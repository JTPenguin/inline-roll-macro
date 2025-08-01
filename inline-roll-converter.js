/**
 * PF2e Inline Roll Converter
 * 
 * Converts plain text descriptions into Foundry VTT inline automation syntax
 * for the Pathfinder 2e Remaster system.
 */

// Define a test input for demonstration and testing
const DEFAULT_TEST_INPUT = `You can Administer First Aid. Deal 4d6 fire damage and 2d4 persistent acid damage. The target becomes frightened 2 and clumsy 1. DC 21 Reflex save. DC 18 Arcana check or DC 18 Occultism check. Heal 3d8 hit points. 30-foot cone. Within 15 feet. Can't use this action again for 1d4 rounds. Use the Shove action.`;

/**
 * ModifierPanelManager - Handles the generation and management of modifier panels
 * for interactive replacement elements
 */
class ModifierPanelManager {
    // Shared label width for all modifier panel labels
    static labelWidth = '100px';
    
    constructor() {
        console.log('[PF2e Converter] Creating ModifierPanelManager instance');
    }
    // DRY: Render the panel header (title + reset button)
    renderPanelHeader(title) {
        return `
            <div class="modifier-field-row">
                <span class="modifier-panel-label bold panel-title">${title}</span>
                <button type="button" id="modifier-reset-btn" title="Reset this roll to its original state" class="modifier-panel-input" style="margin-left: auto; display: inline-flex; align-items: center; gap: 3px; font-size: 11px; padding: 2px 7px; height: 22px; width: auto; border-radius: 4px; background: #f4f4f4; border: 1px solid #bbb; color: #1976d2; cursor: pointer; transition: background 0.2s, border 0.2s; vertical-align: middle;">
                    Reset
                </button>
            </div>
        `;
    }

    // DRY: Render a group of fields
    renderFields(fields, target, prefix = '') {
        return fields.map((field, idx) => {
            if (field.showIf && !field.showIf(target)) return '';
            const value = field.getValue(target);
            const fieldId = prefix ? `${prefix}-${field.id}` : field.id;
            const commonAttrs = `id="${fieldId}" class="modifier-panel-input"`;
            let containerStyle = '';
            if (field.hideIf && field.hideIf(target)) {
                containerStyle = 'display: none;';
            }
            // Use CSS class for all field containers
            let rowClass = 'modifier-field-row';
            let labelClass = 'modifier-panel-label';
            switch (field.type) {
                case 'select':
                    const optionsArray = typeof field.options === 'function' ? field.options(target) : field.options;
                    const options = (optionsArray || []).map(option => {
                        const optionValue = typeof option === 'object' ? option.value : option;
                        const optionLabel = typeof option === 'object' ? option.label : option;
                        const selected = optionValue === value ? 'selected' : '';
                        return `<option value="${optionValue}" ${selected}>${optionLabel}</option>`;
                    }).join('');
                    return `
                        <div id="${fieldId}-container" class="${rowClass}" style="${containerStyle}">
                            <label class="${labelClass}">${field.label}</label>
                            <select ${commonAttrs}>
                                ${options}
                            </select>
                        </div>
                    `;
                case 'number':
                    const minAttr = field.min !== undefined ? `min="${field.min}"` : '';
                    return `
                        <div id="${fieldId}-container" class="${rowClass}" style="${containerStyle}">
                            <label class="${labelClass}">${field.label}</label>
                            <input type="number" ${commonAttrs} ${minAttr} value="${value}" />
                        </div>
                    `;
                case 'checkbox':
                    const checked = value ? 'checked' : '';
                    return `
                        <div id="${fieldId}-container" class="${rowClass}" style="${containerStyle}">
                            <label class="${labelClass}">${field.label}</label>
                            <input type="checkbox" id="${fieldId}" class="modifier-panel-checkbox" ${checked} />
                        </div>
                    `;
                case 'text':
                    const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
                    return `
                        <div id="${fieldId}-container" class="${rowClass}" style="${containerStyle}">
                            <label class="${labelClass}">${field.label}</label>
                            <input type="text" ${commonAttrs} ${placeholder} value="${value}" onkeydown="event.stopPropagation();" />
                        </div>
                    `;
                case 'textarea':
                    const textareaPlaceholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
                    const rows = field.rows || 3;
                    return `
                        <div id="${fieldId}-container" class="${rowClass}" style="${containerStyle}">
                            <label class="${labelClass}">${field.label}</label>
                            <textarea ${commonAttrs} ${textareaPlaceholder} rows="${rows}">${value}</textarea>
                        </div>
                    `;
                case 'multiselect':
                    const selectedValues = Array.isArray(value) ? value : [value];
                    const multiOptionsArray = typeof field.options === 'function' ? field.options(target) : field.options;
                    const multiOptions = (multiOptionsArray || []).map(option => {
                        const optionValue = typeof option === 'object' ? option.value : option;
                        const optionLabel = typeof option === 'object' ? option.label : option;
                        const selected = selectedValues.includes(optionValue) ? 'selected' : '';
                        return `<option value="${optionValue}" ${selected}>${optionLabel}</option>`;
                    }).join('');
                    return `
                        <div id="${fieldId}-container" class="${rowClass}" style="${containerStyle}">
                            <label class="${labelClass}">${field.label}</label>
                            <select ${commonAttrs} multiple>
                                ${multiOptions}
                            </select>
                        </div>
                    `;
                case 'traits':
                    const uniqueId = `${fieldId}-container`;
                    return `
                        <div id="${fieldId}-container" class="${rowClass}" style="${containerStyle}">
                            <label class="${labelClass}">${field.label}</label>
                            <div id="${uniqueId}" style="flex: 1;"></div>
                        </div>
                    `;
                default:
                    return `<div id="${fieldId}-container" class="${rowClass}" style="${containerStyle}">Unknown field type: ${field.type}</div>`;
            }
        }).join('');
    }

    // DRY: Render common traits checkboxes
    renderCommonTraits(commonTraits, rep, type) {
        if (!commonTraits || !commonTraits.length) return '';
        return commonTraits.map(trait => {
                const isChecked = rep.traits && rep.traits.includes(trait);
                return `
                    <div class="modifier-field-row">
                        <label class="modifier-panel-label">${trait.charAt(0).toUpperCase() + trait.slice(1)}</label>
                        <input type="checkbox" id="${type}-trait-${trait}" class="modifier-panel-checkbox" ${isChecked ? 'checked' : ''} />
                    </div>
                `;
            }).join('');
    }

    // DRY: Render traits field
    renderTraitsField(config, type) {
        if (config.showTraits === false) return '';
            const traitsContainerId = `${type}-traits-container-${Math.random().toString(36).substr(2, 9)}`;
        return `
                <div class="modifier-field-row">
                    <label class="modifier-panel-label">Traits</label>
                    <div id="${traitsContainerId}" style="flex: 1;"></div>
                </div>
            `;
        }

    generatePanelHTML(type, rep) {
        const Cls = REPLACEMENT_CLASS_MAP[type];
        const config = Cls?.panelConfig;
        if (!config) {
            return this.generateJSONPanel(type, rep);
        }
        if (type === 'damage' && config.isMultiComponent) {
            return this.generateDamagePanelHTML(rep, config);
        }
        // Split out display text field if present
        const displayTextFieldIndex = config.fields.findIndex(f => f.id === 'display-text');
        let fieldsBeforeDisplayText = config.fields;
        let displayTextField = null;
        if (displayTextFieldIndex !== -1) {
            fieldsBeforeDisplayText = config.fields.slice(0, displayTextFieldIndex).concat(config.fields.slice(displayTextFieldIndex + 1));
            displayTextField = config.fields[displayTextFieldIndex];
        }
        return `
            <form id="${type}-modifier-form" style="display: flex; flex-direction: column; gap: 10px;">
                ${this.renderPanelHeader(config.title)}
                ${this.renderFields(fieldsBeforeDisplayText, rep)}
                ${this.renderCommonTraits(config.commonTraits, rep, type)}
                ${this.renderTraitsField(config, type)}
                ${displayTextField ? this.renderFields([displayTextField], rep) : ''}
            </form>
        `;
    }

    generateDamagePanelHTML(rep, config) {
        if (!rep.damageComponents || !Array.isArray(rep.damageComponents)) {
            rep.damageComponents = [];
        }
        // Render the Enabled field separately at the top
        const enabledField = config.fields.find(f => f.id === 'enabled');
        const enabledFieldHTML = enabledField ? this.renderFields([enabledField], rep) : '';
        const otherFields = config.fields.filter(f => f.id !== 'enabled');
        const componentSections = rep.damageComponents.map((component, index) => {
            return `
                <div class="damage-component" data-component-index="${index}">
                    <div class="modifier-field-row" style="justify-content: space-between; align-items: center;">
                        <div class="damage-component-label">Damage Partial ${index + 1}</div>
                    </div>
                    ${this.renderFields(config.componentFields, component, `damage-${index}`)}
                </div>
            `;
        }).join('');
        return `
            <form id="damage-modifier-form" style="display: flex; flex-direction: column; gap: 10px;">
                ${this.renderPanelHeader(config.title)}
                ${enabledFieldHTML}
                ${componentSections}
                ${this.renderFields(otherFields, rep)}
            </form>
        `;
    }
    
    generateFieldHTML(field, rep) {
        const isHidden = field.showIf && !field.showIf(rep);
        const value = field.getValue(rep);
        const commonAttrs = `id="${field.id}" style="width: 100%;"`;
        const labelWidth = ModifierPanelManager.labelWidth;
        let containerStyle = '';
        if (field.hideIf && field.hideIf(rep)) {
            containerStyle = 'display: none;';
        }
        switch (field.type) {
            case 'select':
                const options = field.options.map(option => {
                    const optionValue = typeof option === 'object' ? option.value : option;
                    const optionLabel = typeof option === 'object' ? option.label : option;
                    const selected = optionValue === value ? 'selected' : '';
                    return `<option value="${optionValue}" ${selected}>${optionLabel}</option>`;
                }).join('');
                return `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label style="width: ${labelWidth}; flex-shrink: 0;">${field.label}</label>
                        <select ${commonAttrs}>
                            ${options}
                        </select>
                    </div>
                `;
            case 'number':
                const minAttr = field.min !== undefined ? `min="${field.min}"` : '';
                const containerStyle = field.showIf && !field.showIf(rep) ? 'display: none;' : 'display: flex;';
                const html = `
                    <div id="${field.id}-container" class="${rowClass}" style="${containerStyle}; align-items: center; gap: 8px;">
                        <label style="width: ${labelWidth}; flex-shrink: 0;">${field.label}</label>
                        <input type="number" ${commonAttrs} ${minAttr} value="${value}" />
                    </div>
                `;
                return html;
            case 'checkbox':
                const checked = value ? 'checked' : '';
                return `
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <label style="width: ${labelWidth}; flex-shrink: 0;">${field.label}</label>
                        <input type="checkbox" id="${field.id}" ${checked} style="width: auto; margin: 0;" />
                    </div>
                `;
            case 'text':
                const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
                return `
                    <div id="${field.id}-container" style="display: flex; align-items: center; gap: 8px; ${containerStyle}">
                        <label style="width: ${labelWidth}; flex-shrink: 0;">${field.label}</label>
                        <input type="text" ${commonAttrs} ${placeholder} value="${value}" onkeydown="event.stopPropagation();" />
                    </div>
                `;
            case 'textarea':
                const textareaPlaceholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
                const rows = field.rows || 3;
                return `
                    <div style="display: flex; gap: 8px;">
                        <label style="width: ${labelWidth}; flex-shrink: 0; margin-top: 4px;">${field.label}</label>
                        <textarea ${commonAttrs} ${textareaPlaceholder} rows="${rows}">${value}</textarea>
                    </div>
                `;
            case 'multiselect':
                const selectedValues = Array.isArray(value) ? value : [value];
                const multiOptions = field.options.map(option => {
                    const optionValue = typeof option === 'object' ? option.value : option;
                    const optionLabel = typeof option === 'object' ? option.label : option;
                    const selected = selectedValues.includes(optionValue) ? 'selected' : '';
                    return `<option value="${optionValue}" ${selected}>${optionLabel}</option>`;
                }).join('');
                return `
                    <div style="display: flex; gap: 8px;">
                        <label style="width: ${labelWidth}; flex-shrink: 0; margin-top: 4px;">${field.label}</label>
                        <select ${commonAttrs} multiple>
                            ${multiOptions}
                        </select>
                    </div>
                `;
            case 'traits':
                const uniqueId = `${field.id}-container-${Math.random().toString(36).substr(2, 9)}`;
                return `
                    <div style="display: flex; gap: 8px;">
                        <label style="width: ${labelWidth}; flex-shrink: 0; margin-top: 8px;">${field.label}</label>
                        <div id="${uniqueId}" style="flex: 1;"></div>
                    </div>
                `;
            default:
                return `<div>Unknown field type: ${field.type}</div>`;
        }
    }
    generateJSONPanel(type, rep) {
        return `
            <div>
                <div style="font-weight: bold; margin-bottom: 5px; color: #1976d2;">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
                <div><strong>Type:</strong> ${type}</div>
                <div><strong>Parameters:</strong></div>
                <pre style="background:#f0f0f0; border-radius:4px; padding:6px; font-size:12px; max-height:200px; overflow-y:auto;">${JSON.stringify(rep, null, 2)}</pre>
            </div>
        `;
    }
    addFormListeners(formElement, type, rep, onChangeCallback) {
        const Cls = REPLACEMENT_CLASS_MAP[type];
        const config = Cls?.panelConfig;
        if (!config) return;
        if (type === 'damage' && config.isMultiComponent) {
            this.addDamageFormListeners(formElement, rep, config, onChangeCallback);
            return;
        }
        let traitsInput = null;
        const traitsContainer = formElement.querySelector('[id*="traits-container"]');
        if (traitsContainer) {
            traitsInput = new TraitsInput(traitsContainer.id, {
                placeholder: 'Type trait name and press Enter...',
                onChange: (selectedTraits) => {
                    let enhancedTraits = selectedTraits.map(t => t.value);
                    rep.traits = enhancedTraits;
                    if (config.commonTraits) {
                        config.commonTraits.forEach(trait => {
                            const traitCheckbox = formElement.querySelector(`#${type}-trait-${trait}`);
                            if (traitCheckbox) {
                                const hasTrait = enhancedTraits.includes(trait);
                                if (traitCheckbox.checked !== hasTrait) {
                                    traitCheckbox.checked = hasTrait;
                                }
                            }
                        });
                    }
                    const secretField = config.fields.find(field => field.id.includes('secret'));
                    if (secretField) {
                        const secretElement = formElement.querySelector(`#${secretField.id}`);
                        if (secretElement) {
                            const hasSecret = enhancedTraits.includes('secret');
                            if (secretElement.checked !== hasSecret) {
                                secretElement.checked = hasSecret;
                            }
                        }
                    }
                    if (onChangeCallback) {
                        onChangeCallback(rep);
                    }
                }
            });
            if (rep.traits && Array.isArray(rep.traits)) {
                traitsInput.setValue(rep.traits);
            }
        }
        // Remove custom listeners for field visibility (Lore Name, Condition Value, Template Width)
        // Instead, use the generic updateFieldVisibility below
        // Initial update after render
        this.updateFieldVisibility(formElement, config.fields, rep);
        formElement.addEventListener('input', (event) => {
            let shouldTriggerCallback = false;
            config.fields.forEach(field => {
                const element = formElement.querySelector(`#${field.id}`);
                if (element && element === event.target) {
                    let value;
                    switch (field.type) {
                        case 'checkbox':
                            value = element.checked;
                            break;
                        case 'number':
                            value = element.value;
                            break;
                        case 'multiselect':
                            value = Array.from(element.selectedOptions).map(option => option.value);
                            break;
                        case 'textarea':
                        case 'text':
                        default:
                            value = element.value;
                    }
                    field.setValue(rep, value);
                    shouldTriggerCallback = true;
                    // If the action-name field was changed, force immediate re-render
                    if (field.id === 'action-name' && typeof onChangeCallback === 'function') {
                        onChangeCallback(rep, 'action-name');
                        return; // Prevent double-calling below
                    }
                }
            });
            // Update all field visibility generically
            this.updateFieldVisibility(formElement, config.fields, rep);
            if (shouldTriggerCallback && onChangeCallback) {
                onChangeCallback(rep, undefined);
            }
            if (config.commonTraits) {
                if (!rep.traits) rep.traits = [];
                let enhancedTraits = [];
                if (traitsInput) {
                    enhancedTraits = traitsInput.getValue();
                }
                let checkboxTraits = [];
                config.commonTraits.forEach(trait => {
                    const element = formElement.querySelector(`#${type}-trait-${trait}`);
                    if (element && element.checked) {
                        checkboxTraits.push(trait);
                    }
                });
                const allTraits = [...new Set([...enhancedTraits, ...checkboxTraits])];
                rep.traits = allTraits;
                if (traitsInput) {
                    const currentValues = traitsInput.getValue();
                    const currentSet = new Set(currentValues);
                    const newSet = new Set(allTraits);
                    const hasChanged = currentSet.size !== newSet.size || 
                        [...currentSet].some(trait => !newSet.has(trait)) ||
                        [...newSet].some(trait => !currentSet.has(trait));
                    if (hasChanged) {
                        traitsInput.setValue(allTraits, false);
                    }
                }
            }
            if (onChangeCallback) {
                onChangeCallback(rep, undefined);
            }
        });
        formElement.addEventListener('change', (event) => {
            let shouldTriggerCallback = false;
            config.fields.forEach(field => {
                const element = formElement.querySelector(`#${field.id}`);
                if (element && element === event.target && field.type === 'checkbox') {
                    field.setValue(rep, element.checked);
                    shouldTriggerCallback = true;
                }
            });
            // Update all field visibility generically
            this.updateFieldVisibility(formElement, config.fields, rep);
            if (config.commonTraits && config.commonTraits.includes(event.target.id.replace(`${type}-trait-`, ''))) {
                const traitName = event.target.id.replace(`${type}-trait-`, '');
                const isChecked = event.target.checked;
                if (!rep.traits) rep.traits = [];
                let currentTraits = [];
                if (traitsInput) {
                    currentTraits = traitsInput.getValue();
                }
                if (isChecked && !currentTraits.includes(traitName)) {
                    currentTraits.push(traitName);
                } else if (!isChecked && currentTraits.includes(traitName)) {
                    currentTraits = currentTraits.filter(trait => trait !== traitName);
                }
                rep.traits = currentTraits;
                if (traitsInput) {
                    traitsInput.setValue(currentTraits, false);
                }
                shouldTriggerCallback = true;
            }
            if (shouldTriggerCallback && onChangeCallback) {
                onChangeCallback(rep, undefined);
            }
            // Update all field visibility generically
            this.updateFieldVisibility(formElement, config.fields, rep);
        });
        // No need for custom listeners for select fields; generic update handles all
    }
    addDamageFormListeners(formElement, rep, config, onChangeCallback) {
        if (!rep.damageComponents || !Array.isArray(rep.damageComponents)) {
            rep.damageComponents = [];
        }
        const updateComponents = () => {
            rep.damageComponents.forEach((component, componentIndex) => {
                config.componentFields.forEach(field => {
                    const element = formElement.querySelector(`#damage-${componentIndex}-${field.id}`);
                    if (element) {
                        let value;
                        switch (field.type) {
                            case 'checkbox':
                                value = element.checked;
                                break;
                            case 'select':
                            case 'text':
                            default:
                                value = element.value;
                        }
                        field.setValue(component, value);
                    }
                });
            });
            if (config.fields) {
                config.fields.forEach(field => {
                    const element = formElement.querySelector(`#${field.id}`);
                    if (element) {
                        let value;
                        switch (field.type) {
                            case 'checkbox':
                                value = element.checked;
                                break;
                            case 'select':
                            case 'text':
                            default:
                                value = element.value;
                        }
                        field.setValue(rep, value);
                    }
                });
            }
            if (onChangeCallback) {
                onChangeCallback(rep);
            }
        };
        formElement.addEventListener('input', updateComponents);
        formElement.addEventListener('change', (event) => {
            const componentSelectMatch = event.target.id.match(/^damage-(\d+)-(category|damage-type)$/);
            if (componentSelectMatch) {
                const componentIndex = parseInt(componentSelectMatch[1]);
                const fieldName = componentSelectMatch[2];
                const component = rep.damageComponents[componentIndex];
                if (component) {
                    if (fieldName === 'category') {
                        const field = config.componentFields.find(f => f.id === 'category');
                        if (field) {
                            field.setValue(component, event.target.value);
                        }
                    } else {
                        component[fieldName] = event.target.value;
                    }
                    if (onChangeCallback) {
                        onChangeCallback(rep);
                    }
                }
            }
            if (config.fields && config.fields.some(field => field.id === event.target.id)) {
                updateComponents();
            }
        });
    }

