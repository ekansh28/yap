import Notification from './Components/Notification/Notification.js?v=2';
import './profile_media.js?v=26';

// Self-contained helpers
export function setFieldHelp(helpElement, message, isVisible, state = "info") {
    if (!helpElement) return;
    helpElement.textContent = message;
    helpElement.classList.toggle("is-visible", isVisible);
    helpElement.classList.toggle("is-error", state === "error");
    helpElement.classList.toggle("is-info", state === "info");
}

export function setRequiredWarning(warningElement, isVisible) {
    if (!warningElement) return;
    warningElement.classList.toggle("is-visible", isVisible);
}

export function shakeFieldHelp(helpElement) {
    if (!helpElement) return;
    helpElement.classList.remove("is-shaking");
    void helpElement.offsetWidth;
    helpElement.classList.add("is-shaking");
}

export function shakeRequiredWarning(warningElement) {
    if (!warningElement) return;
    warningElement.classList.remove("is-shaking");
    void warningElement.offsetWidth;
    warningElement.classList.add("is-shaking");
}

export function getCSRFToken() {
    const cookieName = "csrftoken=";
    const cookies = document.cookie ? document.cookie.split(";") : [];
    for (const cookie of cookies) {
        const trimmedCookie = cookie.trim();
        if (trimmedCookie.startsWith(cookieName)) {
            return decodeURIComponent(trimmedCookie.slice(cookieName.length));
        }
    }
    return "";
}

export const usernamePattern = /^[A-Za-z0-9_.]*$/;
export const usernameRequiredMessage = "Please enter your username";
export const usernameRulesMessage = "Please use only numbers, letters, underscores _ or periods.";
export const usernameLengthMessage = "Username must be 3-32 characters";
export const emailRequiredMessage = "Please enter your email";
export const passwordRequiredMessage = "Please enter your password";
export const passwordMessage = "Password must be at least 8 characters";

// Read server-provided user meta (never from editable inputs)
function getUserMeta() {
    try {
        const el = document.getElementById('user-meta');
        return el ? JSON.parse(el.textContent) : {};
    } catch {
        return {};
    }
}

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
const emailPendingBadge = document.getElementById("email-pending-badge");
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

// Delete Account Elements
const deleteAccountModal = document.getElementById("delete-account-modal");
const deleteAccountButton = document.getElementById("delete-account-button");
const deleteCancelButton = document.getElementById("delete-cancel-button");
const deleteConfirmButton = document.getElementById("delete-confirm-button");
const deletePasswordInput = document.getElementById("delete-password-input");
const deleteAccountHelp = document.getElementById("delete-account-help");

// Editor page elements (scoped inside profileModal to avoid auth modal collisions)
const displayNameInput = profileModal ? profileModal.querySelector('#display-name-input') : document.getElementById('display-name-input');
const displayNameCounter = profileModal ? profileModal.querySelector('#editor-display-name-counter') : document.getElementById('editor-display-name-counter');
const pronounsInput = profileModal ? profileModal.querySelector('#pronouns-input') : document.getElementById('pronouns-input');
const pronounsCounter = profileModal ? profileModal.querySelector('#editor-pronouns-counter') : document.getElementById('editor-pronouns-counter');
const bioInput = profileModal ? profileModal.querySelector('#bio-input') : document.getElementById('bio-input');
const bioTextCounter = profileModal ? profileModal.querySelector('#bio-text-counter') : document.getElementById('bio-text-counter');

// Decoration modal elements
const changeDecorationButton = document.getElementById("change-decoration-button");
const decorationModal = document.getElementById("decoration-modal");
const decorationCloseButton = document.getElementById("decoration-close-button");
const decorationCancelButton = document.getElementById("decoration-cancel-button");
const decorationDoneButton = document.getElementById("decoration-done-button");
const decorationRemoveButton = document.getElementById("decoration-remove-button");
const decorationGrid = document.getElementById("decoration-grid");
const decorationCountText = document.getElementById("decoration-count-text");
const decorationTabs = document.querySelectorAll(".decoration-tab");

// #endregion

let originalUsername = '';
let originalEmail = '';

// #region Validation States
let shouldShowUsernameErrors = false;
let shouldShowEmailErrors = false;
let shouldShowPasswordErrors = false;
// #endregion

// #region Common Modal Logic
function openModal(modal) {
    if (modal) {
        modal.style.display = "flex";
        // Timeout to allow display change to register before adding class
        setTimeout(() => {
            modal.classList.add("is-opening");
        }, 10);

        if (modal === usernameModal) {
            originalUsername = getUserMeta().username || '';
            updateUsernameValidation();
        } else if (modal === emailModal) {
            originalEmail = getUserMeta().email || '';
            updateEmailValidation();
        } else if (modal === passwordModal) {
            updatePasswordValidation();
        }
    }
}

function closeModal(modal) {
    if (modal) {
        modal.classList.remove("is-opening");

        let transitionEnded = false;

        function onTransitionEnd(event) {
            // Make sure we are listening for the right transition
            if (event.propertyName !== 'opacity' || transitionEnded) return;

            transitionEnded = true;
            modal.removeEventListener('transitionend', onTransitionEnd);
            modal.style.display = "none";
            clearValidation(modal);
        }

        modal.addEventListener('transitionend', onTransitionEnd);

        // Fallback in case transitionend doesn't fire
        setTimeout(() => {
            if (!transitionEnded) {
                onTransitionEnd({ propertyName: 'opacity' }); // Simulate the event
            }
        }, 300); // Should be slightly longer than the transition duration (0.2s)
    }
}


