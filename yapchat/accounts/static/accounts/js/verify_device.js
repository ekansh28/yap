export class VerifyDeviceController {
    constructor() {
        this.state = document.getElementById("verify-device-state");
        this.loginState = document.getElementById("login-state");
        this.emailSpan = document.getElementById("verify-device-email");
        this.helpParagraph = document.getElementById("verify-device-help");
        this.errorHelp = document.getElementById("verify-device-error");
        this.submitBtn = document.getElementById("submit-device-code-button");
        this.backBtn = document.getElementById("back-to-login-from-device");
        this.resendBtn = document.getElementById("resend-device-code-button");
        this.boxes = Array.from(document.querySelectorAll(".device-code-box"));
        this.sessionToken = null;
        this.cooldownTimer = null;
        this.secondsRemaining = 0;

        this.init();
    }

    // Called when backend returns requires_device_verification: true
    show(sessionToken, maskedEmail) {
        this.sessionToken = sessionToken;
        if (this.emailSpan) this.emailSpan.textContent = maskedEmail;
        if (this.helpParagraph) {
            this.helpParagraph.style.display = "block";
            this.helpParagraph.style.opacity = "1";
            this.helpParagraph.style.visibility = "visible";
            this.helpParagraph.style.maxHeight = "none";
        }
        this.clear();
        
        // Ensure auth modal remains open and centered
        const authModal = document.getElementById("auth-modal");
        if (authModal) {
            authModal.style.display = "";
            authModal.classList.add("is-open");
        }

        // Hide all other auth states and show verify-device state
        document.querySelectorAll(".auth-state").forEach(el => el.classList.remove("is-active"));
        if (this.state) this.state.classList.add("is-active");

        // Start 60-second resend cooldown timer
        this.startResendCooldown(60);

        // Auto focus first box
        if (this.boxes[0]) this.boxes[0].focus();
    }

    startResendCooldown(seconds = 60) {
        if (this.cooldownTimer) clearInterval(this.cooldownTimer);
        this.secondsRemaining = seconds;

        if (this.resendBtn) {
            this.resendBtn.disabled = true;
            this.resendBtn.innerHTML = `Resend in <span id="resend-countdown-timer">${this.secondsRemaining}</span>s`;
        }

        this.cooldownTimer = setInterval(() => {
            this.secondsRemaining--;
            if (this.secondsRemaining <= 0) {
                clearInterval(this.cooldownTimer);
                this.cooldownTimer = null;
                if (this.resendBtn) {
                    this.resendBtn.disabled = false;
                    this.resendBtn.textContent = "Resend Code";
                }
            } else {
                const timerSpan = document.getElementById("resend-countdown-timer");
                if (timerSpan) {
                    timerSpan.textContent = this.secondsRemaining;
                } else if (this.resendBtn) {
                    this.resendBtn.innerHTML = `Resend in <span id="resend-countdown-timer">${this.secondsRemaining}</span>s`;
                }
            }
        }, 1000);
    }

    clear() {
        this.boxes.forEach(b => b.value = "");
        if (this.errorHelp) {
            this.errorHelp.style.color = "red";
            this.errorHelp.textContent = "";
        }
        if (this.submitBtn) this.submitBtn.disabled = true;
    }

    getCode() {
        return this.boxes.map(b => b.value).join("");
    }

    init() {
        // Back to login button
        if (this.backBtn) {
            this.backBtn.addEventListener("click", () => {
                document.querySelectorAll(".auth-state").forEach(el => el.classList.remove("is-active"));
                if (this.loginState) this.loginState.classList.add("is-active");
            });
        }

        // Resend button click handler
        if (this.resendBtn) {
            this.resendBtn.addEventListener("click", () => this.resendCode());
        }

        // Attach input, backspace, paste, and enter key listeners for each digit box
        this.boxes.forEach((box, idx) => {
            box.addEventListener("input", () => {
                box.value = box.value.replace(/[^0-9]/g, "").slice(-1);
                if (box.value && idx < 4) {
                    this.boxes[idx + 1].focus();
                }
                this.updateState();
            });

            box.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    if (this.getCode().length === 5) {
                        this.submitCode();
                    }
                } else if (e.key === "Backspace" && !box.value && idx > 0) {
                    this.boxes[idx - 1].focus();
                    this.boxes[idx - 1].value = "";
                    this.updateState();
                }
            });

            box.addEventListener("paste", (e) => {
                e.preventDefault();
                const pasted = (e.clipboardData || window.clipboardData).getData("text").replace(/[^0-9]/g, "").slice(0, 5);
                if (pasted) {
                    pasted.split("").forEach((char, i) => {
                        if (this.boxes[i]) this.boxes[i].value = char;
                    });
                    this.updateState();
                    const focusIdx = Math.min(pasted.length, 4);
                    this.boxes[focusIdx].focus();
                }
            });
        });

        if (this.submitBtn) {
            this.submitBtn.addEventListener("click", () => this.submitCode());
        }
    }

    async resendCode() {
        if (!this.sessionToken || this.secondsRemaining > 0) return;

        if (this.resendBtn) this.resendBtn.disabled = true;
        if (this.errorHelp) {
            this.errorHelp.style.color = "#000080";
            this.errorHelp.textContent = "Sending new verification code...";
        }

        try {
            const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]")?.value || "";
            const response = await fetch("/api/resend-device-code/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken
                },
                body: JSON.stringify({ session_token: this.sessionToken })
            });

            const data = await response.json();

            if (data.ok) {
                if (data.new_session_token) {
                    this.sessionToken = data.new_session_token;
                }
                if (this.errorHelp) {
                    this.errorHelp.style.color = "green";
                    this.errorHelp.textContent = data.message || "New code sent! Check your inbox.";
                }
                this.startResendCooldown(60);
            } else {
                if (this.errorHelp) {
                    this.errorHelp.style.color = "red";
                    this.errorHelp.textContent = data.message || "Failed to resend code.";
                }
                if (data.cooldown_remaining) {
                    this.startResendCooldown(data.cooldown_remaining);
                } else if (this.resendBtn) {
                    this.resendBtn.disabled = false;
                }
            }
        } catch (err) {
            if (this.errorHelp) {
                this.errorHelp.style.color = "red";
                this.errorHelp.textContent = "Network error. Please try again.";
            }
            if (this.resendBtn) this.resendBtn.disabled = false;
        }
    }

    updateState() {
        const code = this.getCode();
        if (this.submitBtn) {
            this.submitBtn.disabled = (code.length !== 5);
        }
    }

    async submitCode() {
        const code = this.getCode();
        if (code.length !== 5) return;

        if (this.submitBtn) this.submitBtn.disabled = true;
        if (this.errorHelp) {
            this.errorHelp.style.color = "red";
            this.errorHelp.textContent = "";
        }

        // Hide auth modal window smoothly
        const authModal = document.getElementById("auth-modal");
        if (authModal) {
            authModal.classList.remove("is-open");
            authModal.style.display = "";
        }

        // Show native 98.css Logging In popup window
        const loadingOverlay = document.getElementById("auth-loading-overlay") || document.getElementById("logout-loading-overlay");
        const loadingTitle = document.getElementById("auth-loading-title");
        const loadingText = document.getElementById("auth-loading-text");

        if (loadingTitle) loadingTitle.textContent = "Logging In";
        if (loadingText) loadingText.textContent = "Logging in, please wait...";
        if (loadingOverlay) loadingOverlay.style.display = "flex";

        try {
            const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]")?.value || "";
            const response = await fetch("/api/verify-device-code/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken
                },
                body: JSON.stringify({
                    session_token: this.sessionToken,
                    code: code
                })
            });

            const data = await response.json();

            if (data.ok) {
                window.location.reload();
            } else {
                if (loadingOverlay) loadingOverlay.style.display = "none";
                if (authModal) {
                    authModal.classList.add("is-open");
                }
                if (this.errorHelp) {
                    this.errorHelp.style.color = "red";
                    this.errorHelp.textContent = data.message || "Invalid code.";
                }
                if (this.submitBtn) this.submitBtn.disabled = false;
            }
        } catch (err) {
            if (loadingOverlay) loadingOverlay.style.display = "none";
            if (authModal) {
                authModal.classList.add("is-open");
            }
            if (this.errorHelp) {
                this.errorHelp.style.color = "red";
                this.errorHelp.textContent = "Network error. Please try again.";
            }
            if (this.submitBtn) this.submitBtn.disabled = false;
        }
    }
}

// Instantiate globally
window.VerifyDevice = new VerifyDeviceController();
window.verifyDevice = window.VerifyDevice;