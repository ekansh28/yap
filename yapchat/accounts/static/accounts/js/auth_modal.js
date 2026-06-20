const authButton = document.getElementById("auth-button");
const authModal = document.getElementById("auth-modal");
const closeButton = document.getElementById("close-button");

// States
const registrationState = document.getElementById("registration-state");
const loginState = document.getElementById("login-state");

// Switchers
const showLogin = document.getElementById("show-login");
const showRegister = document.getElementById("show-register");

// Registration Elements
const submitButton = document.getElementById("submit-button");
const emailInput = document.getElementById("email-input");
const emailHelp = document.getElementById("email-help");
const usernameHelp = document.getElementById("username-help");
const displayNameHelp = document.getElementById("display-name-help");
const passwordInput = document.getElementById("password-input");
const passwordHelp = document.getElementById("password-help");
const dobHelp = document.getElementById("dob-help");
const emailRequiredWarning = document.getElementById("email-required-warning");
const usernameRequiredWarning = document.getElementById("username-required-warning");
const passwordRequiredWarning = document.getElementById("password-required-warning");
const dobRequiredWarning = document.getElementById("dob-required-warning");

// Login Elements
const loginButton = document.getElementById("login-button");
const loginEmailInput = document.getElementById("login-email-input");
const loginPasswordInput = document.getElementById("login-password-input");


export const emailRequiredMessage = "Please enter your email";
export const usernameRequiredMessage = "Please enter your username";
export const usernameRulesMessage = "Please use only numbers, letters, underscores _ or periods.";
export const usernameLengthMessage = "Username must be 3-32 characters";
export const displayNameMessage = "This is how others see you. You can use special characters and emojis!";
export const passwordRequiredMessage = "Please enter your password";
export const passwordMessage = "Password must be at least 8 characters";
export const dobMessage = "You must be at least 13 years old to register";
export const dobRequiredMessage = "Please select your date of birth";
export const dobInvalidMessage = "Please enter a valid date of birth";
const registerEndpoint = "/api/register/";
const loginEndpoint = "/api/login/";
export const usernamePattern = /^[A-Za-z0-9_.]*$/;

let shouldShowEmailRequiredError = false;
let shouldShowUsernameRequiredError = false;
let shouldShowUsernameLengthError = false;
let shouldShowPasswordRequiredError = false;
let shouldShowPasswordError = false;
let shouldShowDobError = false;

//#region Auth State Switching
function showState(state) {
    if (state === 'login') {
        loginState.classList.add('is-active');
        registrationState.classList.remove('is-active');
    } else {
        registrationState.classList.add('is-active');
        loginState.classList.remove('is-active');
    }
}

if (showLogin) {
    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        showState('login');
    });
}

if (showRegister) {
    showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        showState('register');
    });
}
//#endregion


//#region Date of Birth Elements
const dobDay = document.getElementById("dob-day");
const dobMonth = document.getElementById("dob-month");
const dobYear = document.getElementById("dob-year");
const dobInput = document.getElementById("date-of-birth-input");
const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

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

function populateDobFields() {
    if (!dobDay || !dobMonth || !dobYear) {
        return;
    }
    for (let day = 1; day <= 31; day++) {
        const option = document.createElement("option");
        option.value = String(day).padStart(2, "0");
        option.textContent = String(day).padStart(2, "0");
        dobDay.appendChild(option);
    }

    months.forEach((month, index) => {
        const option = document.createElement("option");
        option.value = String(index + 1).padStart(2, "0");
        option.textContent = month;
        dobMonth.appendChild(option);
    });

    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 1900; year--) {
        const option = document.createElement("option");
        option.value = String(year);
        option.textContent = String(year);
        dobYear.appendChild(option);
    }
}

function updateDobValue() {
    if (!dobDay || !dobMonth || !dobYear || !dobInput) {
        return;
    }
    const day = dobDay.value;
    const month = dobMonth.value;
    const year = dobYear.value;
    if (!day || !month || !year) {
        dobInput.value = "";
        updateDobHelp();
        return;
    }
    dobInput.value = `${year}-${month}-${day}`;
    updateDobHelp();
}