function clearValidation(modal) {
    if (modal === usernameModal) {
        shouldShowUsernameErrors = false;
        setFieldHelp(usernameHelp, "", false);
        setRequiredWarning(newUsernameRequiredWarning, false);
        setRequiredWarning(usernamePasswordRequiredWarning, false);

        if (newUsernameInput) {
            newUsernameInput.value = "";
            if (usernameCounter) {
                usernameCounter.textContent = `0/32`;
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

        if (newEmailInput) {
            newEmailInput.value = "";
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

        if (currentPasswordInput) currentPasswordInput.value = "";
        if (newPasswordInput) newPasswordInput.value = "";
        if (confirmPasswordInput) confirmPasswordInput.value = "";
    } else if (modal === deleteAccountModal) {
        if (deletePasswordInput) deletePasswordInput.value = "";
        if (deleteAccountHelp) setFieldHelp(deleteAccountHelp, "", false);
    }
}
function setButtonLoading(button, isLoading) {
    if (!button) return;

    const originalContent = button.dataset.originalHTML;

    if (isLoading) {
        if (!originalContent) {
            button.dataset.originalHTML = button.innerHTML;
        }
        button.disabled = true;
        button.innerHTML = '<img src="/static/accounts/images/loading-spinner.gif" alt="Loading..." style="height: 14px; vertical-align: middle;">';
    } else {
        if (originalContent) {
            button.innerHTML = originalContent;
            delete button.dataset.originalHTML;
        }
        button.disabled = false;
    }
}
// Close modals on escape key
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeModal(usernameModal);
        closeModal(emailModal);
        closeModal(passwordModal);
        closeModal(deleteAccountModal);
        closeModal(decorationModal);
        if (profileModal && profileModal.classList.contains("is-open")) {
            closeProfileModal();
        }
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
        usernameCounter.textContent = `0/32`;
    }
}

if (usernamePasswordInput) {
    usernamePasswordInput.addEventListener("input", updateUsernameValidation);
    usernamePasswordInput.addEventListener("blur", updateUsernameValidation);
}

function updateUsernameValidation() {
    if (!newUsernameInput || !usernamePasswordInput) return;

    const username = newUsernameInput.value.trim();
    const isUnchanged = username === originalUsername;
    usernameSaveButton.disabled = isUnchanged;

    const password = usernamePasswordInput.value;
    const isUsernameEmpty = username.length === 0;
    const isTooShort = username.length > 0 && username.length < 3;
    const hasInvalidChars = !usernamePattern.test(username);

    // Warnings
    setRequiredWarning(newUsernameRequiredWarning, isUsernameEmpty && shouldShowUsernameErrors);
    setRequiredWarning(usernamePasswordRequiredWarning, password.length === 0 && shouldShowUsernameErrors);

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
            } else if (isTooShort || hasInvalidChars) {
                shakeFieldHelp(usernameHelp);
                newUsernameInput.focus();
            } else if (isPasswordEmpty) {
                shakeRequiredWarning(usernamePasswordRequiredWarning);
                usernamePasswordInput.focus();
            }
            return;
        }

        const csrfToken = getCSRFToken();
        const payload = {
            username: newUsernameInput.value.trim(),
            password: usernamePasswordInput.value
        };

        setButtonLoading(usernameSaveButton, true);

        try {
            const response = await fetch('/api/profile/change_username/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (data.ok) {
                closeModal(usernameModal);
                document.getElementById('username-input').value = payload.username;
                Notification.success('Username Changed')
            } else {
                Notification.error(`${data.message}`)
            }
        } catch (error) {
            Notification.error(`Connection Error : ${error}`)
        } finally {
            setButtonLoading(usernameSaveButton, false);
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
    const isUnchanged = email === originalEmail;
    emailSaveButton.disabled = isUnchanged;

    const password = emailPasswordInput.value;
    const isEmailEmpty = email.length === 0;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isInvalidEmail = email.length > 0 && !emailPattern.test(email);

    setRequiredWarning(newEmailRequiredWarning, isEmailEmpty && shouldShowEmailErrors);
    setRequiredWarning(emailPasswordRequiredWarning, password.length === 0 && shouldShowEmailErrors);

    if (isEmailEmpty && shouldShowEmailErrors) {
        setFieldHelp(emailHelp, emailRequiredMessage, true, "error");
    } else if (isInvalidEmail && shouldShowEmailErrors) {
        setFieldHelp(emailHelp, "Please enter a valid email address", true, "error");
    } else {
        setFieldHelp(emailHelp, "", false);
    }
}

if (emailSaveButton) {
    emailSaveButton.addEventListener("click", async () => {
        const email = newEmailInput.value.trim();
        const password = emailPasswordInput.value;
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isInvalidEmail = email.length > 0 && !emailPattern.test(email);
        const isEmailEmpty = email.length === 0;
        const isPasswordEmpty = password.length === 0;

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
        setButtonLoading(emailSaveButton, true);
        try {
            const response = await fetch('/api/profile/change_email/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({ email: email, password: password })
            });
            const data = await response.json();
            if (data.ok) {
                closeModal(emailModal);
                if (data.message === 'This email is already verified.') {
                    Notification.success('This email is already verified.');
                } else {
                    const mainEmailInput = document.getElementById('email-input');
                    if (mainEmailInput) mainEmailInput.value = email;
                    if (emailPendingBadge) {
                        emailPendingBadge.style.display = 'inline-block';
                    }
                    Notification.info("Check your email for verification", { duration: 0 });
                }
            } else {
                Notification.warning(data.message || "Failed to update email", { duration: 0 })
            }
        } catch (error) {
            Notification.error(`Connection Error: ${error}`, { duration: 0 })
        } finally {
            setButtonLoading(emailSaveButton, false);
        }
    });
}
// #endregion


