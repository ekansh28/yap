import io
import os
import base64
import uuid
from PIL import Image, ImageSequence
import boto3
from botocore.config import Config
from django.conf import settings

# 1. Image size dictionaries
AVATAR_SIZES = {
    "32": (32, 32),      # Top bar, chat message author icons (~1 KB)
    "64": (64, 64),      # Profile preview card (~3 KB)
    "128": (128, 128),   # Profile modal preview (~7 KB)
    "256": (256, 256),   # High-res avatar master (~15 KB)
}

BANNER_SIZES = {
    "sm": (345, 100),    # Profile card preview (~10 KB)
    "md": (690, 200),    # Profile modal banner (~25 KB)
    "lg": (1035, 300),   # High-res desktop (~50 KB)
}


def get_r2_client():
    account_id = getattr(settings, "R2_ACCOUNT_ID", "") or os.getenv("R2_ACCOUNT_ID", "")
    access_key = getattr(settings, "R2_ACCESS_KEY_ID", "") or os.getenv("R2_ACCESS_KEY_ID", "")
    secret_key = getattr(settings, "R2_SECRET_ACCESS_KEY", "") or os.getenv("R2_SECRET_ACCESS_KEY", "")

    if not (account_id and access_key and secret_key):
        return None

    endpoint_url = f"https://{account_id}.r2.cloudflarestorage.com"
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def resize_to_webp(pil_image, target_size, crop_box=None, quality=85):
    """
    Resizes an image (static or animated GIF/WebP) and returns optimized WebP bytes.
    Preserves all animated frames, frame durations, loops, and alpha transparency.
    """
    is_animated = getattr(pil_image, "is_animated", False) and getattr(pil_image, "n_frames", 1) > 1

    if is_animated:
        frames = []
        durations = []
        for frame in ImageSequence.Iterator(pil_image):
            fc = frame.convert("RGBA")
            if crop_box:
                fc = fc.crop(crop_box)
            fc.thumbnail(target_size, Image.Resampling.LANCZOS)
            frames.append(fc)
            durations.append(frame.info.get("duration", 100))

        buffer = io.BytesIO()
        if frames:
            frames[0].save(
                buffer,
                format="WEBP",
                save_all=True,
                append_images=frames[1:],
                duration=durations,
                loop=pil_image.info.get("loop", 0),
                quality=quality,
                method=6,
            )
        buffer.seek(0)
        return buffer.getvalue()
    else:
        img_copy = pil_image.convert("RGBA" if "A" in pil_image.mode else "RGB")
        if crop_box:
            img_copy = img_copy.crop(crop_box)
        img_copy.thumbnail(target_size, Image.Resampling.LANCZOS)

        buffer = io.BytesIO()
        img_copy.save(buffer, format="WEBP", quality=quality, method=6)
        buffer.seek(0)
        return buffer.getvalue()


def upload_variants(user_id, base64_data, folder="avatars"):
    """
    Decodes base64 image (or dict with data + crop), resizes into all dictionary variants,
    and uploads to R2 (with local media directory fallback if R2 credentials are not set).
    Returns the primary base key (e.g. 'avatars/1_a1b2c3d4.webp').
    """
    # 1. Parse data and optional crop box
    crop_box = None
    if isinstance(base64_data, dict):
        raw_b64 = base64_data.get("data", "")
        crop_dict = base64_data.get("crop")
        if crop_dict and all(k in crop_dict for k in ("x", "y", "width", "height")):
            crop_box = (
                int(crop_dict["x"]),
                int(crop_dict["y"]),
                int(crop_dict["x"] + crop_dict["width"]),
                int(crop_dict["y"] + crop_dict["height"]),
            )
    else:
        raw_b64 = str(base64_data)

    if "," in raw_b64:
        _, raw_b64 = raw_b64.split(",", 1)

    raw_bytes = base64.b64decode(raw_b64)
    img = Image.open(io.BytesIO(raw_bytes))

    # 2. Pick the dictionary to use
    sizes_dict = AVATAR_SIZES if folder == "avatars" else BANNER_SIZES

    # 3. Create a unique base key name
    file_id = f"{user_id}_{uuid.uuid4().hex[:8]}"
    r2_client = get_r2_client()
    bucket = getattr(settings, "R2_BUCKET_NAME", "yapchat") or os.getenv("R2_BUCKET_NAME", "yapchat")
    media_dir = getattr(settings, "MEDIA_ROOT", None) or os.path.join(settings.BASE_DIR, "media")

    # 4. Loop through each size and upload
    for suffix, dimensions in sizes_dict.items():
        webp_bytes = resize_to_webp(img, dimensions, crop_box=crop_box)
        variant_key = f"{folder}/{file_id}_{suffix}.webp"

        # Upload to R2 if client exists
        if r2_client:
            try:
                r2_client.put_object(
                    Bucket=bucket,
                    Key=variant_key,
                    Body=webp_bytes,
                    ContentType="image/webp",
                    CacheControl="public, max-age=31536000, immutable",
                )
            except Exception as e:
                print(f"Error uploading {variant_key} to R2: {e}")

        # Local fallback backup
        target_dir = os.path.join(media_dir, folder)
        os.makedirs(target_dir, exist_ok=True)
        file_path = os.path.join(target_dir, f"{file_id}_{suffix}.webp")
        with open(file_path, "wb") as f:
            f.write(webp_bytes)

    # If R2 is not configured, return local media URL path
    if not r2_client:
        media_url = getattr(settings, "MEDIA_URL", "/media/")
        return f"{media_url.rstrip('/')}/{folder}/{file_id}.webp"

    return f"{folder}/{file_id}.webp"


def delete_variants(base_key, folder="avatars"):
    """
    Deletes all size variants of a key from R2 and local media.
    """
    if not base_key:
        return

    r2_client = get_r2_client()
    bucket = getattr(settings, "R2_BUCKET_NAME", "yapchat") or os.getenv("R2_BUCKET_NAME", "yapchat")
    media_dir = getattr(settings, "MEDIA_ROOT", None) or os.path.join(settings.BASE_DIR, "media")

    # Extract base path without .webp or size suffix
    clean_key = base_key
    if clean_key.startswith("/media/"):
        clean_key = clean_key.replace("/media/", "", 1)
    elif "://" in clean_key:
        clean_key = clean_key.split("://", 1)[1].split("/", 1)[1]

    if clean_key.endswith(".webp"):
        clean_key = clean_key[:-5]

    # Clean up all avatar and banner variants
    suffixes = list(AVATAR_SIZES.keys()) + list(BANNER_SIZES.keys()) + [""]

    for suffix in suffixes:
        suffix_str = f"_{suffix}" if suffix else ""
        variant_key = f"{clean_key}{suffix_str}.webp"

        if r2_client:
            try:
                r2_client.delete_object(Bucket=bucket, Key=variant_key)
            except Exception as e:
                print(f"Error deleting {variant_key} from R2: {e}")

        local_path = os.path.join(media_dir, variant_key)
        if os.path.exists(local_path):
            try:
                os.remove(local_path)
            except Exception as e:
                print(f"Error removing local file {local_path}: {e}")


# Aliases for compatibility
upload_to_r2_or_local = upload_variants
delete_from_r2_or_local = delete_variants