populateDobFields();
[dobDay, dobMonth, dobYear].forEach(select => {
    if (select) {
        select.addEventListener("change", updateDobValue);
        select.addEventListener("focus", updateDobHelp);
        select.addEventListener("blur", updateDobHelp);
    }
});
//#endregion 


//#region OPEN-CLOSE BUTTON LOGIC FOR AUTHENTICATION MODAL
function openAuthModal() {
    if (authModal) {
        authModal.classList.add("is-open");
        showState('login'); // Default to login view
    }
}
function closeAuthModal() {
    if (authModal) authModal.classList.remove("is-open");
}

if (authButton && authModal && closeButton) {
    authButton.addEventListener("click", openAuthModal);
    closeButton.addEventListener("click", closeAuthModal);

    authModal.addEventListener("click", (event) => {
        if (event.target === authModal) {
            closeAuthModal();
        }
    });
}
//#endregion

//#region Email Validation
if (emailInput) {
    emailInput.addEventListener("input", updateEmailHelp);
    emailInput.addEventListener("blur", updateEmailHelp);
    updateEmailHelp();
}
//#endregion

//#region Username Input Counter
const usernameInput = document.getElementById("username-input");
const usernameCounter = document.getElementById("username-counter");
if (usernameInput && usernameCounter) {
    const updateUsernameCounter = () => {
        const currentLength = usernameInput.value.length;
        const hasInvalidCharacters = !usernamePattern.test(usernameInput.value.trim());
        usernameCounter.textContent = `${currentLength}/32`;
        usernameInput.classList.toggle("has-text", currentLength > 0);
        updateUsernameHelp();

        if (hasInvalidCharacters) {
            shakeUsernameHelp();
        }
    };

    usernameInput.addEventListener("input", updateUsernameCounter);
    usernameInput.addEventListener("focus", updateUsernameHelp);
    usernameInput.addEventListener("blur", updateUsernameHelp);
    updateUsernameCounter();
}
//#endregion

//#region Display name Input Counter
const displayNameInput = document.getElementById("display-name-input");
const displayNameCounter = document.getElementById("display-name-counter");
if (displayNameInput && displayNameCounter) {
    const updateDisplayNameCounter = () => {
        const currentLength = displayNameInput.value.length;
        displayNameCounter.textContent = `${currentLength}/32`;
        displayNameInput.classList.toggle("has-text", currentLength > 0);
        updateDisplayNameHelp();
    };

    displayNameInput.addEventListener("input", updateDisplayNameCounter);
    displayNameInput.addEventListener("focus", updateDisplayNameHelp);
    displayNameInput.addEventListener("blur", updateDisplayNameHelp);
    updateDisplayNameCounter();
}
//#endregion

//#region Password Validation
if (passwordInput) {
    passwordInput.addEventListener("input", updatePasswordHelp);
    passwordInput.addEventListener("focus", updatePasswordHelp);
    passwordInput.addEventListener("blur", updatePasswordHelp);
    updatePasswordHelp();
}
//#endregion

//#region Username Input Validation

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

function applyServerErrors(errors = {}, isLogin = false) {
    if (isLogin) {
        if (errors.detail) {
            // Generic login error
            const loginErrorHelp = document.getElementById('login-error-help'); // Assuming you add this element
            if (loginErrorHelp) {
                setFieldHelp(loginErrorHelp, errors.detail, true, "error");
            }
        }
    } else {
        if (errors.email) {
            setFieldHelp(emailHelp, errors.email, true, "error");
            setRequiredWarning(emailRequiredWarning, true);
        }

        if (errors.username) {
            setFieldHelp(usernameHelp, errors.username, true, "error");
            setRequiredWarning(usernameRequiredWarning, true);
        }

        if (errors.display_name) {
            setFieldHelp(displayNameHelp, errors.display_name, true, "error");
        }

        if (errors.password) {
            setFieldHelp(passwordHelp, errors.password, true, "error");
            setRequiredWarning(passwordRequiredWarning, true);
        }

        if (errors.date_of_birth) {
            setFieldHelp(dobHelp, errors.date_of_birth, true, "error");
            setRequiredWarning(dobRequiredWarning, true);
        }
    }
}