// #region Email Verify button
const emailVerifyButton = document.getElementById("verify-email-button");
if (emailVerifyButton){
    emailVerifyButton.addEventListener("click", async () =>{
        // Start loading spinner on button
        setButtonLoading(emailVerifyButton, true);

        try {
            // Make POST Request to backend to send email
            const response = await fetch('/api/profile/resend_verification/', {
                method: 'POST',
                headers: {
                    'Content-Type' : 'application/json',
                    'X-CSRFToken' : getCSRFToken() // Required for DJANGO POST Requests!
                },
            });
            const data = await response.json();

            // handling response
            if (data.ok) {
                Notification.success("Verification email sent! Check your inbox/spam folder.");
            } else {
                Notification.error(data.message || "Failed to send your email.");
            }
        } catch (error) {
            Notification.error("Connection Error: Could not send email.");
        } finally {
            setButtonLoading(emailVerifyButton. false);
        }
    });
}

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

    const newPw = newPasswordInput.value;
    const confirmPw = confirmPasswordInput.value;

    const isNewEmpty = newPw.length === 0;
    const isConfirmEmpty = confirmPw.length === 0;

    passwordSaveButton.disabled = isNewEmpty && isConfirmEmpty;

    const currentPw = currentPasswordInput.value;
    const isCurrentEmpty = currentPw.length === 0;
    const isNewTooShort = newPw.length > 0 && newPw.length < 8;
    const isMismatch = confirmPw.length > 0 && newPw !== confirmPw;
    const isSameAsCurrent = newPw.length > 0 && newPw === currentPw;

    setRequiredWarning(currentPasswordRequiredWarning, isCurrentEmpty && shouldShowPasswordErrors);
    setRequiredWarning(newPasswordRequiredWarning, isNewEmpty && shouldShowPasswordErrors);
    setRequiredWarning(confirmPasswordRequiredWarning, isConfirmEmpty && shouldShowPasswordErrors);

    if (isCurrentEmpty && shouldShowPasswordErrors) {
        setFieldHelp(currentPasswordHelp, "Current password is required", true, "error");
    } else {
        setFieldHelp(currentPasswordHelp, "", false);
    }

    if (isNewEmpty && shouldShowPasswordErrors) {
        setFieldHelp(newPasswordHelp, "New password is required", true, "error");
    } else if (isNewTooShort) {
        setFieldHelp(newPasswordHelp, passwordMessage, true, "error");
    } else if (isSameAsCurrent) {
        setFieldHelp(newPasswordHelp, "New password cannot be the same as the current one.", true, "error");
    } else if (document.activeElement === newPasswordInput) {
        setFieldHelp(newPasswordHelp, passwordMessage, true, "info");
    } else {
        setFieldHelp(newPasswordHelp, "", false);
    }

    if (isConfirmEmpty && shouldShowPasswordErrors) {
        setFieldHelp(confirmPasswordHelp, "Please confirm your new password", true, "error");
    } else if (isMismatch) {
        setFieldHelp(confirmPasswordHelp, "Passwords do not match", true, "error");
    } else {
        setFieldHelp(confirmPasswordHelp, "", false);
    }
}

if (passwordSaveButton) {
    // Replace the existing click listener with this one
    passwordSaveButton.addEventListener("click", async () => {
        // 1. Get the values from all three password fields
        const currentPw = currentPasswordInput.value;
        const newPw = newPasswordInput.value;
        const confirmPw = confirmPasswordInput.value;

        // 2. Perform client-side validation first
        const isCurrentEmpty = currentPw.length === 0;
        const isNewEmpty = newPw.length === 0;
        const isConfirmEmpty = confirmPw.length === 0;
        const isNewTooShort = newPw.length > 0 && newPw.length < 8;
        const isMismatch = newPw !== confirmPw;
        const isSameAsCurrent = newPw.length > 0 && newPw === currentPw;

        // 3. If any validation fails, show errors and stop
        if (isCurrentEmpty || isNewEmpty || isConfirmEmpty || isNewTooShort || isMismatch || isSameAsCurrent) {
            shouldShowPasswordErrors = true;
            updatePasswordValidation(); // This function will display the appropriate error messages

            // Focus the first field with an error to guide the user
            if (isCurrentEmpty) {
                currentPasswordInput.focus();
            } else if (isNewEmpty || isNewTooShort || isSameAsCurrent) {
                newPasswordInput.focus();
            } else if (isConfirmEmpty || isMismatch) {
                confirmPasswordInput.focus();
            }
            return; // Stop the function here
        }

        // 4. If client-side validation passes, prepare data for the server
        const payload = {
            current_password: currentPw,
            new_password: newPw,
            confirm_password: confirmPw,
        };

        // 5. Show loading spinner and disable the button
        setButtonLoading(passwordSaveButton, true);

        try {
            // 6. Send the data to the backend API endpoint
            const response = await fetch('/api/profile/change_password/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken(),
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            // 7. Handle the server's response
            if (data.ok) {
                // On success, close the modal and show a success notification
                closeModal(passwordModal);
                Notification.success(data.message || 'Password changed successfully!');
            } else {
                // On failure, display the error message from the server
                Notification.error(data.message || 'Failed to change password.');
            }
        } catch (error) {
            // Handle network errors
            Notification.error('A connection error occurred.');
        } finally {
            // 8. Re-enable the button and remove the spinner
            setButtonLoading(passwordSaveButton, false);
        }
    });
}
// #endregion

// #region Delete Account
if (deleteAccountButton) {
    deleteAccountButton.addEventListener("click", () => openModal(deleteAccountModal));
}
if (deleteCancelButton) {
    deleteCancelButton.addEventListener("click", () => closeModal(deleteAccountModal));
}
if (deleteConfirmButton) {
    deleteConfirmButton.addEventListener("click", async () => {
        const password = deletePasswordInput.value;
        if (!password) {
            setFieldHelp(deleteAccountHelp, "Password is required.", true, "error");
            shakeFieldHelp(deleteAccountHelp);
            return;
        }

        setButtonLoading(deleteConfirmButton, true);

        try {
            const response = await fetch('/api/profile/delete_account/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken(),
                },
                body: JSON.stringify({ password: password }),
            });

            const data = await response.json();

            if (data.ok) {
                closeModal(deleteAccountModal);
                Notification.success("Account deleted successfully.");
                window.location.href = "/";
            } else {
                setFieldHelp(deleteAccountHelp, data.message, true, "error");
                shakeFieldHelp(deleteAccountHelp);
            }
        } catch (error) {
            setFieldHelp(deleteAccountHelp, "An unexpected error occurred.", true, "error");
        } finally {
            setButtonLoading(deleteConfirmButton, false);
        }
    });
}
// #endregion