    // Generic function to update field visibility based on hideIf/showIf
    updateFieldVisibility(formElement, fields, rep, prefix = '') {
        fields.forEach(field => {
            const fieldId = prefix ? `${prefix}-${field.id}` : field.id;
            const container = formElement.querySelector(`#${fieldId}-container`);
            if (!container) return;
            let hidden = false;
            if (field.hideIf && field.hideIf(rep)) hidden = true;
            if (field.showIf && !field.showIf(rep)) hidden = true;
            container.style.display = hidden ? 'none' : '';
        });
    }
}

/**
 * ConverterDialog - Central state management for the PF2e Converter
 * Eliminates global state pollution and provides clear ownership of all dialog state
 */
class ConverterDialog {
    constructor() {
        console.log('[PF2e Converter] Creating ConverterDialog instance');
        
        // Centralized state object - all dialog state goes here
        this.data = {
            inputText: '',
            replacements: [],
            selectedElementId: null,
            lastRawOutput: '',
            conditionMap: new Map(),
            interactiveElements: {},
            isInitialized: false
        };
        
        // Core processing components
        console.log('[PF2e Converter] Creating TextProcessor instance');
        this.processor = new TextProcessor();
        console.log('[PF2e Converter] Creating ModifierPanelManager instance');
        this.modifierManager = new ModifierPanelManager();
        
        // DOM element references
        this.ui = {};
        
        // Initialize condition mapping
        console.log('[PF2e Converter] Initializing condition map');
        this.initializeConditionMap();
        
        console.log('[PF2e Converter] ConverterDialog constructor completed');
    }
    
    /**
     * Initialize condition mapping for the dialog instance
     */
    initializeConditionMap() {
        console.log('[PF2e Converter] Building condition map');
        this.data.conditionMap = buildConditionMap();
        console.log('[PF2e Converter] Condition map built with', this.data.conditionMap.size, 'entries');
    }
    
    /**
     * Update replacements and trigger UI updates
     * @param {Array} newReplacements - Array of replacement objects
     */
    updateReplacements(newReplacements) {
        console.log('[PF2e Converter] Updating replacements:', newReplacements.length, 'items');
        this.data.replacements = newReplacements;
        this.renderOutput();
        this.renderLivePreview();
    }
    
    /**
     * Handle element selection and modifier panel updates
     * @param {string} elementId - ID of the selected element
     */
    selectElement(elementId) {
        console.log('[PF2e Converter] Selecting element:', elementId);
        this.data.selectedElementId = elementId;
        this.renderModifierPanel();
        this.updateElementHighlighting();
    }
    
    /**
     * Handle element deselection and modifier panel updates
     */
    deselectElement() {
        console.log('[PF2e Converter] Deselecting element');
        this.data.selectedElementId = null;
        this.renderModifierPanel();
        this.updateElementHighlighting();
    }
    
    /**
     * Process input text and generate replacements
     * @param {string} inputText - Text to process
     */
    processInput(inputText) {
        console.log('[PF2e Converter] Processing input text, length:', inputText.length);
        this.data.inputText = inputText;
        this.data.selectedElementId = null; // Clear selection on input change
        
        if (inputText.trim()) {
            const newReplacements = this.processor.process(inputText, this.data);
            this.updateReplacements(newReplacements);
        } else {
            this.updateReplacements([]);
        }
    }
    
    /**
     * Clear all state and reset UI
     */
    clearAll() {
        console.log('[PF2e Converter] Clearing all data');
        this.data.inputText = '';
        this.data.replacements = [];
        this.data.selectedElementId = null;
        this.data.lastRawOutput = '';
        
        if (this.ui.inputTextarea) {
            this.ui.inputTextarea.val('');
        }
        this.renderOutput();
        this.renderLivePreview();
        this.renderModifierPanel();
    }
    
    /**
     * Copy current output to clipboard
     */
    copyOutput() {
        console.log('[PF2e Converter] Copying output to clipboard');
        const outputText = this.data.lastRawOutput || this.processor.renderFromReplacements(this.data.inputText, this.data.replacements);
        copyToClipboard(outputText);
    }
    
    /**
     * Render the converted output
     */
    renderOutput() {
        if (!this.data.isInitialized) {
            console.log('[PF2e Converter] Skipping renderOutput - not initialized');
            return;
        }
        
        console.log('[PF2e Converter] Rendering output');
        const outputText = this.processor.renderFromReplacements(this.data.inputText, this.data.replacements, true, this.data);
        this.data.lastRawOutput = outputText;
        
        if (this.ui.outputHtmlDiv) {
            this.ui.outputHtmlDiv.innerHTML = `<pre style="margin: 0; white-space: pre-wrap; font-family: monospace; font-size: 12px;">${outputText}</pre>`;
            
            // Setup interactive element handlers after rendering output
            this.setupInteractiveElementHandlers();
        }
    }
    
    /**
     * Render the live preview
     */
    renderLivePreview() {
        if (!this.data.isInitialized) {
            console.log('[PF2e Converter] Skipping renderLivePreview - not initialized');
            return;
        }
        
        console.log('[PF2e Converter] Rendering live preview');
        const outputText = this.processor.renderFromReplacements(this.data.inputText, this.data.replacements, false, this.data);
        
        if (this.ui.livePreview) {
            createLivePreview(outputText, this.ui.livePreview);
        }
    }
    
    /**
     * Render the modifier panel
     */
    renderModifierPanel() {
        if (!this.data.isInitialized) {
            console.log('[PF2e Converter] Skipping renderModifierPanel - not initialized');
            return;
        }
        
        console.log('[PF2e Converter] Rendering modifier panel');
        const selectedElementId = this.data.selectedElementId;
        
        if (selectedElementId && this.data.interactiveElements[selectedElementId]) {
            const rep = this.data.interactiveElements[selectedElementId];
            const panelHTML = this.modifierManager.generatePanelHTML(rep.type, rep);
            
            if (this.ui.modifierPanelContent) {
                this.ui.modifierPanelContent.innerHTML = panelHTML;
                this.setupModifierPanelHandlers(rep);
            }
        } else {
            if (this.ui.modifierPanelContent) {
                this.ui.modifierPanelContent.innerHTML = '<em>Select an element to modify.</em>';
            }
        }
    }
    
    /**
     * Setup modifier panel event handlers
     * @param {Object} rep - The replacement object
     */
    setupModifierPanelHandlers(rep) {
        const formElement = this.ui.modifierPanelContent.querySelector('form');
        if (formElement) {
            // Setup form listeners
            this.modifierManager.addFormListeners(
                formElement, 
                rep.type, 
                rep, 
                (modifiedRep, changedFieldId) => this.handleModifierChange(modifiedRep, changedFieldId)
            );
            
            // Setup reset button handler
            this.attachResetButtonHandler(rep, rep.type);
        }
    }
    
    /**
     * Setup interactive element handlers for the output area
     */
    setupInteractiveElementHandlers() {
        console.log('[PF2e Converter] Setting up interactive element handlers');
        if (!this.ui.outputHtmlDiv) {
            console.log('[PF2e Converter] No output element found');
            return;
        }
        
        const interactiveElements = this.ui.outputHtmlDiv.querySelectorAll('.pf2e-interactive');
        console.log('[PF2e Converter] Found', interactiveElements.length, 'interactive elements');
        
        interactiveElements.forEach(element => {
            const elementId = element.getAttribute('data-id');
            if (elementId) {
                // Remove any existing click handlers to prevent duplicates
                element.style.cursor = 'pointer';
                
                // Use a new event handler each time
                element.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[PF2e Converter] Interactive element clicked:', elementId);
                    
                    // Toggle selection: deselect if already selected, select if not
                    if (this.data.selectedElementId === elementId) {
                        console.log('[PF2e Converter] Deselecting element:', elementId);
                        this.deselectElement();
                    } else {
                        console.log('[PF2e Converter] Selecting element:', elementId);
                        this.selectElement(elementId);
                    }
                };
            }
        });
    }
    
    /**
     * Update element highlighting in the output area
     */
    updateElementHighlighting() {
        if (!this.ui.outputHtmlDiv) return;
        
        // Remove previous highlighting
        const allElements = this.ui.outputHtmlDiv.querySelectorAll('.pf2e-interactive');
        allElements.forEach(el => {
            el.classList.remove('selected');
        });
        
        // Add highlighting to selected element
        if (this.data.selectedElementId) {
            const selectedElement = this.ui.outputHtmlDiv.querySelector(`[data-id="${this.data.selectedElementId}"]`);
            if (selectedElement) {
                selectedElement.classList.add('selected');
            }
        }
    }
    
    /**
     * Handle modifier changes from the panel
     * @param {Object} rep - The replacement object
     * @param {string} changedFieldId - ID of the changed field
     */
    handleModifierChange(rep, changedFieldId) {
        console.log('[PF2e Converter] Handling modifier change:', changedFieldId);
        if (rep.markModified) {
            rep.markModified();
        }
        this.renderOutput();
        this.renderLivePreview();
        this.updateElementHighlighting();
    }
    
    /**
     * Attach reset button handler to a replacement
     * @param {Object} rep - The replacement object
     * @param {string} type - The replacement type
     */
    attachResetButtonHandler(rep, type) {
        const resetBtn = document.getElementById('modifier-reset-btn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                console.log('[PF2e Converter] Resetting replacement to original');
                rep.resetToOriginal();
                this.renderOutput();
                this.renderLivePreview();
                this.renderModifierPanel();
                this.updateElementHighlighting();
            };
        }
    }
    
    /**
     * Setup all event handlers
     */
    setupEventHandlers() {
        console.log('[PF2e Converter] Setting up event handlers');
        this.setupInputHandlers();
        this.setupButtonHandlers();
    }
    
    /**
     * Setup input handlers
     */
    setupInputHandlers() {
        console.log('[PF2e Converter] Setting up input handlers');
        if (this.ui.inputTextarea) {
            this.ui.inputTextarea.on('input', (e) => {
                this.processInput(e.target.value);
            });
        }
    }
    
    /**
     * Setup button handlers
     */
    setupButtonHandlers() {
        console.log('[PF2e Converter] Setting up button handlers');
        if (this.ui.copyButton) {
            this.ui.copyButton.on('click', () => {
                this.copyOutput();
            });
        }
        
        if (this.ui.clearButton) {
            this.ui.clearButton.on('click', () => {
                this.clearAll();
            });
        }
    }
    
    /**
     * Initialize UI references
     * @param {Object} html - jQuery object containing the dialog HTML
     */
    initializeUI(html) {
        console.log('[PF2e Converter] Initializing UI references');
        this.ui.inputTextarea = html.find('#input-text');
        this.ui.outputHtmlDiv = html.find('#output-html')[0];
        this.ui.livePreview = html.find('#live-preview')[0];
        this.ui.modifierPanelContent = html.find('#modifier-panel-content')[0];
        this.ui.copyButton = html.find('#copy-output');
        this.ui.clearButton = html.find('#clear-all');
        
        console.log('[PF2e Converter] UI elements found:', {
            inputTextarea: !!this.ui.inputTextarea.length,
            outputHtmlDiv: !!this.ui.outputHtmlDiv,
            livePreview: !!this.ui.livePreview,
            modifierPanelContent: !!this.ui.modifierPanelContent,
            copyButton: !!this.ui.copyButton.length,
            clearButton: !!this.ui.clearButton.length
        });
        
        // Process initial input if present
        const initialText = this.ui.inputTextarea.val();
        if (initialText && initialText.trim()) {
            this.data.inputText = initialText;
        }
        else {
            console.log('[PF2e Converter] No initial input text found');
            this.data.inputText = '';
        }

        this.data.isInitialized = true;
        console.log('[PF2e Converter] Processing initial input text');
        this.processInput(this.data.inputText);
        console.log('[PF2e Converter] UI initialization completed');
    }
}

// ConfigCategory is a class that represents a category of items.
// It is used to store the items in the category, the options for the items,
// the pattern for the items, and the set of items.
class ConfigCategory {
    constructor(items, customLabels = {}) {
        // Compute all derived properties
        this.slugs = items;
        this.options = this._toOptions(items, customLabels);
        this.pattern = this._toPattern(items);

        this.set = new Set(items); // For fast lookup
    }

    // Check if an item is in the list
    includes(item) {
        return this.set.has(item);
    }

    // Helper method for converting arrays to value/label pairs
    _toOptions(items, customLabels = {}) {
        return items.map(item => ({
            value: item,
            label: customLabels[item] || this._toTitleCase(this._unslug(item))
        }));
    }

    // Helper method for converting arrays to a regex pattern
    _toPattern(items) {
        return items
            .map(item => this._unslug(item))
            .filter(item => item !== '') // Remove empty strings
            .sort((a, b) => b.length - a.length) // Longest first
            .join('|');
    }

    // Helper method for converting slugs to normal text (replace hyphens with spaces)
    // Exception: Keep hyphens for condition names that need them
    _unslug(str) {
        // Special cases for conditions that should keep their hyphens
        const keepHyphens = ['flat-footed', 'off-guard'];
        if (keepHyphens.includes(str)) {
            return str;
        }
        
        // Default behavior: replace hyphens with spaces
        return str.replace(/-/g, ' ');
    }

    // Helper method for converting strings to title case (one and two letter words are not capitalized)
    _toTitleCase(str) {
        // Special cases for specific condition names that need custom capitalization
        const specialCases = {
            'off-guard': 'Off-Guard',
            'flat-footed': 'Flat-Footed'
        };
        
        if (specialCases[str]) {
            return specialCases[str];
        }
        
        // Default behavior: capitalize words with 3+ characters
        return str.replace(/\b\w{3,}/g, word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        );
    }
}

// LegacyConversionManager is a class that manages the conversion of legacy items to remaster items.
// It is used to convert legacy damage types to remaster damage types, legacy conditions to remaster conditions.
class LegacyConversionManager {
    
    // Legacy damage type mappings (only applied within damage rolls)
    static LEGACY_DAMAGE_MAPPINGS = {
        'chaotic': 'spirit',
        'evil': 'spirit', 
        'good': 'spirit',
        'lawful': 'spirit',
        'positive': 'vitality',
        'negative': 'void'
    };

    // Legacy condition mappings (applied globally, case-preserving)
    static LEGACY_CONDITION_MAPPINGS = {
        'flat-footed': 'off-guard'
    };

    /**
     * Convert legacy damage type to remaster equivalent
     * Only to be used within damage roll processing
     */
    static convertLegacyDamageType(damageType) {
        if (!damageType) return damageType;
        const normalized = damageType.toLowerCase();
        return this.LEGACY_DAMAGE_MAPPINGS[normalized] || damageType;
    }

    /**
     * Check if a damage type is legacy
     */
    static isLegacyDamageType(damageType) {
        if (!damageType) return false;
        return this.LEGACY_DAMAGE_MAPPINGS.hasOwnProperty(damageType.toLowerCase());
    }

