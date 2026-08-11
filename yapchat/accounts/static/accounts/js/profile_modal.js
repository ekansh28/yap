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
import Notification from './Components/Notification/Notification.js?v=2';
import './profile_media.js';

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

// Editor page elements
const displayNameInput = document.getElementById('display-name-input');
const displayNameCounter = document.getElementById('editor-display-name-counter');
const bioInput = document.getElementById('bio-input');
const bioTextCounter = document.getElementById('bio-text-counter');




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

// #region Editor Page Features
if (displayNameInput && displayNameCounter) {
    const updateDisplayNameCounter = () => {
        displayNameCounter.textContent = `${displayNameInput.value.length}/32`;
    };
    displayNameInput.addEventListener("input", updateDisplayNameCounter);
    updateDisplayNameCounter();
}

if (bioInput && bioTextCounter) {
    const updateBioCounter = () => {
        bioTextCounter.textContent = `${bioInput.value.length}/200`;
    };
    bioInput.addEventListener("input", updateBioCounter);
    updateBioCounter();
}
// #endregion

// #region Profile Save Bar
const profileSaveBar = document.getElementById("profile-save-bar");
const profileResetButton = document.getElementById('profile-reset-button');
const profileSaveButton = document.getElementById('profile-save-button');

// Inputs whose changes should trigger the save bar.
// Add more fields here later (e.g. pronounsInput) and they'll be tracked automatically.
const trackedEditorInputs = [displayNameInput, bioInput].filter(Boolean);

// Snapshot of each input's value at the moment the modal was opened / last saved
let originalEditorValues = new Map();

function snapshotEditorValues() {
    originalEditorValues = new Map(
        trackedEditorInputs.map((input) => [input, input.value])
    );
}

function hasUnsavedEditorChanges() {
    return trackedEditorInputs.some(
        (input) => input.value !== originalEditorValues.get(input)
    );
}

function updateSaveBarVisibility() {
    if (!profileSaveBar) return;
    profileSaveBar.classList.toggle("is-visible", hasUnsavedEditorChanges());
}

trackedEditorInputs.forEach((input) => {
    input.addEventListener("input", updateSaveBarVisibility);
});

// Reset Button Logic
if(profileResetButton){
    profileResetButton.addEventListener("click", () => {
        // Restore all tracked inputs to their original values
        trackedEditorInputs.forEach((input) => {
            input.value = originalEditorValues.get(input);
            // Manually trigger the 'input' event so characters counters update
            input.dispatchEvent(new Event("input"));
        });

        // Hide Save Bar
        updateSaveBarVisibility();
    });
}

// Save Button Logic
if(profileSaveButton){
    profileSaveButton.addEventListener("click", async () => {
        // Prepare data payload
        const payload = {
            display_name: displayNameInput ? displayNameInput.value.trim() : null,
            bio: bioInput ? bioInput.value.trim() : null
        };

        // Start loading state
        setButtonLoading(profileSaveButton, true);

        try {
            // Make network request to your endpoint
            const response = await fetch('/api/profile/update/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken' : getCSRFToken()
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            // Handle server response
            if(data.ok){
                //update snapshot so system knows the new values are original
                snapshotEditorValues();
                updateSaveBarVisibility();
                Notification.success(data.message || "Profile updated sucessfully!");
            } else {
                Notification.error(data.message || "Failed to update profile.");
            }
        } catch(error) {
            Notification.error(`Connection Error: ${error}`);
        } finally {
            // End loading state
            setButtonLoading(profileSaveButton, false);
        }
    });
}
// Take the initial snapshot now, and refresh it whenever the profile modal opens
// so a previous session's edits don't immediately show the bar again.
snapshotEditorValues();
// #endregion

// #region Profile Modal Open/Close
function openProfileModal() {
    if (profileModal) profileModal.classList.add("is-open");
    snapshotEditorValues();
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