// #region Editor Input Live Preview Sync
function updateDisplayNameLive() {
    if (!displayNameInput) return;
    if (displayNameCounter) {
        displayNameCounter.textContent = `${displayNameInput.value.length}/32`;
    }
    const previewDisplayName = document.getElementById('profile-preview-display-name');
    if (previewDisplayName) {
        previewDisplayName.textContent = displayNameInput.value.trim() || getUserMeta().username || 'Anonymous';
    }
}

function updateBioLive() {
    if (!bioInput) return;
    if (bioTextCounter) {
        bioTextCounter.textContent = `${bioInput.value.length}/200`;
    }
    const previewBio = document.getElementById('profile-preview-bio');
    if (previewBio) {
        previewBio.textContent = bioInput.value;
    }
}

function updatePronounsLive() {
    if (!pronounsInput) return;
    if (pronounsCounter) {
        pronounsCounter.textContent = `${pronounsInput.value.length}/32`;
    }
    const previewPronouns = document.getElementById('profile-preview-pronouns');
    if (previewPronouns) {
        const val = pronounsInput.value.trim();
        previewPronouns.textContent = val;
        previewPronouns.style.display = val ? 'inline-block' : 'none';
    }
}

if (displayNameInput) {
    displayNameInput.addEventListener("input", updateDisplayNameLive);
    displayNameInput.addEventListener("keyup", updateDisplayNameLive);
    displayNameInput.addEventListener("change", updateDisplayNameLive);
    updateDisplayNameLive();
}

if (pronounsInput) {
    pronounsInput.addEventListener("input", updatePronounsLive);
    pronounsInput.addEventListener("keyup", updatePronounsLive);
    pronounsInput.addEventListener("change", updatePronounsLive);
    updatePronounsLive();
}

if (bioInput) {
    bioInput.addEventListener("input", updateBioLive);
    bioInput.addEventListener("keyup", updateBioLive);
    bioInput.addEventListener("change", updateBioLive);
    updateBioLive();
}
// #endregion

// #region Profile Save Bar & Media Staging
const profileSaveBar = document.getElementById("profile-save-bar");
const profileResetButton = document.getElementById('profile-reset-button');
const profileSaveButton = document.getElementById('profile-save-button');
const removeAvatarButton = document.getElementById('remove-avatar-button');
const removeBannerButton = document.getElementById('remove-banner-button');

// Staged Media state
let stagedAvatarData = null;
let stagedBannerData = null;
let removeAvatar = false;
let removeBanner = false;
let originalAvatarUrl = '';
let originalBannerUrl = '';

