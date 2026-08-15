// accounts/static/accounts/js/profile_media.js

// Grabbing DOM elements
const cropperModal = document.getElementById('cropper-modal');
const cropperTitle = document.getElementById('cropper-title');
const cropperSelectState = document.getElementById('cropper-select-state');
const cropperEditState = document.getElementById('cropper-edit-state');
const cropperColorState = document.getElementById('cropper-color-state');

const cropperAvatarSelect = document.getElementById('cropper-avatar-select');
const cropperBannerSelect = document.getElementById('cropper-banner-select');
const cropperBannerUploadBtn = document.getElementById('cropper-banner-upload-button');
const cropperColorBtn = document.getElementById('cropper-color-button');
const cropperColorHex = document.getElementById('cropper-color-hex');

const fileInput = document.getElementById('cropper-file-input');
const cropperImage = document.getElementById('cropper-image');
const cropperOverlay = document.querySelector('.cropper-overlay');
const zoomSlider = document.getElementById('cropper-zoom-slider');
const cropperSaveButton = document.getElementById('cropper-save-button');
const workspace = document.getElementById('cropper-workspace');

// Color picker elements
const win98ColorGrid = document.getElementById('win98-color-grid');
const spectrumCanvas = document.getElementById('color-spectrum-canvas');
const spectrumCursor = document.getElementById('color-spectrum-cursor');
const lumCanvas = document.getElementById('color-lum-canvas');
const lumCursor = document.getElementById('color-lum-cursor');
const colorPreviewSwatch = document.getElementById('color-picker-preview-swatch');
const colorHexInput = document.getElementById('color-hex-input');
const colorRInput = document.getElementById('color-r-input');
const colorGInput = document.getElementById('color-g-input');
const colorBInput = document.getElementById('color-b-input');
const cropperColorBackBtn = document.getElementById('cropper-color-back-button');
const cropperColorDoneBtn = document.getElementById('cropper-color-done-button');
const cropperColorCancelBtn = document.getElementById('cropper-color-cancel-button');

let currentMode = 'avatar'; // 'avatar' or 'banner'
let isDragging = false;
let startX = 0, startY = 0;
let currentX = 0, currentY = 0;
let currentScale = 1;

let selectedRawDataUrl = '';
let isAnimatedFile = false;

// Cutout dimensions inside the 400x300 workspace
const CUTOUT_CONFIG = {
    avatar: {
        width: 200,
        height: 200,
        left: 100,
        top: 50,
        outputWidth: 256,
        outputHeight: 256,
    },
    banner: {
        width: 345,
        height: 100,
        left: 28,
        top: 100,
        outputWidth: 690,
        outputHeight: 200,
    }
};

function getActiveConfig() {
    return CUTOUT_CONFIG[currentMode] || CUTOUT_CONFIG.avatar;
}

// 48 Classic Windows 98 Basic Palette Colors (all unique)
const WIN98_BASIC_COLORS = [
    "#ff8080", "#ffff80", "#80ff80", "#00ff80", "#80ffff", "#0080ff", "#ff80c0", "#ff80ff",
    "#ff0000", "#ffff00", "#80ff00", "#00ff40", "#00ffff", "#0080c0", "#8080c0", "#ff00ff",
    "#804040", "#ff8040", "#00ff00", "#008040", "#004080", "#8080ff", "#800040", "#ff0080",
    "#800000", "#ff8000", "#008000", "#004000", "#004040", "#0000ff", "#0000a0", "#800080",
    "#400000", "#804000", "#004020", "#002000", "#002040", "#000080", "#400040", "#400080",
    "#000000", "#808040", "#808000", "#408080", "#008080", "#c0c0c0", "#808080", "#ffffff"
];

let activeHue = 0;       // 0 - 360
let activeSat = 0;       // 0 - 1
let activeLum = 0;       // 0 - 1
let activeHex = '#000000';
let isDraggingSpectrum = false;
let isDraggingLum = false;

function hexToRgb(hex) {
    hex = (hex || '').replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    const num = parseInt(hex, 16);
    if (isNaN(num) || hex.length !== 6) return { r: 0, g: 0, b: 0 };
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
}

function rgbToHexStr(r, g, b) {
    const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s, l };
}

