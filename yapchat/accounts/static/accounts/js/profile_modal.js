import {
    setFieldHelp,
    setRequiredWarning,
    shakeFieldHelp,
    shakeRequiredWarning,
    usernamePattern,
    usernameRequiredMessage,
    usernameRulesMessage,
    usernameLengthMessage,
    emailRequiredMessage,
    passwordRequiredMessage,
    passwordMessage,
    getCSRFToken
} from "./auth_modal.js?v=1";
import Notification from './Components/Notification/Notification.js';
// #region Elements
const profileButton = document.getElementById("profile-button");
const profileModal = document.getElementById("profile-modal");
const profileCloseButton = document.getElementById("profile-close-button");
const sidebarItems = document.querySelectorAll(".sidebar-item");
const editorPages = document.querySelectorAll(".editor-page");

// Username modal elements
const usernameModal = document.getElementById("username-modal");
const editUsernameButton = document.getElementById("edit-username-button");
const newUsernameInput = document.getElementById("new-username-input");
const usernamePasswordInput = document.getElementById("username-password-input");
const usernameCounter = document.getElementById("username-counter");
const usernameHelp = document.getElementById("username-help");
const newUsernameRequiredWarning = document.getElementById("new-username-required-warning");
const usernamePasswordRequiredWarning = document.getElementById("username-password-required-warning");
const usernameCancelButton = document.getElementById("username-cancel-button");
const usernameSaveButton = document.getElementById("username-save-button");

// Email modal elements
const emailModal = document.getElementById("email-modal");
const editEmailButton = document.getElementById("edit-email-button");
const newEmailInput = document.getElementById("new-email-input");
const emailPasswordInput = document.getElementById("email-password-input");
const emailHelp = document.getElementById("email-help");
const newEmailRequiredWarning = document.getElementById("new-email-required-warning");
const emailPasswordRequiredWarning = document.getElementById("email-password-required-warning");
const emailCancelButton = document.getElementById("email-cancel-button");
const emailSaveButton = document.getElementById("email-save-button");

// Password modal elements
const passwordModal = document.getElementById("password-modal");
const editPasswordButton = document.getElementById("edit-password-button");
const currentPasswordInput = document.getElementById("current-password-input");
const newPasswordInput = document.getElementById("new-password-input");
const confirmPasswordInput = document.getElementById("confirm-password-input");
const currentPasswordHelp = document.getElementById("current-password-help");
const newPasswordHelp = document.getElementById("new-password-help");
const confirmPasswordHelp = document.getElementById("confirm-password-help");
const currentPasswordRequiredWarning = document.getElementById("current-password-required-warning");
const newPasswordRequiredWarning = document.getElementById("new-password-required-warning");
const confirmPasswordRequiredWarning = document.getElementById("confirm-password-required-warning");
const passwordCancelButton = document.getElementById("password-cancel-button");
const passwordSaveButton = document.getElementById("password-save-button");

// Editor page elements
const displayNameInput = document.getElementById('display-name-input');
const displayNameCounter = document.getElementById('editor-display-name-counter');
const bioInput = document.getElementById('bio-input');
const bioTextCounter = document.getElementById('bio-text-counter');
// #endregion



// #region Validation States
let shouldShowUsernameErrors = false;
let shouldShowEmailErrors = false;
let shouldShowPasswordErrors = false;
// #endregion

// #region Common Modal Logic
function openModal(modal) {
    if (modal) {
        modal.style.display = "flex";
    }
}

function closeModal(modal) {
    if (modal) {
        modal.style.display = "none";
        clearValidation(modal);
    }
}