function getOriginalBannerUrl() {
    const previewBanner = document.getElementById('profile-preview-banner');
    if (!previewBanner) return '';
    const bg = previewBanner.style.backgroundImage;
    if (bg && bg.startsWith('url(')) {
        return bg.slice(4, -1).replace(/["']/g, '');
    }
    return '';
}

// Listen for cropped images from profile_media.js
window.addEventListener('profile:imageCropped', (e) => {
    const { mode, dataUrl, payloadData } = e.detail;

    if (mode === 'avatar') {
        stagedAvatarData = payloadData !== undefined ? payloadData : dataUrl;
        removeAvatar = false;
        const previewAvatar = document.getElementById('profile-preview-avatar');
        if (previewAvatar) {
            previewAvatar.src = dataUrl;
        }
    } else if (mode === 'banner') {
        stagedBannerData = payloadData !== undefined ? payloadData : dataUrl;
        removeBanner = false;
        const previewBanner = document.getElementById('profile-preview-banner');
        if (previewBanner) {
            previewBanner.style.backgroundImage = `url('${dataUrl}')`;
            previewBanner.style.backgroundSize = 'cover';
            previewBanner.style.backgroundPosition = 'center';
        }
    }

    updateSaveBarVisibility();
});

// Remove Avatar Button
removeAvatarButton?.addEventListener('click', () => {
    removeAvatar = true;
    stagedAvatarData = null;
    const previewAvatar = document.getElementById('profile-preview-avatar');
    if (previewAvatar) {
        previewAvatar.src = '/static/image/default-avatar.png';
    }
    updateSaveBarVisibility();
});

// Remove Banner Button
removeBannerButton?.addEventListener('click', () => {
    removeBanner = true;
    stagedBannerData = null;
    const previewBanner = document.getElementById('profile-preview-banner');
    if (previewBanner) {
        previewBanner.style.backgroundImage = '';
    }
    updateSaveBarVisibility();
});

// Avatar Decorations Catalog
let DECORATIONS = [
    // SQUARE DECORATIONS
    { id: "square/sparkles_heart.gif", name: "Sparkles Heart", shape: "square", animated: true, url: "/static/accounts/decorations/square/sparkles_heart.gif", scale: 0.9 },
    { id: "square/floral.png", name: "Floral", shape: "square", animated: false, url: "/static/accounts/decorations/square/floral.png" },
    { id: "square/emerald.gif", name: "Emerald", shape: "square", animated: true, url: "/static/accounts/decorations/square/emerald.gif" },
    { id: "square/stars.gif", name: "Stars", shape: "square", animated: true, url: "/static/accounts/decorations/square/stars.gif" },
    { id: "square/barbs.png", name: "Barbs", shape: "square", animated: false, url: "/static/accounts/decorations/square/barbs.png" },
    { id: "square/blood.png", name: "Blood", shape: "square", animated: false, url: "/static/accounts/decorations/square/blood.png" },
    { id: "square/bones.png", name: "Bones", shape: "square", animated: false, url: "/static/accounts/decorations/square/bones.png" },
    { id: "square/brains.png", name: "Brains", shape: "square", animated: false, url: "/static/accounts/decorations/square/brains.png" },
    { id: "square/bubble_star.gif", name: "Bubble Star", shape: "square", animated: true, url: "/static/accounts/decorations/square/bubble_star.gif" },
    { id: "square/glitter.gif", name: "Glitter", shape: "square", animated: true, url: "/static/accounts/decorations/square/glitter.gif" },
    { id: "square/glitters_2.gif", name: "Glitters II", shape: "square", animated: true, url: "/static/accounts/decorations/square/glitters_2.gif", scale: 0.87 },
    { id: "square/jewels.gif", name: "Jewels", shape: "square", animated: true, url: "/static/accounts/decorations/square/jewels.gif" },
    { id: "square/royal.png", name: "Royal", shape: "square", animated: false, url: "/static/accounts/decorations/square/royal.png" },
    { id: "square/royal_2.gif", name: "Royal II", shape: "square", animated: true, url: "/static/accounts/decorations/square/royal_2.gif" },
    { id: "square/thorns.png", name: "Thorns", shape: "square", animated: false, url: "/static/accounts/decorations/square/thorns.png" },
    { id: "square/glittery.gif", name: "Glittery", shape: "square", animated: true, url: "/static/accounts/decorations/square/glittery.gif" },
    { id: "square/king.png", name: "King", shape: "square", animated: false, url: "/static/accounts/decorations/square/king.png" },
    { id: "square/rainbow.gif", name: "Rainbow", shape: "square", animated: true, url: "/static/accounts/decorations/square/rainbow.gif" },
    { id: "square/teeth.png", name: "Teeth", shape: "square", animated: false, url: "/static/accounts/decorations/square/teeth.png" },
    { id: "square/royal_blood.png", name: "Royal Blood", shape: "square", animated: false, url: "/static/accounts/decorations/square/royal_blood.png" },
    { id: "square/barbed.png", name: "Barbed", shape: "square", animated: false, url: "/static/accounts/decorations/square/barbed.png" },

    // ROUND DECORATIONS
    { id: "round/horns.png", name: "Horns", shape: "round", animated: false, url: "/static/accounts/decorations/round/horns.png?v=2" },
    { id: "round/coquette.png", name: "Coquette", shape: "round", animated: false, url: "/static/accounts/decorations/round/coquette.png" },
    { id: "round/flowers.png", name: "Flowers", shape: "round", animated: false, url: "/static/accounts/decorations/round/flowers.png" },
    { id: "round/nyan_cat.png", name: "Nyan Cat", shape: "round", animated: false, url: "/static/accounts/decorations/round/nyan_cat.png" },
    { id: "round/polka_dot.png", name: "Polka Dot", shape: "round", animated: false, url: "/static/accounts/decorations/round/polka_dot.png" },
    { id: "round/tides.png", name: "Tides", shape: "round", animated: false, url: "/static/accounts/decorations/round/tides.png" }
];

const DECORATION_MAP = new Map(DECORATIONS.map(d => [d.id, d]));

let originalDecorationKey = '';
let stagedDecorationKey = '';
let decorationFilter = 'all';

function getDecorationUrl(key) {
    if (!key) return '';
    const item = DECORATION_MAP.get(key);
    if (item) return item.url;
    if (key.startsWith('http://') || key.startsWith('https://') || key.startsWith('/')) return key;
    if (key.startsWith('decorations/')) return `/static/accounts/${key}`;
    if (key.includes('/')) return `/static/accounts/decorations/${key}`;
    return key;
}

function applyDecorationPreview(key) {
    const previewDec = document.getElementById('profile-preview-decoration');
    if (!previewDec) return;
    const item = DECORATION_MAP.get(key);
    const url = getDecorationUrl(key);
    if (url) {
        previewDec.src = url;
        previewDec.style.display = 'block';
        const offX = item ? (item.offsetX ?? item.offset_x ?? 0) : 0;
        const offY = item ? (item.offsetY ?? item.offset_y ?? 0) : 0;
        const scale = item ? (item.scale ?? 1.0) : 1.0;
        previewDec.style.transform = `translate(calc(-50% + ${offX}px), calc(-50% + ${offY}px)) scale(${scale})`;
    } else {
        previewDec.style.display = 'none';
        previewDec.src = '';
        previewDec.style.transform = 'translate(-50%, -50%)';
    }
}

function applyTopbarDecoration(key) {
    const topDec = document.getElementById('topbar-avatar-decoration');
    if (!topDec) return;
    const item = DECORATION_MAP.get(key);
    const url = getDecorationUrl(key);
    if (url) {
        topDec.src = url;
        topDec.style.display = 'block';
        const offX = item ? ((item.offsetX ?? item.offset_x ?? 0) * (16 / 64)) : 0;
        const offY = item ? ((item.offsetY ?? item.offset_y ?? 0) * (16 / 64)) : 0;
        const scale = item ? (item.scale ?? 1.0) : 1.0;
        topDec.style.transform = `translate(calc(-50% + ${offX}px), calc(-50% + ${offY}px)) scale(${scale})`;
    } else {
        topDec.style.display = 'none';
        topDec.src = '';
        topDec.style.transform = 'translate(-50%, -50%)';
    }
}

async function loadDecorationsFromBackend() {
    try {
        const res = await fetch('/api/profile/decorations/');
        const data = await res.json();
        if (data.ok && Array.isArray(data.decorations)) {
            DECORATIONS = data.decorations;
            DECORATION_MAP.clear();
            data.decorations.forEach(d => {
                DECORATION_MAP.set(d.id, d);
            });
            applyDecorationPreview(stagedDecorationKey || originalDecorationKey);
            applyTopbarDecoration(originalDecorationKey);
            if (decorationGrid) {
                renderDecorationGrid();
            }
        }
    } catch (e) {
        console.warn('Could not sync decorations from server:', e);
    }
}

loadDecorationsFromBackend();

function renderDecorationGrid() {
    if (!decorationGrid) return;
    decorationGrid.innerHTML = '';

    const previewAvatar = document.getElementById('profile-preview-avatar');
    const userAvatarSrc = (previewAvatar && previewAvatar.src) ? previewAvatar.src : '/static/image/default-avatar.png';
    const currentShape = getSelectedAvatarShape();
    const items = Array.from(DECORATION_MAP.values());
    const filtered = items.filter(item => {
        if (decorationFilter === 'all') return true;
        return item.shape === decorationFilter;
    });

    if (decorationCountText) {
        decorationCountText.textContent = `${filtered.length} items`;
    }

    // 1. None / Remove tile
    const noneTile = document.createElement('div');
    const isNoneSelected = !stagedDecorationKey;
    noneTile.className = `decoration-tile ${isNoneSelected ? 'is-selected' : ''}`;
    noneTile.setAttribute('data-id', '');
    noneTile.innerHTML = `
        <div class="decoration-tile-preview">
            <img class="decoration-tile-preview-avatar ${currentShape}" src="${userAvatarSrc}" alt="Avatar">
            <svg class="decoration-tile-none-icon" viewBox="0 0 24 24" fill="none" stroke="#d9534f" stroke-width="2.5" stroke-linecap="round" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 28px; height: 28px; pointer-events: none; z-index: 3;">
                <circle cx="12" cy="12" r="9"></circle>
                <line x1="5.7" y1="5.7" x2="18.3" y2="18.3"></line>
            </svg>
        </div>
        <div class="decoration-tile-name">None</div>
    `;

    noneTile.addEventListener('mouseenter', () => {
        applyDecorationPreview('');
    });
    noneTile.addEventListener('mouseleave', () => {
        applyDecorationPreview(stagedDecorationKey);
        applyAvatarShape(getSelectedAvatarShape());
    });
    noneTile.addEventListener('click', () => {
        stagedDecorationKey = '';
        applyDecorationPreview('');
        renderDecorationGrid();
        updateSaveBarVisibility();
    });
    decorationGrid.appendChild(noneTile);

    // 2. Filtered decoration items
    filtered.forEach(item => {
        const tile = document.createElement('div');
        const isSelected = stagedDecorationKey === item.id;
        tile.className = `decoration-tile ${isSelected ? 'is-selected' : ''}`;
        tile.setAttribute('data-id', item.id);

        let badgeHtml = item.animated ? '<span class="decoration-badge-gif">GIF</span>' : '';
        const offX = (item.offsetX ?? item.offset_x ?? 0) * (48 / 64);
        const offY = (item.offsetY ?? item.offset_y ?? 0) * (48 / 64);
        const scale = item.scale ?? 1.0;
        const transformStyle = `style="transform: translate(calc(-50% + ${offX}px), calc(-50% + ${offY}px)) scale(${scale});"`;
        const avatarShapeClass = item.shape || currentShape;

        tile.innerHTML = `
            ${badgeHtml}
            <div class="decoration-tile-preview">
                <img class="decoration-tile-preview-avatar ${avatarShapeClass}" src="${userAvatarSrc}" alt="Avatar">
                <img class="decoration-tile-preview-overlay" src="${item.url}" alt="${item.name}" loading="lazy" ${transformStyle}>
            </div>
            <div class="decoration-tile-name" title="${item.name}">${item.name}</div>
        `;

        tile.addEventListener('mouseenter', () => {
            applyDecorationPreview(item.id);
            if (item.shape) {
                applyAvatarShape(item.shape);
            }
        });
        tile.addEventListener('mouseleave', () => {
            applyDecorationPreview(stagedDecorationKey);
            applyAvatarShape(getSelectedAvatarShape());
        });
        tile.addEventListener('click', () => {
            stagedDecorationKey = item.id;
            applyDecorationPreview(item.id);
            if (item.shape === 'round') {
                selectAvatarShape('round');
            } else if (item.shape === 'square') {
                selectAvatarShape('square');
            }
            renderDecorationGrid();
            updateSaveBarVisibility();
        });

        decorationGrid.appendChild(tile);
    });
}

decorationTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        decorationTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        decorationFilter = tab.getAttribute('data-filter') || 'all';
        renderDecorationGrid();
    });
});