function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    if (s === 0) {
        const v = Math.round(l * 255);
        return { r: v, g: v, b: v };
    }
    const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return {
        r: Math.round(hue2rgb(p, q, h + 1/3) * 255),
        g: Math.round(hue2rgb(p, q, h) * 255),
        b: Math.round(hue2rgb(p, q, h - 1/3) * 255)
    };
}

function drawSpectrum() {
    if (!spectrumCanvas) return;
    const ctx = spectrumCanvas.getContext('2d');
    const w = spectrumCanvas.width;
    const h = spectrumCanvas.height;

    // Horizontal Hue Gradient
    const hueGrad = ctx.createLinearGradient(0, 0, w, 0);
    hueGrad.addColorStop(0, '#ff0000');
    hueGrad.addColorStop(0.17, '#ffff00');
    hueGrad.addColorStop(0.33, '#00ff00');
    hueGrad.addColorStop(0.5, '#00ffff');
    hueGrad.addColorStop(0.67, '#0000ff');
    hueGrad.addColorStop(0.83, '#ff00ff');
    hueGrad.addColorStop(1, '#ff0000');

    ctx.fillStyle = hueGrad;
    ctx.fillRect(0, 0, w, h);

    // Vertical Saturation Gradient
    const satGrad = ctx.createLinearGradient(0, 0, 0, h);
    satGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    satGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    satGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    satGrad.addColorStop(1, 'rgba(0, 0, 0, 1)');

    ctx.fillStyle = satGrad;
    ctx.fillRect(0, 0, w, h);
}