function clearValidation(modal) {
    if (modal === usernameModal) {
        shouldShowUsernameErrors = false;
        setFieldHelp(usernameHelp, "", false);
        setRequiredWarning(newUsernameRequiredWarning, false);
        setRequiredWarning(usernamePasswordRequiredWarning, false);
        
        // Reset values to original
        if (newUsernameInput) {
            newUsernameInput.value = newUsernameInput.defaultValue;
            // Update counter after reset
            if (usernameCounter) {
                usernameCounter.textContent = `${newUsernameInput.value.length}/32`;
            }
        }
        if (usernamePasswordInput) {
            usernamePasswordInput.value = "";
        }
    } else if (modal === emailModal) {
        shouldShowEmailErrors = false;
        setFieldHelp(emailHelp, "", false);
        setRequiredWarning(newEmailRequiredWarning, false);
        setRequiredWarning(emailPasswordRequiredWarning, false);
        
        // Reset values to original
        if (newEmailInput) {
            newEmailInput.value = newEmailInput.defaultValue;
        }
        if (emailPasswordInput) {
            emailPasswordInput.value = "";
        }
    } else if (modal === passwordModal) {
        shouldShowPasswordErrors = false;
        setFieldHelp(currentPasswordHelp, "", false);
        setFieldHelp(newPasswordHelp, passwordMessage, false);
        setFieldHelp(confirmPasswordHelp, "", false);
        setRequiredWarning(currentPasswordRequiredWarning, false);
        setRequiredWarning(newPasswordRequiredWarning, false);
        setRequiredWarning(confirmPasswordRequiredWarning, false);
        
        // Clear all password fields
        if (currentPasswordInput) currentPasswordInput.value = "";
        if (newPasswordInput) newPasswordInput.value = "";
        if (confirmPasswordInput) confirmPasswordInput.value = "";
    }
}

// Close modals on escape key
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeModal(usernameModal);
        closeModal(emailModal);
        closeModal(passwordModal);
        if (profileModal && profileModal.classList.contains("is-open")) {
            closeProfileModal();
        }
    }
});

// Close modals on outside click
[usernameModal, emailModal, passwordModal].forEach(modal => {
    if (modal) {
        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                closeModal(modal);
            }
        });
    }
});
// #endregion



// #region Username Validation
if (editUsernameButton) {
    editUsernameButton.addEventListener("click", () => openModal(usernameModal));
}

if (usernameCancelButton) {
    usernameCancelButton.addEventListener("click", () => closeModal(usernameModal));
}

if (newUsernameInput) {
    newUsernameInput.addEventListener("input", () => {
        if (usernameCounter) {
            usernameCounter.textContent = `${newUsernameInput.value.length}/32`;
        }
        updateUsernameValidation();
    });
    newUsernameInput.addEventListener("blur", updateUsernameValidation);
    
    // Initial counter value
    if (usernameCounter) {
        usernameCounter.textContent = `${newUsernameInput.value.length}/32`;
    }
}

if (usernamePasswordInput) {
    usernamePasswordInput.addEventListener("input", updateUsernameValidation);
    usernamePasswordInput.addEventListener("blur", updateUsernameValidation);
}

function updateUsernameValidation() {
    if (!newUsernameInput || !usernamePasswordInput) return;

    const username = newUsernameInput.value.trim();
    const password = usernamePasswordInput.value;
    const isUsernameEmpty = username.length === 0;
    const isPasswordEmpty = password.length === 0;
    const isTooShort = username.length > 0 && username.length < 3;
    const hasInvalidChars = !usernamePattern.test(username);

    // Warnings
    setRequiredWarning(newUsernameRequiredWarning, isUsernameEmpty && shouldShowUsernameErrors);
    setRequiredWarning(usernamePasswordRequiredWarning, isPasswordEmpty && shouldShowUsernameErrors);

    // Help Text
    if (isUsernameEmpty && shouldShowUsernameErrors) {
        setFieldHelp(usernameHelp, usernameRequiredMessage, true, "error");
    } else if (isTooShort && shouldShowUsernameErrors) {
        setFieldHelp(usernameHelp, usernameLengthMessage, true, "error");
    } else if (hasInvalidChars) {
        setFieldHelp(usernameHelp, usernameRulesMessage, true, "error");
    } else if (document.activeElement === newUsernameInput) {
        setFieldHelp(usernameHelp, usernameRulesMessage, true, "info");
    } else {
        setFieldHelp(usernameHelp, "", false);
    }
}