if (changeDecorationButton) {
    changeDecorationButton.addEventListener('click', () => {
        openModal(decorationModal);
        renderDecorationGrid();
    });
}

if (decorationCloseButton) {
    decorationCloseButton.addEventListener('click', () => closeModal(decorationModal));
}

if (decorationCancelButton) {
    decorationCancelButton.addEventListener('click', () => {
        stagedDecorationKey = originalDecorationKey;
        applyDecorationPreview(originalDecorationKey);
        selectAvatarShape(originalAvatarShape);
        closeModal(decorationModal);
        updateSaveBarVisibility();
    });
}

if (decorationDoneButton) {
    decorationDoneButton.addEventListener('click', () => {
        closeModal(decorationModal);
    });
}

if (decorationRemoveButton) {
    decorationRemoveButton.addEventListener('click', () => {
        stagedDecorationKey = '';
        applyDecorationPreview('');
        renderDecorationGrid();
        updateSaveBarVisibility();
        closeModal(decorationModal);
    });
}

// Shape & Status Badge Controls
const shapeRadios = document.querySelectorAll('input[name="avatar_shape"]');
const showStatusCheckbox = document.getElementById('show-status-checkbox');

let originalAvatarShape = 'square';
let originalShowStatusBadge = true;
let stagedBannerColor = null;
let originalBannerColor = '#000000';

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

window.addEventListener('profile:bannerColorChanged', (e) => {
    const newColor = e.detail.color;
    stagedBannerColor = newColor;
    const previewBanner = document.getElementById('profile-preview-banner');
    if (previewBanner) {
        previewBanner.style.backgroundColor = newColor;
    }
    updateSaveBarVisibility();
});

function getSelectedAvatarShape() {
    const checked = document.querySelector('input[name="avatar_shape"]:checked');
    return checked ? checked.value : 'square';
}

function selectAvatarShape(shape) {
    if (!shape) return;
    const radio = document.querySelector(`input[name="avatar_shape"][value="${shape}"]`);
    if (radio) {
        radio.checked = true;
    }
    applyAvatarShape(shape);
}