function drawLuminosity(h, s) {
    if (!lumCanvas) return;
    const ctx = lumCanvas.getContext('2d');
    const w = lumCanvas.width;
    const height = lumCanvas.height;

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, 50%)`);
    grad.addColorStop(1, '#000000');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, height);
}

function populateWin98Swatches() {
    if (!win98ColorGrid || win98ColorGrid.children.length > 0) return;
    WIN98_BASIC_COLORS.forEach((hex) => {
        const swatch = document.createElement('div');
        swatch.className = 'win98-swatch';
        swatch.style.backgroundColor = hex;
        swatch.title = hex.toUpperCase();
        swatch.addEventListener('click', () => {
            setColorFromHex(hex);
        });
        win98ColorGrid.appendChild(swatch);
    });
}

function updateColorUI(fromSource = '') {
    const rgb = hslToRgb(activeHue, activeSat, activeLum);
    activeHex = rgbToHexStr(rgb.r, rgb.g, rgb.b);

    if (colorPreviewSwatch) {
        colorPreviewSwatch.style.backgroundColor = activeHex;
    }

    if (fromSource !== 'hex' && colorHexInput) {
        colorHexInput.value = activeHex.toUpperCase();
    }
    if (fromSource !== 'rgb') {
        if (colorRInput) colorRInput.value = rgb.r;
        if (colorGInput) colorGInput.value = rgb.g;
        if (colorBInput) colorBInput.value = rgb.b;
    }

    // Update spectrum cursor
    if (spectrumCursor && spectrumCanvas) {
        const specW = spectrumCanvas.width;
        const specH = spectrumCanvas.height;
        const cx = (activeHue / 360) * specW;
        const cy = (1 - activeSat) * specH;
        spectrumCursor.style.left = `${cx}px`;
        spectrumCursor.style.top = `${cy}px`;
    }

    // Update lum cursor & canvas
    drawLuminosity(activeHue, activeSat);
    if (lumCursor && lumCanvas) {
        const lumH = lumCanvas.height;
        const ly = (1 - activeLum) * lumH;
        lumCursor.style.top = `${ly}px`;
    }

    // Update swatches active state
    if (win98ColorGrid) {
        Array.from(win98ColorGrid.children).forEach((swatch) => {
            swatch.classList.toggle('active', swatch.style.backgroundColor === activeHex || swatch.title === activeHex.toUpperCase());
        });
    }

    // Live preview on the card banner in real-time
    const previewBanner = document.getElementById('profile-preview-banner');
    if (previewBanner) {
        previewBanner.style.backgroundColor = activeHex;
    }
}

function setColorFromHex(hex, fromSource = '') {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    activeHue = hsl.h;
    activeSat = hsl.s;
    activeLum = hsl.l;
    updateColorUI(fromSource);
}

// Spectrum mouse dragging
function handleSpectrumMove(e) {
    if (!spectrumCanvas) return;
    const rect = spectrumCanvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    activeHue = (x / rect.width) * 360;
    activeSat = 1 - (y / rect.height);
    updateColorUI();
}

spectrumCanvas?.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDraggingSpectrum = true;
    handleSpectrumMove(e);
});

// Luminosity mouse dragging
function handleLumMove(e) {
    if (!lumCanvas) return;
    const rect = lumCanvas.getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    activeLum = 1 - (y / rect.height);
    updateColorUI();
}

lumCanvas?.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDraggingLum = true;
    handleLumMove(e);
});

window.addEventListener('mousemove', (e) => {
    if (isDraggingSpectrum) handleSpectrumMove(e);
    if (isDraggingLum) handleLumMove(e);
});

window.addEventListener('mouseup', () => {
    isDraggingSpectrum = false;
    isDraggingLum = false;
});

// Inputs direct changes
colorHexInput?.addEventListener('input', (e) => {
    let val = e.target.value.trim();
    if (!val.startsWith('#')) val = '#' + val;
    if (val.length === 7) {
        setColorFromHex(val, 'hex');
    }
});

function handleRgbInputs() {
    const r = parseInt(colorRInput?.value || '0', 10);
    const g = parseInt(colorGInput?.value || '0', 10);
    const b = parseInt(colorBInput?.value || '0', 10);
    const hsl = rgbToHsl(r, g, b);
    activeHue = hsl.h;
    activeSat = hsl.s;
    activeLum = hsl.l;
    updateColorUI('rgb');
}

colorRInput?.addEventListener('input', handleRgbInputs);
colorGInput?.addEventListener('input', handleRgbInputs);
colorBInput?.addEventListener('input', handleRgbInputs);

function rgbToHex(color) {
    if (!color) return '#000000';
    if (color.startsWith('#')) return color;
    const match = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return '#000000';
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

function updateCropperColorButton() {
    if (!cropperColorBtn) return;
    const previewBanner = document.getElementById('profile-preview-banner');
    
    const bgImage = previewBanner ? previewBanner.style.backgroundImage : '';
    const hasImage = bgImage && bgImage !== 'none' && bgImage !== 'url("")' && !bgImage.includes('url("none")');
    
    let currentColor = previewBanner ? previewBanner.style.backgroundColor : '';
    if (!currentColor) currentColor = '#000000';
    const hexColor = rgbToHex(currentColor) || '#000000';

    if (hasImage) {
        cropperColorBtn.classList.add('no-color');
        cropperColorBtn.style.backgroundColor = '';
        if (cropperColorHex) cropperColorHex.textContent = 'None';
    } else {
        cropperColorBtn.classList.remove('no-color');
        cropperColorBtn.style.backgroundColor = currentColor;
        if (cropperColorHex) cropperColorHex.textContent = hexColor.toUpperCase();
    }
}

export function openCropper(mode = 'avatar') {
    currentMode = mode;
    if (!cropperModal) return;

    if (cropperTitle) {
        cropperTitle.textContent = currentMode === 'avatar' ? 'Select Avatar Image' : 'Select Banner Image';
    }

    if (cropperOverlay) {
        cropperOverlay.className = 'cropper-overlay ' + (currentMode === 'avatar' ? 'avatar-mode' : 'banner-mode');
    }

    if (cropperAvatarSelect && cropperBannerSelect) {
        if (currentMode === 'avatar') {
            cropperAvatarSelect.style.display = 'block';
            cropperBannerSelect.style.display = 'none';
        } else {
            cropperAvatarSelect.style.display = 'none';
            cropperBannerSelect.style.display = 'block';
            updateCropperColorButton();
        }
    }

    if (cropperSelectState) cropperSelectState.style.display = 'block';
    if (cropperEditState) cropperEditState.style.display = 'none';
    if (cropperColorState) cropperColorState.style.display = 'none';

    if (fileInput) fileInput.value = '';

    cropperModal.style.display = 'flex';
    setTimeout(() => cropperModal.classList.add('is-opening'), 10);
}

let colorPickerSnapshotColor = '#000000';
let colorPickerSnapshotImage = '';

function restoreColorPickerSnapshot() {
    const previewBanner = document.getElementById('profile-preview-banner');
    if (previewBanner) {
        previewBanner.style.backgroundColor = colorPickerSnapshotColor;
        previewBanner.style.backgroundImage = colorPickerSnapshotImage;
    }
}

export function closeCropper(revertColor = true) {
    if (revertColor && cropperColorState && cropperColorState.style.display !== 'none') {
        restoreColorPickerSnapshot();
    }
    if (!cropperModal) return;
    cropperModal.classList.remove('is-opening');
    setTimeout(() => {
        cropperModal.style.display = 'none';
        if (cropperImage) cropperImage.src = '';
        if (cropperColorState) cropperColorState.style.display = 'none';
    }, 200);
}

// Transition to Custom Color Picker
cropperColorBtn?.addEventListener('click', () => {
    const previewBanner = document.getElementById('profile-preview-banner');
    colorPickerSnapshotColor = previewBanner ? (previewBanner.style.backgroundColor || '#000000') : '#000000';
    colorPickerSnapshotImage = previewBanner ? previewBanner.style.backgroundImage : '';

    if (cropperSelectState) cropperSelectState.style.display = 'none';
    if (cropperColorState) cropperColorState.style.display = 'block';
    if (cropperTitle) cropperTitle.textContent = 'Edit Colors';

    populateWin98Swatches();
    drawSpectrum();

    const currentColor = previewBanner ? rgbToHex(previewBanner.style.backgroundColor) : '#000000';
    setColorFromHex(currentColor || '#000000');
});

// Back button from Color Picker to Choose Banner
cropperColorBackBtn?.addEventListener('click', () => {
    restoreColorPickerSnapshot();
    if (cropperColorState) cropperColorState.style.display = 'none';
    if (cropperSelectState) cropperSelectState.style.display = 'block';
    if (cropperTitle) cropperTitle.textContent = 'Select Banner Image';
    updateCropperColorButton();
});

// OK / Done Button from Color Picker
cropperColorDoneBtn?.addEventListener('click', () => {
    colorPickerSnapshotColor = activeHex;
    if (cropperColorBtn) {
        cropperColorBtn.classList.remove('no-color');
        cropperColorBtn.style.backgroundColor = activeHex;
    }
    if (cropperColorHex) {
        cropperColorHex.textContent = activeHex.toUpperCase();
    }
    window.dispatchEvent(new CustomEvent('profile:bannerColorChanged', {
        detail: { color: activeHex }
    }));
    closeCropper(false);
});

// Cancel Button from Color Picker
cropperColorCancelBtn?.addEventListener('click', () => {
    restoreColorPickerSnapshot();
    closeCropper(false);
});

// Trigger change avatar button or avatar preview click
document.getElementById('change-avatar-button')?.addEventListener('click', () => {
    openCropper('avatar');
});

document.getElementById('profile-avatar-wrapper')?.addEventListener('click', () => {
    openCropper('avatar');
});

// Trigger change banner button or banner preview click
document.getElementById('change-banner-button')?.addEventListener('click', () => {
    openCropper('banner');
});

document.getElementById('profile-preview-banner')?.addEventListener('click', () => {
    openCropper('banner');
});

// Upload buttons trigger file picker
document.getElementById('cropper-upload-button')?.addEventListener('click', () => {
    fileInput?.click();
});

cropperBannerUploadBtn?.addEventListener('click', () => {
    fileInput?.click();
});

// File selected
fileInput?.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    isAnimatedFile = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif') || file.type.includes('gif');

    const reader = new FileReader();
    reader.onload = (e) => {
        selectedRawDataUrl = e.target.result;
        if (!cropperImage) return;

        cropperImage.onload = () => {
            const config = getActiveConfig();
            const naturalW = cropperImage.naturalWidth;
            const naturalH = cropperImage.naturalHeight;

            const scaleX = (config.width + 2) / naturalW;
            const scaleY = (config.height + 2) / naturalH;
            const minScale = Math.max(scaleX, scaleY);

            const scaledWidth = naturalW * minScale;
            const scaledHeight = naturalH * minScale;

            currentScale = minScale;
            currentX = (400 - scaledWidth) / 2;
            currentY = (300 - scaledHeight) / 2;

            if (zoomSlider) {
                zoomSlider.min = minScale;
                zoomSlider.max = Math.max(3, minScale * 3.5);
                zoomSlider.step = ((zoomSlider.max - zoomSlider.min) / 100).toFixed(4);
                zoomSlider.value = minScale;
            }

            clampPosition();
            updateImageTransform();
        };

        cropperImage.src = e.target.result;

        if (cropperTitle) {
            cropperTitle.textContent = currentMode === 'avatar' ? 'Edit Avatar Image' : 'Edit Banner Image';
        }
        if (cropperSelectState) cropperSelectState.style.display = 'none';
        if (cropperColorState) cropperColorState.style.display = 'none';
        if (cropperEditState) cropperEditState.style.display = 'block';
    };

    reader.readAsDataURL(file);
});

// Close / Cancel buttons
document.getElementById('cropper-close-button')?.addEventListener('click', closeCropper);
document.getElementById('cropper-cancel-button')?.addEventListener('click', closeCropper);

function updateImageTransform() {
    if (cropperImage) {
        cropperImage.style.transform = `translate(${currentX}px, ${currentY}px) scale(${currentScale})`;
    }
}

function clampPosition() {
    if (!cropperImage) return;
    const config = getActiveConfig();
    const imgWidth = cropperImage.naturalWidth * currentScale;
    const imgHeight = cropperImage.naturalHeight * currentScale;

    const maxX = config.left;
    const maxY = config.top;
    const minX = config.left + config.width - imgWidth;
    const minY = config.top + config.height - imgHeight;

    if (imgWidth >= config.width) {
        currentX = Math.max(minX, Math.min(currentX, maxX));
    }
    if (imgHeight >= config.height) {
        currentY = Math.max(minY, Math.min(currentY, maxY));
    }
}

workspace?.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDragging = true;
    startX = e.clientX - currentX;
    startY = e.clientY - currentY;
});

window.addEventListener('mouseup', () => {
    isDragging = false;
});

window.addEventListener('mouseleave', () => {
    isDragging = false;
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    currentX = e.clientX - startX;
    currentY = e.clientY - startY;
    clampPosition();
    updateImageTransform();
});

zoomSlider?.addEventListener('input', (event) => {
    const newScale = parseFloat(event.target.value);
    const oldScale = currentScale;

    const centerX = (200 - currentX) / oldScale;
    const centerY = (150 - currentY) / oldScale;

    currentScale = newScale;
    currentX = 200 - centerX * currentScale;
    currentY = 150 - centerY * currentScale;

    clampPosition();
    updateImageTransform();
});

workspace?.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (!zoomSlider) return;

    const delta = e.deltaY * -0.0015;
    const minScale = parseFloat(zoomSlider.min);
    const maxScale = parseFloat(zoomSlider.max);
    let targetScale = currentScale + delta;
    targetScale = Math.max(minScale, Math.min(maxScale, targetScale));

    zoomSlider.value = targetScale;
    zoomSlider.dispatchEvent(new Event('input'));
}, { passive: false });

cropperSaveButton?.addEventListener('click', () => {
    if (!cropperImage || !cropperImage.naturalWidth) return;

    const config = getActiveConfig();
    const sourceX = Math.max(0, Math.round((config.left - currentX) / currentScale));
    const sourceY = Math.max(0, Math.round((config.top - currentY) / currentScale));
    const sourceW = Math.round(config.width / currentScale);
    const sourceH = Math.round(config.height / currentScale);

    if (isAnimatedFile && selectedRawDataUrl) {
        window.dispatchEvent(new CustomEvent('profile:imageCropped', {
            detail: {
                mode: currentMode,
                dataUrl: selectedRawDataUrl,
                payloadData: {
                    data: selectedRawDataUrl,
                    crop: {
                        x: sourceX,
                        y: sourceY,
                        width: sourceW,
                        height: sourceH
                    }
                }
            }
        }));
    } else {
        const canvas = document.createElement('canvas');
        canvas.width = config.outputWidth;
        canvas.height = config.outputHeight;
        const ctx = canvas.getContext('2d');

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(
            cropperImage,
            sourceX, sourceY, sourceW, sourceH,
            0, 0, canvas.width, canvas.height
        );

        const croppedDataUrl = canvas.toDataURL('image/webp', 0.92);

        window.dispatchEvent(new CustomEvent('profile:imageCropped', {
            detail: {
                mode: currentMode,
                dataUrl: croppedDataUrl,
                payloadData: croppedDataUrl
            }
        }));
    }

    closeCropper();
});