if (usernameSaveButton) {
    usernameSaveButton.addEventListener("click", async () => {
        const username = newUsernameInput.value.trim();
        const password = usernamePasswordInput.value;
        const isUsernameEmpty = username.length === 0;
        const isPasswordEmpty = password.length === 0;
        const isTooShort = username.length > 0 && username.length < 3;
        const hasInvalidChars = !usernamePattern.test(username);
        if (isUsernameEmpty || isPasswordEmpty || isTooShort || hasInvalidChars) {
            shouldShowUsernameErrors = true;
            updateUsernameValidation();
            
            if (isUsernameEmpty) {
                shakeRequiredWarning(newUsernameRequiredWarning);
                shakeFieldHelp(usernameHelp);
                newUsernameInput.focus();
            } else if (isTooShort || hasInvalidCharacters) {
                shakeFieldHelp(usernameHelp);
                newUsernameInput.focus();
            } else if (isPasswordEmpty) {
                shakeRequiredWarning(usernamePasswordRequiredWarning);
                usernamePasswordInput.focus();
            }
            return;
        }

        // get csrf token helper
        const csrfToken = getCSRFToken();
        // Prepare the data
        const payload = {
            username: newUsernameInput.value.trim(),
            password: usernamePasswordInput.value
        };
        try{
            // Sending to the new URL
            const response = await fetch('/api/profile/change_username/',{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken':  csrfToken
                },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if(data.ok){
                // Handle Success
                closeModal(usernameModal);
                document.getElementById('username-input').value = payload.username;
                Notification.success('Username Changed')
            } else {
                Notification.error(`${data.message}`)
            }
        } catch (error){
            Notification.error(`Connection Error : ${error}`)
        }
        
        
    });
}
// #endregion

// #region Email Validation
if (editEmailButton) {
    editEmailButton.addEventListener("click", () => openModal(emailModal));
}

if (emailCancelButton) {
    emailCancelButton.addEventListener("click", () => closeModal(emailModal));
}

if (newEmailInput) {
    newEmailInput.addEventListener("input", updateEmailValidation);
    newEmailInput.addEventListener("blur", updateEmailValidation);
}

if (emailPasswordInput) {
    emailPasswordInput.addEventListener("input", updateEmailValidation);
    emailPasswordInput.addEventListener("blur", updateEmailValidation);
}

function updateEmailValidation() {
    if (!newEmailInput || !emailPasswordInput) return;

    const email = newEmailInput.value.trim();
    const password = emailPasswordInput.value;
    const isEmailEmpty = email.length === 0;
    const isPasswordEmpty = password.length === 0;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isInvalidEmail = email.length > 0 && !emailPattern.test(email);

    setRequiredWarning(newEmailRequiredWarning, isEmailEmpty && shouldShowEmailErrors);
    setRequiredWarning(emailPasswordRequiredWarning, isPasswordEmpty && shouldShowEmailErrors);

    if (isEmailEmpty && shouldShowEmailErrors) {
        setFieldHelp(emailHelp, emailRequiredMessage, true, "error");
    } else if (isInvalidEmail && shouldShowEmailErrors) {
        setFieldHelp(emailHelp, "Please enter a valid email address", true, "error");
    } else {
        setFieldHelp(emailHelp, "", false);
    }
}

if (emailSaveButton) {
    emailSaveButton.addEventListener("click", () => {
        const email = newEmailInput.value.trim();
        const password = emailPasswordInput.value;
        const isEmailEmpty = email.length === 0;
        const isPasswordEmpty = password.length === 0;
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isInvalidEmail = email.length > 0 && !emailPattern.test(email);

        if (isEmailEmpty || isPasswordEmpty || isInvalidEmail) {
            shouldShowEmailErrors = true;
            updateEmailValidation();

            if (isEmailEmpty || isInvalidEmail) {
                if (isEmailEmpty) shakeRequiredWarning(newEmailRequiredWarning);
                shakeFieldHelp(emailHelp);
                newEmailInput.focus();
            } else if (isPasswordEmpty) {
                shakeRequiredWarning(emailPasswordRequiredWarning);
                emailPasswordInput.focus();
            }
            return;
        }

        closeModal(emailModal);
    });
}
// #endregion

// #region Password Validation
if (editPasswordButton) {
    editPasswordButton.addEventListener("click", () => openModal(passwordModal));
}

if (passwordCancelButton) {
    passwordCancelButton.addEventListener("click", () => closeModal(passwordModal));
}

[currentPasswordInput, newPasswordInput, confirmPasswordInput].forEach(input => {
    if (input) {
        input.addEventListener("input", updatePasswordValidation);
        input.addEventListener("blur", updatePasswordValidation);
    }
});

function updatePasswordValidation() {
    if (!currentPasswordInput || !newPasswordInput || !confirmPasswordInput) return;

    const currentPw = currentPasswordInput.value;
    const newPw = newPasswordInput.value;
    const confirmPw = confirmPasswordInput.value;

    const isCurrentEmpty = currentPw.length === 0;
    const isNewEmpty = newPw.length === 0;
    const isConfirmEmpty = confirmPw.length === 0;
    const isNewTooShort = newPw.length > 0 && newPw.length < 8;
    const isMismatch = confirmPw.length > 0 && newPw !== confirmPw;

    setRequiredWarning(currentPasswordRequiredWarning, isCurrentEmpty && shouldShowPasswordErrors);
    setRequiredWarning(newPasswordRequiredWarning, isNewEmpty && shouldShowPasswordErrors);
    setRequiredWarning(confirmPasswordRequiredWarning, isConfirmEmpty && shouldShowPasswordErrors);

    // Current Password Help
    if (isCurrentEmpty && shouldShowPasswordErrors) {
        setFieldHelp(currentPasswordHelp, "Current password is required", true, "error");
    } else {
        setFieldHelp(currentPasswordHelp, "", false);
    }

    // New Password Help
    if (isNewEmpty && shouldShowPasswordErrors) {
        setFieldHelp(newPasswordHelp, "New password is required", true, "error");
    } else if (isNewTooShort) {
        setFieldHelp(newPasswordHelp, passwordMessage, true, "error");
    } else if (document.activeElement === newPasswordInput) {
        setFieldHelp(newPasswordHelp, passwordMessage, true, "info");
    } else {
        setFieldHelp(newPasswordHelp, "", false);
    }

    // Confirm Password Help
    if (isConfirmEmpty && shouldShowPasswordErrors) {
        setFieldHelp(confirmPasswordHelp, "Please confirm your new password", true, "error");
    } else if (isMismatch) {
        setFieldHelp(confirmPasswordHelp, "Passwords do not match", true, "error");
    } else {
        setFieldHelp(confirmPasswordHelp, "", false);
    }
}

if (passwordSaveButton) {
    passwordSaveButton.addEventListener("click", () => {
        const isCurrentEmpty = currentPasswordInput.value.length === 0;
        const isNewEmpty = newPasswordInput.value.length === 0;
        const isConfirmEmpty = confirmPasswordInput.value.length === 0;
        const isNewTooShort = newPasswordInput.value.length < 8;
        const isMismatch = newPasswordInput.value !== confirmPasswordInput.value;

        if (isCurrentEmpty || isNewEmpty || isConfirmEmpty || isNewTooShort || isMismatch) {
            shouldShowPasswordErrors = true;
            updatePasswordValidation();

            if (isCurrentEmpty) {
                shakeRequiredWarning(currentPasswordRequiredWarning);
                shakeFieldHelp(currentPasswordHelp);
                currentPasswordInput.focus();
            } else if (isNewEmpty || isNewTooShort) {
                shakeRequiredWarning(newPasswordRequiredWarning);
                shakeFieldHelp(newPasswordHelp);
                newPasswordInput.focus();
            } else if (isConfirmEmpty || isMismatch) {
                shakeRequiredWarning(confirmPasswordRequiredWarning);
                shakeFieldHelp(confirmPasswordHelp);
                confirmPasswordInput.focus();
            }
            return;
        }

        closeModal(passwordModal);
    });
}
// #endregion

// #region Editor Page Features
if (displayNameInput && displayNameCounter) {
    const updateDisplayNameCounter = () => {
        displayNameCounter.textContent = `${displayNameInput.value.length}/32`;
    };
    displayNameInput.addEventListener("input", updateDisplayNameCounter);
    // Initial count for pre-filled values
    updateDisplayNameCounter();
}

if (bioInput && bioTextCounter) {
    const updateBioCounter = () => {
        bioTextCounter.textContent = `${bioInput.value.length}/200`;
    };
    bioInput.addEventListener("input", updateBioCounter);
    // Initial count for pre-filled values
    updateBioCounter();
}
// #endregion

// #region Profile Modal Open/Close
function openProfileModal() {
    if (profileModal) profileModal.classList.add("is-open");
}

function closeProfileModal() {
    if (profileModal) profileModal.classList.remove("is-open");
}

if (profileButton && profileCloseButton) {
    profileButton.addEventListener("click", openProfileModal);
    profileCloseButton.addEventListener("click", closeProfileModal);

    if (profileModal) {
        profileModal.addEventListener("click", (event) => {
            if (event.target === profileModal) {
                closeProfileModal();
            }
        });
    }
}
// #endregion

// #region Sidebar Switching
sidebarItems.forEach((item) => {
    item.addEventListener("click", () => {
        sidebarItems.forEach((button) => button.classList.remove("active"));
        editorPages.forEach((page) => page.classList.remove("active"));

        item.classList.add("active");
        const tab = item.dataset.tab;
        const targetPage = document.getElementById(`editor-${tab}`);
        if (targetPage) {
            targetPage.classList.add("active");
        }
    });
});
// #endregion