function showAuthError(message, isLogin = false) {
    const helpElement = isLogin ? document.getElementById('login-error-help') : emailHelp;
    setFieldHelp(
        helpElement,
        message || "Authentication failed. Please try again.",
        true,
        "error"
    );
}

async function readJsonResponse(response) {
    const contentType = response.headers.get("Content-Type") || "";

    if (contentType.includes("application/json")) {
        return response.json();
    }

    const text = await response.text();
    return {
        ok: false,
        message: text ? "The server returned an unexpected error." : "Request failed.",
    };
}

function setUsernameHelp(message, isVisible, state = "info") {
    setFieldHelp(usernameHelp, message, isVisible, state);
}

function shakeUsernameHelp() {
    shakeFieldHelp(usernameHelp);
}

function updateUsernameHelp() {
    if (!usernameInput) return;

    const username = usernameInput.value.trim();
    const usernameLength = username.length;
    const isEmpty = usernameLength === 0;
    const hasInvalidCharacters = !usernamePattern.test(username);
    const isTooShort = usernameLength > 0 && usernameLength < 3;

    if (!isEmpty) {
        shouldShowUsernameRequiredError = false;
    }

    if (!isTooShort) {
        shouldShowUsernameLengthError = false;
    }

    setRequiredWarning(usernameRequiredWarning, isEmpty && shouldShowUsernameRequiredError);

    if (isEmpty && shouldShowUsernameRequiredError) {
        setUsernameHelp(usernameRequiredMessage, true, "error");
    } else if (isTooShort && shouldShowUsernameLengthError) {
        setUsernameHelp(usernameLengthMessage, true, "error");
    } else if (hasInvalidCharacters) {
        setUsernameHelp(usernameRulesMessage, true, "error");
    } else if (document.activeElement === usernameInput) {
        setUsernameHelp(usernameRulesMessage, true, "info");
    } else {
        setUsernameHelp(usernameRulesMessage, false, "info");
    }
}

//#endregion

//#region Email Help
function updateEmailHelp() {
    if (!emailInput) return;

    const isEmpty = emailInput.value.trim().length === 0;

    if (!isEmpty) {
        shouldShowEmailRequiredError = false;
    }

    setRequiredWarning(emailRequiredWarning, isEmpty && shouldShowEmailRequiredError);

    if (isEmpty && shouldShowEmailRequiredError) {
        setFieldHelp(emailHelp, emailRequiredMessage, true, "error");
    } else {
        setFieldHelp(emailHelp, emailRequiredMessage, false, "info");
    }
}
//#endregion

//#region Display Name Help
function updateDisplayNameHelp() {
    if (!displayNameInput) return;

    if (document.activeElement === displayNameInput) {
        setFieldHelp(displayNameHelp, displayNameMessage, true, "info");
    } else {
        setFieldHelp(displayNameHelp, displayNameMessage, false, "info");
    }
}
//#endregion

//#region Password Help
function updatePasswordHelp() {
    if (!passwordInput) return;

    const passwordLength = passwordInput.value.length;
    const isTooShort = passwordLength > 0 && passwordLength < 8;
    const isEmpty = passwordLength === 0;

    if (!isEmpty) {
        shouldShowPasswordRequiredError = false;
    }

    if (!isTooShort && !isEmpty) {
        shouldShowPasswordError = false;
    }

    setRequiredWarning(passwordRequiredWarning, isEmpty && shouldShowPasswordRequiredError);

    if (isEmpty && shouldShowPasswordRequiredError) {
        setFieldHelp(passwordHelp, passwordRequiredMessage, true, "error");
    } else if (isTooShort && shouldShowPasswordError) {
        setFieldHelp(passwordHelp, passwordMessage, true, "error");
    } else if (document.activeElement === passwordInput) {
        setFieldHelp(passwordHelp, passwordMessage, true, "info");
    } else {
        setFieldHelp(passwordHelp, passwordMessage, false, "info");
    }
}
//#endregion

