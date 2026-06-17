// counter.js

/**
 * Sets up a character counter for an input or textarea.
 * @param {string} inputId - ID of the input element.
 * @param {string} counterId - ID of the counter element.
 * @param {number} maxLength - Maximum allowed length.
 */
export function setupCounter(
    inputId,
    counterId,
    maxLength
) {
    const input =
        document.getElementById(inputId);

    const counter =
        document.getElementById(counterId);

    if (!input || !counter) {
        console.error(
            `Counter setup failed for ${inputId}`
        );
        return;
    }

    function updateCounter() {
        counter.textContent =
            `${input.value.length}/${maxLength}`;
    }

    input.addEventListener(
        "input",
        updateCounter
    );

    updateCounter();
}