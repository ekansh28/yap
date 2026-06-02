const authModalTitle = document.querySelector("#auth-modal .title-bar-text");
const registrationState = document.getElementById("registration-state");
const verifyEmailState = document.getElementById("verify-email-state");
const verifyEmailAddress = document.getElementById("verify-email-address");
const backToRegistrationButton = document.getElementById("back-to-registration-button");
const verifyEmailButton = document.getElementById("verify-email-button");
const resendCodeButton = document.getElementById("resend-code-button");
const verificationCodeInputs = Array.from(document.querySelectorAll(".verification-code-input"));
const verificationCodeHelp = document.getElementById("verify-email-help");
const verificationCodeRequiredWarning = document.getElementById("verification-code-required-warning");
let shouldShowVerificationCodeError = false;
let resendCountdownSeconds = 60;
let resendCountdownTimer = null;

function showAuthState(stateName) {
    const isVerifyEmailState = stateName === "verify-email";

    if (registrationState) {
        registrationState.classList.toggle("is-active", !isVerifyEmailState);
    }

    if (verifyEmailState) {
        verifyEmailState.classList.toggle("is-active", isVerifyEmailState);
    }

    if (authModalTitle) {
        authModalTitle.textContent = isVerifyEmailState
            ? "Verify Email"
            : "Registration / Sign In";
    }
}

function setVerifyEmailHelp(message, isVisible, state = "info") {
    if (!verificationCodeHelp) return;
    verificationCodeHelp.textContent = message;
    verificationCodeHelp.classList.toggle("is-visible", isVisible);
    verificationCodeHelp.classList.toggle("is-error", state === "error");
    verificationCodeHelp.classList.toggle("is-info", state === "info");
}

function setVerificationWarning(isVisible) {
    if (!verificationCodeRequiredWarning) return;
    verificationCodeRequiredWarning.classList.toggle("is-visible", isVisible);
}

function shakeElement(element) {
    if (!element) return;
    element.classList.remove("is-shaking");
    void element.offsetWidth;
    element.classList.add("is-shaking");
}

function getVerificationCode() {
    return verificationCodeInputs.map((input) => input.value).join("");
}

function updateVerificationCodeHelp() {
    const verificationCode = getVerificationCode();
    const isIncomplete = verificationCode.length < 6;

    if (!isIncomplete) {
        shouldShowVerificationCodeError = false;
    }

    setVerificationWarning(isIncomplete && shouldShowVerificationCodeError);

    if (isIncomplete && shouldShowVerificationCodeError) {
        setVerifyEmailHelp("Please enter the 6-digit code", true, "error");
    } else {
        setVerifyEmailHelp("Please enter the 6-digit code", false, "info");
    }
}

function updateResendButton() {
    if (!resendCodeButton) return;

    if (resendCountdownSeconds > 0) {
        resendCodeButton.textContent = `Resend [${resendCountdownSeconds}s]`;
        resendCodeButton.disabled = true;
        resendCodeButton.classList.add("is-disabled");
    } else {
        resendCodeButton.textContent = "Resend";
        resendCodeButton.disabled = false;
        resendCodeButton.classList.remove("is-disabled");
    }
}

function startResendCountdown() {
    if (resendCountdownTimer) {
        clearInterval(resendCountdownTimer);
    }

    resendCountdownSeconds = 60;
    updateResendButton();

    resendCountdownTimer = setInterval(() => {
        resendCountdownSeconds -= 1;
        updateResendButton();

        if (resendCountdownSeconds <= 0) {
            clearInterval(resendCountdownTimer);
            resendCountdownTimer = null;
        }
    }, 1000);
}

verificationCodeInputs.forEach((input, index) => {
    input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, "").slice(0, 1);
        updateVerificationCodeHelp();

        if (input.value && verificationCodeInputs[index + 1]) {
            verificationCodeInputs[index + 1].focus();
        }
    });

    input.addEventListener("keydown", (event) => {
        if (event.key === "Backspace" && !input.value && verificationCodeInputs[index - 1]) {
            verificationCodeInputs[index - 1].focus();
        }
    });
});

if (backToRegistrationButton) {
    backToRegistrationButton.addEventListener("click", () => {
        showAuthState("registration");
    });
}

if (verifyEmailButton) {
    verifyEmailButton.addEventListener("click", () => {
        const isIncomplete = getVerificationCode().length < 6;

        if (!isIncomplete) {
            return;
        }

        shouldShowVerificationCodeError = true;
        updateVerificationCodeHelp();
        shakeElement(verificationCodeHelp);
        shakeElement(verificationCodeRequiredWarning);

        if (verificationCodeInputs[0]) {
            verificationCodeInputs[0].focus();
        }
    });
}

if (resendCodeButton) {
    resendCodeButton.addEventListener("click", () => {
        if (resendCountdownSeconds > 0) return;
        startResendCountdown();
    });
}

window.VerifyEmail = {
    show(email) {
        const displayEmail = email || "your email";

        if (verifyEmailAddress) {
            verifyEmailAddress.textContent = displayEmail;
        }

        showAuthState("verify-email");
        startResendCountdown();

        if (verificationCodeInputs[0]) {
            verificationCodeInputs[0].focus();
        }
    },
    showRegistration() {
        showAuthState("registration");
    }
};
