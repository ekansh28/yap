export class VideoEffectProcessor{
    constructor(rawvideoElement, canvasElement) {
        this.rawvideoElement = rawvideoElement;
        this.canvasElement = canvasElement;
        this.canvasCtx = this.canvasElement.getContext('2d');
        this.isRunning = false;
        this.isProcessing = false;

        //Initializing Selfie Segmentation
        this.selfieSegmentation = new SelfieSegmentation({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
            }
        });

        this.selfieSegmentation.setOptions({
            modelSelection: 1,
        });

        this.selfieSegmentation.onResults(this.onResults.bind(this));
    }

    async processFrame() {
        if (!this.isRunning) return;

        if (!this.isProcessing && this.rawvideoElement.readyState >= 2) {
            this.isProcessing = true;
            try {
                await this.selfieSegmentation.send({image: this.rawvideoElement});
            } catch (error) {
                console.error("Error processing video frame:", error);
            }
            this.isProcessing = false;
        }

        // Sync perfectly with webcam framerate to prevent lag
        if (this.rawvideoElement.requestVideoFrameCallback) {
            this.rawvideoElement.requestVideoFrameCallback(() => this.processFrame());
        } else {
            requestAnimationFrame(() => this.processFrame());
        }
    }

    onResults(results) {
        // This function is called every time a frame is processed
        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

        // Draw the mask (white for person, black for background)
        this.canvasCtx.drawImage(results.segmentationMask, 0, 0, this.canvasElement.width, this.canvasElement.height);

        // 'source-out' means new drawings only appear where there IS NO existing drawing (the background)
        this.canvasCtx.globalCompositeOperation = 'source-out';
        
        // Apply blur filter and draw the original image (this blurs the background)
        this.canvasCtx.filter = 'blur(10px)'; // Adjust pixel value to increase/decrease blur
        this.canvasCtx.drawImage(results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);

        // 'destination-atop' means new drawings go BEHIND existing drawings, and keep the existing drawings (the person)
        this.canvasCtx.globalCompositeOperation = 'destination-atop';
        
        // Remove blur filter and draw the original image (this draws the clear person over the blurred background)
        this.canvasCtx.filter = 'none';
        this.canvasCtx.drawImage(results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);

        this.canvasCtx.restore();
    }

    start() {
        this.isRunning = true;
        // Start the manual processing loop
        this.processFrame();
    }

    stop() {
        this.isRunning = false;
    }
}