    /**
     * Convert legacy condition while preserving case
     * Returns null if no conversion needed
     */
    static convertLegacyCondition(conditionText) {
        const normalized = conditionText.toLowerCase();
        const mapping = this.LEGACY_CONDITION_MAPPINGS[normalized];
        
        if (!mapping) return null;

        // Preserve case pattern from input
        return this.preserveCase(conditionText, mapping);
    }

    /**
     * Apply case pattern from source to target string
     * Handles different string lengths by mapping words and characters intelligently
     */
    static preserveCase(source, target) {
        if (source.length === 0 || target.length === 0) return target;

        // Handle simple cases first
        if (source === source.toLowerCase()) {
            return target.toLowerCase();
        }
        if (source === source.toUpperCase()) {
            return target.toUpperCase();
        }
        
        // For mixed case, try to preserve the pattern intelligently
        // Split both strings into words (by hyphens and spaces)
        const sourceWords = source.split(/[-\s]+/);
        const targetWords = target.split(/[-\s]+/);
        
        // If we have the same number of words, map word by word
        if (sourceWords.length === targetWords.length) {
            const result = targetWords.map((targetWord, index) => {
                const sourceWord = sourceWords[index];
                return this.preserveCaseForWord(sourceWord, targetWord);
            });
            
            // Reconstruct with the same separators as target
            return target.split(/[-\s]+/).map((_, index) => result[index]).join(
                target.includes('-') ? '-' : ' '
            );
        }
        
        // Fallback: apply the case of the first character to the whole target
        if (source[0] === source[0].toUpperCase()) {
            return target.charAt(0).toUpperCase() + target.slice(1).toLowerCase();
        } else {
            return target.toLowerCase();
        }
    }

    /**
     * Apply case pattern from source word to target word
     */
    static preserveCaseForWord(sourceWord, targetWord) {
        if (!sourceWord || !targetWord) return targetWord;
        
        // All lowercase
        if (sourceWord === sourceWord.toLowerCase()) {
            return targetWord.toLowerCase();
        }
        
        // All uppercase  
        if (sourceWord === sourceWord.toUpperCase()) {
            return targetWord.toUpperCase();
        }
        
        // Title case (first letter uppercase, rest lowercase)
        if (sourceWord[0] === sourceWord[0].toUpperCase() && 
            sourceWord.slice(1) === sourceWord.slice(1).toLowerCase()) {
            return targetWord.charAt(0).toUpperCase() + targetWord.slice(1).toLowerCase();
        }
        
        // For other mixed cases, apply character by character up to the shorter length
        let result = '';
        const minLength = Math.min(sourceWord.length, targetWord.length);
        
        for (let i = 0; i < minLength; i++) {
            if (sourceWord[i] === sourceWord[i].toUpperCase()) {
                result += targetWord[i].toUpperCase();
            } else {
                result += targetWord[i].toLowerCase();
            }
        }
        
        // If target is longer, add remaining characters in lowercase
        if (targetWord.length > minLength) {
            result += targetWord.slice(minLength).toLowerCase();
        }
        
        return result;
    }

    /**
     * Get all legacy damage types for pattern generation
     */
    static getLegacyDamageTypes() {
        return Object.keys(this.LEGACY_DAMAGE_MAPPINGS);
    }

    /**
     * Get all legacy conditions for pattern generation
     */
    static getLegacyConditions() {
        return Object.keys(this.LEGACY_CONDITION_MAPPINGS);
    }
}

// ConfigManager is a class that manages the configuration of the converter.
// It is used to store the configuration of the converter, including the damage types,
// the conditions, the skills, the saves, the statistics, the template types, the actions,
// the action variants, the healing terms, and the legacy conditions.
class ConfigManager {

    static DAMAGE_TYPES = new ConfigCategory([
        'acid', 'cold', 'electricity', 'fire', 'force', 'sonic', 'vitality', 'void', // Energy types
        'bleed', 'bludgeoning', 'piercing', 'slashing', // Physical types
        'mental', 'spirit', 'poison', 'untyped' // Other types
    ]);

    static LEGACY_DAMAGE_TYPES = new ConfigCategory(LegacyConversionManager.getLegacyDamageTypes());

    static ALL_DAMAGE_TYPES = new ConfigCategory([
        ...this.DAMAGE_TYPES.slugs,
        ...this.LEGACY_DAMAGE_TYPES.slugs
    ]);

    // Legacy to Remaster damage type mapping
    static LEGACY_DAMAGE_TYPE_MAPPING = {
        chaotic: 'spirit',
        evil: 'spirit',
        good: 'spirit',
        lawful: 'spirit',
        positive: 'vitality',
        negative: 'void'
    };

    static DAMAGE_CATEGORIES = new ConfigCategory([ '', 'persistent', 'precision', 'splash' ]);

    static CHECK_TYPES = new ConfigCategory(
        [ 'skill', 'save', 'perception', 'lore', 'flat' ],
        {
            skill: 'Skill Check',
            save: 'Saving Throw',
            perception: 'Perception Check',
            lore: 'Lore Check',
            flat: 'Flat Check'
        }
    );

    static SAVES = new ConfigCategory([ 'reflex', 'fortitude', 'will' ]);

    static SKILLS = new ConfigCategory([
        'acrobatics', 'arcana', 'athletics', 'crafting',
        'deception', 'diplomacy', 'intimidation', 'medicine',
        'nature', 'occultism', 'performance', 'religion',
        'society', 'stealth', 'survival', 'thievery'
    ]);

    static DC_METHODS = new ConfigCategory(
        [ 'static', 'target', 'origin' ],
        {
            static: 'Static DC',
            target: 'Target\'s Statistic',
            origin: 'Origin\'s Statistic'
        }
    );

    static SHOW_DCS = new ConfigCategory(
        [ 'owner', 'gm', 'all', 'none' ],
        {
            owner: 'Owner Only',
            gm: 'GM Only',
            all: 'Everyone',
            none: 'No One'
        }
    );

    static STATISTICS = new ConfigCategory(
        [
            'ac',
            'perception',
            ...this.SAVES.slugs, // Saves are also statistics
            'class',
            'spell',
            'class-spell',
            ...this.SKILLS.slugs, // Skills are also statistics
        ],
        {
            ac: 'Armor Class',
            class: 'Class DC',
            spell: 'Spell DC',
            'class-spell': 'Class or Spell DC',
        }
    );

    static CONDITIONS = new ConfigCategory(
        [
            'blinded', 'broken', 'clumsy', 'concealed', 'confused', 'controlled', 'dazzled',
            'deafened', 'doomed', 'drained', 'dying', 'enfeebled', 'fascinated', 'fatigued',
            'fleeing', 'frightened', 'grabbed', 'immobilized', 'invisible', 'off-guard',
            'paralyzed', 'petrified', 'prone', 'quickened', 'restrained', 'sickened',
            'slowed', 'stunned', 'stupefied', 'unconscious', 'undetected', 'wounded'
        ],
        {
            'off-guard': 'Off-Guard' // Ensure we keep the hyphen in the label
        }
    );

    // Define which conditions can have a value and legacy condition conversions
    static CONDITION_METADATA = {
        withValues: new Set([
            'clumsy', 'doomed', 'drained', 'dying', 'enfeebled', 'frightened',
            'sickened', 'slowed', 'stunned', 'stupefied', 'wounded'
        ])
    }

    static LEGACY_CONDITIONS = new ConfigCategory(LegacyConversionManager.getLegacyConditions());

    static ALL_CONDITIONS = new ConfigCategory([
        ...this.CONDITIONS.slugs,
        ...this.LEGACY_CONDITIONS.slugs
    ]);

    // Helper method for checking if a condition can have a value
    static conditionCanHaveValue(condition) {
        return this.CONDITION_METADATA.withValues.has(condition);
    }

    static TEMPLATE_TYPES = new ConfigCategory([ 'burst', 'cone', 'line', 'emanation' ]);

    static ALTERNATE_TEMPLATE_MAPPING = {
        'radius': 'burst',
        'circle': 'burst',
        'sphere': 'burst',
        'cylinder': 'burst',
        'wall': 'line',
        'square': 'line',
        'cube': 'line'
    }

    static getStandardTemplateType(alternateName) {
        return this.ALTERNATE_TEMPLATE_MAPPING[alternateName] || alternateName;
    }

    static ALTERNATE_TEMPLATE_NAMES = new ConfigCategory(
        Object.keys(this.ALTERNATE_TEMPLATE_MAPPING)
    )

    static ALL_TEMPLATE_NAMES = new ConfigCategory([
        ...this.TEMPLATE_TYPES.slugs,
        ...this.ALTERNATE_TEMPLATE_NAMES.slugs
    ])

    static DURATION_UNITS = new ConfigCategory([
        'rounds', 'round',
        'seconds', 'second',
        'minutes', 'minute',
        'hours', 'hour',
        'days', 'day'
    ]);

    static ACTIONS = new ConfigCategory([
            'administer-first-aid', 'affix-a-talisman', 'aid', 'arrest-a-fall',
            'avert-gaze', 'avoid-notice', 'balance', 'burrow', 'climb', 'coerce',
            'command-an-animal', 'conceal-an-object', 'crawl', 'create-a-diversion',
            'create-forgery', 'decipher-writing', 'delay', 'demoralize',
            'disable-device', 'disarm', 'dismiss', 'drop-prone', 'escape',
            'feint', 'fly', 'force-open', 'gather-information', 'gran-an-edge',
            'grapple', 'hide', 'high-jump', 'identify-alchemy', 'identify-magic',
            'impersonate', 'interact', 'leap', 'learn-a-spell', 'lie', 'long-jump',
            'make-an-impression', 'maneuver-in-flight', 'mount', 'palm-an-object',
            'perform', 'pick-a-lock', 'point-out', 'ready', 'recall-knowledge',
            'release', 'reposition', 'request', 'seek', 'sense-direction',
            'sense-motive', 'shove', 'sneak', 'squeeze', 'stand', 'steal',
            'step', 'stride', 'subsist', 'sustain', 'swim', 'take-cover',
            'track', 'treat-disease', 'treat-poison', 'trip', 'tumble-through',
            'exploit-vulnerability', 'daring-swing', 'haughty-correction', 'entrap-confession'
        ]
    );

    static ACTION_VARIANTS = {
        'administer-first-aid': new ConfigCategory([ 'stabilize', 'stop-bleeding' ]),
        'create-a-diversion': new ConfigCategory([ 'distracting-words', 'gesture', 'trick' ]),
        'perform': new ConfigCategory([ 'acting', 'comedy', 'dance', 'keyboards', 'oratory', 'percussion', 'singing', 'strings', 'winds' ])
    };

    // Helper method for checking if an action has variants
    static actionHasVariants(action) {
        return this.ACTION_VARIANTS.hasOwnProperty(action);
    }

    static HEALING_TERMS = new ConfigCategory([ 'hit\\s+points?', 'HP', 'healing' ]);
}

// Condition mapping for dynamic UUID retrieval
let conditionMap = new Map();

/**
 * Try to get condition UUID from compendium
 * @param {string} conditionName - The condition name to look up
 * @returns {string|null} - The condition UUID or null if not found
 */
function getConditionUUIDFromCompendium(conditionName) {
    try {
        console.log('[PF2e Converter] Looking up condition UUID for:', conditionName);
        
        const conditionCompendium = game.packs.get('pf2e.conditionitems');
        if (!conditionCompendium) {
            console.warn('[PF2e Converter] Condition compendium not found');
            return null;
        }
        
        const normalizedName = conditionName.toLowerCase().trim();
        console.log('[PF2e Converter] Normalized condition name:', normalizedName);
        
        // Search through the compendium index
        const entries = conditionCompendium.index.contents;
        console.log('[PF2e Converter] Searching through', entries.length, 'compendium entries');
        
        for (const entry of entries) {
            if (entry.name.toLowerCase() === normalizedName) {
                console.log('[PF2e Converter] Found condition UUID:', entry.uuid);
                return entry.uuid;
            }
        }
        
        console.log('[PF2e Converter] Condition not found in compendium:', conditionName);
        return null;
    } catch (error) {
        console.error('[PF2e Converter] Error looking up condition UUID:', error);
        console.error('[PF2e Converter] Error stack:', error.stack);
        // Silently fail - fallback UUIDs will be used
        return null;
    }
}

/**
 * Build condition mapping for dynamic UUID retrieval
 * @returns {Map} - Map of condition names to UUIDs
 */
function buildConditionMap() {
    console.log('[PF2e Converter] buildConditionMap called');
    
    try {
        const conditionMap = new Map();
        
        // List of all conditions we want to support
        console.log('[PF2e Converter] Getting condition names from ConfigManager');
        const conditionNames = ConfigManager.CONDITIONS.slugs;
        console.log('[PF2e Converter] Found', conditionNames.length, 'condition names');
        
        // Try to get all conditions from the compendium
        console.log('[PF2e Converter] Looking up condition UUIDs from compendium');
        for (const conditionName of conditionNames) {
            const uuid = getConditionUUIDFromCompendium(conditionName);
            if (uuid) {
                conditionMap.set(conditionName, {
                    uuid: uuid,
                    name: conditionName,
                    slug: conditionName
                });
            } else {
                console.warn(`[PF2e Converter] Could not find UUID for condition "${conditionName}"`);
            }
        }
    
    // Fallback condition UUIDs (common PF2e conditions) - Updated for Remaster
    const fallbackConditions = {};
    ConfigManager.CONDITIONS.slugs.forEach(name => {
        fallbackConditions[name] = `Compendium.pf2e.conditionitems.Item.${name}`;
    });
    
        // If we didn't get any conditions from the compendium, use fallbacks
        if (conditionMap.size === 0) {
            console.warn('[PF2e Converter] No conditions found from compendium, using fallback mapping');
            for (const [name, uuid] of Object.entries(fallbackConditions)) {
                conditionMap.set(name, {
                    uuid: uuid,
                    name: name,
                    slug: name
                });
            }
        } else {
            // Fill in any missing conditions with fallbacks
            for (const [name, uuid] of Object.entries(fallbackConditions)) {
                if (!conditionMap.has(name)) {
                    conditionMap.set(name, {
                        uuid: uuid,
                        name: name,
                        slug: name
                    });
                }
            }
        }
        
        console.log('[PF2e Converter] Condition map built successfully with', conditionMap.size, 'entries');
        return conditionMap;
    } catch (error) {
        console.error('[PF2e Converter] Error building condition map:', error);
        console.error('[PF2e Converter] Error stack:', error.stack);
        // Return empty map as fallback
        return new Map();
    }
}

/**
 * Get condition UUID by name
 * @param {string} conditionName - The condition name to look up
 * @param {Object} state - Optional state object containing conditionMap
 * @returns {string|null} - The condition UUID or null if not found
 */
function getConditionUUID(conditionName, state = null) {
    const normalizedName = conditionName.toLowerCase().trim();
    
    // Get from state if provided
    if (state && state.conditionMap) {
        const condition = state.conditionMap.get(normalizedName);
        return condition?.uuid || null;
    }
    
    // If no state provided, return null (should not happen in normal operation)
    return null;
}

/**
 * Initialize condition mapping
 */
// Global initializeConditionMap function removed - functionality moved to ConverterDialog class

// ===================== PATTERN SYSTEM =========================
// 
// ====================================================================

/*
// Template for static pattern classes
class PatternNamePattern {
    static type = 'patternname';
    static priority = 50;
    static description = 'Pattern description';

    static PATTERNS = [
        {
            regex: /pattern/gi,
            priority: 50,
            handler: PatternNamePattern.handlerMethod
        }
    ];

    static handlerMethod(match) {
        return match;
    }

    static validateMatch(match) {
        return match && match[0] && typeof match.index === 'number';
    }

    static test(text) {
        const matches = [];
        
        for (const pattern of this.PATTERNS) {
            let match;
            pattern.regex.lastIndex = 0;
            while ((match = pattern.regex.exec(text)) !== null) {
                if (this.validateMatch(match)) {
                    const processedMatch = pattern.handler ? pattern.handler(match) : match;
                    if (processedMatch) {
                        matches.push({
                            match: processedMatch,
                            type: this.type,
                            priority: pattern.priority || this.priority,
                            config: { pattern: pattern }
                        });
                    }
                }
            }
        }
        
        return matches;
    }

    static createReplacement(match, config) {
        return new PatternNameReplacement(match, this.type, config);
    }
}
*/

class DamagePattern {
    static type = 'damage';
    static priority = 100;
    static description = 'Damage roll patterns';

    static PATTERNS = [
        // Multi-damage pattern (highest priority)
        {
            regex: new RegExp(`((?:\\d+(?:d\\d+)?(?:[+-]\\d+)?\\s+(?:(?:persistent\\s+)?(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})(?:\\s+persistent)?|(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})\\s+splash|splash\\s+(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})|(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})\\s+precision|precision\\s+(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})|precision|(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern}))(?:\\s+damage)?(?:\\s*,\\s*|\\s*,\\s*and\\s*|\\s*,\\s*plus\\s*|\\s+and\\s+|\\s+plus\\s+))*\\d+(?:d\\d+)?(?:[+-]\\d+)?\\s+(?:(?:persistent\\s+)?(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})(?:\\s+persistent)?|(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})\\s+splash|splash\\s+(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})|(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})\\s+precision|precision\\s+(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})|precision|(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern}))(?:\\s+damage)?)`, 'gi'),
            priority: 110,
            handler: DamagePattern.handleMultiDamage
        },
        // Persistent damage
        {
            regex: new RegExp(`(\\d+(?:d\\d+)?(?:[+-]\\d+)?)\\s+(?:persistent\\s+(${ConfigManager.ALL_DAMAGE_TYPES.pattern})|(${ConfigManager.ALL_DAMAGE_TYPES.pattern})\\s+persistent)(?:\\s+damage)?`, 'gi'),
            priority: 100,
            handler: DamagePattern.handleSingleDamage
        },
        // Continue with all other damage patterns...
    ];