//#region Date of Birth Help
function getSelectedDob() {
    if (!dobDay || !dobMonth || !dobYear) return null;
    if (!dobDay.value || !dobMonth.value || !dobYear.value) return null;

    const year = Number(dobYear.value);
    const month = Number(dobMonth.value);
    const day = Number(dobDay.value);
    const selectedDate = new Date(year, month - 1, day);

    if (
        selectedDate.getFullYear() !== year ||
        selectedDate.getMonth() !== month - 1 ||
        selectedDate.getDate() !== day
    ) {
        return "invalid";
    }

    return selectedDate;
}

function isAtLeast13(date) {
    const today = new Date();
    const minDate = new Date(
        today.getFullYear() - 13,
        today.getMonth(),
        today.getDate()
    );

    return date <= minDate;
}

function isDobFocused() {
    return document.activeElement === dobDay ||
        document.activeElement === dobMonth ||
        document.activeElement === dobYear;
}

function updateDobHelp() {
    const selectedDob = getSelectedDob();
    const isMissing = selectedDob === null;
    const isInvalidDate = selectedDob === "invalid";
    const isTooYoung = selectedDob instanceof Date && !isAtLeast13(selectedDob);

    if (!isMissing && !isInvalidDate && !isTooYoung) {
        shouldShowDobError = false;
    }

    setRequiredWarning(dobRequiredWarning, isMissing && shouldShowDobError);

    if (shouldShowDobError && isMissing) {
        setFieldHelp(dobHelp, dobRequiredMessage, true, "error");
    } else if (shouldShowDobError && isInvalidDate) {
        setFieldHelp(dobHelp, dobInvalidMessage, true, "error");
    } else if (shouldShowDobError && isTooYoung) {
        setFieldHelp(dobHelp, dobMessage, true, "error");
    } else {
        setFieldHelp(dobHelp, dobMessage, false, "info");
    }
}
//#endregion

//#region Enter Key Submission
const registrationInputs = [emailInput, displayNameInput, usernameInput, passwordInput, dobDay, dobMonth, dobYear];
const loginInputs = [loginEmailInput, loginPasswordInput];

function handleEnterKey(event, button) {
    if (event.key === 'Enter') {
        event.preventDefault();
        button.click();
    }
}

registrationInputs.forEach(input => {
    if (input) {
        input.addEventListener('keydown', (event) => handleEnterKey(event, submitButton));
    }
});

loginInputs.forEach(input => {
    if (input) {
        input.addEventListener('keydown', (event) => handleEnterKey(event, loginButton));
    }
});
//#endregion