function applyAvatarShape(shape) {
    const wrapper = document.getElementById('profile-avatar-wrapper');
    const avatar = document.getElementById('profile-preview-avatar');
    if (wrapper) {
        wrapper.classList.remove('square', 'round');
        wrapper.classList.add(shape);
    }
    if (avatar) {
        avatar.classList.remove('square', 'round');
        avatar.classList.add(shape);
        avatar.style.borderRadius = shape === 'round' ? '50%' : '0px';
    }
}

function applyStatusBadgeVisibility(show) {
    const badge = document.getElementById('profile-preview-status-badge');
    if (badge) {
        badge.style.display = show ? 'flex' : 'none';
    }
}

// Live sync for Avatar Shape
shapeRadios.forEach((radio) => {
    const handler = () => {
        applyAvatarShape(radio.value);
        renderDecorationGrid();
        updateSaveBarVisibility();
    };
    radio.addEventListener('change', handler);
    radio.addEventListener('click', handler);
});

// Live sync for Status Badge Visibility
if (showStatusCheckbox) {
    const statusHandler = () => {
        applyStatusBadgeVisibility(showStatusCheckbox.checked);
        updateSaveBarVisibility();
    };
    showStatusCheckbox.addEventListener('change', statusHandler);
    showStatusCheckbox.addEventListener('click', statusHandler);
}

// Inputs whose changes should trigger the save bar.
const trackedEditorInputs = [displayNameInput, pronounsInput, bioInput].filter(Boolean);

// Snapshot of each input's value at the moment the modal was opened / last saved
let originalEditorValues = new Map();

function snapshotEditorValues() {
    originalEditorValues = new Map(
        trackedEditorInputs.map((input) => [input, input.value])
    );
    const previewAvatar = document.getElementById('profile-preview-avatar');
    if (previewAvatar) {
        originalAvatarUrl = previewAvatar.src;
    }
    originalBannerUrl = getOriginalBannerUrl();
    const previewBanner = document.getElementById('profile-preview-banner');
    if (previewBanner) {
        originalBannerColor = rgbToHex(previewBanner.style.backgroundColor) || '#000000';
    }
    stagedBannerColor = null;
    originalAvatarShape = getSelectedAvatarShape();
    originalShowStatusBadge = showStatusCheckbox ? showStatusCheckbox.checked : true;

    const previewDec = document.getElementById('profile-preview-decoration');
    if (previewDec) {
        originalDecorationKey = previewDec.getAttribute('data-decoration-key') || '';
    }
    stagedDecorationKey = originalDecorationKey;

    applyAvatarShape(originalAvatarShape);
    applyStatusBadgeVisibility(originalShowStatusBadge);
    applyDecorationPreview(originalDecorationKey);
    applyTopbarDecoration(originalDecorationKey);
}

function hasUnsavedEditorChanges() {
    const inputChanged = trackedEditorInputs.some(
        (input) => input.value !== originalEditorValues.get(input)
    );
    const mediaChanged = (stagedAvatarData !== null) || (stagedBannerData !== null) || removeAvatar || removeBanner;
    const shapeChanged = getSelectedAvatarShape() !== originalAvatarShape;
    const statusChanged = showStatusCheckbox ? (showStatusCheckbox.checked !== originalShowStatusBadge) : false;
    const bannerColorChanged = stagedBannerColor !== null && stagedBannerColor !== originalBannerColor;
    const decorationChanged = stagedDecorationKey !== originalDecorationKey;
    return inputChanged || mediaChanged || shapeChanged || statusChanged || bannerColorChanged || decorationChanged;
}

function updateSaveBarVisibility() {
    if (!profileSaveBar) return;
    profileSaveBar.classList.toggle("is-visible", hasUnsavedEditorChanges());
}

trackedEditorInputs.forEach((input) => {
    input.addEventListener("input", updateSaveBarVisibility);
});

// Reset Button Logic
if (profileResetButton) {
    profileResetButton.addEventListener("click", () => {
        // Restore text inputs to original values
        trackedEditorInputs.forEach((input) => {
            input.value = originalEditorValues.get(input) || '';
            input.dispatchEvent(new Event("input"));
        });

        // Reset media staged states
        stagedAvatarData = null;
        stagedBannerData = null;
        removeAvatar = false;
        removeBanner = false;
        stagedBannerColor = null;

        const previewAvatar = document.getElementById('profile-preview-avatar');
        if (previewAvatar) {
            previewAvatar.src = originalAvatarUrl || '/static/image/default-avatar.png';
        }

        const previewBanner = document.getElementById('profile-preview-banner');
        if (previewBanner) {
            previewBanner.style.backgroundColor = originalBannerColor;
            if (originalBannerUrl) {
                previewBanner.style.backgroundImage = `url('${originalBannerUrl}')`;
                previewBanner.style.backgroundSize = 'cover';
                previewBanner.style.backgroundPosition = 'center';
            } else {
                previewBanner.style.backgroundImage = '';
            }
        }

        const cropperColorBtn = document.getElementById('cropper-color-button');
        const cropperColorHex = document.getElementById('cropper-color-hex');
        if (cropperColorBtn) {
            if (originalBannerUrl) {
                cropperColorBtn.classList.add('no-color');
                cropperColorBtn.style.backgroundColor = '';
                if (cropperColorHex) cropperColorHex.textContent = 'None';
            } else {
                cropperColorBtn.classList.remove('no-color');
                cropperColorBtn.style.backgroundColor = originalBannerColor;
                if (cropperColorHex) cropperColorHex.textContent = (originalBannerColor || '#000000').toUpperCase();
            }
        }

        // Reset Avatar Shape
        shapeRadios.forEach((radio) => {
            radio.checked = radio.value === originalAvatarShape;
        });
        applyAvatarShape(originalAvatarShape);

        // Reset Status Badge
        if (showStatusCheckbox) {
            showStatusCheckbox.checked = originalShowStatusBadge;
        }
        applyStatusBadgeVisibility(originalShowStatusBadge);

        // Reset Decoration
        stagedDecorationKey = originalDecorationKey;
        applyDecorationPreview(originalDecorationKey);
        renderDecorationGrid();

        // Hide Save Bar
        updateSaveBarVisibility();
    });
}