    static handleMultiDamage(match) {
        // Move existing logic here
        const singlePattern = new RegExp(`(\\d+(?:d\\d+)?(?:[+-]\\d+)?)\\s+(?:(?:persistent\\s+)?(?:(${ConfigManager.ALL_DAMAGE_TYPES.pattern}))(?:\\s+persistent)?|(?:(${ConfigManager.ALL_DAMAGE_TYPES.pattern}))\\s+splash|splash\\s+(${ConfigManager.ALL_DAMAGE_TYPES.pattern})|(?:(${ConfigManager.ALL_DAMAGE_TYPES.pattern}))\\s+precision|precision\\s+(${ConfigManager.ALL_DAMAGE_TYPES.pattern})|precision|(?:(${ConfigManager.ALL_DAMAGE_TYPES.pattern})))(?:\\s+damage)?`, 'gi');
        
        const multiMatches = [];
        let m;
        while ((m = singlePattern.exec(match[0])) !== null) {
            multiMatches.push(m);
        }
        
        match.multiMatches = multiMatches;
        return match;
    }

    static handleSingleDamage(match) {
        return match;
    }

    // Standard static methods (from template)
    static validateMatch(match) {
        return match && match[0] && typeof match.index === 'number';
    }

    static test(text) {
        const matches = [];
        
        for (const pattern of this.PATTERNS) {
            let match;
            pattern.regex.lastIndex = 0;
            while ((match = pattern.regex.exec(text)) !== null) {
                if (this.validateMatch(match)) {
                    const processedMatch = pattern.handler ? pattern.handler(match) : match;
                    if (processedMatch) {
                        matches.push({
                            match: processedMatch,
                            type: this.type,
                            priority: pattern.priority || this.priority,
                            config: { pattern: pattern }
                        });
                    }
                }
            }
        }
        
        return matches;
    }

    static createReplacement(match, config) {
        return new DamageReplacement(match, this.type, config);
    }
}

// CheckPattern
class CheckPattern {
    static type = 'check';
    static priority = 90;
    static description = 'Check roll patterns';

    static PATTERNS = [
        // Comprehensive save pattern (highest priority)
        {
            regex: /(?:\(?)((?:basic\s+)?(?:DC\s*(\d{1,2})\s*[,;:\(\)]?\s*)?\b(fort(?:itude)?|ref(?:lex)?|will)\b(?:\s+(?:save|saving\s+throw))?(?:\s*[,;:\(\)]?\s*(?:basic\s+)?(?:DC\s*(\d{1,2}))?)?|(?:basic\s+)?\b(fort(?:itude)?|ref(?:lex)?|will)\b(?:\s+(?:save|saving\s+throw))?\s*(?:basic)?(?:\s*[,;:\(\)]?\s*(?:DC\s*(\d{1,2}))?)?|(?:basic\s+)?(?:DC\s*(\d{1,2})\s+)?\b(fort(?:itude)?|ref(?:lex)?|will)\b|(?:DC\s*(\d{1,2})\s+)?(?:basic\s+)?\b(fort(?:itude)?|ref(?:lex)?|will)\b)(?:\)?)/gi,
            priority: 95,
            handler: CheckPattern.handleSaveCheck
        },
        // Perception checks
        {
            regex: /(?:DC\s+(\d+)\s+)?Perception(?:\s+check)?/gi,
            priority: 90,
            handler: CheckPattern.handlePerceptionCheck
        },
        // Lore skill checks (DC first)
        {
            regex: /(?:DC\s+(\d+)\s+)?([^0-9\n]+?)\s+Lore(?:\s+check)?/gi,
            priority: 90,
            handler: CheckPattern.handleLoreCheckDCFirst
        },
        // Lore skill checks (lore name first)
        {
            regex: /([^0-9\n]+?)\s+Lore\s+(?:DC\s+(\d+)\s+)?check/gi,
            priority: 90,
            handler: CheckPattern.handleLoreCheckNameFirst
        },
        // Lore skill checks (DC at end)
        {
            regex: /([^0-9\n]+?)\s+Lore(?:\s+check)?(?:\s+DC\s+(\d+))?/gi,
            priority: 90,
            handler: CheckPattern.handleLoreCheckDCEnd
        },
        // Flat checks
        {
            regex: /DC\s+(\d+)\s+flat\s+check/gi,
            priority: 85,
            handler: CheckPattern.handleFlatCheck
        },
        // Single skill checks
        {
            regex: new RegExp(`(?:DC\\s+(\\d+)\\s+)?(${ConfigManager.SKILLS.pattern})(?:\\s+check)?`, 'gi'),
            priority: 80,
            handler: CheckPattern.handleSkillCheck
        }
    ];

    // Static handler methods
    static handleSaveCheck(match) {
        match.checkType = 'save';
        return match;
    }

    static handlePerceptionCheck(match) {
        match.checkType = 'skill';
        return match;
    }

    static handleLoreCheckDCFirst(match) {
        match.isLoreCheck = true;
        match.loreName = match[2].trim();
        match.checkType = 'lore';
        return match;
    }

    static handleLoreCheckNameFirst(match) {
        match.isLoreCheck = true;
        match.loreName = match[1].trim();
        const dc = match[2];
        match[1] = dc || null;
        match[2] = match.loreName;
        match.checkType = 'lore';
        return match;
    }

    static handleLoreCheckDCEnd(match) {
        match.isLoreCheck = true;
        match.loreName = match[1].trim();
        const dc = match[2];
        match[1] = dc || null;
        match[2] = match.loreName;
        match.checkType = 'lore';
        return match;
    }

    static handleFlatCheck(match) {
        match.checkType = 'flat';
        return match;
    }

    static handleSkillCheck(match) {
        match.checkType = 'skill';
        return match;
    }

    // Standard static methods (from template)
    static validateMatch(match) {
        return match && match[0] && typeof match.index === 'number';
    }

    static test(text) {
        const matches = [];
        
        for (const pattern of this.PATTERNS) {
            let match;
            pattern.regex.lastIndex = 0;
            while ((match = pattern.regex.exec(text)) !== null) {
                if (this.validateMatch(match)) {
                    const processedMatch = pattern.handler ? pattern.handler(match) : match;
                    if (processedMatch) {
                        matches.push({
                            match: processedMatch,
                            type: this.type,
                            priority: pattern.priority || this.priority,
                            config: { pattern: pattern }
                        });
                    }
                }
            }
        }
        
        return matches;
    }

    static createReplacement(match, config) {
        return new CheckReplacement(match, this.type, config);
    }
}

// HealingPattern
class HealingPattern {
    static type = 'healing';
    static priority = 80;
    static description = 'Healing roll patterns';

    static PATTERNS = [
        // Healing patterns - consolidated handler
        {
            regex: new RegExp(`(\\d+(?:d\\d+)?(?:[+-]\\d+)?)(?:\\s+\\b(?:${ConfigManager.HEALING_TERMS.pattern})\\b)(?:\\s+(?:healed|damage))?`, 'gi'),
            priority: 80,
            handler: HealingPattern.handleHealing
        }
    ];

    // Static handler methods
    static handleHealing(match) {
        return match;
    }

    // Standard static methods (from template)
    static validateMatch(match) {
        return match && match[0] && typeof match.index === 'number';
    }

    static test(text) {
        const matches = [];
        
        for (const pattern of this.PATTERNS) {
            let match;
            pattern.regex.lastIndex = 0;
            while ((match = pattern.regex.exec(text)) !== null) {
                if (this.validateMatch(match)) {
                    const processedMatch = pattern.handler ? pattern.handler(match) : match;
                    if (processedMatch) {
                        matches.push({
                            match: processedMatch,
                            type: this.type,
                            priority: pattern.priority || this.priority,
                            config: { pattern: pattern }
                        });
                    }
                }
            }
        }
        
        return matches;
    }

    static createReplacement(match, config) {
        return new HealingReplacement(match, this.type, config);
    }
}

// ConditionPattern
class ConditionPattern {
    static type = 'condition';
    static priority = 70;
    static description = 'Condition patterns';

    static PATTERNS = [
        // Legacy flat-footed
        {
            regex: /(?<!@UUID\[[^\]]*\]\{[^}]*\})\b(flat-footed)\b(?!\})/gi,
            priority: 75,
            handler: ConditionPattern.handleLegacyCondition
        },
        // Condition linking
        {
            regex: new RegExp(`(?<!@UUID\\[[^\\]]*\\]\\{[^}]*\\})\\b(${ConfigManager.ALL_CONDITIONS.pattern})(?:\\s+(\\d+))?\\b(?!\\})`, 'gi'),
            priority: 70,
            handler: ConditionPattern.handleCondition
        }
    ];

    // Static handler methods
    static handleLegacyCondition(match) {
        return { 
            match, 
            args: ['flat-footed'], 
            originalText: match[0] // Preserve original case
        };
    }

    static handleCondition(match) {
        return { match, args: [match[1], match[2]] };
    }

    // Standard static methods (from template)
    static validateMatch(match) {
        return match && match[0] && typeof match.index === 'number';
    }

    static test(text) {
        const matches = [];
        
        for (const pattern of this.PATTERNS) {
            let match;
            pattern.regex.lastIndex = 0;
            while ((match = pattern.regex.exec(text)) !== null) {
                if (this.validateMatch(match)) {
                    const processedMatch = pattern.handler ? pattern.handler(match) : match;
                    if (processedMatch) {
                        matches.push({
                            match: processedMatch,
                            type: this.type,
                            priority: pattern.priority || this.priority,
                            config: { pattern: pattern }
                        });
                    }
                }
            }
        }
        
        return matches;
    }

    static createReplacement(match, config) {
        return new ConditionReplacement(match, this.type, config);
    }
}

// TemplatePattern
class TemplatePattern {
    static type = 'template';
    static priority = 60;
    static description = 'Template patterns';

    static PATTERNS = [
        // Area effects (consolidated)
        {
            regex: new RegExp(`(\\d+)(?:[\\s-]+)(?:foot|feet)\\s+(${ConfigManager.ALL_TEMPLATE_NAMES.pattern})`, 'gi'),
            priority: 60,
            handler: TemplatePattern.handleAreaEffect
        },
        // "within X feet" pattern
        {
            regex: /within\s+(\d+)\s+(?:foot|feet)/gi,
            priority: 60,
            handler: TemplatePattern.handleWithinPattern
        }
    ];

    // Static handler methods
    static handleAreaEffect(match) {
        return match;
    }

    static handleWithinPattern(match) {
        // Simulate a template match for an emanation
        return {
            0: match[0],
            1: match[1], // distance
            2: 'emanation', // shape
            index: match.index,
            displayText: `within ${match[1]} feet`,
            isWithin: true // optional flag for future use
        };
    }

    // Standard static methods (from template)
    static validateMatch(match) {
        return match && match[0] && typeof match.index === 'number';
    }

    static test(text) {
        const matches = [];
        
        for (const pattern of this.PATTERNS) {
            let match;
            pattern.regex.lastIndex = 0;
            while ((match = pattern.regex.exec(text)) !== null) {
                if (this.validateMatch(match)) {
                    const processedMatch = pattern.handler ? pattern.handler(match) : match;
                    if (processedMatch) {
                        matches.push({
                            match: processedMatch,
                            type: this.type,
                            priority: pattern.priority || this.priority,
                            config: { pattern: pattern }
                        });
                    }
                }
            }
        }
        
        return matches;
    }

    static createReplacement(match, config) {
        return new TemplateReplacement(match, this.type, config);
    }
}
// DurationPattern
class DurationPattern {
    static type = 'duration';
    static priority = 50;
    static description = 'Duration roll patterns';

    static PATTERNS = [
        // Duration pattern: dice expression followed by a time unit
        {
            regex: new RegExp(`(\\d+d\\d+(?:[+-]\\d+)?|\\d+)(?:\\s+)(${ConfigManager.DURATION_UNITS.pattern})`, 'gi'),
            priority: 50,
            handler: DurationPattern.handleDuration
        }
    ];

    // Static handler methods
    static handleDuration(match) {
        return match;
    }

    // Standard static methods (from template)
    static validateMatch(match) {
        return match && match[0] && typeof match.index === 'number';
    }

    static test(text) {
        const matches = [];
        
        for (const pattern of this.PATTERNS) {
            let match;
            pattern.regex.lastIndex = 0;
            while ((match = pattern.regex.exec(text)) !== null) {
                if (this.validateMatch(match)) {
                    const processedMatch = pattern.handler ? pattern.handler(match) : match;
                    if (processedMatch) {
                        matches.push({
                            match: processedMatch,
                            type: this.type,
                            priority: pattern.priority || this.priority,
                            config: { pattern: pattern }
                        });
                    }
                }
            }
        }
        
        return matches;
    }

    static createReplacement(match, config) {
        return new DurationReplacement(match, this.type, config);
    }
}

// ActionPattern
class ActionPattern {
    static type = 'action';
    static priority = 40;
    static description = 'Action patterns';

    static PATTERNS = [
        // Inline Action pattern
        {
            regex: new RegExp(`\\b(${ConfigManager.ACTIONS.pattern})\\b`, 'gi'),
            priority: 40,
            handler: ActionPattern.handleAction
        }
    ];

    // Static handler methods
    static handleAction(match) {
        // match[1] is the action name matched (case-insensitive)
        return match;
    }

    // Standard static methods (from template)
    static validateMatch(match) {
        return match && match[0] && typeof match.index === 'number';
    }

    static test(text) {
        const matches = [];
        
        for (const pattern of this.PATTERNS) {
            let match;
            pattern.regex.lastIndex = 0;
            while ((match = pattern.regex.exec(text)) !== null) {
                if (this.validateMatch(match)) {
                    const processedMatch = pattern.handler ? pattern.handler(match) : match;
                    if (processedMatch) {
                        matches.push({
                            match: processedMatch,
                            type: this.type,
                            priority: pattern.priority || this.priority,
                            config: { pattern: pattern }
                        });
                    }
                }
            }
        }
        
        return matches;
    }

    static createReplacement(match, config) {
        return new ActionReplacement(match, this.type, config);
    }
}

class PatternDetector {
    // All patterns defined as a static constant - no runtime changes
    static PATTERN_CLASSES = [
        DamagePattern,
        CheckPattern,
        HealingPattern,
        ConditionPattern,
        TemplatePattern,
        DurationPattern,
        ActionPattern
    ];

    /**
     * Detect all patterns in text
     * @param {string} text - Text to analyze
     * @returns {Array} - All matches with conflicts resolved
     */
    static detectAll(text) {
        console.log('[PF2e Converter] PatternDetector.detectAll called with text length:', text?.length);
        
        const allMatches = [];
        
        // Test each pattern class directly
        console.log('[PF2e Converter] Testing', this.PATTERN_CLASSES.length, 'pattern classes');
        for (const PatternClass of this.PATTERN_CLASSES) {
            try {
                console.log('[PF2e Converter] Testing pattern class:', PatternClass.type);
                const matches = PatternClass.test(text);
                console.log('[PF2e Converter] Pattern', PatternClass.type, 'found', matches.length, 'matches');
                allMatches.push(...matches);
            } catch (error) {
                console.error(`[PF2e Converter] Error in pattern ${PatternClass.type}:`, error);
                console.error('[PF2e Converter] Error stack:', error.stack);
            }
        }

        console.log('[PF2e Converter] Total matches before conflict resolution:', allMatches.length);
        const resolvedMatches = this.resolveConflicts(allMatches);
        console.log('[PF2e Converter] Total matches after conflict resolution:', resolvedMatches.length);
        
        return resolvedMatches;
    }

    /**
     * Create replacement from match result
     * @param {Object} matchResult - Match result from detectAll
     * @returns {Replacement} - Replacement instance
     */
    static createReplacement(matchResult) {
        const PatternClass = this.PATTERN_CLASSES.find(cls => cls.type === matchResult.type);
        if (!PatternClass) {
            throw new Error(`No pattern class found for type: ${matchResult.type}`);
        }
        return PatternClass.createReplacement(matchResult.match, matchResult.config);
    }

    /**
     * Resolve overlapping matches (keep highest priority, then leftmost)
     */
    static resolveConflicts(matches) {
        matches.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            
            const aPos = this.getMatchPosition(a.match);
            const bPos = this.getMatchPosition(b.match);
            return aPos - bPos;
        });

        const result = [];
        const covered = [];

        for (const m of matches) {
            const matchObj = this.getMatchObject(m.match);
            if (!matchObj) continue;

            const start = matchObj.index;
            const end = start + matchObj[0].length;

            const overlaps = covered.some(([s, e]) => (start < e && end > s));
            
            if (!overlaps) {
                result.push(m);
                covered.push([start, end]);
            }
        }

        return result;
    }

    static getMatchPosition(match) {
        if (match && typeof match.index === 'number') {
            return match.index;
        }
        if (match && match.match && typeof match.match.index === 'number') {
            return match.match.index;
        }
        return 0;
    }

    static getMatchObject(match) {
        if (match && match.match) {
            return match.match;
        }
        if (match && match[0] && typeof match.index === 'number') {
            return match;
        }
        return null;
    }
}

class PatternTester {
    // Test a specific pattern against text
    static testPattern(patternType, text) {
        const PatternClass = PatternDetector.PATTERN_CLASSES.find(cls => cls.type === patternType);
        if (!PatternClass) {
            return { error: `Pattern type '${patternType}' not found` };
        }

        const matches = PatternClass.test(text);
        return {
            pattern: patternType,
            text: text,
            matches: matches.length,
            results: matches.map(match => ({
                matched: PatternDetector.getMatchObject(match.match)?.[0],
                position: PatternDetector.getMatchPosition(match.match),
                priority: match.priority
            }))
        };
    }

