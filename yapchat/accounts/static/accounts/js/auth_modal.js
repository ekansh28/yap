const authButton = document.getElementById("auth-button");
const authModal = document.getElementById("auth-modal");
const closeButton = document.getElementById("close-button");
// Function to open the authentication modal
function openAuthModal() {
    authModal.classList.add("is-open");
}
// Function to close the authentication modal
function closeAuthModal() {
    authModal.classList.remove("is-open");
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