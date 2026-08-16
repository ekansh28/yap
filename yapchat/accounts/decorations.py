# accounts/decorations.py
from django.conf import settings

DECORATIONS = [
    # SQUARE DECORATIONS
    {
        "id": "square/sparkles_heart.gif",
        "name": "Sparkles Heart",
        "shape": "square",
        "animated": True,
        "url": "/static/accounts/decorations/square/sparkles_heart.gif",
        "scale": 0.9,
    },
    {
        "id": "square/floral.png",
        "name": "Floral",
        "shape": "square",
        "animated": False,
        "url": "/static/accounts/decorations/square/floral.png",
    },
    {
        "id": "square/emerald.gif",
        "name": "Emerald",
        "shape": "square",
        "animated": True,
        "url": "/static/accounts/decorations/square/emerald.gif",
    },
    {
        "id": "square/stars.gif",
        "name": "Stars",
        "shape": "square",
        "animated": True,
        "url": "/static/accounts/decorations/square/stars.gif",
        "scale": 0.9,
    },
    {
        "id": "square/barbs.png",
        "name": "Barbs",
        "shape": "square",
        "animated": False,
        "url": "/static/accounts/decorations/square/barbs.png",
    },
    {
        "id": "square/blood.png",
        "name": "Blood",
        "shape": "square",
        "animated": False,
        "url": "/static/accounts/decorations/square/blood.png",
    },
    {
        "id": "square/bones.png",
        "name": "Bones",
        "shape": "square",
        "animated": False,
        "url": "/static/accounts/decorations/square/bones.png",
        "scale": 0.9,
        "offset_x": 0,
    },
    {
        "id": "square/brains.png",
        "name": "Brains",
        "shape": "square",
        "animated": False,
        "url": "/static/accounts/decorations/square/brains.png",
        "scale": 0.9,
    },
    {
        "id": "square/bubble_star.gif",
        "name": "Bubble Star",
        "shape": "square",
        "animated": True,
        "url": "/static/accounts/decorations/square/bubble_star.gif",
    },
    {
        "id": "square/glitter.gif",
        "name": "Glitter",
        "shape": "square",
        "animated": True,
        "url": "/static/accounts/decorations/square/glitter.gif",
    },
    {
        "id": "square/glitters_2.gif",
        "name": "Glitters II",
        "shape": "square",
        "animated": True,
        "url": "/static/accounts/decorations/square/glitters_2.gif",
        "scale": 0.87,
    },
    {
        "id": "square/jewels.gif",
        "name": "Jewels",
        "shape": "square",
        "animated": True,
        "url": "/static/accounts/decorations/square/jewels.gif",
    },
    {
        "id": "square/royal.png",
        "name": "Royal",
        "shape": "square",
        "animated": False,
        "url": "/static/accounts/decorations/square/royal.png",
        "scale": 0.9,
    },
    {
        "id": "square/royal_2.gif",
        "name": "Royal II",
        "shape": "square",
        "animated": True,
        "url": "/static/accounts/decorations/square/royal_2.gif",
    },
    {
        "id": "square/thorns.png",
        "name": "Thorns",
        "shape": "square",
        "animated": False,
        "url": "/static/accounts/decorations/square/thorns.png",
    },
    {
        "id": "square/glittery.gif",
        "name": "Glittery",
        "shape": "square",
        "animated": True,
        "url": "/static/accounts/decorations/square/glittery.gif",
        "scale": 0.9,
    },
    {
        "id": "square/king.png",
        "name": "King",
        "shape": "square",
        "animated": False,
        "url": "/static/accounts/decorations/square/king.png",
    },
    {
        "id": "square/rainbow.gif",
        "name": "Rainbow",
        "shape": "square",
        "animated": True,
        "url": "/static/accounts/decorations/square/rainbow.gif",
         "scale": 0.9,
    },
    {
        "id": "square/teeth.png",
        "name": "Teeth",
        "shape": "square",
        "animated": False,
        "url": "/static/accounts/decorations/square/teeth.png",
        "scale": 0.9,
    },
    {
        "id": "square/royal_blood.png",
        "name": "Royal Blood",
        "shape": "square",
        "animated": False,
        "url": "/static/accounts/decorations/square/royal_blood.png",
    },
    {
        "id": "square/barbed.png",
        "name": "Barbed",
        "shape": "square",
        "animated": False,
        "url": "/static/accounts/decorations/square/barbed.png",
    },

    # ROUND DECORATIONS
    {
        "id": "round/horns.png",
        "name": "Horns",
        "shape": "round",
        "animated": False,
        "url": "/static/accounts/decorations/round/horns.png?v=2",
        "offset_x": 1.6,
    },
    {
        "id": "round/coquette.png",
        "name": "Coquette",
        "shape": "round",
        "animated": False,
        "url": "/static/accounts/decorations/round/coquette.png",
         "scale": 1.1,
    },
    {
        "id": "round/flowers.png",
        "name": "Flowers",
        "shape": "round",
        "animated": False,
        "url": "/static/accounts/decorations/round/flowers.png",
    },
    {
        "id": "round/nyan_cat.png",
        "name": "Nyan Cat",
        "shape": "round",
        "animated": False,
        "url": "/static/accounts/decorations/round/nyan_cat.png",
        "scale": 0.9,
    },
    {
        "id": "round/polka_dot.png",
        "name": "Polka Dot",
        "shape": "round",
        "animated": False,
        "url": "/static/accounts/decorations/round/polka_dot.png",
        "scale": 0.9,
    },
    {
        "id": "round/tides.png",
        "name": "Tides",
        "shape": "round",
        "animated": False,
        "url": "/static/accounts/decorations/round/tides.png",
    },
]

DECORATION_MAP = {d["id"]: d for d in DECORATIONS}

def get_decoration_item(key: str) -> dict:
    if not key:
        return {}
    return DECORATION_MAP.get(key, {})

def get_decoration_url(key: str) -> str:
    if not key:
        return ""
    if key in DECORATION_MAP:
        return DECORATION_MAP[key]["url"]
    if key.startswith("http://") or key.startswith("https://") or key.startswith("/"):
        return key
    if key.startswith("decorations/"):
        return f"/static/accounts/{key}"
    if "/" in key:
        return f"/static/accounts/decorations/{key}"
    cdn_domain = getattr(settings, "R2_CUSTOM_DOMAIN", "https://cdn.yap.chat").rstrip("/")
    return f"{cdn_domain}/{key}"

def get_decoration_transform(key: str, base_scale: float = 1.0, is_topbar: bool = False) -> str:
    item = get_decoration_item(key)
    if not item:
        return "transform: translate(-50%, -50%);"
    
    off_x = item.get("offset_x", item.get("offsetX", 0))
    off_y = item.get("offset_y", item.get("offsetY", 0))
    scale = item.get("scale", base_scale)
    
    if is_topbar:
        off_x = round(off_x * (16.0 / 64.0), 2)
        off_y = round(off_y * (16.0 / 64.0), 2)
        scale_factor = round(scale, 3)
    else:
        scale_factor = round(scale, 3)

    return f"transform: translate(calc(-50% + {off_x}px), calc(-50% + {off_y}px)) scale({scale_factor});"