    /**
     * Test all patterns against text
     */
    static testAll(text) {
        const results = {};
        const allMatches = PatternDetector.detectAll(text);
        
        // Test each pattern individually
        for (const PatternClass of PatternDetector.PATTERN_CLASSES) {
            results[PatternClass.type] = this.testPattern(PatternClass.type, text);
        }

        // Add summary
        results._summary = {
            totalPatterns: PatternDetector.PATTERN_CLASSES.length,
            totalMatches: allMatches.length,
            finalMatches: allMatches.map(match => ({
                type: match.type,
                matched: PatternDetector.getMatchObject(match.match)?.[0],
                position: PatternDetector.getMatchPosition(match.match),
                priority: match.priority
            }))
        };

        return results;
    }

    /**
     * Run a test suite with predefined test cases
     */
    static runTestSuite(testCases) {
        const results = {
            passed: 0,
            failed: 0,
            total: testCases.length,
            details: []
        };

        for (const testCase of testCases) {
            try {
                const result = this.testAll(testCase.input);
                const passed = this.validateTestCase(result, testCase.expected);
                
                results.details.push({
                    input: testCase.input,
                    expected: testCase.expected,
                    actual: result,
                    passed: passed
                });

                if (passed) {
                    results.passed++;
                } else {
                    results.failed++;
                }
            } catch (error) {
                results.failed++;
                results.details.push({
                    input: testCase.input,
                    error: error.message,
                    passed: false
                });
            }
        }

        return results;
    }

    static validateTestCase(actual, expected) {
        if (expected.matchCount !== undefined) {
            return actual._summary.totalMatches === expected.matchCount;
        }
        
        if (expected.patterns !== undefined) {
            const actualPatterns = actual._summary.finalMatches.map(m => m.type);
            const expectedPatterns = expected.patterns;
            return JSON.stringify(actualPatterns.sort()) === JSON.stringify(expectedPatterns.sort());
        }

        return true;
    }
}

// ===================== PATTERN TESTING SUITE =====================

// Comprehensive test cases
const COMPREHENSIVE_TEST_CASES = [
    // Single pattern tests
    { input: '2d6 fire damage', expected: { matchCount: 1, patterns: ['damage'] } },
    { input: '1d4 persistent acid damage', expected: { matchCount: 1, patterns: ['damage'] } },
    { input: 'DC 15 Reflex save', expected: { matchCount: 1, patterns: ['check'] } },
    { input: 'heal 3d8 hit points', expected: { matchCount: 1, patterns: ['healing'] } },
    { input: 'becomes frightened 2', expected: { matchCount: 1, patterns: ['condition'] } },
    { input: '30-foot cone', expected: { matchCount: 1, patterns: ['template'] } },
    { input: '1d4 rounds', expected: { matchCount: 1, patterns: ['duration'] } },
    { input: 'Use the Shove action', expected: { matchCount: 1, patterns: ['action'] } },
    
    // Multi-damage tests
    { input: '2d6 fire damage and 1d4 acid damage', expected: { matchCount: 1, patterns: ['damage'] } },
    
    // Complex combinations
    { 
        input: 'Deal 2d6 fire damage. DC 15 Reflex save. Target becomes frightened 1.',
        expected: { matchCount: 3, patterns: ['damage', 'check', 'condition'] }
    },
    
    // Edge cases
    { input: '', expected: { matchCount: 0, patterns: [] } },
    { input: 'No patterns here', expected: { matchCount: 0, patterns: [] } },
];