//#region Submit Validation Logic
if (submitButton && usernameInput) {
    submitButton.addEventListener("click", async (event) => {
        event.preventDefault();
        const isEmailEmpty = !emailInput || emailInput.value.trim().length === 0;
        const usernameLength = usernameInput.value.trim().length;
        const isUsernameEmpty = usernameLength === 0;
        const hasInvalidCharacters = !usernamePattern.test(usernameInput.value.trim());
        const isTooShort = usernameLength > 0 && usernameLength < 3;
        const isUsernameInvalid = isUsernameEmpty || isTooShort || hasInvalidCharacters;
        const isPasswordEmpty = !passwordInput || passwordInput.value.length === 0;
        const isPasswordTooShort = !!passwordInput && passwordInput.value.length > 0 && passwordInput.value.length < 8;
        const isPasswordInvalid = isPasswordEmpty || isPasswordTooShort;
        const selectedDob = getSelectedDob();
        const isDobInvalid = selectedDob === null ||
            selectedDob === "invalid" ||
            (selectedDob instanceof Date && !isAtLeast13(selectedDob));

        if (isEmailEmpty || isUsernameInvalid || isPasswordInvalid || isDobInvalid) {
            shouldShowEmailRequiredError = isEmailEmpty;
            shouldShowUsernameRequiredError = isUsernameEmpty;
            shouldShowUsernameLengthError = isTooShort;
            shouldShowPasswordRequiredError = isPasswordEmpty;
            shouldShowPasswordError = isPasswordTooShort;
            shouldShowDobError = isDobInvalid;
            updateEmailHelp();
            updateUsernameHelp();
            updatePasswordHelp();
            updateDobHelp();

            if (isEmailEmpty) {
                if (emailInput) emailInput.focus();
            } else if (isUsernameInvalid) {
                if (usernameInput) usernameInput.focus();
            } else if (isPasswordInvalid) {
                if (passwordInput) passwordInput.focus();
            } else if (isDobInvalid) {
                const firstDobField = !dobDay.value ? dobDay : !dobMonth.value ? dobMonth : dobYear;
                if (firstDobField) firstDobField.focus();
            }

            if (isEmailEmpty) shakeFieldHelp(emailHelp);
            if (isEmailEmpty) shakeRequiredWarning(emailRequiredWarning);
            if (isUsernameInvalid) shakeUsernameHelp();
            if (isUsernameEmpty) shakeRequiredWarning(usernameRequiredWarning);
            if (isPasswordInvalid) shakeFieldHelp(passwordHelp);
            if (isPasswordEmpty) shakeRequiredWarning(passwordRequiredWarning);
            if (isDobInvalid) shakeFieldHelp(dobHelp);
            if (selectedDob === null) shakeRequiredWarning(dobRequiredWarning);
        } else {
            const payload = {
                email: emailInput.value.trim(),
                display_name: displayNameInput ? displayNameInput.value.trim() : "",
                username: usernameInput.value.trim(),
                password: passwordInput ? passwordInput.value : "",
                date_of_birth: dobInput ? dobInput.value : "",
            };

            setButtonLoading(submitButton, true);

            try {
                const response = await fetch(registerEndpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": getCSRFToken(),
                    },
                    body: JSON.stringify(payload),
                });

                const data = await readJsonResponse(response);

                if (!response.ok || !data.ok) {
                    applyServerErrors(data.errors || {});
                    if (!Object.keys(data.errors || {}).length) {
                        showAuthError(data.message);
                        console.error(data.detail || data.message || "Registration failed.");
                    }
                    return;
                }

                if (window.VerifyEmail) {
                    window.VerifyEmail.show(payload.email);
                } else {
                    console.error("Verify email state controller not found.");
                }
            } catch (error) {
                showAuthError("Registration request failed. Please try again.");
                console.error("Registration request failed.", error);
            } finally {
                setButtonLoading(submitButton, false);
            }
        }
    });
}

if (loginButton) {
    loginButton.addEventListener("click", async (event) => {
        event.preventDefault();

        const email = loginEmailInput.value.trim();
        const password = loginPasswordInput.value;

        if (!email || !password) {
            showAuthError("Email/username and password are required.", true);
            return;
        }

        const payload = {
            login: email, // Assuming backend accepts 'login' field for email or username
            password: password,
        };

        setButtonLoading(loginButton, true);

        try {
            const response = await fetch(loginEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRFToken(),
                },
                body: JSON.stringify(payload),
            });

            const data = await readJsonResponse(response);

            if (!response.ok || !data.ok) {
                applyServerErrors(data.errors || { detail: "Invalid credentials." }, true);
                if (!Object.keys(data.errors || {}).length) {
                    showAuthError(data.message, true);
                    console.error(data.detail || data.message || "Login failed.");
                }
                return;
            }

            // On success, close modal and reload the page to reflect logged-in state
            closeAuthModal();
            window.location.reload();

        } catch (error) {
            showAuthError("Login request failed. Please try again.", true);
            console.error("Login request failed.", error);
        } finally {
            setButtonLoading(loginButton, false);
        }
    });
}