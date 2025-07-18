# PF2e Inline Roll Converter: Interactive Modification System Implementation Plan

## Phase 2: Interactive Modification System

### 1. Refactor Output Rendering for Interactivity
- [ ] 1.1. **Wrap Converted Elements**
    - [ ] Update the text processing pipeline to wrap each converted element (inline roll, condition, link, etc.) in a uniquely identifiable, clickable container (e.g., `<span class="pf2e-interactive" data-id="...">...</span>`).
    - [ ] Assign a unique ID and store element type and parameters as data attributes or in a JS state object.
- [ ] 1.2. **Store Element State**
    - [ ] Maintain a mapping of element IDs to their current parameters (type, DC, traits, etc.) for later modification.

### 2. Implement Element Selection Logic
- [ ] 2.1. **Add Click Handlers**
    - [ ] Add event listeners to interactive elements in the output panel so that clicking an element selects it.
- [ ] 2.2. **Visual Feedback for Selection**
    - [ ] Highlight the selected element (e.g., border, background color).
    - [ ] Deselect previously selected elements.

### 3. Build the Modifier Panel (Right Side)
- [ ] 3.1. **Create Modifier Panel UI**
    - [ ] Add a right-side panel in the dialog for element modification.
    - [ ] Make the panel context-sensitive: show controls based on the selected element’s type.
- [ ] 3.2. **Implement Controls for Each Element Type**
    - [ ] Skill/Check: Dropdown for skill, numeric input for DC, checkboxes for secret/basic, trait input.
    - [ ] Save: Dropdown for save type, numeric input for DC, basic flag.
    - [ ] Damage: Dice expression input, dropdown for damage type, checkboxes for persistent/splash/precision, notes.
    - [ ] Condition: Dropdown for condition, numeric input for value (if applicable), display text.
    - [ ] Compendium Link: Text input for display text, UUID (advanced).
    - [ ] (Expand as needed for other types.)

### 4. Two-Way Data Binding and Live Updates
- [ ] 4.1. **Update Element State on Modification**
    - [ ] When a user changes a property in the modifier panel, update the corresponding element’s state in JS.
- [ ] 4.2. **Re-render Output and Preview**
    - [ ] Regenerate the output panel’s HTML to reflect changes.
    - [ ] Update the live preview to show the new output.
- [ ] 4.3. **Preserve Modifications**
    - [ ] Ensure that user modifications persist during further edits and mode switches.

### 5. Visual Feedback and Validation
- [ ] 5.1. **Show Modified State**
    - [ ] Visually indicate elements that have been modified (e.g., green tint, icon).
- [ ] 5.2. **Validation Feedback**
    - [ ] Validate user input in real time (e.g., DC must be numeric, valid skill names).
    - [ ] Show error messages or red highlight for invalid input.

### 6. Edit/Preview Mode Toggle
- [ ] 6.1. **Implement Mode Toggle**
    - [ ] Allow users to switch between Edit Mode (interactive) and Live Preview Mode (WYSIWYG).
    - [ ] In Edit Mode, show interactive wrappers and modifier panel.
    - [ ] In Preview Mode, render output as Foundry would display it, with no interactive controls.

### 7. Final Output Generation
- [ ] 7.1. **Generate Clean Output**
    - [ ] When copying or exporting, strip all interactive markup and output only the final PF2e inline roll syntax and links.

---

**Tip:**  
Start with a minimal working version (e.g., just skill checks or damage rolls) and expand to other element types once the system is working.

Let me know if you want code scaffolding for any of these steps!