function runComprehensiveTestSuite() {
    console.log('=== Comprehensive Test Suite ===');
    const results = PatternTester.runTestSuite(COMPREHENSIVE_TEST_CASES);
    
    console.log(`Total: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    
    if (results.failed > 0) {
        console.log('\n=== Failed Tests ===');
        results.details.filter(d => !d.passed).forEach(detail => {
            console.log(`❌ "${detail.input}"`);
            console.log(`   Expected: ${JSON.stringify(detail.expected)}`);
            if (detail.error) {
                console.log(`   Error: ${detail.error}`);
            }
        });
    }
    
    return results;
}

// runComprehensiveTestSuite();

// ===================== REPLACEMENT CLASS SYSTEM =====================
// Replacement base class is extended by a class for each type of replacement.
// ====================================================================

// Utility for unique IDs
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// Global variables removed - now managed by ConverterDialog class

class Replacement {
    constructor(match, type) {
        if (!match || typeof match !== 'object' || typeof match[0] !== 'string' || typeof match.index !== 'number') {
            throw new Error('Replacement: Invalid match object passed to constructor.');
        }
        this.id = generateId();
        this.startPos = match.index;
        this.endPos = match.index + match[0].length;
        this.originalText = match[0];
        this.trimTrailingSpaces();
        this.enabled = true;
        this.priority = 0;
        this.displayText = '';
        this.type = type; // Store the type string for UI/lookup
        // For reset: store the last match/config used
        this._lastMatch = match;
        this._lastConfig = undefined;
        // originalRender will be set after parsing in subclasses
    }
    // Return the original or converted text depending on the enabled state
    render() {
        // Logging for debugging render output
        // console.log(`[render] id=${this.id} enabled=${this.enabled} returning=${this.enabled ? 'converted' : 'originalText'}`);
        if (!this.enabled) return this.originalText;
        return this.conversionRender();
    }
    // Subclasses must implement this
    conversionRender() { throw new Error('Must implement conversionRender()'); }
    getInteractiveParams() {
        const params = { type: this.type, id: this.id, displayText: this.displayText };
        return params;
    }
    // Render the interactive element
    renderInteractive(state = null) {
        const params = this.getInteractiveParams();
        
        // Store the actual replacement object reference in state, not just params
        if (state && state.interactiveElements) {
            state.interactiveElements[this.id] = this; // Store the actual object, not params
        }
        
        // Add 'modified' class if isModified() is true and enabled
        const modifiedClass = (this.enabled && this.isModified && this.isModified()) ? ' modified' : '';
        // Add 'disabled' class if not enabled
        const disabledClass = !this.enabled ? ' disabled' : '';
        return `<span class="pf2e-interactive${modifiedClass}${disabledClass}" data-id="${this.id}" data-type="${params.type}" data-params='${JSON.stringify(params)}'>${this.enabled ? this.render() : this.originalText}</span>`;
    }
    validate() { return true; }
    getText() { return this.originalText; }
    getLength() { return this.endPos - this.startPos; }
    static get panelConfig() {
        return {
            title: 'Replacement',
            fields: [ENABLED_FIELD, DISPLAY_TEXT_FIELD]
        };
    }
    isModified() {
        return this.render() !== this.originalRender;
    }
    parseMatch(match, config) {
        // Store for reset
        this._lastMatch = match;
        this._lastConfig = config;
        this.displayText = '';
    }
    // Reset to the original text
    resetToOriginal() {
        // Use the last match/config, or re-detect if missing
        let match = this._lastMatch, config = this._lastConfig;
        if (!match) {
            const detector = new TextProcessor().detector;
            const matches = detector.detectAll(this.originalText);
            for (const m of matches) {
                if (m.type === this.type) {
                    match = m.match;
                    config = m.config;
                    break;
                }
            }
        }
        if (match) {
            this.parseMatch(match, config);
        }
    }
    // Trim trailing spaces from the original text
    trimTrailingSpaces() {
        const originalLength = this.originalText.length;
        const trimmed = this.originalText.replace(/\s+$/, '');
        const spacesRemoved = originalLength - trimmed.length;
        if (spacesRemoved > 0) {
            this.endPos -= spacesRemoved;
            this.originalText = trimmed;
        }
    }
}

class RollReplacement extends Replacement {
    constructor(match, type) {
        super(match, type);
        this.rollType = '';
        this.traits = [];
        this.options = [];
        // originalRender will be set after parsing in subclasses
    }
    getInteractiveParams() {
        // Add traits and options to base params
        return {
            ...super.getInteractiveParams(),
            traits: this.traits,
            options: this.options,
            rollType: this.rollType
        };
    }
    static get panelConfig() {
        return {
            ...super.panelConfig,
            fields: [ENABLED_FIELD, ...super.panelConfig.fields.slice(1)]
        };
    }
    parseMatch(match, config) {
        super.parseMatch(match, config);
        this.traits = [];
        this.options = [];
    }
    resetToOriginal() {
        super.resetToOriginal();
        // Removed traits/options reset (now in parseMatch)
    }
}

// -------------------- Damage Replacement --------------------
class DamageComponent {
    constructor(dice = '', damageType = '', category = '') {
        this.dice = dice;
        this.damageType = damageType;
        this.category = category; // 'persistent', 'precision', 'splash', or ''
    }

    /**
     * Check if the component has dice
     * @returns {boolean} - True if the component has dice
     */
    hasDice() {
        return this.dice && this.dice.length > 0;
    }

    /**
     * Render the component as a PF2e damage expression
     * @returns {string} - The rendered damage expression
     */
    render() {
        let formula = this.dice;
        
        if (["precision", "splash"].includes(this.category)) formula = `(${formula})[${this.category}]`; // Handle precision and splash (they wrap the formula)
        if (this.category === "persistent" && this.damageType) return `(${formula})[persistent,${this.damageType}]`; // Handle persistent damage (special case with damage type)
        if (this.damageType) formula = `(${formula})[${this.damageType}]`; // Handle regular damage type
        // NEW: If no type and no category, just (dice)
        if (!this.damageType && !this.category) return `(${formula})`;
        return formula;
    }

    /**
     * Validate the component
     * @returns {boolean} - True if the component is valid
     */
    validate() {
        return this.hasDice();
    }

    /**
     * Convert the component to a plain object
     * @returns {object} - The component as a plain object
     */
    toJSON() {
        return {
            dice: this.dice,
            damageType: this.damageType,
            category: this.category
        };
    }
}

class DamageReplacement extends RollReplacement {
    constructor(match, type, config) {
        super(match, type);
        this.rollType = 'damage';
        this.priority = 100;
        this.damageComponents = [];
        this.areaDamage = false;
        this.match = match;
        this.parseMatch(match, config);
        this.originalRender = this.render();
    }

    parseMatch(match, config) {
        super.parseMatch(match, config);
        this.areaDamage = false;
        // Defensive: if match.replacement exists, skip parsing (already replaced)
        if (match && match.replacement) return;
        // If this is a multi-damage match, match[0] is the whole string, match[1] is the repeated group
        this.damageComponents = [];
        if (Array.isArray(match.multiMatches)) {
            for (const m of match.multiMatches) {
                this._parseSingleDamage(m);
            }
        } else {
            this._parseSingleDamage(match);
        }
    }

    _parseSingleDamage(match) {
        // Accepts a regex match array for a single dice/type pair
        const dice = match[1] || '';
        const originalText = match[0].toLowerCase();
        
        // Extract damage type from the various capture groups
        // The new regex has multiple capture groups for different damage patterns:
        // match[2] = persistent damage type (first pattern)
        // match[3] = persistent damage type (second pattern) 
        // match[4] = splash damage type (first pattern)
        // match[5] = splash damage type (second pattern)
        // match[6] = precision damage type (first pattern)
        // match[7] = precision damage type (second pattern)
        // match[8] = basic damage type
        const type = match[2] || match[3] || match[4] || match[5] || match[6] || match[7] || match[8] || '';
        
        const isPersistent = originalText.includes('persistent');
        const isPrecision = originalText.includes('precision');
        const isSplash = originalText.includes('splash');
        
        this.addDamageComponent(dice, type, isPersistent, isPrecision, isSplash);
    }

    addDamageComponent(dice, damageType = '', persistent = false, precision = false, splash = false) {
        // Convert legacy types to remaster types automatically
        let remasterType = damageType;
        if (damageType && LegacyConversionManager.isLegacyDamageType(damageType)) {
            remasterType = LegacyConversionManager.convertLegacyDamageType(damageType);
            console.log(`Legacy damage type converted: ${damageType} -> ${remasterType}`);
        }
        
        // Determine category from boolean flags
        let category = '';
        if (persistent) category = 'persistent';
        else if (precision) category = 'precision';
        else if (splash) category = 'splash';
        
        this.damageComponents.push(new DamageComponent(dice, remasterType, category));
    }

    render() { return super.render(); }
    conversionRender() {
        // If match.replacement exists, use it directly
        if (this.match && this.match.replacement) {
            return this.match.replacement;
        }
        // Handle damage consolidation
        if (this.originalText.includes('@Damage[') && this.originalText.includes('@Damage[')) {
            return this.renderDamageConsolidation();
        }
        let roll;
        if (this.damageComponents.length === 1) {
            roll = `@Damage[${this.damageComponents[0].render()}]`;
        } else {
            const componentStrings = this.damageComponents.map(comp => comp.render());
            roll = `@Damage[${componentStrings.join(',')}]`;
        }
        // Add area-damage option if enabled
        if (this.areaDamage) {
            // Find the last closing bracket of the @Damage expression
            const lastBracketIndex = roll.lastIndexOf(']');
            if (lastBracketIndex !== -1) {
                roll = roll.slice(0, lastBracketIndex) + '|options:area-damage' + roll.slice(lastBracketIndex);
            }
        }
        // Display text logic
        if (this.displayText && this.displayText.trim()) {
            return `${roll}{${this.displayText}} damage`;
        }
        return roll + ' damage';
    }
    
    renderDamageConsolidation() {
        const damageRolls = [];
        const regex = /@Damage\[/g;
        let startMatch;
        const originalText = this.originalText;
        
        while ((startMatch = regex.exec(originalText)) !== null) {
            const startPos = startMatch.index + startMatch[0].length;
            let bracketCount = 1;
            let endPos = startPos;
            while (endPos < originalText.length && bracketCount > 0) {
                if (originalText[endPos] === '[') bracketCount++;
                else if (originalText[endPos] === ']') bracketCount--;
                if (bracketCount > 0) endPos++;
            }
            if (bracketCount === 0) {
                const damageContent = originalText.substring(startPos, endPos);
                damageRolls.push(damageContent);
            }
        }
        
        if (damageRolls.length >= 2) {
            return `@Damage[${damageRolls.join(',')}]`;
        }
        
        return originalText;
    }
    validate() {
        if (this.match && this.match.replacement) return true;
        return this.damageComponents.length > 0 && this.damageComponents.every(comp => comp.validate());
    }
    getInteractiveParams() {
        // Return all damage components and rollType
        return {
            ...super.getInteractiveParams(),
            damageComponents: this.damageComponents.map(dc => dc.toJSON()),
            areaDamage: this.areaDamage,
            originalText: this.originalText
        };
    }
    static get panelConfig() {
        return {
            ...super.panelConfig,
            title: 'Damage Roll',
            isMultiComponent: true,
            componentFields: DAMAGE_COMPONENT_FIELDS,
            fields: [ENABLED_FIELD, ...DAMAGE_ADDITIONAL_FIELDS, ...super.panelConfig.fields.slice(1)]
        };
    }
    toJSON() {
        return {
            type: this.type,
            displayText: this.displayText,
            areaDamage: this.areaDamage,
            damageComponents: this.damageComponents.map(dc => dc.toJSON()),
            enabled: this.enabled
        };
    }
    resetToOriginal() {
        super.resetToOriginal();
        // Removed areaDamage reset (now in parseMatch)
    }
}

// -------------------- Check Replacement --------------------
class CheckReplacement extends RollReplacement {
    constructor(match, type, config) {
        super(match, type);
        this.rollType = 'check';
        this.priority = 90;
        this.checkType = '';
        this.skill = '';
        this.save = '';
        this.perception = 'perception';
        this.flat = 'flat';
        this.dcMethod = 'static';
        this.statistic = '';
        this.dc = null;
        this.basic = false;
        this.damagingEffect = false;
        this.loreName = '';
        this.showDC = 'owner';
        this.traits = [];
        this.options = [];
        this.match = match;
        this.parseMatch(match, config);
        this.originalRender = this.render();
    }

    resetCategoryProperties() {
        // Reset all category-specific properties
        this.basic = false;
        this.loreName = '';
        this.skill = 'acrobatics';
        this.save = 'reflex';
        this.perception = 'perception';
        this.flat = 'flat';
        this.dcMethod = 'static';
        this.statistic = 'ac';
        this.showDC = 'owner';
    }

    determineCategory(match, config) {
        // Priority 1: Explicit category from pattern handler
        if (match && match.checkType) return match.checkType;
        // Detect from match content
        if (match && match.isLoreCheck) return 'lore';
    }

    parseMatch(match, config) {
        super.parseMatch(match, config);
        this.resetCategoryProperties();
        this.checkType = this.determineCategory(match, config);
        // Route to category-specific parser
        switch (this.checkType) {
            case 'save':
                this.parseSaveMatch(match, config);
                break;
            case 'skill':
                this.parseSkillMatch(match, config);
                break;
            case 'perception':
                this.parsePerceptionMatch(match, config);
                break;
            case 'lore':
                this.parseLoreMatch(match, config);
                break;
            case 'flat':
                this.parseFlatMatch(match, config);
                break;
            default:
                this.parseSkillMatch(match, config);
        }
    }

    parseSkillMatch(match, config) {
        // Minimal logic for skill checks (already handled in previous parseMatch)
        this.skill = match[2].toLowerCase() || '';
        this.dc = match[1] || null;
    }

    parsePerceptionMatch(match, config) {
        // Minimal logic for perception checks
        this.dc = match[1] || null;
    }

    parseLoreMatch(match, config) {
        // Lore check name extraction and DC
        if (match && match.loreName) {
            this.loreName = match.loreName;
        } else if (match && match[2]) {
            this.loreName = match[2];
        } else if (match && match[1]) {
            this.loreName = match[1];
        }
        this.dc = match[1] || null;
    }

    render() { return super.render(); }
    conversionRender() {
        // Handle special replacement cases
        if (this.match && this.match.replacement) {
            return this.match.replacement;
        }
        // Route to category-specific renderer
        switch (this.checkType) {
            case 'save':
                return this.renderSaveCheck();
            case 'lore':
                return this.renderLoreCheck();
            case 'flat':
                return this.renderFlatCheck();
            case 'perception':
                return this.renderPerceptionCheck();
            case 'skill':
                return this.renderSkillCheck();
            default:
                return this.renderSkillCheck();
        }
    }

    buildDCParams() {
        const dcParams = [];
        
        // Handle DC method
        if (this.dcMethod !== 'static') {
            dcParams.push(`against:${this.statistic}`);
            if (this.checkType === 'save' && this.dcMethod === 'target') {
                dcParams.push('rollerRole:origin');
            }
            else if (this.checkType !== 'save' && this.dcMethod === 'origin') {
                dcParams.push('rollerRole:target');
            }
        }
        else if (this.dc) { dcParams.push(`dc:${this.dc}`); }

        if (this.showDC !== 'owner') {
            dcParams.push(`showDC:${this.showDC}`);
        }

        // Handle traits
        if (this.traits && this.traits.length > 0) {
            dcParams.push(`traits:${this.traits.join(',')}`);
        }
        
        return dcParams;
    }

    renderSkillCheck() {
        let params = [this.skill];
        params.push(...this.buildDCParams());
        
        const baseRoll = `@Check[${params.join('|')}]`;
        const displayText = this.getDisplayText ? this.getDisplayText() : this.displayText;
        return baseRoll + (displayText ? `{${displayText}}` : '');
    }
    
    renderPerceptionCheck() {
        let params = [this.perception];
        params.push(...this.buildDCParams());
        
        const baseRoll = `@Check[${params.join('|')}]`;
        const displayText = this.getDisplayText ? this.getDisplayText() : this.displayText;
        return baseRoll + (displayText ? `{${displayText}}` : '');
    }
    
    renderLoreCheck() {
        const loreSlug = this.loreName.toLowerCase().replace(/ /g, '-') + '-lore';
        let params = [];
        params.push(`type:${loreSlug}`);
        params.push(...this.buildDCParams());
        
        params.push(`name:${this.loreName}`);
        const baseRoll = `@Check[${params.join('|')}]`;
        const displayText = this.displayText || `${this.loreName} Lore`;
        return baseRoll + `{${displayText}}`;
    }
    
    renderSaveCheck() {
        let params = [this.save];
        params.push(...this.buildDCParams());
        
        if (this.basic) params.push('basic');
        if (this.damagingEffect) params.push('options:damaging-effect');
        // Only append 'save' or 'saving throw' if it was present in the input
        let saveTerm = '';
        if (this.saveTermInInput) {
            // Use the exact term found in the input (prefer 'saving throw' if present)
            const found = this.match[0].match(/\b(saving throw|save)\b/i);
            saveTerm = found ? ` ${found[1]}` : '';
        }
        
        const replacement = `@Check[${params.join('|')}]` + (this.displayText && this.displayText.trim() ? `{${this.displayText}}` : '') + saveTerm;
        return this.hasWrappingParentheses ? `(${replacement})` : replacement;
    }
    
    renderFlatCheck() {
        let params = [this.flat];
        
        // Flat checks always use static DC (no defense/against options in UI)
        if (this.dc) params.push(`dc:${this.dc}`);

        // Handle showDC
        if (this.showDC !== 'owner') {
            params.push(`showDC:${this.showDC}`);
        }

        // Handle traits
        if (this.traits && this.traits.length > 0) {
            params.push(`traits:${this.traits.join(',')}`);
        }
        
        const baseRoll = `@Check[${params.join('|')}]`;
        const displayText = this.displayText;
        return baseRoll + (displayText ? `{${displayText}}` : '');
    }

    validate() {
        if (this.match && this.match.replacement) return true;
        return this.skill || this.save || this.perception || this.flat || this.loreName;
    }
    getInteractiveParams() {
        return {
            ...super.getInteractiveParams(),
            checkType: this.checkType,
            skill: this.skill,
            save: this.save,
            perception: this.perception,
            flat: this.flat,
            dcMethod: this.dcMethod,
            statistic: this.statistic,
            dc: this.dc,
            basic: this.basic,
            loreName: this.loreName,
            originalText: this.originalText
        };
    }
    static get panelConfig() {
        return {
            ...super.panelConfig,
            title: 'Check/Save',
            fields: [
                ENABLED_FIELD,
                {
                    id: 'check-type',
                    type: 'select',
                    label: 'Type',
                    options: ConfigManager.CHECK_TYPES.options,
                    getValue: (rep) => rep.checkType || 'skill',
                    setValue: (rep, value) => { rep.checkType = value; }
                },
                {
                    id: 'check-type-skill',
                    type: 'select',
                    label: 'Skill',
                    options: ConfigManager.SKILLS.options,
                    getValue: (rep) => rep.skill || '',
                    setValue: (rep, value) => { rep.skill = value; },
                    hideIf: (rep) => rep.checkType !== 'skill'
                },
                // Save selector
                {
                    id: 'check-type-save',
                    type: 'select',
                    label: 'Save',
                    options: ConfigManager.SAVES.options,
                    getValue: (rep) => rep.save || '',
                    setValue: (rep, value) => { rep.save = value; },
                    hideIf: (rep) => rep.checkType !== 'save'
                },
                {
                    id: 'lore-name',
                    type: 'text',
                    label: 'Lore Name',
                    placeholder: 'e.g., Warfare, Local Politics',
                    getValue: (rep) => rep.loreName || '',
                    setValue: (rep, value) => { rep.loreName = value; },
                    hideIf: (rep) => rep.checkType !== 'lore'
                },
                {
                    id: 'dc-method',
                    type: 'select',
                    label: 'DC Method',
                    options: ConfigManager.DC_METHODS.options,
                    getValue: (rep) => rep.dcMethod || 'static',
                    setValue: (rep, value) => { rep.dcMethod = value; },
                    hideIf: (rep) => rep.checkType === 'flat'
                },
                {
                    id: 'statistic',
                    type: 'select',
                    label: 'Statistic',
                    options: ConfigManager.STATISTICS.options,
                    getValue: (rep) => rep.statistic || '',
                    setValue: (rep, value) => { rep.statistic = value; },
                    hideIf: (rep) => rep.dcMethod === 'static' || rep.checkType === 'flat'
                },
                // DC field
                {
                    id: 'check-dc',
                    type: 'number',
                    label: 'DC',
                    min: 0,
                    getValue: (rep) => rep.dc || '',
                    setValue: (rep, value) => { rep.dc = value; },
                    hideIf: (rep) => rep.dcMethod !== 'static' && rep.checkType !== 'flat'
                },
                {
                    id: 'show-dc',
                    type: 'select',
                    label: 'Show DC',
                    options: ConfigManager.SHOW_DCS.options,
                    getValue: (rep) => rep.showDC || 'owner',
                    setValue: (rep, value) => { rep.showDC = value; }
                },
                {
                    id: 'basic-save',
                    type: 'checkbox',
                    label: 'Basic Save',
                    getValue: (rep) => !!rep.basic,
                    setValue: (rep, value) => { rep.basic = value; },
                    hideIf: (rep) => rep.checkType !== 'save'
                },
                {
                    id: 'damaging-effect',
                    type: 'checkbox',
                    label: 'Damaging Effect',
                    getValue: (rep) => !!rep.damagingEffect,
                    setValue: (rep, value) => { rep.damagingEffect = value; },
                    hideIf: (rep) => rep.checkType !== 'save'
                },
                DISPLAY_TEXT_FIELD
            ],
            commonTraits: ['secret']
        };
    }
    resetToOriginal() {
        super.resetToOriginal();
    }
    parseSaveMatch(match, config) {
        // SaveReplacement.parseMatch logic
        super.parseMatch(match, config);
        // Defensive: if match.replacement exists, skip parsing (already replaced)
        if (match && match.replacement) return;
        // Parentheses handling (for wrapping)
        this.hasWrappingParentheses = false;
        if (typeof match[0] === 'string' && match[0].startsWith('(') && match[0].endsWith(')')) {
            this.hasWrappingParentheses = true;
        }
        // Save term detection
        this.saveTermInInput = /\b(save|saving throw)\b/i.test(match[0]);
        // Extract DC, type, and basic
        this.basic = /\bbasic\b/i.test(match[0]);
        for (let i = 1; i < (match.length || 0); i++) {
            const value = match[i];
            if (!value) continue;
            if (/^\d{1,2}$/.test(value)) {
                this.dc = value;
            } else if (/^(fort(?:itude)?|ref(?:lex)?|will)$/i.test(value)) {
                this.save = value.toLowerCase();
                if (this.save.startsWith('fort')) this.save = 'fortitude';
                else if (this.save.startsWith('ref')) this.save = 'reflex';
                else if (this.save.startsWith('will')) this.save = 'will';
            }
        }
    }

    parseFlatMatch(match, config) {
        // FlatCheckReplacement.parseMatch logic
        super.parseMatch(match, config);
        // Defensive: if match.replacement exists, skip parsing (already replaced)
        if (match && match.replacement) return;
        // Flat check pattern: match[1] is DC
        this.dc = match[1] || null;
    }
}

// -------------------- Healing Replacement --------------------
class HealingReplacement extends RollReplacement {
    constructor(match, type, config) {
        super(match, type);
        this.rollType = 'healing';
        this.priority = 85;
        this.dice = '';
        this.match = match;
        this.parseMatch(match, config);
        this.originalRender = this.render();
    }
    parseMatch(match, config) {
        super.parseMatch(match, config);
        if (match && match.replacement) return;
        this.dice = match[1] || '';
        // Disable if dice is just a number (not a dice roll)
        if (isNumberOnlyDice(this.dice)) {
            this.enabled = false;
        }
    }
    render() { return super.render(); }
    conversionRender() {
        if (this.match && this.match.replacement) {
            return this.match.replacement;
        }
        const dice = this.dice;
        let params = [`(${dice})[healing]`];
        if (this.traits && this.traits.length > 0) {
            params.push(`traits:${this.traits.join(',')}`);
        }
        let roll = `@Damage[${params.join('|')}]`;
        let afterDice = '';
        if (this._lastMatch && this._lastMatch[1]) {
            const originalDice = this._lastMatch[1];
            const diceIndex = this.originalText.indexOf(originalDice);
            if (diceIndex !== -1) {
                afterDice = this.originalText.substring(diceIndex + originalDice.length);
            }
        }
        if (this.displayText && this.displayText.trim()) {
            return `${roll}{${this.displayText}}${afterDice}`;
        }
        return `${roll}${afterDice}`;
    }
    validate() {
        if (this.match && this.match.replacement) return true;
        return this.dice && this.dice.length > 0;
    }
    getInteractiveParams() {
        return {
            ...super.getInteractiveParams(),
            dice: this.dice,
            originalText: this.originalText
        };
    }
    static get panelConfig() {
        return {
            ...super.panelConfig,
            title: 'Healing',
            fields: [
                ENABLED_FIELD,
                {
                    id: 'healing-dice',
                    type: 'text',
                    label: 'Dice',
                    placeholder: 'e.g., 3d8+4',
                    getValue: (rep) => rep.dice || '',
                    setValue: (rep, value) => { rep.dice = value; }
                },
                ...super.panelConfig.fields.slice(1)
            ]
        };
    }
    resetToOriginal() {
        super.resetToOriginal();
    }
}

// -------------------- Condition Replacement --------------------
class ConditionReplacement extends Replacement {
    constructor(matchObj, type, config) {
        super(matchObj.match, type);
        this.priority = 50;
        this.conditionName = '';
        this.degree = null;
        this.uuid = '';
        
        // Handle the linkedConditions config properly - it's an object with a 'set' property
        if (config && config.linkedConditions && config.linkedConditions.set) {
            this.linkedConditions = config.linkedConditions.set;
        } else {
            this.linkedConditions = new Set();
        }
        
        this.args = matchObj.args || [];
        this.originalConditionText = matchObj.originalText || matchObj.args?.[0] || ''; // Store original for case preservation
        this.parseMatch();
        let dedupKey = this.degree ? `${this.conditionName.toLowerCase()}-${this.degree}` : this.conditionName.toLowerCase();
        if (dedupKey === 'flat-footed') dedupKey = 'off-guard';
        if (this.linkedConditions.has(dedupKey)) {
            this.enabled = false;
        } else {
            this.linkedConditions.add(dedupKey);
            this.enabled = true;
        }
        this.displayText = '';
        this.originalRender = this.render();
    }

    parseMatch() {
        super.parseMatch();
        const args = this.args;
        let conditionName = (args[0] || '').toLowerCase();
        
        // Check for legacy condition conversion
        const converted = LegacyConversionManager.convertLegacyCondition(conditionName);
        if (converted) {
            this.conditionName = converted.toLowerCase();
            this.isLegacyConversion = true;
        } else {
            this.conditionName = conditionName;
            this.isLegacyConversion = false;
        }
        
        this.degree = args[1] || null;
        this.uuid = getConditionUUID(this.conditionName);
        // Store state reference for later use if available
        this._state = this._lastConfig?.linkedConditions?.state || null;
        // Update UUID with state if available
        if (this._state) {
            this.uuid = getConditionUUID(this.conditionName, this._state);
        }
    }

    render() { return super.render(); }
    conversionRender() {
        if (!this.uuid) {
            // If disabled and this is a legacy conversion, preserve original case
            if (!this.enabled && this.isLegacyConversion && this.originalConditionText) {
                return LegacyConversionManager.convertLegacyCondition(this.originalConditionText) || this.originalText;
            }
            return this.originalText;
        }
    
        // Get the proper display label from ConfigManager instead of manual capitalization
        const conditionOption = ConfigManager.CONDITIONS.options.find(opt => opt.value === this.conditionName);
        const displayName = conditionOption ? conditionOption.label : 
            this.conditionName.charAt(0).toUpperCase() + this.conditionName.slice(1);
        
        // Only include degree if this condition supports values AND we have a degree
        const shouldIncludeDegree = this.degree && ConfigManager.conditionCanHaveValue(this.conditionName);
        
        let display;
        if (shouldIncludeDegree) {
            display = `${displayName} ${this.degree}`;
        } else {
            display = displayName;
        }
        
        return `@UUID[${this.uuid}]{${display}}`;
    }

    validate() {
        return this.conditionName && this.uuid;
    }
    getInteractiveParams() {
        return {
            ...super.getInteractiveParams(),
            conditionName: this.conditionName,
            degree: this.degree,
            uuid: this.uuid,
            originalText: this.originalText
        };
    }
    static get panelConfig() {
        return {
            ...super.panelConfig,
            title: 'Condition',
            showTraits: false,
            fields: [
                ENABLED_FIELD,
                {
                    id: 'condition-select',
                    type: 'select',
                    label: 'Condition',
                    options: ConfigManager.CONDITIONS.options,
                    getValue: (rep) => rep.conditionName || '',
                    setValue: (rep, value) => {
                        rep.conditionName = value;
                        rep.uuid = getConditionUUID(value, rep._state);
                    }
                },
                {
                    id: 'condition-value',
                    type: 'number',
                    label: 'Value',
                    min: 1,
                    getValue: (rep) => rep.degree || '',
                    setValue: (rep, value) => { rep.degree = value ? String(value) : null; },
                    hideIf: (rep) => !ConfigManager.conditionCanHaveValue(rep.conditionName)
                },
            ]
        };
    }
    resetToOriginal() {
        super.resetToOriginal();
    }
}

// -------------------- Template Replacement --------------------
class TemplateReplacement extends RollReplacement {
    constructor(match, type, config) {
        super(match, type);
        this.rollType = 'template';
        this.priority = 80;
        this.shape = '';
        this.distance = 0;
        this.width = 5;
        this.parseMatch(match, config);
        this.originalRender = this.render();
    }
    parseMatch(match, config) {
        super.parseMatch(match, config);
        if (match && match.replacement) return;
        const shapeName = match[2] ? match[2].toLowerCase() : '';
        this.distance = match[1] ? parseInt(match[1], 10) : 0;
        this.shape = ConfigManager.getStandardTemplateType(shapeName); // Get the standard template type from the alternate name if necessary
        // Special handling for square/cube: width = distance
        if ((shapeName === 'square' || shapeName === 'cube') && this.distance) {
            this.width = this.distance;
        } else {
            this.width = 5; // default for lines
        }
        // If displayText is provided by the match, use it. Otherwise, if alternate shape, set displayText to the original phrase.
        if (match.displayText) {
            this.displayText = match.displayText;
        } else if (ConfigManager.ALTERNATE_TEMPLATE_NAMES.includes(shapeName) && this.distance) {
            this.displayText = `${this.distance}-foot ${shapeName}`;
        } else {
            this.displayText = '';
        }
        if (match.isWithin) this.isWithin = true; // optional, for future use
    }
    render() { return super.render(); }
    conversionRender() {
        let params = [`type:${this.shape}`, `distance:${this.distance}`];
        if (this.shape === 'line' && this.width && this.width !== 5) {
            params.push(`width:${this.width}`);
        }
        if (this.displayText && this.displayText.trim()) {
            return `@Template[${params.join('|')}]` + `{${this.displayText}}`;
        } else {
            return `@Template[${params.join('|')}]`;
        }
    }
    getInteractiveParams() {
        return {
            ...super.getInteractiveParams(),
            shape: this.shape,
            distance: this.distance,
            width: this.width,
            originalText: this.originalText
        };
    }
    static get panelConfig() {
        return {
            ...super.panelConfig,
            title: 'Template',
            showTraits: false, // Hide traits field for templates
            fields: [
                ENABLED_FIELD,
                {
                    id: 'template-type',
                    type: 'select',
                    label: 'Type',
                    options: ConfigManager.TEMPLATE_TYPES.options,
                    getValue: (rep) => rep.shape || '',
                    setValue: (rep, value) => { rep.shape = value; }
                },
                {
                    id: 'template-distance',
                    type: 'number',
                    label: 'Distance',
                    min: 0,
                    getValue: (rep) => rep.distance || '',
                    setValue: (rep, value) => { rep.distance = parseInt(value, 10) || 0; }
                },
                {
                    id: 'template-width',
                    type: 'number',
                    label: 'Width',
                    min: 0,
                    getValue: (rep) => rep.width || '',
                    setValue: (rep, value) => { rep.width = parseInt(value, 10) || 0; },
                    hideIf: (rep) => rep.shape !== 'line'
                },
                ...super.panelConfig.fields.slice(1)
            ]
        };
    }
    resetToOriginal() {
        super.resetToOriginal();
    }
}

// -------------------- Duration Replacement --------------------
class DurationReplacement extends RollReplacement {
    constructor(match, type, config) {
        super(match, type);
        this.rollType = 'duration';
        this.priority = 75;
        this.dice = '';
        this.unit = '';
        this.isGM = false; // false = public, true = GM-only
        this.label = 'Duration'; // New: label for the roll
        this.match = match;
        this.parseMatch(match, config);
        this.originalRender = this.render();
    }
    parseMatch(match, config) {
        super.parseMatch(match, config);
        if (match && match.replacement) return;
        this.dice = match[1] || '';
        this.unit = match[2] || '';
        this.isGM = false; // default to public
        this.label = 'Duration'; // default label
        // Disable if dice is just a number (not a dice roll)
        if (isNumberOnlyDice(this.dice)) {
            this.enabled = false;
        }
    }
    render() { return super.render(); }
    conversionRender() {
        if (this.match && this.match.replacement) {
            return this.match.replacement;
        }
        const rollType = this.isGM ? '/gmr' : '/r';
        const label = this.displayText && this.displayText.trim() ? this.displayText : `${this.dice} ${this.unit}`;
        const hashLabel = this.label && this.label.trim() ? this.label : 'Duration';
        return `[[${rollType} ${this.dice} #${hashLabel}]]{${label}}`;
    }
    validate() {
        if (this.match && this.match.replacement) return true;
        return this.dice && this.unit;
    }
    getInteractiveParams() {
        return {
            ...super.getInteractiveParams(),
            dice: this.dice,
            unit: this.unit,
            isGM: this.isGM,
            label: this.label,
            originalText: this.originalText
        };
    }
    static get panelConfig() {
        return {
            ...super.panelConfig,
            title: 'Duration',
            fields: [
                ENABLED_FIELD,
                {
                    id: 'duration-dice',
                    type: 'text',
                    label: 'Dice',
                    placeholder: 'e.g., 1d4',
                    getValue: (rep) => rep.dice || '',
                    setValue: (rep, value) => { rep.dice = value; }
                },
                {
                    id: 'duration-label',
                    type: 'text',
                    label: 'Label',
                    placeholder: 'e.g., Duration, Recharge, Cooldown',
                    getValue: (rep) => rep.label || 'Duration',
                    setValue: (rep, value) => { rep.label = value; }
                },
                {
                    id: 'duration-isGM',
                    type: 'checkbox',
                    label: 'GM Only',
                    getValue: (rep) => !!rep.isGM,
                    setValue: (rep, value) => { rep.isGM = value; }
                },
                DISPLAY_TEXT_FIELD
            ],
            showTraits: false
        };
    }
    resetToOriginal() {
        super.resetToOriginal();
        // isGM and label reset is handled in parseMatch
    }
}

class ActionReplacement extends Replacement {
    constructor(match, type, config) {
        super(match, type);
        this.priority = 60; // Utility level
        this.action = '';
        this.variant = '';
        this.dc = '';
        this.statistic = '';
        this.displayText = '';
        this.parseMatch(match, config);
        this.originalRender = this.render();
    }

    parseMatch(match, config) {
        super.parseMatch(match, config);
        // match[1] contains the unslugged action name (e.g., "administer first aid")
        const matchedAction = match[1] || '';
        
        // Convert the matched text to a slug
        this.action = this.actionToSlug(matchedAction);
        
        // Check if this action has variants and set default if it does
        if (ConfigManager.actionHasVariants(this.action)) {
            const variants = ConfigManager.ACTION_VARIANTS[this.action];
            if (variants && variants.slugs.length > 0) {
                this.variant = variants.slugs[0]; // Set first variant as default
            }
        } else {
            this.variant = '';
        }
        
        this.dc = '';
        this.statistic = '';
    }
    
    // Helper method to convert matched action text to slug
    actionToSlug(actionText) {
        // The action text from the regex will match the "unslug" pattern
        // We need to convert it back to the slug form
        const normalizedText = actionText.toLowerCase().trim();
        
        // Find the matching action slug
        for (const slug of ConfigManager.ACTIONS.slugs) {
            const unsluggedAction = slug.replace(/-/g, ' ');
            if (unsluggedAction === normalizedText) {
                return slug;
            }
        }
        
        // Fallback: create slug from text
        return normalizedText.replace(/\s+/g, '-');
    }

    render() { return super.render(); }

    conversionRender() {
        // Use this.action directly as it's already the slug
        let paramsArr = [];
        if (this.variant && this.variant.trim()) paramsArr.push(`variant=${this.variant.trim()}`);
        if (this.dc && this.dc.trim()) paramsArr.push(`dc=${this.dc.trim()}`);
        if (this.statistic && this.statistic.trim()) paramsArr.push(`statistic=${this.statistic.trim()}`);
        let params = paramsArr.length ? ' ' + paramsArr.join(' ') : '';
        
        // Only include display text if explicitly set
        let label = this.displayText && this.displayText.trim() ? `{${this.displayText}}` : '';
            
        return `[[/act ${this.action}${params}]]${label}`;
    }
    
    validate() {
        return !!this.action;
    }

    getInteractiveParams() {
        return {
            ...super.getInteractiveParams(),
            action: this.action,
            variant: this.variant,
            dc: this.dc,
            statistic: this.statistic,
            originalText: this.originalText
        };
    }
    static get panelConfig() {
        return {
            ...super.panelConfig,
            title: 'Action',
            showTraits: false,
            fields: [
                ENABLED_FIELD,
                {
                    id: 'action-select',
                    type: 'select',
                    label: 'Action',
                    options: ConfigManager.ACTIONS.options,
                    getValue: (rep) => rep.action || '',
                    setValue: (rep, value) => {
                        rep.action = value;
                        // Reset variant when action changes
                        if (ConfigManager.actionHasVariants(value)) {
                            const variants = ConfigManager.ACTION_VARIANTS[value];
                            rep.variant = variants && variants.slugs.length > 0 ? variants.slugs[0] : '';
                        } else {
                            rep.variant = '';
                        }
                    }
                },
                {
                    id: 'action-variant',
                    type: 'select',
                    label: 'Variant',
                    options: (rep) =>{
                        // Dynamically get options based on current selection
                        if (ConfigManager.actionHasVariants(rep.action)) {
                            return ConfigManager.ACTION_VARIANTS[rep.action].options;
                        }
                        return [];
                    },
                    getValue: (rep) => rep.variant || '',
                    setValue: (rep, value) => { rep.variant = value; },
                    hideIf: (rep) => !ConfigManager.actionHasVariants(rep.action) // Hide if the action has no variants
                },
                {
                    id: 'action-dc',
                    type: 'text',
                    label: 'DC',
                    placeholder: 'e.g., 20 or thievery',
                    getValue: (rep) => rep.dc || '',
                    setValue: (rep, value) => { rep.dc = value; }
                },
                {
                    id: 'action-statistic',
                    type: 'text',
                    label: 'Statistic',
                    placeholder: 'e.g., performance',
                    getValue: (rep) => rep.statistic || '',
                    setValue: (rep, value) => { rep.statistic = value; }
                },
                DISPLAY_TEXT_FIELD
            ]
        };
    }

    resetToOriginal() {
        super.resetToOriginal();
        // Re-parse to reset everything
        if (this._lastMatch) {
            this.parseMatch(this._lastMatch, this._lastConfig);
        }
    }
}

// Replacement class mapping for pattern types
const REPLACEMENT_CLASS_MAP = {
    damage: DamageReplacement,
    healing: HealingReplacement, // Dedicated healing replacement class
    check: CheckReplacement, // Unified check replacement for all check/save/flat
    template: TemplateReplacement,
    condition: ConditionReplacement,
    duration: DurationReplacement, // Duration replacement
    action: ActionReplacement, // New action replacement class
};

class ReplacementFactory {
    static createFromMatch(match, patternType, patternConfig) {
        const Cls = REPLACEMENT_CLASS_MAP[patternType];
        if (!Cls) throw new Error(`Unknown pattern type: ${patternType}`);
        let instance;
        if (patternType === 'condition') {
            instance = new Cls(match, patternType, patternConfig);
        } else {
            instance = new Cls(match, patternType, patternConfig);
        }
        return instance;
    }
    static getSupportedTypes() {
        return Object.keys(REPLACEMENT_CLASS_MAP);
    }
}

// Pattern priority constants
const PRIORITY = {
    SAVE: 1,
    DAMAGE: 2,
    HEALING: 2,
    SKILL: 2,
    FLAT: 2,
    UTILITY: 2,
    BASIC_DAMAGE: 3,
    BASIC_SKILL: 3,
    LEGACY: 4,
    DAMAGE_CONSOLIDATION: 5,
    LEGACY_CONDITION: 5,
    CONDITION: 6,
    TEMPLATE: 7
};

// -------------------- Condition Detector --------------------
// ConditionDetector class removed - not used in current implementation

// -------------------- Text Processor --------------------
class TextProcessor {
    constructor() {
        console.log('[PF2e Converter] Creating TextProcessor instance');
        this.linkedConditions = new Set(); // Only needed for condition linking
    }

    process(inputText, state = null) {
        console.log('[PF2e Converter] TextProcessor.process called with text length:', inputText?.length);
        
        if (!inputText || !inputText.trim()) {
            console.log('[PF2e Converter] No input text to process');
            return [];
        }
        
        try {
            this.linkedConditions = new Set();
            
            // Direct call to static detector - no registry needed
            console.log('[PF2e Converter] Detecting patterns in text');
            const matches = PatternDetector.detectAll(inputText);
            console.log('[PF2e Converter] Found', matches.length, 'pattern matches');
            
            const replacements = [];

            for (const matchResult of matches) {
                try {
                    let replacement;
                    
                    if (matchResult.type === 'condition') {
                        // Special handling for condition linking with state
                        replacement = PatternDetector.createReplacement({
                            ...matchResult,
                            config: { 
                                ...matchResult.config, 
                                linkedConditions: { 
                                    set: this.linkedConditions,
                                    state: state 
                                }
                            }
                        });
                    } else {
                        replacement = PatternDetector.createReplacement(matchResult);
                    }
                    
                    replacements.push(replacement);
                } catch (error) {
                    console.error('[PF2e Converter] Error creating replacement:', error, matchResult);
                }
            }

            console.log('[PF2e Converter] Created', replacements.length, 'replacement objects');
            return this.sortByPriority(replacements);
        } catch (error) {
            console.error('[PF2e Converter] Error in TextProcessor.process:', error);
            console.error('[PF2e Converter] Error stack:', error.stack);
            return [];
        }
    }

    sortByPriority(replacements) {
        return replacements.sort((a, b) => {
            return b.priority - a.priority || a.startPos - b.startPos;
        });
    }

    // Keep existing render methods unchanged
    renderFromReplacements(text, replacements, interactive = false, state = null) {
        const sorted = replacements.slice().sort((a, b) => b.startPos - a.startPos);
        let result = text;
        
        for (const replacement of sorted) {
            result = this.applyReplacement(result, replacement, interactive, state);
        }
        
        return this.applyGlobalLegacyConditionConversions(result);
    }

    applyReplacement(text, replacement, interactive = false, state = null) {
        const before = text.substring(0, replacement.startPos);
        const after = text.substring(replacement.endPos);
        const rendered = interactive ? replacement.renderInteractive(state) : replacement.render();
        return before + rendered + after;
    }

    applyGlobalLegacyConditionConversions(result) {
        LegacyConversionManager.getLegacyConditions().forEach(legacyCondition => {
            const regex = new RegExp(`\\b${legacyCondition}\\b`, 'gi');
            result = result.replace(regex, (match) => {
                return LegacyConversionManager.convertLegacyCondition(match);
            });
        });
        return result;
    }
}

// ===================== END OOP PIPELINE ARCHITECTURE =====================

/**
 * Create a live preview with active inline rolls
 * @param {string} text - Text with inline roll syntax
 * @param {HTMLElement} container - Container to render preview in
 */
async function createLivePreview(text, container) {
    if (!text || text.trim() === '') {
        container.innerHTML = '<em style="color: #999;">Live preview will appear here...</em>';
        return;
    }

    try {
        // Replace newlines with <br> for HTML preview
        const htmlText = text.replace(/\n/g, '<br>');

        // Use TextEditor to process the inline rolls
        const processedHTML = await TextEditor.enrichHTML(htmlText, {
            async: true,
            rollData: {},
            relativeTo: null
        });

        // Create a styled container for the preview
        const previewContent = `
            <div class="pf2e-preview-content" style="
                font-family: 'Signika', sans-serif;
                font-size: 14px;
                line-height: 1.4;
                color: #191813;
            ">
                ${processedHTML}
            </div>
        `;

        container.innerHTML = previewContent;

        // Add click handlers to the inline rolls
        const inlineRolls = container.querySelectorAll('.inline-roll');
        inlineRolls.forEach(roll => {
            roll.style.cursor = 'pointer';
            roll.addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                
                try {
                    // Execute the inline roll
                    const formula = roll.dataset.formula || roll.innerText;
                    const rollData = {};
                    
                    // Create and evaluate the roll
                    const actualRoll = new Roll(formula, rollData);
                    await actualRoll.evaluate();
                    
                    // Display the roll result
                    actualRoll.toMessage({
                        flavor: "PF2e Converter Preview Roll",
                        speaker: ChatMessage.getSpeaker()
                    });
                    
                } catch (rollError) {
                    ui.notifications.warn(`Could not execute roll: ${rollError.message}`);
                }
            });
        });

    } catch (error) {
        container.innerHTML = `<em style="color: #d32f2f;">Error creating preview: ${error.message}</em>`;
    }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        ui.notifications.info("Text copied to clipboard!");
    } catch (error) {
        ui.notifications.error("Failed to copy text to clipboard.");
    }
}

