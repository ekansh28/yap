// Grabbing DOM elements
const cropperModal = document.getElementById('cropper-modal');
const cropperTitle = document.getElementById('cropper-title');
const cropperSelectState = document.getElementById('cropper-select-state');
const cropperEditState = document.getElementById('cropper-edit-state');
const fileInput = document.getElementById('cropper-file-input');
const cropperImage = document.getElementById('cropper-image');


// Open modal when they click change avatar button (from profile_modal.html)
document.getElementById('change-avatar-button')?.addEventListener('click', () => {
    // Reset to initial state
    cropperTitle.textContent = "Select an Image";
    cropperSelectState.style.display= 'block';
    cropperEditState.style.display = 'none';

    cropperModal.style.display = 'flex';
    setTimeout(() => cropperModal.classList.add("is-opening"), 10);
});

// Click Upload Image => Triggers file browser
document.getElementById('cropper-upload-button')?.addEventListener('click', () => {
    fileInput.click();
});

// When file is selected
fileInput?.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Use FileReader to turn the image into a URL to display instantly
    const reader = new FileReader();
    reader.onload = (e) => {
        // Wait for the image to fully load its dimensions before calculating scale
        cropperImage.onload = () => {
            // Find the shortest side of the image
            const minSide = Math.min(cropperImage.naturalWidth, cropperImage.naturalHeight);
            
            // Calculate the perfect scale to make the shortest side exactly fit the 200x200 square
            // We use 202px just to give a tiny 1px padding so no black edges peek through
            const idealScale = 202 / minSide;

            // Calculate the actual size of the image on screen at this scale
            const scaledWidth = cropperImage.naturalWidth * idealScale;
            const scaledHeight = cropperImage.naturalHeight * idealScale;

            // Center the image in the 400x300 workspace
            currentX = (400 - scaledWidth) / 2;
            currentY = (300 - scaledHeight) / 2;
            currentScale = idealScale;
            
            const zoomSlider = document.getElementById('cropper-zoom-slider');
            if (zoomSlider) {
                zoomSlider.min = idealScale; // Prevent them from zooming out smaller than the square
                zoomSlider.max = Math.max(3, idealScale * 3); // Allow zooming in 3x
                zoomSlider.value = idealScale;
            }
            updateImageTransform();
        };

        cropperImage.src = e.target.result; // Put the image on screen, triggering onload

        // Switch the UI to the Edit Image cropper state
        cropperTitle.textContent = "Edit Image";
        cropperSelectState.style.display = 'none';
        cropperEditState.style.display = 'block';
    };
    reader.readAsDataURL(file);
});


// Close button logic
document.getElementById('cropper-close-button')?.addEventListener('click', () => {
    cropperModal.classList.remove("is-opening");
    setTimeout(() => cropperModal.style.display = "none", 200);
});
document.getElementById('cropper-cancel-button')?.addEventListener('click', () => {
    document.getElementById('cropper-close-button').click();
});

const workspace = document.getElementById('cropper-workspace');

let isDragging = false;
let startX = 0, startY = 0;
let currentX = 0, currentY = 0;
let currentScale = 1;

function updateImageTransform() {
    cropperImage.style.transform = `translate(${currentX}px, ${currentY}px) scale(${currentScale})`;
}

workspace?.addEventListener('mousedown', (e) => {
    // 1. Tell the browser NOT to use its default image dragging behavior
    e.preventDefault(); 
    
    isDragging = true;
    startX = e.clientX - currentX;
    startY = e.clientY - currentY;
});

window.addEventListener('mouseup', () => {
    isDragging = false;
});

// 2. Safety net: If the mouse leaves the browser window entirely, stop dragging
window.addEventListener('mouseleave', () => {
    isDragging = false;
});

function clampPosition() {
    // Calculate the exact size of the image on screen using the current scale
    const imgWidth = cropperImage.naturalWidth * currentScale;
    const imgHeight = cropperImage.naturalHeight * currentScale;

    // The left margin is 100px, top is 50px
    const maxX = 100;
    const maxY = 50;
    const minX = 300 - imgWidth;
    const minY = 250 - imgHeight;

    if (imgWidth >= 200) {
        currentX = Math.max(minX, Math.min(currentX, maxX));
    }
    
    if (imgHeight >= 200) {
        currentY = Math.max(minY, Math.min(currentY, maxY));
    }
}

window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    // Calculate the raw new position based on mouse movement
    currentX = e.clientX - startX;
    currentY = e.clientY - startY;
    
    clampPosition();
    updateImageTransform();
});

const zoomSlider = document.getElementById('cropper-zoom-slider');
zoomSlider?.addEventListener('input', (event) => {
    const oldScale = currentScale;
    const newScale = parseFloat(event.target.value);
    
    // 1. Find the exact pixel on the image that is dead-center in our 200x200 cutout
    // The center of the cutout is exactly at (200px, 150px) in the workspace
    const centerX = (200 - currentX) / oldScale;
    const centerY = (150 - currentY) / oldScale;
    
    // 2. Update the scale
    currentScale = newScale;
    
    // 3. Shift the image position so that the exact same pixel stays dead-center!
    currentX = 200 - centerX * currentScale;
    currentY = 150 - centerY * currentScale;
    
    clampPosition();
    updateImageTransform();
});