const authModalTitle = document.querySelector("#auth-modal .title-bar-text");
const registrationState = document.getElementById("registration-state");
const verifyEmailState = document.getElementById("verify-email-state");
const verifyEmailAddress = document.getElementById("verify-email-address");
const backToRegistrationButton = document.getElementById("back-to-registration-button");
const verificationHelp = document.getElementById("verify-email-help");

function showAuthState(stateName) {
    const isVerifyEmailState = stateName === "verify-email";

    if (registrationState) {
        registrationState.classList.toggle("is-active", !isVerifyEmailState);
    }

    if (verifyEmailState) {
        verifyEmailState.classList.toggle("is-active", isVerifyEmailState);
    }

    if (verificationHelp) {
        verificationHelp.classList.toggle("is-visible", isVerifyEmailState);
        verificationHelp.classList.toggle("is-info", isVerifyEmailState);
        verificationHelp.classList.remove("is-error");
    }

    if (authModalTitle) {
        authModalTitle.textContent = isVerifyEmailState
            ? "Verify Email"
            : "Registration / Sign In";
    }
}

if (backToRegistrationButton) {
    backToRegistrationButton.addEventListener("click", () => {
        showAuthState("registration");
    });
}

window.VerifyEmail = {
    show(email) {
        const displayEmail = email || "your email";

        if (verifyEmailAddress) {
            verifyEmailAddress.textContent = displayEmail;
        }

        showAuthState("verify-email");
    },
    showRegistration() {
        showAuthState("registration");
    }
};
