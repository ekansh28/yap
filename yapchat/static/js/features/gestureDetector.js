export class GestureDetector {
    constructor(videoElement, onGesture) {
        this.videoElement = videoElement;
        this.onGesture = onGesture; // Callback function that receives the emoji
        this.isRunning = false;
        this.currentGesture = null; // State to track the currently held gesture

        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 2, // Allow 2 hands for gestures like 🫶 and 🙏
            modelComplexity: 0, 
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.hands.onResults(this.onResults.bind(this));
    }

    async processFrame() {
        if (!this.isRunning) return;

        if (this.videoElement.readyState >= 2) {
            try {
                await this.hands.send({image: this.videoElement});
            } catch (error) {
                console.error("Error processing hand gesture:", error);
            }
        }
    }

    onResults(results) {
        let detectedGesture = null;

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            // Helper function to calculate distance between two landmarks
            const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

            if (results.multiHandLandmarks.length === 1) {
                const lm = results.multiHandLandmarks[0];
                
                // Compare distance of finger tip to wrist vs PIP joint to wrist to determine if extended
                const indexExt = dist(lm[8], lm[0]) > dist(lm[6], lm[0]);
                const middleExt = dist(lm[12], lm[0]) > dist(lm[10], lm[0]);
                const ringExt = dist(lm[16], lm[0]) > dist(lm[14], lm[0]);
                const pinkyExt = dist(lm[20], lm[0]) > dist(lm[18], lm[0]);
                
                // For thumb, compare distance from tip to pinky base (17) vs IP joint to pinky base
                const thumbExt = dist(lm[4], lm[17]) > dist(lm[3], lm[17]);

                if (thumbExt && !indexExt && !middleExt && !ringExt && !pinkyExt) {
                    // Thumb extended, others curled. Check direction based on y-coordinates
                    if (lm[4].y < lm[5].y) {
                        detectedGesture = '👍'; // Thumb is pointing UP (smaller y than index knuckle)
                    } else if (lm[4].y > lm[5].y) {
                        detectedGesture = '👎'; // Thumb is pointing DOWN (larger y than index knuckle)
                    }
                } else if (indexExt && !middleExt && !ringExt && !pinkyExt) {
                    detectedGesture = '🫵'; // Only index extended
                } else if (indexExt && !middleExt && !ringExt && pinkyExt) {
                    detectedGesture = '🤘'; // Index and pinky extended (rock on)
                }

            } else if (results.multiHandLandmarks.length === 2) {
                const lm1 = results.multiHandLandmarks[0];
                const lm2 = results.multiHandLandmarks[1];

                const thumbDist = dist(lm1[4], lm2[4]);
                const indexDist = dist(lm1[8], lm2[8]);
                const middleDist = dist(lm1[12], lm2[12]);
                const wristDist = dist(lm1[0], lm2[0]);

                if (thumbDist < 0.15 && indexDist < 0.15 && wristDist > 0.15) {
                    // Thumbs touching, index touching, wrists far apart -> Heart hands
                    detectedGesture = '🫶';
                } else if (wristDist < 0.15 && indexDist < 0.15 && middleDist < 0.15) {
                    // Wrists touching and fingers touching -> Praying / Folded hands
                    detectedGesture = '🙏';
                }
            }
        }

        // State logic: Only trigger if we found a NEW gesture.
        // Once the hands go out of that gesture (detectedGesture becomes null or changes),
        // we can trigger the next one.
        if (detectedGesture) {
            if (this.currentGesture !== detectedGesture) {
                this.currentGesture = detectedGesture;
                if (this.onGesture) {
                    this.onGesture(detectedGesture); // Send the specific emoji string
                }
            }
        } else {
            // Hand is gone or gesture stopped, unlock state so it can happen again
            this.currentGesture = null;
        }
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.intervalId = setInterval(() => this.processFrame(), 200); 
    }

    stop() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
}