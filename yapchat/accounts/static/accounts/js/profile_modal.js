const profileButton = document.getElementById("profile-button");
const profileModal = document.getElementById("profile-modal");
const profileCloseButton = document.getElementById("profile-close-button");

function openProfileModal() {
    profileModal.classList.add("is-open");
}
// Function to close the profile modal
function closeProfileModal() {
    profileModal.classList.remove("is-open");
}

if (profileButton && profileModal && profileCloseButton) {
    profileButton.addEventListener("click", openProfileModal);
    profileCloseButton.addEventListener("click", closeProfileModal);

    profileModal.addEventListener("click", (event) => {
        console.log("Clicked inside profile modal:", event.target);
        if (event.target === profileModal) {
            closeProfileModal();
        }
    });
} else {
    console.error("Profile modal elements not found in the DOM.");
}