# PF2e Inline Roll Converter: Interactive Modification System Implementation Plan

## Phase 2: Interactive Modification System

Check off tasks as they are completed.

### 1. Refactor Output Rendering for Interactivity
- [x] 1.1. **Wrap Converted Elements**
    - [x] 1.1.1. Update the text processing pipeline to wrap each converted element (inline roll, condition, link, etc.) in a uniquely identifiable, clickable container (e.g., `<span class="pf2e-interactive" data-id="..."></span>`).
    - [x] 1.1.2. Assign a unique ID and store element type and parameters as data attributes or in a JS state object.
- [x] 1.2. **Store Element State**
    - [x] 1.2.1. Maintain a mapping of element IDs to their current parameters (type, DC, traits, etc.) for later modification.
    - [x] 1.2.2. Clear or update the global state object (e.g., window.pf2eInteractiveElements) on each re-render to avoid memory leaks or stale data.

### 2. Implement Element Selection Logic
- [x] 2.1. **Add Click Handlers**
    - [x] 2.1.1. Add event listeners to interactive elements in the output panel so that clicking an element selects it.
- [x] 2.2. **Visual Feedback for Selection**
    - [x] 2.2.1. Highlight the selected element (e.g., border, background color).
    - [x] 2.2.2. Deselect previously selected elements.

### 3. Build the Modifier Panel (Right Side)
- [x] 3.1. **Create Modifier Panel UI**
    - [x] 3.1.1. Add a right-side panel in the dialog for element modification.
    - [x] 3.1.2. Make the panel context-sensitive: show controls based on the selected element’s type.
- [ ] 3.2. **Implement Controls for Each Element Type**
    - [x] 3.2.1. Skill/Check: Dropdown for skill, numeric input for DC, checkboxes for secret/basic, trait input.
    - [x] 3.2.2. Save: Dropdown for save type, numeric input for DC, basic flag.
    - [x] 3.2.3. Damage: Dice expression input, dropdown for damage type, checkboxes for persistent/splash/precision, notes.
    - [x] 3.2.4. Condition: Dropdown for condition, numeric input for value (if applicable), display text.
- [ ] 3.3. **Universal Controls**
    - [x] 3.3.1. Add Display Text option for all elements

### 4. Two-Way Data Binding and Live Updates
- [x] 4.1. **Update Element State on Modification**
    - [x] 4.1.1. When a user changes a property in the modifier panel, update the corresponding element’s state in JS.
    - [x] 4.1.2. Ensure two-way binding: changes in the modifier panel update the state and trigger a re-render of the output and preview panels.
- [x] 4.2. **Re-render Output and Preview**
    - [x] 4.2.1. Regenerate the output panel’s HTML to reflect changes.
    - [x] 4.2.2. Update the live preview to show the new output.
- [x] 4.3. **Preserve Modifications**
    - [x] 4.3.1. Ensure that user modifications persist during further edits and mode switches.

### 5. Visual Feedback and Validation
- [x] 5.1. **Show Modified State**
    - [x] 5.1.1. Visually indicate elements that have been modified (e.g., green tint).
    - [x] 5.1.2. Allow user to reset an element to its original parameters
- [ ] 5.2. **Validation Feedback**
    - [ ] 5.2.1. Validate user input in real time (e.g., DC must be numeric, valid skill names).
    - [ ] 5.2.2. Show error messages or red highlight for invalid input.

### 6. Edit/Preview Mode Toggle
- [ ] 6.1. **Implement Mode Toggle**
    - [ ] 6.1.1. Allow users to switch between Edit Mode (interactive) and Live Preview Mode (WYSIWYG).
    - [ ] 6.1.2. In Edit Mode, show interactive wrappers and modifier panel.
    - [ ] 6.1.3. In Preview Mode, render output as Foundry would display it, with no interactive controls.

### 7. Final Output Generation
- [ ] 7.1. **Generate Clean Output**
    - [ ] 7.1.1. When copying or exporting, strip all interactive markup and output only the final PF2e inline roll syntax and links.

---

**Tip:**  
Start with a minimal working version (e.g., just skill checks or damage rolls) and expand to other element types once the system is working.