// Save Button Logic
if (profileSaveButton) {
    profileSaveButton.addEventListener("click", async () => {
        // Prepare data payload
        const payload = {
            display_name: displayNameInput ? displayNameInput.value.trim() : null,
            pronouns: pronounsInput ? pronounsInput.value.trim() : null,
            bio: bioInput ? bioInput.value.trim() : null,
            avatar_data: stagedAvatarData,
            banner_data: stagedBannerData,
            banner_color: stagedBannerColor !== null ? stagedBannerColor : originalBannerColor,
            remove_avatar: removeAvatar,
            remove_banner: removeBanner,
            avatar_shape: getSelectedAvatarShape(),
            show_status_badge: showStatusCheckbox ? showStatusCheckbox.checked : true,
            decoration_key: stagedDecorationKey,
        };

        // Start loading state
        setButtonLoading(profileSaveButton, true);

        try {
            const response = await fetch('/api/profile/update/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.ok) {
                // Update live state with saved values
                if (data.avatar_url_64) {
                    originalAvatarUrl = data.avatar_url_64;
                    const previewAvatar = document.getElementById('profile-preview-avatar');
                    if (previewAvatar) previewAvatar.src = data.avatar_url_64;
                    const topAvatar = document.querySelector('.profile-widget-avatar');
                    if (topAvatar) topAvatar.src = data.avatar_url_64;
                }
                if (data.banner_color) {
                    originalBannerColor = data.banner_color;
                    const previewBanner = document.getElementById('profile-preview-banner');
                    if (previewBanner) previewBanner.style.backgroundColor = data.banner_color;
                }
                if (data.banner_url_sm !== undefined) {
                    originalBannerUrl = data.banner_url_sm;
                    const previewBanner = document.getElementById('profile-preview-banner');
                    if (previewBanner) {
                        if (data.banner_url_sm) {
                            previewBanner.style.backgroundImage = `url('${data.banner_url_sm}')`;
                            previewBanner.style.backgroundSize = 'cover';
                            previewBanner.style.backgroundPosition = 'center';
                        } else {
                            previewBanner.style.backgroundImage = '';
                        }
                    }
                }
                if (data.effective_display_name) {
                    const topName = document.querySelector('.profile-widget-name');
                    if (topName) topName.textContent = data.effective_display_name;
                }

                if (data.avatar_shape) {
                    originalAvatarShape = data.avatar_shape;
                }
                if (data.show_status_badge !== undefined) {
                    originalShowStatusBadge = data.show_status_badge;
                }

                if (data.decoration_key !== undefined) {
                    originalDecorationKey = data.decoration_key;
                    stagedDecorationKey = data.decoration_key;
                    const previewDec = document.getElementById('profile-preview-decoration');
                    if (previewDec) {
                        previewDec.setAttribute('data-decoration-key', data.decoration_key);
                    }
                    applyDecorationPreview(data.decoration_key);
                    applyTopbarDecoration(data.decoration_key);
                }

                // Reset staged states
                stagedAvatarData = null;
                stagedBannerData = null;
                stagedBannerColor = null;
                removeAvatar = false;
                removeBanner = false;

                snapshotEditorValues();
                updateSaveBarVisibility();
            } else {
                alert(data.message || 'Failed to save profile changes.');
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('An unexpected error occurred while saving.');
        } finally {
            setButtonLoading(profileSaveButton, false);
        }
    });
}

// Initial snapshot
snapshotEditorValues();
// #endregion

// #region Profile Modal Open/Close
function openProfileModal() {
    if (profileModal) profileModal.classList.add("is-open");
    snapshotEditorValues();
    updateDisplayNameLive();
    updatePronounsLive();
    updateBioLive();
    updateSaveBarVisibility();
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

// #region Enter Key Submission
function handleEnterKey(event, button) {
    if (event.key === 'Enter') {
        event.preventDefault();
        button.click();
    }
}

[newUsernameInput, usernamePasswordInput].forEach(input => {
    if (input) {
        input.addEventListener('keydown', (event) => handleEnterKey(event, usernameSaveButton));
    }
});

[newEmailInput, emailPasswordInput].forEach(input => {
    if (input) {
        input.addEventListener('keydown', (event) => handleEnterKey(event, emailSaveButton));
    }
});

[currentPasswordInput, newPasswordInput, confirmPasswordInput].forEach(input => {
    if (input) {
        input.addEventListener('keydown', (event) => handleEnterKey(event, passwordSaveButton));
    }
});

if (deletePasswordInput) {
    deletePasswordInput.addEventListener('keydown', (event) => handleEnterKey(event, deleteConfirmButton));
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

// #region Log Out Event Listener
const logoutAccountButton = document.getElementById("logout-account-button");
logoutAccountButton?.addEventListener("click", async () => {
    // 1. Close profile modal immediately
    closeProfileModal();

    // 2. Show native Win98 auth loading popup with Logging Out text
    const loadingOverlay = document.getElementById("auth-loading-overlay") || document.getElementById("logout-loading-overlay");
    const loadingTitle = document.getElementById("auth-loading-title");
    const loadingText = document.getElementById("auth-loading-text");

    if (loadingTitle) loadingTitle.textContent = "Logging Out";
    if (loadingText) loadingText.textContent = "Logging out, please wait...";
    if (loadingOverlay) loadingOverlay.style.display = "flex";

    try {
        const response = await fetch("/api/logout/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCSRFToken(),
            },
        });
        const data = await response.json();
        if (data.ok) {
            window.location.reload();
        } else {
            if (loadingOverlay) loadingOverlay.style.display = "none";
            console.error("Logout failed:", data.message);
        }
    } catch (err) {
        if (loadingOverlay) loadingOverlay.style.display = "none";
        console.error("Logout request error:", err);
    }
});
// #endregion