/**
 * Create and show the converter dialog
 */
function showConverterDialog() {
    console.log('[PF2e Converter] showConverterDialog called');
    
    const dialogContent = `
        <div class="pf2e-converter-dialog" style="display: flex; flex-direction: row; min-width: 900px;">
            <div style="flex: 2; min-width: 0;">
                <div class="form-group">
                    <label for="input-text"><strong>Input Text:</strong></label>
                    <textarea 
                        id="input-text" 
                        name="inputText" 
                        rows="6" 
                        placeholder="Paste your spell, ability, or feat description here..."
                        style="width: 100%; resize: vertical; font-family: monospace; font-size: 12px;"
                        >${DEFAULT_TEST_INPUT}</textarea>
                </div>
                <div class="form-group">
                    <label for="output-text"><strong>Converted Text:</strong></label>
                    <div id="output-html" style="
                        width: 100%; 
                        height: 150px;
                        max-height: 150px;
                        overflow-y: auto;
                        border: 1px solid #ddd; 
                        border-radius: 4px; 
                        background-color: #fafafa;
                        padding: 8px;
                        font-family: 'Signika', sans-serif;
                        font-size: 13px;
                        line-height: 1.7;
                    ">
                        <em style="color: #999;">Live preview will appear here...</em>
                    </div>
                </div>
                <div class="form-group">
                    <label for="live-preview"><strong>Live Preview:</strong> <small>(Click inline rolls to test them)</small></label>
                    <div 
                        id="live-preview" 
                        style="
                            width: 100%; 
                            height: 150px;
                            max-height: 150px;
                            overflow-y: auto;
                            border: 1px solid #ddd; 
                            border-radius: 4px; 
                            background-color: #fafafa;
                            padding: 8px;
                            font-family: 'Signika', sans-serif;
                            font-size: 13px;
                        "
                    >
                        <em style="color: #999;">Live preview will appear here...</em>
                    </div>
                </div>
                <div class="converter-controls" style="display: flex; gap: 10px; margin-top: 15px;">
                    <button type="button" id="copy-output" style="flex: 1; padding: 8px;">Copy Output</button>
                    <button type="button" id="clear-all" style="flex: 1; padding: 8px;">Clear All</button>
                </div>
            </div>
            <div id="modifier-panel" style="flex: 1; width: 300px; padding: 0; box-sizing: border-box;">
                <label style="font-weight: bold; display: block; margin: 0 0 4px 12px;">Modifier Panel</label>
                <div id="modifier-panel-content" style="background: #fff; border: 1px solid #ddd; border-radius: 4px; padding: 12px 10px; margin: 0 12px 12px 12px; min-height: 120px; color: #444; font-size: 14px;">
                    <em>Select an element to modify.</em>
                </div>
            </div>
        </div>
        
        <style>
            .pf2e-converter-dialog .form-group {
                margin-bottom: 15px;
            }
            .pf2e-converter-dialog label {
                display: block;
            }
            .pf2e-preview-content .inline-roll {
                background: #1f5582;
                color: white;
                padding: 2px 4px;
                border-radius: 2px;
                font-weight: bold;
                text-decoration: none;
                border: 1px solid #0d4068;
                transition: background-color 0.2s;
            }
            .pf2e-preview-content .inline-roll:hover {
                background: #2a6590;
                text-decoration: none;
            }
            .pf2e-preview-content .inline-roll.damage {
                background: #8b0000;
                border-color: #660000;
            }
            .pf2e-preview-content .inline-roll.damage:hover {
                background: #a50000;
            }
            .pf2e-preview-content .inline-roll.healing {
                background: #006400;
                border-color: #004d00;
            }
            .pf2e-preview-content .inline-roll.healing:hover {
                background: #007800;
            }
            /* Enhanced traits input styling */
            .traits-input-wrapper .trait-option.active {
                background: #e3f2fd !important;
            }
            .traits-input-wrapper .trait-option:hover {
                background: #f5f5f5;
            }
            .traits-input-wrapper .trait-tag {
                background: var(--color-bg-trait, #e3f2fd) !important;
                color: var(--color-text-trait, #1976d2) !important;
                border: solid 1px var(--color-border-trait, #bbdefb);
                font-weight: 500;
                text-transform: uppercase;
                font-size: 10px;
                letter-spacing: 0.05em;
            }
            .traits-input-wrapper .trait-tag .trait-remove {
                color: inherit;
                opacity: 0.7;
            }
            .traits-input-wrapper .trait-tag .trait-remove:hover {
                opacity: 1;
                color: #d32f2f;
            }
            .traits-input-wrapper .traits-selected:focus-within {
                border-color: #1976d2;
                box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
            }
            .pf2e-interactive.selected:hover {
                background: #bbbbbb !important;
            }
            .pf2e-interactive.selected.modified:hover {
                background: #aee9a3 !important;
            }
            .pf2e-interactive {
                cursor: pointer;
                background: #dddddd;
                padding: 1px 3px;
                color: #191813;
                border-radius: 1px;
                outline: 1px solid #444;
            }
            .pf2e-interactive:hover {
                background: #bbbbbb;
            }
            .pf2e-interactive.modified {
                background: #c8f7c5;
            }
            .pf2e-interactive.modified:hover {
                background: #aee9a3;
            }
            .pf2e-interactive.selected {
                outline: 2px solid #1976d2;
                box-shadow: 0 0 6px 1px #90caf9;
            }
            .pf2e-interactive.selected.modified {
                outline: 2px solid #1976d2;
                box-shadow: 0 0 6px 1px #90caf9;
            }
            #modifier-reset-btn:hover {
                background: #e3eafc !important;
                border-color: #1976d2 !important;
            }
            .modifier-field-row {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .modifier-field-row:last-child {
                margin-bottom: 0;
            }
            .modifier-panel-label {
                width: 80px;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                height: 100%;
                margin-bottom: 0;
            }
            .modifier-panel-label.panel-title {
                font-weight: bold;
                width: 200px;
            }
            .modifier-panel-label.bold { font-weight: bold; }
            .modifier-panel-input { width: 100%; }
            input[type="checkbox"].modifier-panel-checkbox { width: auto; margin: 0; }
            #damage-modifier-form,
            #modifier-panel form,
            .damage-component {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .damage-component {
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 10px;
                background: #f9f9f9;
            }
            .damage-component-label {
                font-weight: bold;
            }
            .damage-component label {
                width: 68px !important;
            }
            .pf2e-interactive.disabled {
                background: none;
            }
            .pf2e-interactive.disabled:hover {
                background: #dddddd;
            }
        </style>
    `;

    // Create the converter dialog instance
    console.log('[PF2e Converter] Creating ConverterDialog instance');
    const converterDialog = new ConverterDialog();

    console.log('[PF2e Converter] Creating Dialog instance');
    const dialog = new Dialog({
        title: "PF2e Inline Roll Converter",
        content: dialogContent,
        buttons: {},
        render: (html) => {
            console.log('[PF2e Converter] Dialog render callback called');
            try {
                // Initialize UI references in the converter dialog
                console.log('[PF2e Converter] Initializing UI');
                converterDialog.initializeUI(html);
                
                // Setup event handlers
                console.log('[PF2e Converter] Setting up event handlers');
                converterDialog.setupEventHandlers();
                
                console.log('[PF2e Converter] Dialog render completed successfully');
            } catch (error) {
                console.error('[PF2e Converter] Error in dialog render callback:', error);
                console.error('[PF2e Converter] Error stack:', error.stack);
            }
        }
    }, {
        width: 1000,
        height: 700,
        resizable: true
    });
    
    console.log('[PF2e Converter] Rendering dialog');
    dialog.render(true);
    console.log('[PF2e Converter] Dialog render called');
}

