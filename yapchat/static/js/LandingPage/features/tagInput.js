/*
 * Handles the landing page interest tag input.
 * Converts comma-separated or Enter-submitted text into Windows 98 style tags,
 * displays them inside the input area, prevents duplicates, supports removing
 * tags with Backspace, and enforces a maximum of 5 tags.
 */
import Notification from '../../Components/Notification/Notification.js';

export function initTagInput() {
    // State to hold the current tags
    const tags = [];
    // Get the input element
    const input = document.getElementById('tags-input');
    // Get the container for displaying tags
    const tagsContainer = document.getElementById('tags-container');

    // Stop execution if the input element is not found
    if (!input || !tagsContainer){
        console.error('Input or tag container not found');
        return;
    } 

    /**
     * Creates a new tag 
     * @param {string} text - The text for the tag
     */
    function createTag(text) {
        // 1. Removing spaces and converting to lowercase for consistent comparison
        const normalizedText = text.trim().toLowerCase();

        // 2. Check for empty input
        if (!text) return;

        // 3. Check for duplicates
        if (tags.includes(normalizedText)) return;  

        // 4. Enforce maximum of 5 tags
        if (tags.length >= 5) {
            Notification.warning('You can only add up to 5 tags.', {duration: 4000});
            return;
        }

        // 5. Add the tag to the tags array
        tags.push(normalizedText);

        // 6. Create the tag element
        const tagElement = document.createElement('div');

        // 7. Set the CSS class 
        tagElement.className = 'tag';

        // 8. Set the text content of the tag
        tagElement.textContent = text;

        // 9. Append the tag element to the tag container
        // Insert tag BEFORE the input
        tagsContainer.insertBefore(tagElement, input);

        // 10. Clear the input field    
        input.value = '';

        // 11. Log the current tags for debugging
        console.log('Current tags:', tags);

        // 12. Adding a remove button to each tag
        // Create image element
        const removeButton = document.createElement('img');

        // Path to image
        removeButton.src = '/static/image/close.png';

        // Alternative text
        removeButton.alt = 'Remove tag';

        // CSS class
        removeButton.className = 'remove-tag';

        // Style
        removeButton.style.width = '8px';
        removeButton.style.height = '8px';
        removeButton.style.marginLeft = '5px';
        removeButton.style.cursor = 'pointer';
  
        removeButton.addEventListener('click', () => {
            // Remove the tag from the tags array
            const index = tags.indexOf(normalizedText);
            if (index > -1) {
                tags.splice(index, 1);
                // Remove the tag element from the tag container
                tagElement.remove();
                console.log('Current tags:', tags);
            }
        });
        tagElement.appendChild(removeButton);

        // 13. Removing placeholder after a tag is added
        input.placeholder = '';
    }

    /**
     * Removes the last tag
    */
    function removeLastTag() {

    if (tags.length === 0) return;

    tags.pop();

    const tagElements = tagsContainer.querySelectorAll('.tag');

    const lastTag = tagElements[tagElements.length - 1];

    if (lastTag) {
        lastTag.remove();
    }

    console.log('Current tags:', tags);

    if (tags.length === 0) {
        input.placeholder = 'music,gaming,tech';
    }
    }

    /**
     * Keyboard event handler for the input field
    */
    input.addEventListener('keydown', (event) => {
        // 1. Check if the key is Enter or comma
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault(); // Prevent the default action (form submission or adding a comma)
            createTag(input.value); // Create a new tag with the current input value
        }
        // 2. Handle Backspace key to remove the last tag
        if ( event.key === 'Backspace' && input.value === '') {
        removeLastTag();
        }
    });

  

}