// Main execution
console.log('[PF2e Converter] Starting PF2e Inline Roll Converter');
console.log('[PF2e Converter] Foundry version:', game.version);
console.log('[PF2e Converter] Game system:', game.system?.id);

try {
    // Verify we're in a PF2e game
    if (game.system.id !== 'pf2e') {
        console.error('[PF2e Converter] Wrong game system detected:', game.system.id);
        ui.notifications.error("This macro is designed for the Pathfinder 2e system only.");
        return;
    }
    
    console.log('[PF2e Converter] PF2e system confirmed');
    
    // Verify minimum Foundry version
    if (!game.version || parseInt(game.version.split('.')[0]) < 12) {
        console.warn('[PF2e Converter] Foundry version may be too old:', game.version);
        ui.notifications.warn("This macro is designed for Foundry VTT v12+. Some features may not work properly.");
    }
    
    console.log('[PF2e Converter] Version check completed');
    
    // Show the converter dialog (condition mapping is now handled by ConverterDialog)
    console.log('[PF2e Converter] Calling showConverterDialog');
    showConverterDialog();
    console.log('[PF2e Converter] showConverterDialog completed');
    
} catch (error) {
    console.error('[PF2e Converter] Error during startup:', error);
    console.error('[PF2e Converter] Error stack:', error.stack);
    ui.notifications.error("Failed to start PF2e Inline Roll Converter. Check console for details.");
}

// ===================== MODIFIER PANEL SYSTEM =====================

/**
 * Get trait options from the PF2e system configuration
 * @returns {Array} - Array of trait objects with label and value
 */
function getTraitOptions() {
    try {
        // Get action traits from PF2e CONFIG
        const actionTraits = CONFIG?.PF2E?.actionTraits || {};
        const spellTraits = CONFIG?.PF2E?.spellTraits || {};
        const allTraits = { ...actionTraits, ...spellTraits };
        
        return Object.entries(allTraits)
            .map(([value, label]) => ({
                label: game.i18n.localize(label), // Always localize since labels are i18n keys
                value: value
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
    } catch (error) {
        // Fallback common traits
        return [
            { label: 'Arcane', value: 'arcane' },
            { label: 'Attack', value: 'attack' },
            { label: 'Divine', value: 'divine' },
            { label: 'Occult', value: 'occult' },
            { label: 'Primal', value: 'primal' },
            { label: 'Secret', value: 'secret' },
            { label: 'Mental', value: 'mental' },
            { label: 'Physical', value: 'physical' }
        ].sort((a, b) => a.label.localeCompare(b.label));
    }
}

/**
 * Enhanced traits input component that mimics pf2e system behavior
 * Supports typing, filtering, multiple selection, and tab completion
 */
class TraitsInput {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = {
            placeholder: 'Type trait name and press Enter...',
            multiple: true,
            creatable: true,
            ...options
        };
        this.traitOptions = getTraitOptions();
        this.selectedTraits = [];
        this.filteredOptions = [];  // Start empty until user types
        this.activeIndex = -1;
        this.isOpen = false;
        
        this.createElement();
        this.bindEvents();
    }
    
    createElement() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div class="traits-input-wrapper" style="position: relative; width: 100%;">
                <div class="traits-selected" style="
                    min-height: 32px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    padding: 4px;
                    background: white;
                    cursor: text;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                    align-items: center;
                ">
                    <input 
                        type="text" 
                        class="traits-search-input"
                        placeholder="${this.options.placeholder}"
                        style="
                            border: none;
                            outline: none;
                            background: transparent;
                            flex: 1;
                            min-width: 120px;
                            font-size: 14px;
                        "
                    />
                </div>
                <div class="traits-dropdown" style="
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: white;
                    border: 1px solid #ccc;
                    border-top: none;
                    border-radius: 0 0 4px 4px;
                    max-height: 200px;
                    overflow-y: auto;
                    z-index: 1000;
                    display: none;
                "></div>
            </div>
        `;
        
        this.wrapper = container.querySelector('.traits-input-wrapper');
        this.selectedContainer = container.querySelector('.traits-selected');
        this.searchInput = container.querySelector('.traits-search-input');
        this.dropdown = container.querySelector('.traits-dropdown');
    }
    
    bindEvents() {
        if (!this.searchInput || !this.dropdown) return;
        
        // Input events
        this.searchInput.addEventListener('input', (e) => {
            e.stopPropagation();
            this.handleInput(e);
        });
        this.searchInput.addEventListener('focus', (e) => {
            e.stopPropagation();
            this.openDropdown();
        });
        this.searchInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.searchInput.addEventListener('blur', (e) => setTimeout(() => this.closeDropdown(), 150));
        
        // Container click to focus input
        this.selectedContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            this.searchInput.focus();
        });
        
        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target)) {
                this.closeDropdown();
            }
        });
    }
    
    handleInput(e) {
        const query = e.target.value.toLowerCase();
        this.filterOptions(query);
        this.openDropdown();
    }
    
    handleKeyDown(e) {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                e.stopPropagation();
                this.navigateDown();
                break;
            case 'ArrowUp':
                e.preventDefault();
                e.stopPropagation();
                this.navigateUp();
                break;
            case 'Enter':
            case 'Tab':
                e.preventDefault();
                e.stopPropagation();
                this.selectActiveOption();
                break;
            case 'Escape':
                e.preventDefault();
                e.stopPropagation();
                this.closeDropdown();
                break;
            case 'Backspace':
                if (e.target.value === '' && this.selectedTraits.length > 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.removeTrait(this.selectedTraits[this.selectedTraits.length - 1].value);
                }
                break;
        }
    }
    
    filterOptions(query) {
        const normalizedQuery = query.toLowerCase().trim();
        this.filteredOptions = this.traitOptions.filter(trait => 
            trait.label.toLowerCase().includes(normalizedQuery) &&
            !this.selectedTraits.some(selected => selected.value === trait.value)
        );
        
        // Auto-select first option if we have results and query is not empty
        if (this.filteredOptions.length > 0 && normalizedQuery) {
            this.activeIndex = 0;
        } else {
            this.activeIndex = -1;
        }
        
        this.renderDropdown();
    }
    
    navigateDown() {
        this.activeIndex = Math.min(this.activeIndex + 1, this.filteredOptions.length - 1);
        this.updateActiveOption();
    }
    
    navigateUp() {
        this.activeIndex = Math.max(this.activeIndex - 1, -1);
        this.updateActiveOption();
    }
    
    updateActiveOption() {
        const options = this.dropdown.querySelectorAll('.trait-option');
        options.forEach((option, index) => {
            option.classList.toggle('active', index === this.activeIndex);
        });
        
        // Scroll active option into view
        if (this.activeIndex >= 0 && options[this.activeIndex]) {
            options[this.activeIndex].scrollIntoView({ block: 'nearest' });
        }
    }
    
    selectActiveOption() {
        if (this.activeIndex >= 0 && this.filteredOptions[this.activeIndex]) {
            // Use selected option from dropdown
            this.addTrait(this.filteredOptions[this.activeIndex]);
        } else if (this.searchInput.value.trim()) {
            // Try to add based on typed text
            this.addTraitFromText(this.searchInput.value.trim());
        }
    }
    
    addTraitFromText(text) {
        const normalizedText = text.toLowerCase().trim();
        
        // First, try to find exact match by label
        let matchedTrait = this.traitOptions.find(trait => 
            trait.label.toLowerCase() === normalizedText
        );
        
        // If no exact match, try partial match
        if (!matchedTrait) {
            matchedTrait = this.traitOptions.find(trait => 
                trait.label.toLowerCase().includes(normalizedText)
            );
        }
        
        // If we found a match, use it, otherwise create a custom trait
        if (matchedTrait) {
            this.addTrait(matchedTrait);
        } else {
            // Create custom trait (allows for user-defined traits)
            const customTrait = {
                label: text.charAt(0).toUpperCase() + text.slice(1).toLowerCase(),
                value: normalizedText.replace(/\s+/g, '-')
            };
            this.addTrait(customTrait);
        }
    }
    
    openDropdown() {
        this.isOpen = true;
        this.dropdown.style.display = 'block';
        const query = this.searchInput.value;
        
        // Only show options if user has typed something or if there are no selected traits
        if (query.trim() || this.selectedTraits.length === 0) {
            this.filterOptions(query);
        } else {
            this.filteredOptions = [];
            this.renderDropdown();
        }
    }
    
    closeDropdown() {
        this.isOpen = false;
        this.dropdown.style.display = 'none';
        this.activeIndex = -1;
    }
    
    renderDropdown() {
        if (this.filteredOptions.length === 0) {
            const query = this.searchInput.value.trim();
            if (query) {
                this.dropdown.innerHTML = `
                    <div style="padding: 8px; color: #666; font-style: italic;">
                        No matching traits found. Press Enter to add "${query}" as custom trait.
                    </div>
                `;
            } else {
                this.dropdown.innerHTML = '';
            }
            return;
        }
        
        this.dropdown.innerHTML = this.filteredOptions.map((trait, index) => `
            <div class="trait-option" data-value="${trait.value}" style="
                padding: 6px 12px;
                cursor: pointer;
                border-bottom: 1px solid #eee;
                ${index === this.activeIndex ? 'background: #e3f2fd;' : ''}
            ">
                ${trait.label}
            </div>
        `).join('');
        
        // Add click handlers
        this.dropdown.querySelectorAll('.trait-option').forEach((option, index) => {
            option.addEventListener('mouseenter', () => {
                this.activeIndex = index;
                this.updateActiveOption();
            });
            option.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.addTrait(this.filteredOptions[index]);
            });
        });
    }
    
    addTrait(trait) {
        if (!this.selectedTraits.some(selected => selected.value === trait.value)) {
            this.selectedTraits.push(trait);
            this.renderSelected();
            this.searchInput.value = '';
            this.filterOptions('');
            if (this.options.onChange) {
                this.options.onChange(this.selectedTraits);
            }
        }
        this.searchInput.focus();
    }
    
    removeTrait(value) {
        this.selectedTraits = this.selectedTraits.filter(trait => trait.value !== value);
        this.renderSelected();
        this.filterOptions(this.searchInput.value);
        if (this.options.onChange) {
            this.options.onChange(this.selectedTraits);
        }
    }
    
    renderSelected() {
        // Remove existing trait tags, but keep the input
        const existingTags = this.selectedContainer.querySelectorAll('.trait-tag');
        existingTags.forEach(tag => tag.remove());
        
        // Add trait tags before the input
        this.selectedTraits.forEach(trait => {
            const tag = document.createElement('div');
            tag.className = 'trait-tag';
            tag.style.cssText = `
                background: #e3f2fd;
                color: #1976d2;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 4px;
                white-space: nowrap;
            `;
            
            tag.innerHTML = `
                ${trait.label}
                <span class="trait-remove" style="
                    cursor: pointer;
                    font-weight: bold;
                    color: #666;
                    margin-left: 4px;
                ">&times;</span>
            `;
            
            tag.querySelector('.trait-remove').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.removeTrait(trait.value);
            });
            
            this.selectedContainer.insertBefore(tag, this.searchInput);
        });
    }
    
    setValue(traits, triggerChange = false) {
        // Convert string array to trait objects
        this.selectedTraits = traits.map(value => {
            const traitOption = this.traitOptions.find(option => option.value === value);
            return traitOption || { label: value, value: value };
        });
        this.renderSelected();
        this.filterOptions('');
        
        // Optionally trigger onChange callback
        if (triggerChange && this.options.onChange) {
            this.options.onChange(this.selectedTraits);
        }
    }
    
    getValue() {
        return this.selectedTraits.map(trait => trait.value);
    }
}

/**
 * Modifier Panel Manager - Handles creation and management of modifier panels for different replacement types
 * 
 * This system provides a flexible, DRY approach to creating modifier panels for different replacement types.
 * Each replacement type can have its own configuration with different field types and validation.
 * 
 * Supported field types:
 * - select: Dropdown with options
 * - number: Numeric input with optional min/max
 * - checkbox: Boolean checkbox
 * - text: Single-line text input
 * - textarea: Multi-line text input
 * - multiselect: Multiple selection dropdown
 * - traits: Enhanced traits input with pf2e system integration
 * 
 * Example usage:
 * // See static panelConfig on each Replacement class for configuration.
 */

const DAMAGE_COMPONENT_FIELDS = [
    {
        id: 'dice',
        type: 'text',
        label: 'Damage',
        placeholder: 'e.g., 2d6+3',
        getValue: (component) => component.dice || '',
        setValue: (component, value) => { component.dice = value; }
    },
    {
        id: 'damage-type',
        type: 'select',
        label: 'Type',
        options: ConfigManager.DAMAGE_TYPES.options,
        getValue: (component) => component.damageType || '',
        setValue: (component, value) => { component.damageType = value; }
    },
    {
        id: 'category',
        type: 'select',
        label: 'Category',
        options: ConfigManager.DAMAGE_CATEGORIES.options,
        getValue: (component) => component.category || '',
        setValue: (component, value) => { component.category = value || ''; }
    }
];

const DAMAGE_ADDITIONAL_FIELDS = [
    {
        id: 'area-damage',
        type: 'checkbox',
        label: 'Area Damage',
        getValue: (rep) => !!rep.areaDamage,
        setValue: (rep, value) => { rep.areaDamage = value; }
    }
];

// DRY: Shared Display Text field definition
const DISPLAY_TEXT_FIELD = {
    id: 'display-text',
    type: 'text',
    label: 'Display Text',
    placeholder: 'Optional display text',
    getValue: (rep) => rep.displayText || '',
    setValue: (rep, value) => { rep.displayText = value; }
};

// DRY: Shared Enabled field definition
const ENABLED_FIELD = {
    id: 'enabled',
    type: 'checkbox',
    label: 'Enabled',
    getValue: (rep) => rep.enabled !== false,
    setValue: (rep, value) => {
        const prev = rep.enabled;
        rep.enabled = value;
        // console.log(`[ENABLED_FIELD] id=${rep.id} enabled changed: ${prev} -> ${value}`); // LOGGING
    }
};

// Global attachResetButtonHandler function removed - functionality moved to ConverterDialog class

// Utility: Check if a dice expression is just a number (no 'd' present)
function isNumberOnlyDice(dice) {
    return /^\s*\d+\s*$/.test(dice);
}
