/**
 * PF2e Inline Roll Converter
 * 
 * Converts plain text descriptions into Foundry VTT inline automation syntax
 * for the Pathfinder 2e Remaster system.
 */

// Define a test input for demonstration and testing
const DEFAULT_TEST_INPUT = `You can Administer First Aid. Deal 4d6 fire damage and 2d4 persistent acid damage. The target becomes frightened 2 and clumsy 1. DC 21 Reflex save. DC 18 Arcana check or DC 18 Occultism check. Heal 3d8 hit points. 30-foot cone. Within 15 feet. Can't use this action again for 1d4 rounds. Use the Shove action.`;

// ==================== INLINE ROLL SYSTEM ====================

// Base class for all inline rolls
// Handles the actual syntax generation and parameters
class InlineAutomation {
    constructor(type, params = {}) {
        this.type = type;
        this.params = {...params};
        this.traits = params.traits || [];
        this.options = params.options || [];
        this.displayText = params.displayText || '';
    }

    // Helper methods to manage options
    
    // Return true if the option is in the options array
    // @param {string} option - The option to check
    // @returns {boolean} - True if the option is in the options array
    hasOption(option) {
        return this.options.includes(option);
    }

    // Add an option if the option is not already in the options array
    // @param {string} option - The option to add
    // @returns {void}
    addOption(option) {
        if (!this.hasOption(option)) {
            this.options.push(option);
        }
    }

    // Remove an option if the option is in the options array
    // @param {string} option - The option to remove
    // @returns {void}
    removeOption(option) {
        if (this.hasOption(option)) {
            this.options = this.options.filter(o => o !== option);
        }
    }

    // Add or remove an option based on a boolean value
    // @param {string} option - The option to set
    // @param {boolean} value - The value to set the option to
    // @returns {void}
    setOption(option, value) {
        if (value) {
            this.addOption(option);
        } else {
            this.removeOption(option);
        }
    }

    // Render the options as a string for the inline roll syntax (in alphabetical order)
    // @returns {string} - The rendered options syntax
    renderOptions() {
        return this.options.length > 0 ? `|options:${this.options.sort().join(',')}` : '';
    }

    // Generate the inline roll syntax
    // Must be implemented by subclasses
    render() {
        throw new Error('Must implement render() method');
    }

    static toSlug(text) {
        return text.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }

    static isValidDiceExpression(diceExpression) {
        if (!diceExpression || typeof diceExpression !== 'string') { return false; }
        const dicePattern = /^\d+(?:d\d+(?:[+-]\d+)?)?$/;
        return dicePattern.test(diceExpression);
    }
}

// Damage partial with dice, damage type, and category
class DamageComponent {
    constructor(dice = '', damageType = '', category = '') {
        this._dice = '';
        this._damageType = 'untyped';
        this._category = '';

        this.dice = dice || '';
        this.damageType = damageType || 'untyped';
        this.category = category || ''; // 'persistent', 'precision', 'splash', or ''
    }

    get damageType() { return this._damageType; }
    set damageType(value) {
        const valueSlug = InlineAutomation.toSlug(value);
        if (ConfigManager.DAMAGE_TYPES.slugs.includes(valueSlug)) {
            this._damageType = valueSlug;
        } else {
            console.warn(`Invalid damage type: ${valueSlug}`);
        }
    }

    get category() { return this._category; }
    set category(value) {
        const valueSlug = InlineAutomation.toSlug(value);
        if (ConfigManager.DAMAGE_CATEGORIES.slugs.includes(valueSlug)) {
            this._category = valueSlug;
        } else {
            console.warn(`Invalid damage category: ${valueSlug}`);
        }
    }

    get dice() { return this._dice; }
    set dice(value) {
        const normalizedValue = value.toLowerCase().trim();
        if (InlineAutomation.isValidDiceExpression(normalizedValue)) {
            this._dice = normalizedValue;
        } else {
            console.warn(`Invalid dice expression: ${normalizedValue}`);
        }
    }

    /**
     * Check if the component has dice
     * @returns {boolean} - True if the component has dice
     */
    hasDice() {
        return this._dice && this._dice.length > 0;
    }

    /**
     * Render the component as a PF2e damage expression
     * @returns {string} - The rendered damage expression
     */
    render(isHealing = false) {
        let formula = this._dice;
        // If formula contains '+' or '-' and is not wrapped in parentheses, wrap it in parentheses
        if (/[+-]/.test(formula) && !/^\(.*\)/.test(formula)) {
            formula = `(${formula})`;
        }

        const typeParts = [];
        if (this.damageType !== '') {typeParts.push(this.damageType);}
        if (this.category === "persistent") {typeParts.push("persistent");}
        if (isHealing) {typeParts.push("healing");}
        const typeSyntax = typeParts.length > 0 ? `[${typeParts.join(',')}]` : ''; // Create the damage type syntax, including persistent and/or healing
        
        if (["precision", "splash"].includes(this.category)) formula = `(${formula}[${this.category}])`; // Handle precision and splash (they wrap the formula)
        
        return `${formula}${typeSyntax}`;
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
            dice: this._dice,
            damageType: this._damageType,
            category: this._category
        };
    }
}

// Inline damage roll syntax
// @Damage[...]
class InlineDamage extends InlineAutomation {
    constructor(params = {}) {
        super('damage', params);
        
        // Set properties directly from parameters
        this.healing = params.healing || false;
        
        // Convert component parameter objects to DamageComponent instances
        this.components = (params.components || []).map(comp => 
            new DamageComponent(comp.dice, comp.damageType, comp.category)
        );
    }

    render() {
        // Render the syntax for each damage component
        const componentSyntax = [];
        this.components.forEach((component, index) => {
            componentSyntax.push(component.render(this.healing));
        });

        const optionsSyntax = this.renderOptions();
        const displayTextSyntax = this.displayText !== '' ? `{${this.displayText}}` : ''; // Add display text syntax if it's not empty

        // Return the complete syntax
        return `@Damage[${componentSyntax.join(',')}${optionsSyntax}]${displayTextSyntax}`;
    }
}

// Inline check syntax
// @Check[...|dc:...|options:...|traits:...]
class InlineCheck extends InlineAutomation {
    constructor(params = {}) {
        super('check', params);
        // Create internal properties
        this._checkType = 'flat';
        this._loreName = 'warfare';
        this._dcMethod = 'none';
        this._dc = 0;
        this._statistic = 'acrobatics';
        this._showDC = 'owner';

        this.checkType = params.checkType || 'flat';
        this.loreName = params.loreName || 'warfare';
        this.dcMethod = params.dcMethod || 'none';
        this.dc = params.dc || 0;
        this.statistic = params.statistic || 'acrobatics';
        this.showDC = params.showDC || 'owner';
        this.basic = params.basic || false;
    }

    get checkType() { return this._checkType; }
    set checkType(value) {
        const valueSlug = InlineAutomation.toSlug(value);
        if (ConfigManager.CHECK_TYPES.slugs.includes(valueSlug)) {
            this._checkType = valueSlug;
        } else {
            console.warn(`Invalid check type: ${valueSlug}`);
        }
    }

    get loreName() { return this._loreName; }
    set loreName(value) { this._loreName = InlineAutomation.toSlug(value); }

    get dcMethod() { return this._dcMethod; }
    set dcMethod(value) {
        const valueSlug = InlineAutomation.toSlug(value);
        if (ConfigManager.DC_METHODS.slugs.includes(valueSlug)) {
            this._dcMethod = valueSlug;
        } else {
            console.warn(`Invalid dc method: ${valueSlug}`);
        }
    }

    get dc() { return this._dc; }
    set dc(value) {
        if (typeof value === 'number') {
            this._dc = value;
        } else {
            console.warn(`Invalid dc: ${value}`);
        }
    }

    get statistic() { return this._statistic; }
    set statistic(value) {
        const valueSlug = InlineAutomation.toSlug(value);
        if (ConfigManager.STATISTICS.slugs.includes(valueSlug)) {
            this._statistic = valueSlug;
        } else {
            console.warn(`Invalid statistic: ${valueSlug}`);
        }
    }

    get showDC() { return this._showDC; }
    set showDC(value) {
        const valueSlug = InlineAutomation.toSlug(value);
        if (ConfigManager.SHOW_DCS.slugs.includes(valueSlug)) {
            this._showDC = valueSlug;
        } else {
            console.warn(`Invalid showDC: ${valueSlug}`);
        }
    }

    render() {
        const parts = [];
        // Add checkType, unless it's a lore, in which case add a slug created from the lore name
        if (this.checkType === 'lore') {
            parts.push(InlineAutomation.toSlug(this.loreName) + '-lore');
        } else {
            parts.push(this.checkType);
        }

        // Add the syntax for the dc/statistic based on the dcMethod
        if (this.dcMethod === 'static') {
            parts.push(`dc:${this.dc}`);
        } else if (this.dcMethod === 'target') {
            parts.push(`against:${this.statistic}`);
            if (this.isSave()) { parts.push(`rollerRole:origin`); }
        } else if (this.dcMethod === 'origin') {
            parts.push(`against:${this.statistic}`);
            if (!this.isSave()) { parts.push(`rollerRole:target`); }
        }
        
        // Add other parameters conditionally
        if (this.basic && this.isSave()) { parts.push(`basic`); } // Add basic parameter syntax if it's a save and it's basic
        if (this.showDC !== 'owner') { parts.push(`showDC:${this.showDC}`); } // Add showDC syntax if it's not 'owner'

        // Add options syntax to parts, minus the leading '|'
        const optionsSyntax = this.renderOptions().slice(1); // Remove the leading '|'
        if (optionsSyntax !== '') { parts.push(optionsSyntax); }

        if (this.traits.length > 0) { parts.push(`traits:${this.traits.join(',')}`); } // Add traits syntax if traits is not empty

        const displayTextSyntax = this.displayText !== '' ? `{${this.displayText}}` : ''; // Add display text syntax if it's not empty

        return `@Check[${parts.join('|')}]${displayTextSyntax}`; // Return the complete syntax
    }

    isSave() { // Return true if the check type is 'reflex', 'fortitude', or 'will'
        return this.checkType === 'reflex' || this.checkType === 'fortitude' || this.checkType === 'will';
    }

    isSkillCheck() {
        return ConfigManager.SKILLS.slugs.includes(this.checkType);
    }

    isPerceptionCheck() {
        return this.checkType === 'perception';
    }

    isLoreCheck() {
        return this.checkType === 'lore';
    }

    isFlatCheck() {
        return this.checkType === 'flat';
    }

    isOptionRelevant(option) {
        const relevanceRules = {
            'area-effect': () => this.isSave(),
            'damaging-effect': () => this.isSave()
        }

        const rule = relevanceRules[option];
        return rule ? rule() : true; // Default to true for unrecognized options
    }

    getRelevantOptions() {
        return this.options.filter(option => this.isOptionRelevant(option));
    }

    renderOptions() {
        const relevantOptions = this.getRelevantOptions();
        return relevantOptions.length > 0 ? `|options:${relevantOptions.join(',')}` : '';
    }
}

class InlineLink extends InlineAutomation {
    constructor(params = {}) {
        super('link', params);
        this.uuid = params.uuid || '';
    }

    // TODO: Add getter for uuid
    // TODO: Add setter for uuid that validates the uuid

    render() {
        const displayTextSyntax = this.displayText !== '' ? `{${this.displayText}}` : ''; // Add display text syntax if it's not empty
        return `@UUID[${this.uuid}]${displayTextSyntax}`;
    }
}

class InlineCondition extends InlineLink {
    constructor(params = {}) {
        super(params);
        this._condition = '';
        this._value = 0;
        
        this.condition = params.condition || '';
        this.value = params.value || 0;
        this.uuid = ConfigManager.getConditionUUID(this._condition) || '';
    }

    get condition() { return this._condition; }
    set condition(newCondition) {
        const valueSlug = InlineAutomation.toSlug(newCondition);
        if (ConfigManager.CONDITIONS.slugs.includes(valueSlug)) {
            this._condition = valueSlug;
        } else if (valueSlug === 'flat-footed') { // Special case for flat-footed legacy conversion
            this._condition = 'off-guard';
        } else {
            console.warn(`Invalid condition: ${valueSlug}`);
        }

        this.uuid = ConfigManager.getConditionUUID(this._condition) || '';
    }

    get value() { return this._value; }
    set value(newValue) {
        if (typeof newValue === 'number') {
            this._value = newValue;
        } else {
            console.warn(`Invalid value: ${newValue}`);
        }
    }
    
    render() {
        // Use the pre-calculated display text or generate it
        let displayTextSyntax = '';
        if (this.displayText !== '') {
            displayTextSyntax = `{${this.displayText}}`;
        } else if (this.condition === 'flat-footed' || this.condition === 'off-guard') {
            displayTextSyntax = '{Off-Guard}';
        } else {
            displayTextSyntax = this.condition.charAt(0).toUpperCase() + this.condition.slice(1).toLowerCase();
            if (ConfigManager.conditionCanHaveValue(this.condition) && this.value > 0) {
                displayTextSyntax += ` ${this.value}`;
            }
            displayTextSyntax = `{${displayTextSyntax}}`;
        }

        return `@UUID[${this.uuid}]${displayTextSyntax}`;
    }
}

class InlineTemplate extends InlineAutomation {
    constructor(params = {}) {
        super('template', params);
        this._templateType = 'burst';
        this._distance = 30;
        this._width = 5;
        
        this.templateType = params.templateType || 'burst';
        this.distance = params.distance || 30;
        this.width = params.width || 5;
    }

    get templateType() { return this._templateType; }
    set templateType(value) {
        const valueSlug = InlineAutomation.toSlug(value);
        if (ConfigManager.TEMPLATE_TYPES.slugs.includes(valueSlug)) {
            this._templateType = valueSlug;
        } else {
            console.warn(`Invalid template type: ${valueSlug}`);
        }
    }

    get distance() { return this._distance; }
    set distance(value) {
        if (typeof value === 'number') {
            this._distance = value;
        } else {
            console.warn(`Invalid distance: ${value}`);
        }
    }

    get width() { return this._width; }
    set width(value) {
        if (typeof value === 'number') {
            this._width = value;
        } else {
            console.warn(`Invalid width: ${value}`);
        }
    }

    render() {
        const parts = [];

        parts.push(`${this.templateType}`);
        parts.push(`distance:${this.distance}`);

        if (this.width >= 10 && this.templateType === 'line') {
            parts.push(`width:${this.width}`);
        }

        const displayTextSyntax = this.displayText !== '' ? `{${this.displayText}}` : '';
        
        return `@Template[${parts.join('|')}]${displayTextSyntax}`;
    }
}

class InlineGenericRoll extends InlineAutomation {
    constructor(params = {}) {
        super('generic', params);
        this._dice = '1d20';

        this.dice = params.dice || '1d20';
        this.label = params.label || '';
        this.gmOnly = params.gmOnly || false;
    }

    get dice() { return this._dice; }
    set dice(value) {
        const normalizedValue = value.toLowerCase().trim();
        if (InlineAutomation.isValidDiceExpression(normalizedValue)) {
            this._dice = normalizedValue;
        } else {
            console.warn(`Invalid dice expression: ${normalizedValue}`);
        }
    }

    render() {
        const parts = [];

        if (this.gmOnly) {
            parts.push(`/gmr`);
        } else {
            parts.push(`/r`);
        }

        parts.push(this.dice);

        if (this.label !== '') {
            parts.push(`#${this.label}`);
        }

        const displayTextSyntax = this.displayText !== '' ? `{${this.displayText}}` : '';

        return `[[${parts.join(' ')}]]${displayTextSyntax}`;
    }
}

class InlineAction extends InlineAutomation {
    constructor(params = {}) {
        super('action', params);
        this._action = 'administer-first-aid';
        this._variant = '';
        this._dcMethod = 'none';
        this._dc = 0;
        this._statistic = 'ac';
        this._alternateRollStatistic = 'none';

        this.action = params.action || 'administer-first-aid';
        this.variant = params.variant || '';
        this.dcMethod = params.dcMethod || 'none';
        this.dc = params.dc || 0;
        this.statistic = params.statistic || 'ac';
        this.alternateRollStatistic = params.alternateRollStatistic || 'none';
        
        this.correctInvalidVariant();
    }

    get action() { return this._action; }
    set action(value) {
        const valueSlug = InlineAutomation.toSlug(value);
        if (ConfigManager.ACTIONS.slugs.includes(valueSlug)) {
            this._action = valueSlug;
            this.correctInvalidVariant();
        } else {
            console.warn(`Invalid action: ${valueSlug}`);
        }
    }

    get variant() { return this._variant; }
    set variant(value) {
        const valueSlug = InlineAutomation.toSlug(value);

        // If the current action has no variants, set the variant to an empty string
        if (!ConfigManager.actionHasVariants(this.action)) {
            this._variant = '';
            if (valueSlug !== '') { console.warn(`Action ${this.action} has no variants, setting variant to empty string`); }
            return;
        }

        // If the valueSlug is a valid variant for the current action, set the variant
        if (ConfigManager.isValidActionVariant(this.action, valueSlug)) {
            this._variant = valueSlug;
        } else { 
            console.warn(`Invalid variant: ${valueSlug}`);
        }
    }

    get dcMethod() { return this._dcMethod; }
    set dcMethod(value) {
        const valueSlug = InlineAutomation.toSlug(value);
        if (ConfigManager.ACTION_DC_METHODS.slugs.includes(valueSlug)) {
            this._dcMethod = valueSlug;
        } else {
            console.warn(`Invalid dc method: ${valueSlug}`);
        }
    }

    get dc() { return this._dc; }
    set dc(value) {
        if (typeof value === 'number') {
            this._dc = value;
        } else {
            console.warn(`Invalid dc: ${value}`);
        }
    }

    get statistic() { return this._statistic; }
    set statistic(value) {
        const valueSlug = InlineAutomation.toSlug(value);
        if (ConfigManager.STATISTICS.slugs.includes(valueSlug)) {
            this._statistic = valueSlug;
        } else {
            console.warn(`Invalid statistic: ${valueSlug}`);
        }
    }

    get alternateRollStatistic() { return this._alternateRollStatistic; }
    set alternateRollStatistic(value) {
        const valueSlug = InlineAutomation.toSlug(value);
        if (ConfigManager.ALTERNATE_ROLL_STATISTICS.slugs.includes(valueSlug)) {
            this._alternateRollStatistic = valueSlug;
        } else {
            console.warn(`Invalid alternate roll statistic: ${valueSlug}`);
        }
    }

    correctInvalidVariant() {
        // If the current action has variants and the current variant is not valid, set the variant to the first valid variant
        if (ConfigManager.actionHasVariants(this.action) && !ConfigManager.isValidActionVariant(this.action, this.variant)) {
            this.variant = ConfigManager.getDefaultActionVariant(this.action);
        }
        // If the current action has no variants, set the variant to an empty string
        else if (!ConfigManager.actionHasVariants(this.action)) {
            this.variant = '';
        }
    }

    render() {
        const parts = [];

        parts.push(this.action);
        if (this.variant !== '') {
            parts.push(`variant=${this.variant}`);
        }

        if (this.dcMethod === 'static' && this.dc !== null) {
            parts.push(`dc=${this.dc}`);
        } else if (this.dcMethod === 'target' && this.statistic !== '') {
            parts.push(`dc=${this.statistic}`);
        }

        // Add alternate roll statistic if it's not empty and not 'none'
        if (this.alternateRollStatistic !== 'none' && this.alternateRollStatistic !== '') {
            parts.push(`statistic=${this.alternateRollStatistic}`);
        }

        const displayTextSyntax = this.displayText !== '' ? `{${this.displayText}}` : '';

        return `[[/act ${parts.join(' ')}]]${displayTextSyntax}`;
    }
}

// Enhanced field configuration object template
// const fieldConfig = {
//     id: 'field-name',           // Unique field identifier
//     type: 'select',             // Field type (select, text, checkbox, etc.)
//     label: 'Field Label',       // Display label
//     getValue: (rep) => rep.value, // Function to get current value
//     setValue: (rep, val) => {},  // Function to set new value (optional)
    
//     // Type-specific options
//     options: [...],             // For select/multiselect fields
//     placeholder: 'text...',     // For text fields
//     min: 0,                     // For number fields
    
//     // Conditional display
//     showIf: (rep) => true,      // Function to determine if field should be shown
//     hideIf: (rep) => false,     // Function to determine if field should be hidden
    
//     // Enhanced dependency and update properties
//     affects: ['other-field-id'],           // Fields this field affects
//     dependsOn: ['source-field-id'],        // Fields this field depends on
//     triggersUpdate: 'panel-partial',       // Update scope when changed
//     validate: (value, rep) => boolean      // Field validation function
// };

/**
 * BaseRenderer - Base class for type-specific renderers
 * Provides common interface and utility methods for all renderers
 */
class BaseRenderer {
    /**
     * Get field configurations for this replacement type
     * This base implementation ensures enabled field is always first
     */
    getFieldConfigs(replacement) {
        throw new Error('Must implement getFieldConfigs()');
    }

    /**
     * Get the base field configurations that all replacements should have
     * This ensures consistent enabled field across all types
     */
    getBaseFieldConfigs(replacement) {
        return [
            {
                id: 'enabled',
                type: 'checkbox',
                label: 'Enabled',
                getValue: (r) => r.enabled !== false,
                setValue: (r, value) => {
                    console.log(`[BaseRenderer] Setting enabled for ${r.type || 'unknown'} (${r.id}): ${r.enabled} -> ${value}`);
                    r.enabled = value;
                }
            }
        ];
    }

    /**
     * Get field configurations with base fields prepended
     * Subclasses should override getTypeSpecificFieldConfigs instead of getFieldConfigs
     */
    getFieldConfigs(replacement) {
        const baseFields = this.getBaseFieldConfigs(replacement);
        const typeSpecificFields = this.getTypeSpecificFieldConfigs(replacement);
        const traitFields = this.getTraitFieldConfigs(replacement);
        const displayTextFields = this.getDisplayTextFieldConfigs(replacement);
        
        return [
            ...baseFields,
            ...typeSpecificFields,
            ...traitFields,
            ...displayTextFields
        ];
    }

    /**
     * Get type-specific field configurations
     * Subclasses should override this method instead of getFieldConfigs
     */
    getTypeSpecificFieldConfigs(replacement) {
        return [];
    }

    /**
     * Get trait-related field configurations if supported
     */
    getTraitFieldConfigs(replacement) {
        if (!this.supportsTraits(replacement)) {
            return [];
        }

        const commonTraits = this.getCommonTraits(replacement);
        const traitFields = [];

        // Add common trait checkboxes first
        commonTraits.forEach(trait => {
            traitFields.push({
                id: `trait-${trait}`,
                type: 'checkbox',
                label: trait.charAt(0).toUpperCase() + trait.slice(1),
                getValue: (r) => r.inlineAutomation.traits && r.inlineAutomation.traits.includes(trait),
                setValue: (r, value) => {
                    if (!r.inlineAutomation.traits) r.inlineAutomation.traits = [];
                    if (value && !r.inlineAutomation.traits.includes(trait)) {
                        r.inlineAutomation.traits.push(trait);
                    } else if (!value && r.inlineAutomation.traits.includes(trait)) {
                        r.inlineAutomation.traits = r.inlineAutomation.traits.filter(t => t !== trait);
                    }
                }
            });
        });

        // Add traits input field last (so it appears after common trait checkboxes)
        traitFields.push({
            id: 'traits',
            type: 'traits',
            label: 'Traits',
            getValue: (r) => r.inlineAutomation.traits || [],
            setValue: (r, value) => { r.inlineAutomation.traits = value; }
        });

        return traitFields;
    }

    /**
     * Get display text field configuration if supported
     */
    getDisplayTextFieldConfigs(replacement) {
        const displayTextField = this.getDisplayTextField(replacement);
        return displayTextField ? [displayTextField] : [];
    }

    /**
     * Get the display title for this replacement type
     * @param {Object} replacement - The replacement object  
     * @returns {string} Display title
     */
    getTitle(replacement) {
        throw new Error('Must implement getTitle()');
    }

    /**
     * Get common traits for this replacement type
     * @param {Object} replacement - The replacement object
     * @returns {Array} Array of common trait names
     */
    getCommonTraits(replacement) {
        return [];
    }

    /**
     * Check if this renderer supports traits input
     * @param {Object} replacement - The replacement object
     * @returns {boolean} Whether traits input should be shown
     */
    supportsTraits(replacement) {
        return true;
    }

    /**
     * Get display text field configuration if supported
     * @param {Object} replacement - The replacement object
     * @returns {Object|null} Display text field config or null
     * Subclassess should override this method to return null if they don't support display text
     */
    getDisplayTextField(replacement) {
        return {
            id: 'display-text',
            type: 'text',
            label: 'Display Text',
            getValue: (r) => r.inlineAutomation.displayText || '',
            setValue: (r, value) => { r.inlineAutomation.displayText = value; },
            placeholder: 'Custom display text...'
        };
    }

    /**
     * Get enhanced field configurations with dependency information
     * @param {Object} replacement - The replacement object
     * @returns {Array} Array of enhanced field configuration objects
     */
    getEnhancedFieldConfigs(replacement) {
        const baseConfigs = this.getFieldConfigs(replacement);
        
        // Enhance field configurations with dependency information
        return baseConfigs.map(config => ({
            ...config,
            // Ensure all required properties are present with defaults
            affects: config.affects || [],
            dependsOn: config.dependsOn || [],
            triggersUpdate: config.triggersUpdate || 'field-only',
            validate: config.validate || null
        }));
    }
}

/**
 * FieldRenderer - Utility class for consistent field rendering
 * Provides static methods for generating field HTML
 */
class FieldRenderer {
    /**
     * Render a field with consistent styling
     * @param {string} type - Field type (text, select, checkbox, number, textarea, multiselect, traits)
     * @param {string} id - Field ID
     * @param {string} label - Field label
     * @param {*} value - Current value
     * @param {Object} options - Field options
     * @returns {string} Field HTML
     */
    static render(type, id, label, value, options = {}) {
        const fieldId = id;
        const containerStyle = options.hidden ? 'display: none;' : '';

        switch (type) {
            case 'select':
                const optionsArray = options.options || [];
                const selectOptions = optionsArray.map(option => {
                    const optionValue = typeof option === 'object' ? option.value : option;
                    const optionLabel = typeof option === 'object' ? option.label : option;
                    const selected = optionValue === value ? 'selected' : '';
                    return `<option value="${optionValue}" ${selected}>${optionLabel}</option>`;
                }).join('');
                return `
                    <div id="${fieldId}-container" class="form-group" style="${containerStyle}" data-field-id="${fieldId}">
                        <label>${label}</label>
                        <div class="form-fields">
                            <select id="${fieldId}" class="rollconverter-field-input">
                                ${selectOptions}
                            </select>
                        </div>
                        ${options.notes ? `<p class="notes">${options.notes}</p>` : ''}
                    </div>
                `;

            case 'number':
                const minAttr = options.min !== undefined ? `min="${options.min}"` : '';
                return `
                    <div id="${fieldId}-container" class="form-group" style="${containerStyle}" data-field-id="${fieldId}">
                        <label>${label}</label>
                        <div class="form-fields">
                            <input type="number" id="${fieldId}" class="rollconverter-field-input" ${minAttr} value="${value}" />
                        </div>
                        ${options.notes ? `<p class="notes">${options.notes}</p>` : ''}
                    </div>
                `;

            case 'checkbox':
                const checked = value ? 'checked' : '';
                return `
                    <div id="${fieldId}-container" class="form-group" style="${containerStyle}" data-field-id="${fieldId}">
                        <label>${label}</label>
                        <div class="form-fields">
                            <input type="checkbox" id="${fieldId}" class="rollconverter-field-checkbox" ${checked} />
                        </div>
                        ${options.notes ? `<p class="notes">${options.notes}</p>` : ''}
                    </div>
                `;

            case 'text':
                const placeholder = options.placeholder ? `placeholder="${options.placeholder}"` : '';
                return `
                    <div id="${fieldId}-container" class="form-group" style="${containerStyle}" data-field-id="${fieldId}">
                        <label>${label}</label>
                        <div class="form-fields">
                            <input type="text" id="${fieldId}" class="rollconverter-field-input" ${placeholder} value="${value}" onkeydown="event.stopPropagation();" />
                        </div>
                        ${options.notes ? `<p class="notes">${options.notes}</p>` : ''}
                    </div>
                `;

            case 'textarea':
                const textareaPlaceholder = options.placeholder ? `placeholder="${options.placeholder}"` : '';
                const rows = options.rows || 3;
                return `
                    <div id="${fieldId}-container" class="form-group" style="${containerStyle}" data-field-id="${fieldId}">
                        <label>${label}</label>
                        <div class="form-fields">
                            <textarea id="${fieldId}" class="rollconverter-field-input" ${textareaPlaceholder} rows="${rows}">${value}</textarea>
                        </div>
                        ${options.notes ? `<p class="notes">${options.notes}</p>` : ''}
                    </div>
                `;

            case 'traits':
                // Use the fieldId directly as the container ID for the traits input
                const traitsContainerId = `${fieldId}-input-container`;
                return `
                    <div id="${fieldId}-container" class="form-group" style="${containerStyle}" data-field-id="${fieldId}">
                        <label>${label}</label>
                        <div class="form-fields">
                            <div id="${traitsContainerId}" class="rollconverter-field-input-wrapper"></div>
                        </div>
                        ${options.notes ? `<p class="notes">${options.notes}</p>` : ''}
                    </div>
                `;

            default:
                return `<div id="${fieldId}-container" class="form-group" style="${containerStyle}" data-field-id="${fieldId}">Unknown field type: ${type}</div>`;
        }
    }

    /**
     * Render a row of fields
     * @param {Array} fields - Array of field configs
     * @param {Object} target - Target object for field values
     * @param {string} prefix - Optional prefix for field IDs
     * @returns {string} Row HTML
     */
    static renderRow(fields, target, prefix = '') {
        return fields.map((field, idx) => {
            if (field.showIf && !field.showIf(target)) return '';
            
            const value = field.getValue ? field.getValue(target) : target[field.id];
            const fieldId = prefix ? `${prefix}-${field.id}` : field.id;
            const options = {
                options: typeof field.options === 'function' ? field.options(target) : field.options,
                placeholder: field.placeholder,
                min: field.min,
                rows: field.rows,
                hidden: field.hideIf && field.hideIf(target),
                notes: field.notes
            };

            return FieldRenderer.render(field.type, fieldId, field.label, value, options);
        }).join('');
    }

    /**
     * Render a conditional field
     * @param {Function} condition - Condition function
     * @param {Object} field - Field configuration
     * @param {Object} target - Target object
     * @returns {string} Conditional field HTML
     */
    static renderConditional(condition, field, target) {
        if (!condition(target)) return '';
        return FieldRenderer.render(field.type, field.id, field.label, field.getValue(target), field);
    }
}

/**
 * DamageRenderer - Handles damage roll modifier UI
 */
class DamageRenderer extends BaseRenderer {
    getTitle(replacement) {
        return 'Inline Damage Roll';
    }

    getTypeSpecificFieldConfigs(replacement) {
        const configs = [];
    
        // Ensure components array exists
        if (!replacement.inlineAutomation.components || !Array.isArray(replacement.inlineAutomation.components)) {
            replacement.inlineAutomation.components = [];
        }
        
        // Generate field configs for each component using the standard system
        replacement.inlineAutomation.components.forEach((component, index) => {
            configs.push({
                id: `component-${index}-dice`,
                type: 'text',
                label: `Dice`,
                getValue: (r) => r.inlineAutomation.components[index]?.dice || '',
                setValue: (r, value) => {
                    if (!r.inlineAutomation.components[index]) {
                        r.inlineAutomation.components[index] = new DamageComponent();
                    }
                    r.inlineAutomation.components[index].dice = value;
                },
                placeholder: 'e.g., 2d6+3',
                // ADD these new properties:
                isComponentField: true,
                componentIndex: index,
                componentField: 'dice'
            });
            
            configs.push({
                id: `component-${index}-damage-type`,
                type: 'select',
                label: `Type`,
                options: ConfigManager.DAMAGE_TYPES.options,
                getValue: (r) => r.inlineAutomation.components[index]?.damageType || '',
                setValue: (r, value) => {
                    if (!r.inlineAutomation.components[index]) {
                        r.inlineAutomation.components[index] = new DamageComponent();
                    }
                    r.inlineAutomation.components[index].damageType = value;
                },
                // ADD these new properties:
                isComponentField: true,
                componentIndex: index,
                componentField: 'damageType'
            });
            
            configs.push({
                id: `component-${index}-damage-category`,
                type: 'select',
                label: `Category`,
                options: ConfigManager.DAMAGE_CATEGORIES.options,
                getValue: (r) => r.inlineAutomation.components[index]?.category || '',
                setValue: (r, value) => {
                    if (!r.inlineAutomation.components[index]) {
                        r.inlineAutomation.components[index] = new DamageComponent();
                    }
                    r.inlineAutomation.components[index].category = value;
                },
                // ADD these new properties:
                isComponentField: true,
                componentIndex: index,
                componentField: 'category'
            });
        });
    
        // Area damage field (no changes needed)
        configs.push({
            id: 'area-damage',
            type: 'checkbox',
            label: 'Area Damage',
            getValue: (r) => r.inlineAutomation.hasOption('area-damage') || false,
            setValue: (r, value) => r.inlineAutomation.setOption('area-damage', value)
        });
    
        configs.push({
            id: 'healing',
            type: 'checkbox',
            label: 'Healing',
            getValue: (r) => r.inlineAutomation.healing || false,
            setValue: (r, value) => { r.inlineAutomation.healing = value; },
            showIf: (r) => r.inlineAutomation.components.length === 1
        });
    
        return configs;
    }

    supportsTraits(replacement) {
        return false;
    }
}

/**
 * CheckRenderer - Handles check/save modifier UI
 */
class CheckRenderer extends BaseRenderer {
    getTitle(replacement) {
        return 'Inline Check/Save';
    }

    getTypeSpecificFieldConfigs(replacement) {
        const configs = [];
        
        configs.push({
            id: 'check-type',
            type: 'select',
            label: 'Check Type',
            getValue: (r) => r.inlineAutomation.checkType || 'flat',
            setValue: (r, value) => { r.inlineAutomation.checkType = value; },
            options: ConfigManager.CHECK_TYPES.options,
            affects: ['lore-name'],
            triggersUpdate: 'visibility'
        });

        configs.push({
            id: 'lore-name',
            type: 'text',
            label: 'Lore Name',
            getValue: (r) => r.inlineAutomation.loreName || '',
            setValue: (r, value) => { r.inlineAutomation.loreName = value; },
            placeholder: 'e.g., Sailing Lore',
            dependsOn: ['check-type'],
            showIf: (r) => r.inlineAutomation.checkType === 'lore'
        });
        
        configs.push({
            id: 'dc-method',
            type: 'select',
            label: 'DC Method',
            getValue: (r) => r.inlineAutomation.dcMethod || 'static',
            setValue: (r, value) => { r.inlineAutomation.dcMethod = value; },
            options: ConfigManager.DC_METHODS.options,
            affects: ['dc', 'statistic'],
            triggersUpdate: 'visibility'
        });

        configs.push({
            id: 'dc',
            type: 'number',
            label: 'DC',
            getValue: (r) => r.inlineAutomation.dc || '',
            setValue: (r, value) => { r.inlineAutomation.dc = value; },
            min: 1,
            dependsOn: ['dc-method'],
            showIf: (r) => r.inlineAutomation.dcMethod === 'static'
        });

        configs.push({
            id: 'statistic',
            type: 'select',
            label: 'Defense Stat',
            getValue: (r) => r.inlineAutomation.statistic || '',
            setValue: (r, value) => { r.inlineAutomation.statistic = value; },
            options: ConfigManager.STATISTICS.options,
            dependsOn: ['dc-method'],
            showIf: (r) => r.inlineAutomation.dcMethod === 'target' || r.inlineAutomation.dcMethod === 'origin'
        });

        configs.push({
            id: 'show-dc',
            type: 'select',
            label: 'Show DC',
            getValue: (r) => r.inlineAutomation.showDC || 'owner',
            setValue: (r, value) => { r.inlineAutomation.showDC = value; },
            options: ConfigManager.SHOW_DCS.options
        });
        
        configs.push({
            id: 'basic-save',
            type: 'checkbox',
            label: 'Basic',
            getValue: (r) => r.inlineAutomation.basic || false,
            setValue: (r, value) => { r.inlineAutomation.basic = value; },
            showIf: (r) => r.inlineAutomation.isSave()
        });

        configs.push({
            id: 'damaging-effect',
            type: 'checkbox',
            label: 'Damaging Effect',
            getValue: (r) => r.inlineAutomation.hasOption('damaging-effect') || false,
            setValue: (r, value) => r.inlineAutomation.setOption('damaging-effect', value),
            showIf: (r) => r.inlineAutomation.isOptionRelevant('damaging-effect')
        });

        configs.push({
            id: 'area-effect',
            type: 'checkbox',
            label: 'Area Effect',
            getValue: (r) => r.inlineAutomation.hasOption('area-effect') || false,
            setValue: (r, value) => r.inlineAutomation.setOption('area-effect', value),
            showIf: (r) => r.inlineAutomation.isOptionRelevant('area-effect')
        });

        return configs;
    }

    getCommonTraits(replacement) {
        return ['secret'];
    }
}

/**
 * ConditionRenderer - Handles condition link modifier UI
 */
class ConditionRenderer extends BaseRenderer {
    getTitle(replacement) {
        return 'Inline Condition Link';
    }

    getTypeSpecificFieldConfigs(replacement) {
        const configs = [];
        
        configs.push({
            id: 'condition-select',
            type: 'select',
            label: 'Condition',
            getValue: (r) => r.inlineAutomation.condition || '',
            setValue: (r, value) => { r.inlineAutomation.condition = value; },
            options: ConfigManager.CONDITIONS.options,
            affects: ['condition-value'],
            triggersUpdate: 'visibility'
        });

        configs.push({
            id: 'condition-value',
            type: 'number',
            label: 'Value',
            getValue: (r) => r.inlineAutomation.value || '',
            setValue: (r, value) => { r.inlineAutomation.value = value; },
            min: 1,
            showIf: (r) => r.inlineAutomation.condition && ConfigManager.conditionCanHaveValue(r.inlineAutomation.condition),
            dependsOn: ['condition-select']
        });

        return configs;
    }

    // Conditions don't support display text
    getDisplayTextField(replacement) { 
        return null;
    }

    // Conditions don't support traits
    supportsTraits(replacement) {
        return false;
    }
}

/**
 * TemplateRenderer - Handles template modifier UI
 */
class TemplateRenderer extends BaseRenderer {
    getTitle(replacement) {
        return 'Inline Template Link';
    }

    getTypeSpecificFieldConfigs(replacement) {
        const configs = [];
        
        configs.push({
            id: 'template-type',
            type: 'select',
            label: 'Type',
            getValue: (r) => r.inlineAutomation.templateType || 'burst',
            setValue: (r, value) => { r.inlineAutomation.templateType = value; },
            options: ConfigManager.TEMPLATE_TYPES.options,
            affects: ['width'],
            triggersUpdate: 'visibility'
        });
        
        configs.push({
            id: 'distance',
            type: 'number',
            label: 'Distance',
            getValue: (r) => r.inlineAutomation.distance || '',
            setValue: (r, value) => { r.inlineAutomation.distance = value; },
            min: 1
        });
        
        configs.push({
            id: 'width',
            type: 'number',
            label: 'Width',
            getValue: (r) => r.inlineAutomation.width || '',
            setValue: (r, value) => { r.inlineAutomation.width = value; },
            min: 1,
            dependsOn: ['template-type'],
            showIf: (r) => r.inlineAutomation.templateType === 'line'
        });

        return configs;
    }

    // Templates don't support traits
    supportsTraits(replacement) {
        return false;
    }
}

class GenericRollRenderer extends BaseRenderer {
    getTitle(replacement) {
        return 'Generic Inline Roll';
    }

    getTypeSpecificFieldConfigs(replacement) {
        const configs = [];
        
        configs.push({
            id: 'dice',
            type: 'text',
            label: 'Dice',
            getValue: (r) => r.inlineAutomation.dice || '',
            setValue: (r, value) => { r.inlineAutomation.dice = value; },
            placeholder: 'e.g., 1d4'
        });
        
        configs.push({
            id: 'roll-label',
            type: 'text',
            label: 'Label',
            getValue: (r) => r.inlineAutomation.label || 'Duration',
            setValue: (r, value) => { r.inlineAutomation.label = value; },
            placeholder: 'e.g., Duration'
        });
        
        configs.push({
            id: 'gm-only',
            type: 'checkbox',
            label: 'GM Only',
            getValue: (r) => r.inlineAutomation.gmOnly || false,
            setValue: (r, value) => { r.inlineAutomation.gmOnly = value; }
        });

        return configs;
    }

    // Durations don't support traits
    supportsTraits(replacement) {
        return false;
    }
}

/**
 * ActionRenderer - Handles action modifier UI
 */
class ActionRenderer extends BaseRenderer {
    getTitle(replacement) {
        return 'Inline Action';
    }

    getTypeSpecificFieldConfigs(replacement) {
        const configs = [];
        
        configs.push({
            id: 'action-name',
            type: 'select',
            label: 'Action',
            getValue: (r) => r.inlineAutomation.action || '',
            setValue: (r, value) => { r.inlineAutomation.action = value; },
            options: ConfigManager.ACTIONS.options,
            affects: ['action-variant'],
            triggersUpdate: 'panel-partial'
        });

        configs.push({
            id: 'action-variant',
            type: 'select',
            label: 'Variant',
            options: (r) => ConfigManager.getActionVariantOptions(r.inlineAutomation.action) || [],
            getValue: (r) => r.inlineAutomation.variant || '',
            setValue: (r, value) => { r.inlineAutomation.variant = value; },
            dependsOn: ['action-name'],
            showIf: (r) => r.inlineAutomation.action && ConfigManager.actionHasVariants(r.inlineAutomation.action)
        });

        configs.push({
            id: 'alternate-roll-statistic',
            type: 'select',
            label: 'Statistic',
            getValue: (r) => r.inlineAutomation.alternateRollStatistic || 'none',
            setValue: (r, value) => { r.inlineAutomation.alternateRollStatistic = value; },
            options: ConfigManager.ALTERNATE_ROLL_STATISTICS.options
        });

        configs.push({
            id: 'dc-method',
            type: 'select',
            label: 'DC Method',
            getValue: (r) => r.inlineAutomation.dcMethod || 'none',
            setValue: (r, value) => { r.inlineAutomation.dcMethod = value; },
            options: ConfigManager.ACTION_DC_METHODS.options,
            affects: ['dc', 'statistic'],
            triggersUpdate: 'visibility'
        });

        configs.push({
            id: 'dc',
            type: 'number',
            label: 'DC',
            getValue: (r) => r.inlineAutomation.dc || 0,
            setValue: (r, value) => { r.inlineAutomation.dc = value; },
            dependsOn: ['dc-method'],
            showIf: (r) => r.inlineAutomation.dcMethod === 'static'
        });

        configs.push({
            id: 'statistic',
            type: 'select',
            label: 'Defense Stat',
            getValue: (r) => r.inlineAutomation.statistic || 'ac',
            setValue: (r, value) => { r.inlineAutomation.statistic = value; },
            options: ConfigManager.STATISTICS.options,
            dependsOn: ['dc-method'],
            showIf: (r) => r.inlineAutomation.dcMethod === 'target'
        });

        return configs;
    }

    // Actions don't support traits
    supportsTraits(replacement) {
        return false;
    }
}

// ===================== CENTRALIZED CSS SYSTEM =====================

/**
 * CSS Manager - Handles injection and management of styles
 */
class CSSManager {
    static STYLE_ID = 'rollconverter-styles';
    static isInjected = false;

    /**
     * Inject the centralized CSS into the document head
     */
    static injectStyles() {
        if (this.isInjected) return;

        const existingStyle = document.getElementById(this.STYLE_ID);
        if (existingStyle) {
            existingStyle.remove();
        }

        const style = document.createElement('style');
        style.id = this.STYLE_ID;
        style.textContent = this.getCSS();
        document.head.appendChild(style);
        
        this.isInjected = true;
        console.log('[PF2e Converter] Centralized CSS injected');
    }

    /**
     * Remove the injected CSS (for cleanup)
     */
    static removeStyles() {
        const existingStyle = document.getElementById(this.STYLE_ID);
        if (existingStyle) {
            existingStyle.remove();
            this.isInjected = false;
        }
    }

    /**
     * Get the complete CSS for the converter
     */
    static getCSS() {
        return `
            /* ===== CONVERTER DIALOG LAYOUT ===== */
            .rollconverter-dialog {
                display: flex;
                flex-direction: row;
                min-width: 900px;
            }

            .rollconverter-main {
                flex: 2;
                min-width: 0;
            }

            .rollconverter-sidebar {
                flex: 1;
                width: 300px;
                padding: 0;
                box-sizing: border-box;
            }

            /* ===== FORM GROUPS ===== */
            .rollconverter-form-group {
                margin-bottom: 15px;
            }

            .rollconverter-form-group label {
                display: block;
            }

            .rollconverter-input-textarea {
                width: 100%;
                resize: vertical;
                font-family: monospace;
            }

            .rollconverter-modifier-fieldset p.notes {
                font-size: 12px;
                margin: 3px 0;
            }

            /* ===== OUTPUT AREAS ===== */
            .rollconverter-output-area {
                width: 100%;
                height: 150px;
                max-height: 150px;
                overflow-y: auto;
                font-family: 'Signika', sans-serif;
                padding: 0 4px 0 4px;
            }

            .rollconverter-output-converted {
                line-height: 1.7;
            }

            .rollconverter-output-placeholder {
                color: #999;
                font-style: italic;
            }

            .rollconverter-output-pre {
                margin: 0;
                white-space: pre-wrap;
                font-family: monospace;
                font-size: 12px;
            }

            /* ===== CONTROL BUTTONS ===== */
            .rollconverter-controls {
                display: flex;
                gap: 10px;
                margin-top: 15px;
            }

            .rollconverter-control-button {
                flex: 1;
                padding: 8px;
            }

            /* ===== MODIFIER PANEL ===== */

            /* ===== DAMAGE COMPONENTS ===== */
            .rollconverter-damage-component {
                background: var(--color-bg-option);
                border: 1px solid var(--color-border-light-secondary);
                border-radius: 4px;
                margin: 8px 0;
                padding: 8px 10px;
            }

            /* ===== INTERACTIVE ELEMENTS ===== */
            .rollconverter-interactive {
                cursor: pointer;
                background: #dddddd;
                padding: 1px 3px;
                color: #191813;
                border-radius: 1px;
                outline: 1px solid #444;
            }

            .rollconverter-interactive:hover {
                background: #bbbbbb;
            }

            .rollconverter-interactive.rollconverter-modified {
                background: #c8f7c5;
            }

            .rollconverter-interactive.rollconverter-modified:hover {
                background: #aee9a3;
            }

            .rollconverter-interactive.rollconverter-selected {
                outline: 2px solid #1976d2;
                box-shadow: 0 0 6px 1px #90caf9;
            }

            .rollconverter-interactive.rollconverter-selected:hover {
                background: #bbbbbb !important;
            }

            .rollconverter-interactive.rollconverter-selected.rollconverter-modified:hover {
                background: #aee9a3 !important;
            }

            .rollconverter-interactive.rollconverter-disabled {
                background: none;
            }

            .rollconverter-interactive.rollconverter-disabled:hover {
                background: #dddddd;
            }

            /* ===== LIVE PREVIEW ELEMENTS ===== */
            .rollconverter-preview-content {
                font-family: 'Signika', sans-serif;
                font-size: 14px;
                line-height: 1.4;
                color: #191813;
            }

            /* ===== TRAITS INPUT SYSTEM ===== */
            .rollconverter-traits-wrapper {
                position: relative;
                width: 100%;
            }

            .rollconverter-traits-selected {
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
            }

            .rollconverter-traits-selected:focus-within {
                border-color: #1976d2;
                box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
            }

            .rollconverter-traits-input {
                border: none;
                outline: none;
                background: transparent;
                flex: 1;
                min-width: 120px;
                font-size: 14px;
            }

            .rollconverter-traits-dropdown {
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
            }

            .rollconverter-trait-option {
                padding: 6px 12px;
                cursor: pointer;
                border-bottom: 1px solid #eee;
            }

            .rollconverter-trait-option:hover {
                background: #f5f5f5;
            }

            .rollconverter-trait-option.rollconverter-active {
                background: #e3f2fd !important;
            }

            .rollconverter-trait-tag {
                background: var(--color-bg-trait, #e3f2fd) !important;
                color: var(--color-text-trait, #1976d2) !important;
                border: solid 1px var(--color-border-trait, #bbdefb);
                font-weight: 500;
                text-transform: uppercase;
                font-size: 10px;
                letter-spacing: 0.05em;
                padding: 2px 8px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                gap: 4px;
                white-space: nowrap;
            }

            .rollconverter-trait-remove {
                cursor: pointer;
                font-weight: bold;
                color: #666;
                margin-left: 4px;
                color: inherit;
                opacity: 0.7;
            }

            .rollconverter-trait-remove:hover {
                opacity: 1;
                color: #d32f2f;
            }

            .rollconverter-traits-dropdown-empty {
                padding: 8px;
                color: #666;
                font-style: italic;
            }
        `;
    }
}

/**
 * ModifierPanelManager - Handles the generation and management of modifier panels
 * for interactive replacement elements
 * Now uses organized renderer system for type-specific UI logic
 */
class ModifierPanelManager {
    // Shared label width for all modifier panel labels
    static labelWidth = '100px';
    
    // Update scope constants for targeted updates
    static UpdateScope = {
        FIELD_ONLY: 'field-only',      // No additional updates needed
        VISIBILITY: 'visibility',      // Update field visibility only
        PANEL_PARTIAL: 'panel-partial', // Update dependent fields
        PANEL_FULL: 'panel-full'       // Complete panel regeneration
    };
    
    constructor() {
        console.log('[PF2e Converter] Creating ModifierPanelManager instance');
        
        // Initialize renderer registry for type-specific UI logic
        this.renderers = {
            damage: new DamageRenderer(),
            check: new CheckRenderer(),
            condition: new ConditionRenderer(),
            template: new TemplateRenderer(),
            generic: new GenericRollRenderer(),
            action: new ActionRenderer()
        };
        
        // Store current form state for updates
        this.currentForm = null;
        this.currentFieldConfigs = null;
        this.currentReplacement = null;
        this.currentOnChangeCallback = null;
        this.attachedListeners = new Map(); // Track attached listeners to prevent duplicates
    }
    /**
     * Get the optimal event type for a field type
     * @param {string} fieldType - The field type
     * @returns {string} The optimal event type
     */
    getOptimalEventType(fieldType) {
        switch (fieldType) {
            case 'checkbox':
            case 'select':
            case 'multiselect':
                return 'change';
            case 'text':
            case 'number':
            case 'textarea':
            default:
                return 'input';
        }
    }

    /**
     * Extract value from a form element based on its type
     * @param {HTMLElement} element - The form element
     * @returns {any} The extracted value
     */
    extractFieldValue(element) {
        switch (element.type) {
            case 'checkbox':
                return element.checked;
            case 'number':
                return element.value === '' ? '' : Number(element.value);
            case 'select-one':
            case 'select-multiple':
                if (element.multiple) {
                    return Array.from(element.selectedOptions).map(option => option.value);
                }
                return element.value;
            case 'textarea':
            case 'text':
            default:
                return element.value;
        }
    }

    /**
     * Set value on a form element based on its type
     * @param {HTMLElement} element - The form element
     * @param {any} value - The value to set
     */
    setFieldValue(element, value) {
        switch (element.type) {
            case 'checkbox':
                element.checked = Boolean(value);
                break;
            case 'number':
                element.value = value === '' ? '' : String(value);
                break;
            case 'select-one':
                element.value = String(value);
                break;
            case 'select-multiple':
                if (Array.isArray(value)) {
                    Array.from(element.options).forEach(option => {
                        option.selected = value.includes(option.value);
                    });
                }
                break;
            case 'textarea':
            case 'text':
            default:
                element.value = String(value);
                break;
        }
    }

    /**
     * Determine the update scope for a field change
     * @param {Object} fieldConfig - The field configuration
     * @param {any} oldValue - The old value
     * @param {any} newValue - The new value
     * @returns {string} The update scope
     */
    getUpdateScope(fieldConfig, oldValue, newValue) {
        // Check if field config specifies update scope
        if (fieldConfig.triggersUpdate) {
            return fieldConfig.triggersUpdate;
        }
        
        // Check if field has dependencies that require updates
        if (fieldConfig.affects && fieldConfig.affects.length > 0) {
            return ModifierPanelManager.UpdateScope.PANEL_PARTIAL;
        }
        
        // Check if field has visibility conditions
        if (fieldConfig.showIf || fieldConfig.hideIf) {
            return ModifierPanelManager.UpdateScope.VISIBILITY;
        }
        
        // Default to field-only updates
        return ModifierPanelManager.UpdateScope.FIELD_ONLY;
    }

    /**
     * Setup unified event listener for a field
     * @param {HTMLElement} fieldElement - The field element
     * @param {Object} fieldConfig - The field configuration
     * @param {Object} replacement - The replacement object
     * @param {Function} onChangeCallback - The change callback
     */
    setupFieldListener(fieldElement, fieldConfig, replacement, onChangeCallback) {
        const eventType = this.getOptimalEventType(fieldConfig.type);
        const listenerKey = `${fieldElement.id}-${eventType}`;
        
        // Prevent duplicate listeners
        if (this.attachedListeners.has(listenerKey)) {
            return;
        }
        
        const listener = (event) => {
            const oldValue = fieldConfig.getValue(replacement);
            const newValue = this.extractFieldValue(event.target);
            
            // Only proceed if value actually changed
            if (oldValue !== newValue) {
                // Set the new value if setValue function is provided
                if (fieldConfig.setValue) {
                    fieldConfig.setValue(replacement, newValue);
                }
                
                // Use normal update scope detection
                const updateScope = this.getUpdateScope(fieldConfig, oldValue, newValue);
                this.handleFieldUpdate(replacement, fieldConfig, updateScope, onChangeCallback);
            }
        };
        
        fieldElement.addEventListener(eventType, listener);
        this.attachedListeners.set(listenerKey, { element: fieldElement, type: eventType, listener });
    }

    /**
     * Handle field updates based on update scope
     * @param {Object} replacement - The replacement object
     * @param {Object} fieldConfig - The field configuration
     * @param {string} updateScope - The update scope
     * @param {Function} onChangeCallback - The change callback
     */
    handleFieldUpdate(replacement, fieldConfig, updateScope, onChangeCallback) {
        try {
            // Debug logging
            const oldValue = fieldConfig.getValue(replacement);
            this.debugFieldUpdate(fieldConfig.id, oldValue, fieldConfig.getValue(replacement), updateScope);
            
            // Validate new value if validation function is provided
            if (fieldConfig.validate) {
                const currentValue = fieldConfig.getValue(replacement);
                if (!fieldConfig.validate(currentValue, replacement)) {
                    this.showFieldError(fieldConfig.id, 'Invalid value');
                    return;
                }
            }
            
            this.clearFieldError(fieldConfig.id);
            
            // Handle updates based on scope
            switch (updateScope) {
                case ModifierPanelManager.UpdateScope.FIELD_ONLY:
                    // No additional updates needed
                    break;
                    
                case ModifierPanelManager.UpdateScope.VISIBILITY:
                    this.updateFieldVisibility(this.currentForm, this.currentFieldConfigs, replacement);
                    break;
                    
                case ModifierPanelManager.UpdateScope.PANEL_PARTIAL:
                    this.updateDependentFields(fieldConfig, replacement);
                    break;
                    
                case ModifierPanelManager.UpdateScope.PANEL_FULL:
                    this.regeneratePanel(this.currentForm, replacement, onChangeCallback);
                    break;
            }
            
            // Always call the change callback
            if (onChangeCallback) {
                onChangeCallback(replacement, fieldConfig.id);
            }
            
        } catch (error) {
            console.error(`[ModifierPanelManager] Error updating field ${fieldConfig.id}:`, error);
            this.showFieldError(fieldConfig.id, 'Update failed');
        }
    }

    /**
     * Show field error
     * @param {string} fieldId - The field ID
     * @param {string} message - The error message
     */
    showFieldError(fieldId, message) {
        const fieldElement = this.currentForm?.querySelector(`#${fieldId}`);
        if (fieldElement) {
            fieldElement.style.borderColor = '#ff4444';
            fieldElement.title = message;
        }
    }

    /**
     * Clear field error
     * @param {string} fieldId - The field ID
     */
    clearFieldError(fieldId) {
        const fieldElement = this.currentForm?.querySelector(`#${fieldId}`);
        if (fieldElement) {
            fieldElement.style.borderColor = '';
            fieldElement.title = '';
        }
    }

    /**
     * Debug logging for field updates
     * @param {string} fieldId - The field ID
     * @param {any} oldValue - The old value
     * @param {any} newValue - The new value
     * @param {string} updateScope - The update scope
     */
    debugFieldUpdate(fieldId, oldValue, newValue, updateScope) {
        if (console.debug) {
            console.debug(`[ModifierPanelManager] Field update: ${fieldId}`, {
                oldValue,
                newValue,
                updateScope,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Debug logging for dependency resolution
     * @param {Object} fieldConfig - The field configuration
     * @param {Array} affectedFields - The affected fields
     */
    debugDependencyResolution(fieldConfig, affectedFields) {
        if (console.debug) {
            console.debug(`[ModifierPanelManager] Dependency resolution:`, {
                fieldId: fieldConfig.id,
                affects: fieldConfig.affects,
                dependsOn: fieldConfig.dependsOn,
                affectedFields,
                timestamp: new Date().toISOString()
            });
        }
    }

    renderPanelHeader(title) {
        return `
            <div class="form-group">
                <div class="form-fields">
                    <label class="rollconverter-field-label-title" style="margin-right:auto;">${title}</label>
                    <button type="button" id="modifier-reset-btn" title="Reset this roll to its original state" class="rollconverter-reset-button">
                        Reset
                    </button>
                </div>
            </div>
        `;
    }

    generatePanelHTML(type, rep) {
        const renderer = this.renderers[type];
        if (!renderer) {
            return this.generateJSONPanel(type, rep);
        }

        const title = renderer.getTitle(rep);
        const fieldConfigs = renderer.getFieldConfigs(rep);
        
        let fields = '';
        
        // Exclude the header-managed 'enabled' field from visual field rendering
        const renderableFieldConfigs = fieldConfigs.filter(cfg => cfg.id !== 'enabled');
        if (type === 'damage') {
            fields = this.renderDamageFields(renderableFieldConfigs, rep);
        } else {
            fields = renderableFieldConfigs.map(config => this.renderFieldFromConfig(config, rep)).join('');
        }

        return `
            <form id="${type}-modifier-form" class="rollconverter-modifier-form">
                <fieldset class="rollconverter-modifier-fieldset">
                    <legend>${title}</legend>
                    ${this.renderHeaderControls(rep)}
                    ${fields}
                </fieldset>
            </form>
        `;
    }

    renderHeaderControls(rep) {
        return `
            <div class="form-group">
                <div class="form-fields">
                    <label>Enabled</label>
                    <input type="checkbox" id="enabled" class="rollconverter-field-checkbox" ${rep.enabled !== false ? 'checked' : ''}>
                    <button type="button" id="modifier-reset-btn" class="rollconverter-reset-button">Reset</button>
                </div>
            </div>
        `;
    }

    /**
     * Special field rendering for damage components with containers
     */
    renderDamageFields(fieldConfigs, rep) {
        // Group fields by component index
        const componentGroups = new Map();
        const fieldOrder = [];
        
        // First pass: group component fields and track field order
        fieldConfigs.forEach((config, index) => {
            if (config.isComponentField && config.componentIndex !== undefined) {
                if (!componentGroups.has(config.componentIndex)) {
                    componentGroups.set(config.componentIndex, []);
                    fieldOrder.push({ type: 'component', index: config.componentIndex, originalIndex: index });
                }
                componentGroups.get(config.componentIndex).push(config);
            } else {
                fieldOrder.push({ type: 'field', config: config, originalIndex: index });
            }
        });

        // Remove duplicate component entries (keep only the first occurrence)
        const uniqueFieldOrder = [];
        const seenComponents = new Set();
        fieldOrder.forEach(item => {
            if (item.type === 'component') {
                if (!seenComponents.has(item.index)) {
                    seenComponents.add(item.index);
                    uniqueFieldOrder.push(item);
                }
            } else {
                uniqueFieldOrder.push(item);
            }
        });

        // Sort by original index to maintain field config order
        uniqueFieldOrder.sort((a, b) => a.originalIndex - b.originalIndex);

        // Render fields in the correct order
        let html = '';
        uniqueFieldOrder.forEach(item => {
            if (item.type === 'component') {
                const componentFields = componentGroups.get(item.index);
                html += this.renderDamageComponentContainer(componentFields, rep, item.index);
            } else {
                html += this.renderFieldFromConfig(item.config, rep);
            }
        });

        return html;
    }

    /**
     * Render a damage component container with its fields
     */
    renderDamageComponentContainer(componentFields, rep, componentIndex) {        
        const fieldsHtml = componentFields
            .filter(cfg => cfg.id !== 'enabled')
            .map(config => this.renderFieldFromConfig(config, rep)).join('');

        return `
            <fieldset class="rollconverter-damage-component">
                <legend>Component ${componentIndex + 1}</legend>
                ${fieldsHtml}
            </fieldset>
        `;
    }
    
    renderFieldFromConfig(config, rep) {
        const value = config.getValue(rep);
        const shouldShow = !config.hideIf || !config.hideIf(rep);
        const shouldShowConditional = !config.showIf || config.showIf(rep);
        const isVisible = shouldShow && shouldShowConditional;
        
        const options = {
            hidden: !isVisible,
            options: typeof config.options === 'function' ? config.options(rep) : config.options,
            placeholder: config.placeholder,
            min: config.min,
            max: config.max,
            rows: config.rows,
            notes: config.notes
        };
        
        return FieldRenderer.render(config.type, config.id, config.label, value, options);
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
        const renderer = this.renderers[type];
        if (!renderer) return;
        
        // Store current form state for updates
        this.currentForm = formElement;
        this.currentReplacement = rep;
        this.currentOnChangeCallback = onChangeCallback;
        
        // Get enhanced field configurations from renderer
        const fieldConfigs = renderer.getEnhancedFieldConfigs(rep);
        this.currentFieldConfigs = fieldConfigs;
        
        // Setup standard field listeners
        this.setupStandardFieldListeners(formElement, fieldConfigs, rep, onChangeCallback);
        
        // Setup special component listeners
        this.setupSpecialComponentListeners(formElement, type, rep, onChangeCallback);
        
        // Initial state sync
        this.updateAllFieldVisibility(formElement, fieldConfigs, rep);
    }

    /**
     * Setup standard field listeners using unified event system
     * @param {HTMLElement} formElement - The form element
     * @param {Array} fieldConfigs - Array of field configurations
     * @param {Object} replacement - The replacement object
     * @param {Function} onChangeCallback - The change callback
     */
    setupStandardFieldListeners(formElement, fieldConfigs, replacement, onChangeCallback) {
        fieldConfigs.forEach(config => {
            const fieldElement = formElement.querySelector(`#${config.id}`);
            if (fieldElement) {
                this.setupFieldListener(fieldElement, config, replacement, onChangeCallback);
            }
        });
    }

    /**
 * Enhanced setup special component listeners with better error handling
 * @param {HTMLElement} formElement - The form element
 * @param {string} type - The replacement type
 * @param {Object} replacement - The replacement object
 * @param {Function} onChangeCallback - The change callback
 */
    setupSpecialComponentListeners(formElement, type, replacement, onChangeCallback) {
        // REMOVED: Special damage handling - now uses standard field configs
        
        // Setup traits inputs - look for traits containers that were created by FieldRenderer  
        const traitsContainers = formElement.querySelectorAll('[id$="-input-container"]');
        traitsContainers.forEach(container => {
            const parentContainer = container.closest('[data-field-id="traits"]');
            if (parentContainer) {
                this.setupTraitsInput(container, replacement, onChangeCallback);
            }
        });
        
        // Setup common trait checkboxes
        const renderer = this.renderers[type];
        if (renderer.supportsTraits && renderer.supportsTraits(replacement)) {
            const commonTraits = renderer.getCommonTraits(replacement);
            commonTraits.forEach(trait => {
                const traitCheckbox = formElement.querySelector(`#trait-${trait}`);
                if (traitCheckbox) {
                    this.setupCommonTraitCheckbox(traitCheckbox, trait, replacement, onChangeCallback);
                }
            });
        }
    }

    /**
     * Setup a single common trait checkbox with improved synchronization
     * @param {HTMLElement} traitCheckbox - The trait checkbox element
     * @param {string} trait - The trait name
     * @param {Object} replacement - The replacement object
     * @param {Function} onChangeCallback - The change callback
     */
    setupCommonTraitCheckbox(traitCheckbox, trait, replacement, onChangeCallback) {
        const listenerKey = `${traitCheckbox.id}-change`;
        
        const listener = (event) => {
            const isChecked = event.target.checked;
            
            // FIX: Update inlineAutomation.traits instead of replacement.traits
            if (!replacement.inlineAutomation.traits) replacement.inlineAutomation.traits = [];
            
            // Update traits array
            if (isChecked && !replacement.inlineAutomation.traits.includes(trait)) {
                replacement.inlineAutomation.traits.push(trait);
                console.log(`[ModifierPanelManager] Added trait ${trait} via checkbox`);
            } else if (!isChecked && replacement.inlineAutomation.traits.includes(trait)) {
                replacement.inlineAutomation.traits = replacement.inlineAutomation.traits.filter(t => t !== trait);
                console.log(`[ModifierPanelManager] Removed trait ${trait} via checkbox`);
            }
            
            // Sync with traits input if it exists
            console.log(`[ModifierPanelManager] Syncing traits input from array:`, replacement.inlineAutomation.traits);
            this.syncTraitsInputFromArray(replacement.inlineAutomation.traits);
            
            if (onChangeCallback) {
                onChangeCallback(replacement, `trait-${trait}`);
            }
        };
        
        console.log(`[ModifierPanelManager] Setting up listener for trait ${trait}`);
        traitCheckbox.addEventListener('change', listener);
        this.attachedListeners.set(listenerKey, { element: traitCheckbox, type: 'change', listener });
    }

    /**
     * Setup traits input component with improved synchronization
     * @param {HTMLElement} container - The traits container
     * @param {Object} replacement - The replacement object
     * @param {Function} onChangeCallback - The change callback
     */
    setupTraitsInput(container, replacement, onChangeCallback) {
        const renderer = this.renderers[replacement.type];
        if (!renderer || !renderer.supportsTraits(replacement)) return;
        
        const traitsInput = new TraitsInput(container.id, {
            placeholder: 'Type trait name and press Enter...',
            onChange: (selectedTraits) => {
                // Convert trait objects to simple string array
                let enhancedTraits = selectedTraits.map(t => t.value);
                
                // FIX: Update the inlineAutomation.traits instead of replacement.traits
                replacement.inlineAutomation.traits = enhancedTraits;
                
                // Sync with common trait checkboxes
                const commonTraits = renderer.getCommonTraits(replacement);
                commonTraits.forEach(trait => {
                    const traitCheckbox = this.currentForm?.querySelector(`#trait-${trait}`);
                    if (traitCheckbox) {
                        const shouldBeChecked = enhancedTraits.includes(trait);
                        if (traitCheckbox.checked !== shouldBeChecked) {
                            traitCheckbox.checked = shouldBeChecked;
                            console.log(`[ModifierPanelManager] Synced checkbox ${trait}: ${shouldBeChecked}`);
                        }
                    }
                });
                
                if (onChangeCallback) {
                    onChangeCallback(replacement, 'traits');
                }
            }
        });
        
        // Store reference for syncing
        container.traitsInput = traitsInput;
        
        // FIX: Set initial value from inlineAutomation.traits instead of replacement.traits
        if (replacement.inlineAutomation.traits && Array.isArray(replacement.inlineAutomation.traits)) {
            traitsInput.setValue(replacement.inlineAutomation.traits);
            this.syncCheckboxesFromTraits(replacement, renderer);
        }
    }

    /**
     * Sync traits input component from traits array
     * @param {Array} traitsArray - Array of trait strings
     */
    syncTraitsInputFromArray(traitsArray) {
        // Look for traits input container with the correct ID pattern
        const traitsContainer = this.currentForm?.querySelector('[id$="traits-input-container"]');
        if (traitsContainer && traitsContainer.traitsInput) {
            // Don't trigger onChange when syncing to avoid infinite loops
            traitsContainer.traitsInput.setValue(traitsArray, false);
            console.log(`[ModifierPanelManager] Synced traits input:`, traitsArray);
        } else {
            // Debug: log what containers we actually have
            const allContainers = this.currentForm?.querySelectorAll('[id*="traits"]');
            console.log(`[ModifierPanelManager] Available traits containers:`, 
                Array.from(allContainers || []).map(c => c.id));
        }
    }

    /**
     * Sync common trait checkboxes from replacement traits array
     * @param {Object} replacement - The replacement object
     * @param {Object} renderer - The renderer object
     */
    syncCheckboxesFromTraits(replacement, renderer) {
        const commonTraits = renderer.getCommonTraits(replacement);
        // FIX: Use inlineAutomation.traits instead of replacement.traits
        const currentTraits = replacement.inlineAutomation.traits || [];
        
        commonTraits.forEach(trait => {
            const traitCheckbox = this.currentForm?.querySelector(`#trait-${trait}`);
            if (traitCheckbox) {
                const shouldBeChecked = currentTraits.includes(trait);
                if (traitCheckbox.checked !== shouldBeChecked) {
                    traitCheckbox.checked = shouldBeChecked;
                    console.log(`[ModifierPanelManager] Synced checkbox ${trait}: ${shouldBeChecked}`);
                }
            }
        });
    }

    /**
     * Clean up event listeners to prevent memory leaks
     */
    cleanupEventListeners() {
        this.attachedListeners.forEach(({ element, type, listener }) => {
            if (element && element.removeEventListener) {
                element.removeEventListener(type, listener);
            }
        });
        this.attachedListeners.clear();
        
        // Clear stored references
        this.currentForm = null;
        this.currentFieldConfigs = null;
        this.currentReplacement = null;
        this.currentOnChangeCallback = null;
    }

    /**
     * Regenerate the entire panel with updated field configurations
     * @param {HTMLElement} formElement - The form element
     * @param {Object} rep - The replacement object
     * @param {Function} onChangeCallback - Callback function
     */
    regeneratePanel(formElement, rep, onChangeCallback) {
        const renderer = this.renderers[rep.type];
        if (!renderer) return;
        
        // Store current state before regeneration
        const currentValues = this.preserveFormState(formElement);
        const focusedElement = document.activeElement;
        
        // Clean up existing listeners
        this.cleanupEventListeners();
        
        // Get fresh enhanced field configurations (important for dynamic options)
        const fieldConfigs = renderer.getEnhancedFieldConfigs(rep);
        
        // Clear and regenerate form content, but preserve the form element itself
        const panelHTML = this.generatePanelHTML(rep.type, rep);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = panelHTML;
        const newForm = tempDiv.querySelector('form');
        
        if (newForm) {
            // Replace form contents
            formElement.innerHTML = newForm.innerHTML;
            
            // Re-setup event listeners on the updated form
            this.addFormListeners(formElement, rep.type, rep, onChangeCallback);
            
            // Restore form state
            this.restoreFormState(formElement, currentValues, focusedElement);
        }
    }

    /**
     * Preserve form state before regeneration
     * @param {HTMLElement} formElement - The form element
     * @returns {Object} Object containing form state
     */
    preserveFormState(formElement) {
        const state = {};
        const inputs = formElement.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            if (input.id) {
                state[input.id] = {
                    value: this.extractFieldValue(input),
                    hasFocus: input === document.activeElement,
                    cursorPosition: input === document.activeElement ? input.selectionStart : null
                };
            }
        });
        
        return state;
    }

    /**
     * Restore form state after regeneration
     * @param {HTMLElement} formElement - The form element
     * @param {Object} state - The preserved state
     * @param {HTMLElement} focusedElement - The previously focused element
     */
    restoreFormState(formElement, state, focusedElement) {
        Object.entries(state).forEach(([id, fieldState]) => {
            const element = formElement.querySelector(`#${id}`);
            if (element) {
                this.setFieldValue(element, fieldState.value);
                
                // Restore focus and cursor position
                if (fieldState.hasFocus && focusedElement && focusedElement.id === id) {
                    element.focus();
                    if (fieldState.cursorPosition !== null && element.setSelectionRange) {
                        element.setSelectionRange(fieldState.cursorPosition, fieldState.cursorPosition);
                    }
                }
            }
        });
    }
    
    /**
     * Get the value from a form element based on its type
     * @param {HTMLElement} element - The form element
     * @returns {any} The element's value
     */
    getFieldValue(element) {
        switch (element.type) {
            case 'checkbox':
                return element.checked;
            case 'number':
                return element.value;
            case 'select-one':
                return element.value;
            case 'textarea':
            case 'text':
            default:
                return element.value;
        }
    }

    /**
     * Update dependent fields when a field changes
     * @param {Object} changedFieldConfig - The field configuration that changed
     * @param {Object} replacement - The replacement object
     */
    updateDependentFields(changedFieldConfig, replacement) {
        const affectedFields = changedFieldConfig.affects || [];
        
        // Debug logging
        this.debugDependencyResolution(changedFieldConfig, affectedFields);
        
        // Build dependency map for this update cycle
        const dependencyMap = this.buildDependencyMap(this.currentFieldConfigs);
        
        // Get all fields that need updating (including transitive dependencies)
        const fieldsToUpdate = this.getTransitiveDependencies(changedFieldConfig.id, dependencyMap);
        
        // Update fields in dependency order (least dependent first)
        const sortedFields = this.sortByDependencyOrder(fieldsToUpdate, dependencyMap);
        
        sortedFields.forEach(fieldId => {
            const fieldElement = this.currentForm?.querySelector(`#${fieldId}`);
            const fieldConfig = this.currentFieldConfigs?.find(config => config.id === fieldId);
            
            if (fieldElement && fieldConfig) {
                this.updateSingleField(fieldElement, fieldConfig, replacement);
            } else {
                console.warn(`[ModifierPanelManager] Could not find field or config for: ${fieldId}`);
            }
        });
        
        // Update field visibility after dependent field updates
        this.updateFieldVisibility(this.currentForm, this.currentFieldConfigs, replacement);
    }

    /**
     * Build a dependency map from field configurations
     * @param {Array} fieldConfigs - Array of field configurations
     * @returns {Map} Map of field ID to array of dependent field IDs
     */
    buildDependencyMap(fieldConfigs) {
        const dependencyMap = new Map();
        
        fieldConfigs.forEach(config => {
            const dependents = fieldConfigs
                .filter(otherConfig => otherConfig.dependsOn && otherConfig.dependsOn.includes(config.id))
                .map(otherConfig => otherConfig.id);
            
            dependencyMap.set(config.id, dependents);
        });
        
        // Detect circular dependencies
        const circularDependencies = this.detectCircularDependencies(dependencyMap);
        if (circularDependencies.length > 0) {
            console.warn('[ModifierPanelManager] Circular dependencies detected:', circularDependencies);
        }
        
        return dependencyMap;
    }

    /**
     * Detect circular dependencies in the dependency map
     * @param {Map} dependencyMap - The dependency map
     * @returns {Array} Array of circular dependency cycles
     */
    detectCircularDependencies(dependencyMap) {
        const visited = new Set();
        const recursionStack = new Set();
        const cycles = [];
        
        const dfs = (fieldId, path = []) => {
            if (recursionStack.has(fieldId)) {
                // Found a cycle
                const cycleStart = path.indexOf(fieldId);
                const cycle = path.slice(cycleStart);
                cycles.push([...cycle, fieldId]);
                return;
            }
            
            if (visited.has(fieldId)) {
                return;
            }
            
            visited.add(fieldId);
            recursionStack.add(fieldId);
            
            const dependents = dependencyMap.get(fieldId) || [];
            dependents.forEach(dependent => {
                dfs(dependent, [...path, fieldId]);
            });
            
            recursionStack.delete(fieldId);
        };
        
        Array.from(dependencyMap.keys()).forEach(fieldId => {
            if (!visited.has(fieldId)) {
                dfs(fieldId);
            }
        });
        
        return cycles;
    }

    /**
     * Get all transitive dependencies for a field
     * @param {string} fieldId - The field ID
     * @param {Map} dependencyMap - The dependency map
     * @returns {Set} Set of field IDs that depend on the given field
     */
    getTransitiveDependencies(fieldId, dependencyMap) {
        const visited = new Set();
        const toVisit = [fieldId];
        const result = new Set();
        
        while (toVisit.length > 0) {
            const current = toVisit.pop();
            
            if (visited.has(current)) {
                continue;
            }
            
            visited.add(current);
            result.add(current);
            
            const dependents = dependencyMap.get(current) || [];
            dependents.forEach(dependent => {
                if (!visited.has(dependent)) {
                    toVisit.push(dependent);
                }
            });
        }
        
        return result;
    }

    /**
     * Sort fields by dependency order (least dependent first)
     * @param {Set} fieldIds - Set of field IDs to sort
     * @param {Map} dependencyMap - The dependency map
     * @returns {Array} Sorted array of field IDs
     */
    sortByDependencyOrder(fieldIds, dependencyMap) {
        const visited = new Set();
        const result = [];
        
        const visit = (fieldId) => {
            if (visited.has(fieldId)) return;
            visited.add(fieldId);
            
            const dependents = dependencyMap.get(fieldId) || [];
            dependents.forEach(dependent => {
                if (fieldIds.has(dependent)) {
                    visit(dependent);
                }
            });
            
            result.push(fieldId);
        };
        
        Array.from(fieldIds).forEach(visit);
        return result;
    }

    /**
     * Update a single field with new data
     * @param {HTMLElement} fieldElement - The field element
     * @param {Object} fieldConfig - The field configuration
     * @param {Object} replacement - The replacement object
     */
    updateSingleField(fieldElement, fieldConfig, replacement) {
        // Store current focus and cursor position
        const hasFocus = fieldElement === document.activeElement;
        const cursorPosition = hasFocus ? fieldElement.selectionStart : null;
        
        // Update dynamic options for select fields
        if (fieldConfig.type === 'select' && typeof fieldConfig.options === 'function') {
            this.updateSelectOptions(fieldElement, fieldConfig, replacement);
        }
        
        // Sync field value with replacement object
        const currentValue = fieldConfig.getValue(replacement);
        this.setFieldValue(fieldElement, currentValue);
        
        // Update field visibility
        this.updateFieldVisibility(this.currentForm, [fieldConfig], replacement);
        
        // Restore focus and cursor position if field had focus
        if (hasFocus) {
            fieldElement.focus();
            if (cursorPosition !== null && fieldElement.setSelectionRange) {
                fieldElement.setSelectionRange(cursorPosition, cursorPosition);
            }
        }
    }

    /**
     * Update select field options dynamically
     * @param {HTMLElement} selectElement - The select element
     * @param {Object} fieldConfig - The field configuration
     * @param {Object} replacement - The replacement object
     */
    updateSelectOptions(selectElement, fieldConfig, replacement) {
        try {
            const currentValue = fieldConfig.getValue(replacement);
            const newOptions = fieldConfig.options(replacement);
            
            // Validate that newOptions is an array
            if (!Array.isArray(newOptions)) {
                console.warn(`[ModifierPanelManager] Dynamic options for ${fieldConfig.id} is not an array:`, newOptions);
                return;
            }
            
            // Store current selection state
            const wasSelected = selectElement.value === currentValue;
            
            // Clear existing options
            selectElement.innerHTML = '';
            
            // Add new options
            newOptions.forEach(option => {
                const optionValue = typeof option === 'object' ? option.value : option;
                const optionLabel = typeof option === 'object' ? option.label : option;
                const optionElement = document.createElement('option');
                optionElement.value = optionValue;
                optionElement.textContent = optionLabel;
                
                // Preserve selected value if still valid
                if (optionValue === currentValue) {
                    optionElement.selected = true;
                }
                
                selectElement.appendChild(optionElement);
            });
            
            // Clear selection if current value is no longer valid
            const isValidOption = newOptions.some(opt => (typeof opt === 'object' ? opt.value : opt) === currentValue);
            if (currentValue && !isValidOption) {
                console.log(`[ModifierPanelManager] Clearing invalid selection for ${fieldConfig.id}: ${currentValue}`);
                fieldConfig.setValue(replacement, '');
                selectElement.value = '';
            }
            
            // Debug logging
            if (console.debug) {
                console.debug(`[ModifierPanelManager] Updated select options for ${fieldConfig.id}:`, {
                    currentValue,
                    newOptions: newOptions.length,
                    wasSelected,
                    isValidOption
                });
            }
            
        } catch (error) {
            console.error(`[ModifierPanelManager] Error updating select options for ${fieldConfig.id}:`, error);
        }
    }

    /**
     * Update all field visibility based on current replacement state
     * @param {HTMLElement} formElement - The form element
     * @param {Array} fieldConfigs - Array of field configurations
     * @param {Object} replacement - The replacement object
     */
    updateAllFieldVisibility(formElement, fieldConfigs, replacement) {
        fieldConfigs.forEach(config => {
            this.updateFieldVisibility(formElement, [config], replacement);
        });
    }

    /**
     * Check if a field should be visible based on its conditions
     * @param {Object} fieldConfig - The field configuration
     * @param {Object} replacement - The replacement object
     * @returns {boolean} Whether the field should be visible
     */
    shouldFieldBeVisible(fieldConfig, replacement) {
        const shouldShow = !fieldConfig.hideIf || !fieldConfig.hideIf(replacement);
        const shouldShowConditional = !fieldConfig.showIf || fieldConfig.showIf(replacement);
        return shouldShow && shouldShowConditional;
    }

    // Generic function to update field visibility based on hideIf/showIf
    updateFieldVisibility(formElement, fieldConfigs, rep, prefix = '') {
        fieldConfigs.forEach(config => {
            // Try multiple container selectors for better compatibility
            const containerSelectors = [
                `#${config.id}-container`,
                `[data-field-id="${config.id}"]`,
                `.form-group:has(#${config.id})`,
                `#${config.id}`.replace(/-/g, '\\-') + '-container'
            ];
            
            let container = null;
            for (const selector of containerSelectors) {
                container = formElement.querySelector(selector);
                if (container) break;
            }
            
            // Fallback: find container by looking for parent with .form-group
            if (!container) {
                const field = formElement.querySelector(`#${config.id}`);
                if (field) {
                    container = field.closest('.form-group') || field.parentElement;
                }
            }
            
            if (container) {
                const isVisible = this.shouldFieldBeVisible(config, rep);
                container.style.display = isVisible ? '' : 'none';
                
                if (console.debug) {
                    console.debug(`[ModifierPanelManager] Field visibility update: ${config.id} -> ${isVisible ? 'visible' : 'hidden'}`);
                }
            } else {
                console.warn(`[ModifierPanelManager] Could not find container for field: ${config.id}`);
            }
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
        
        console.log('[PF2e Converter] ConverterDialog constructor completed');
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

        // Reset modifier panel to default state when input changes
        this.renderModifierPanel();
    }
    
    /**
     * Clean up resources when dialog is closed
     */
    cleanup() {
        console.log('[PF2e Converter] Cleaning up dialog resources');
        if (this.modifierManager) {
            this.modifierManager.cleanupEventListeners();
        }
        this.data.selectedElementId = null;
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
        const outputText = this.processor.renderFromReplacements(this.data.inputText, this.data.replacements, false, this.data);
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
            // Use semantic class for the pre element
            this.ui.outputHtmlDiv.innerHTML = `<pre class="rollconverter-output-pre">${outputText}</pre>`;
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
                this.ui.modifierPanelContent.innerHTML = `
                    <form id="placeholder-modifier-form" class="rollconverter-modifier-form">
                        <fieldset class="rollconverter-modifier-fieldset">
                            <legend>Modifier Panel</legend>
                            <p>Select an element to modify.</p>
                        </fieldset>
                    </form>
                `;
            }
        }
    }
    
    /**
     * Setup modifier panel event handlers
     * @param {Object} rep - The replacement object
     */
    setupModifierPanelHandlers(rep) {
        // Clean up existing panel manager if it exists
        if (this.modifierManager) {
            this.modifierManager.cleanupEventListeners();
        }
        
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
        
        const interactiveElements = this.ui.outputHtmlDiv.querySelectorAll('.rollconverter-interactive');
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
        
        // Remove previous highlighting using class instead of style
        const allElements = this.ui.outputHtmlDiv.querySelectorAll('.rollconverter-interactive');
        allElements.forEach(el => {
            el.classList.remove('rollconverter-selected');
        });
        
        // Add highlighting to selected element
        if (this.data.selectedElementId) {
            const selectedElement = this.ui.outputHtmlDiv.querySelector(`[data-id="${this.data.selectedElementId}"]`);
            if (selectedElement) {
                selectedElement.classList.add('rollconverter-selected');
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
    constructor(items, customLabels = {}, metadata = {}) {
        this.slugs = items;
        this.metadata = metadata;
        
        // Lazy initialization - only compute when first accessed
        this._options = null;
        this._pattern = null;
        this._set = null;
        this._customLabels = customLabels;
    }

    // Memoized getter for options
    get options() {
        if (this._options === null) {
            this._options = this.slugs.map(item => ({
                value: item,
                label: this._customLabels[item] || this._toTitleCase(this._unslug(item))
            }));
        }
        return this._options;
    }

    // Memoized getter for regex pattern
    get pattern() {
        if (this._pattern === null) {
            this._pattern = this.slugs
                .map(item => this._unslug(item))
                .filter(item => item !== '')
                .sort((a, b) => b.length - a.length) // Longest first for better matching
                .join('|');
        }
        return this._pattern;
    }

    // Memoized getter for Set (fast lookups)
    get set() {
        if (this._set === null) {
            this._set = new Set(this.slugs);
        }
        return this._set;
    }

    includes(item) {
        return this.set.has(item);
    }

    // Existing helper methods unchanged
    _toOptions(items, customLabels = {}) {
        return items.map(item => ({
            value: item,
            label: customLabels[item] || this._toTitleCase(this._unslug(item))
        }));
    }

    _toPattern(items) {
        return items
            .map(item => this._unslug(item))
            .filter(item => item !== '')
            .sort((a, b) => b.length - a.length)
            .join('|');
    }

    _unslug(str) {
        const keepHyphens = ['flat-footed', 'off-guard'];
        if (keepHyphens.includes(str)) return str;
        return str.replace(/-/g, ' ');
    }

    _toTitleCase(str) {
        const specialCases = {
            'off-guard': 'Off-Guard',
            'flat-footed': 'Flat-Footed'
        };
        
        if (specialCases[str]) return specialCases[str];
        
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

    static isLegacyCondition(conditionText) {
        const normalized = conditionText.toLowerCase();
        return this.LEGACY_CONDITION_MAPPINGS.hasOwnProperty(normalized);
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

    static getLegacyConditions() {
        return Object.keys(this.LEGACY_CONDITION_MAPPINGS);
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
    // Private cache for memoization
    static _cache = new Map();
    
    // ===== DAMAGE SYSTEM =====
    static get DAMAGE_TYPES() {
        if (!this._cache.has('DAMAGE_TYPES')) {
            this._cache.set('DAMAGE_TYPES', new ConfigCategory([
                'acid', 'cold', 'electricity', 'fire', 'force', 'sonic', 'vitality', 'void',
                'bleed', 'bludgeoning', 'piercing', 'slashing',
                'mental', 'spirit', 'poison', 'untyped'
            ]));
        }
        return this._cache.get('DAMAGE_TYPES');
    }

    static get LEGACY_DAMAGE_TYPES() {
        if (!this._cache.has('LEGACY_DAMAGE_TYPES')) {
            this._cache.set('LEGACY_DAMAGE_TYPES', new ConfigCategory(
                LegacyConversionManager.getLegacyDamageTypes()
            ));
        }
        return this._cache.get('LEGACY_DAMAGE_TYPES');
    }

    static get ALL_DAMAGE_TYPES() {
        if (!this._cache.has('ALL_DAMAGE_TYPES')) {
            this._cache.set('ALL_DAMAGE_TYPES', new ConfigCategory([
                ...this.DAMAGE_TYPES.slugs,
                ...this.LEGACY_DAMAGE_TYPES.slugs
            ]));
        }
        return this._cache.get('ALL_DAMAGE_TYPES');
    }

    static get DAMAGE_CATEGORIES() {
        if (!this._cache.has('DAMAGE_CATEGORIES')) {
            this._cache.set('DAMAGE_CATEGORIES', new ConfigCategory([
                '', 'persistent', 'precision', 'splash'
            ]));
        }
        return this._cache.get('DAMAGE_CATEGORIES');
    }

    static get HEALING_TERMS() {
        if (!this._cache.has('HEALING_TERMS')) {
            this._cache.set('HEALING_TERMS', new ConfigCategory([
                'hit point', 'hit points', 'hp', 'healing'
            ]));
        }
        return this._cache.get('HEALING_TERMS');
    }

    // ===== CONSOLIDATED CONDITIONS CONFIG =====
    static get CONDITIONS() {
        if (!this._cache.has('CONDITIONS')) {
            const conditionData = {
                items: [
                    'blinded', 'broken', 'clumsy', 'concealed', 'confused', 'controlled', 'dazzled',
                    'deafened', 'doomed', 'drained', 'dying', 'enfeebled', 'fascinated', 'fatigued',
                    'fleeing', 'frightened', 'grabbed', 'immobilized', 'invisible', 'off-guard',
                    'paralyzed', 'petrified', 'prone', 'quickened', 'restrained', 'sickened',
                    'slowed', 'stunned', 'stupefied', 'unconscious', 'undetected', 'wounded'
                ],
                customLabels: {
                    'off-guard': 'Off-Guard'
                },
                metadata: {
                    withValues: new Set([
                        'clumsy', 'doomed', 'drained', 'dying', 'enfeebled', 'frightened',
                        'sickened', 'slowed', 'stunned', 'stupefied', 'wounded'
                    ]),
                    uuids: {
                        'blinded': 'Compendium.pf2e.conditionitems.Item.XgEqL1kFApUbl5Z2',
                        'broken': 'Compendium.pf2e.conditionitems.Item.6dNUvdb1dhToNDj3',
                        'clumsy': 'Compendium.pf2e.conditionitems.Item.i3OJZU2nk64Df3xm',
                        'concealed': 'Compendium.pf2e.conditionitems.Item.DmAIPqOBomZ7H95W',
                        'confused': 'Compendium.pf2e.conditionitems.Item.yblD8fOR1J8rDwEQ',
                        'controlled': 'Compendium.pf2e.conditionitems.Item.9qGBRpbX9NEwtAAr',
                        'dazzled': 'Compendium.pf2e.conditionitems.Item.TkIyaNPgTZFBCCuh',
                        'deafened': 'Compendium.pf2e.conditionitems.Item.9PR9y0bi4JPKnHPR',
                        'doomed': 'Compendium.pf2e.conditionitems.Item.3uh1r86TzbQvosxv',
                        'drained': 'Compendium.pf2e.conditionitems.Item.4D2KBtexWXa6oUMR',
                        'dying': 'Compendium.pf2e.conditionitems.Item.yZRUzMqrMmfLu0V1',
                        'enfeebled': 'Compendium.pf2e.conditionitems.Item.MIRkyAjyBeXivMa7',
                        'fascinated': 'Compendium.pf2e.conditionitems.Item.AdPVz7rbaVSRxHFg',
                        'fatigued': 'Compendium.pf2e.conditionitems.Item.HL2l2VRSaQHu9lUw',
                        'fleeing': 'Compendium.pf2e.conditionitems.Item.sDPxOjQ9kx2RZE8D',
                        'frightened': 'Compendium.pf2e.conditionitems.Item.TBSHQspnbcqxsmjL',
                        'grabbed': 'Compendium.pf2e.conditionitems.Item.kWc1fhmv9LBiTuei',
                        'immobilized': 'Compendium.pf2e.conditionitems.Item.eIcWbB5o3pP6OIMe',
                        'invisible': 'Compendium.pf2e.conditionitems.Item.zJxUflt9np0q4yML',
                        'off-guard': 'Compendium.pf2e.conditionitems.Item.AJh5ex99aV6VTggg',
                        'paralyzed': 'Compendium.pf2e.conditionitems.Item.6uEgoh53GbXuHpTF',
                        'petrified': 'Compendium.pf2e.conditionitems.Item.dTwPJuKgBQCMxixg',
                        'prone': 'Compendium.pf2e.conditionitems.Item.j91X7x0XSomq8d60',
                        'quickened': 'Compendium.pf2e.conditionitems.Item.nlCjDvLMf2EkV2dl',
                        'restrained': 'Compendium.pf2e.conditionitems.Item.VcDeM8A5oI6VqhbM',
                        'sickened': 'Compendium.pf2e.conditionitems.Item.fesd1n5eVhpCSS18',
                        'slowed': 'Compendium.pf2e.conditionitems.Item.xYTAsEpcJE1Ccni3',
                        'stunned': 'Compendium.pf2e.conditionitems.Item.dfCMdR4wnpbYNTix',
                        'stupefied': 'Compendium.pf2e.conditionitems.Item.e1XGnhKNSQIm5IXg',
                        'unconscious': 'Compendium.pf2e.conditionitems.Item.fBnFDH2MTzgFijKf',
                        'undetected': 'Compendium.pf2e.conditionitems.Item.VRSef5y1LmL2Hkjf',
                        'wounded': 'Compendium.pf2e.conditionitems.Item.Yl48xTdMh3aeQYL2'
                    }
                }
            };

            this._cache.set('CONDITIONS', new ConfigCategory(
                conditionData.items,
                conditionData.customLabels,
                conditionData.metadata
            ));
        }
        return this._cache.get('CONDITIONS');
    }

    // Consolidated condition helper methods
    static conditionCanHaveValue(condition) {
        return this.CONDITIONS.metadata.withValues.has(condition);
    }

    static getConditionUUID(condition) {
        const normalizedName = condition?.toLowerCase()?.trim();
        return this.CONDITIONS.metadata.uuids[normalizedName] || null;
    }

    // ===== CHECKS AND SKILLS =====
    static get SAVES() {
        if (!this._cache.has('SAVES')) {
            this._cache.set('SAVES', new ConfigCategory(['reflex', 'fortitude', 'will']));
        }
        return this._cache.get('SAVES');
    }

    static get SKILLS() {
        if (!this._cache.has('SKILLS')) {
            this._cache.set('SKILLS', new ConfigCategory([
                'acrobatics', 'arcana', 'athletics', 'crafting',
                'deception', 'diplomacy', 'intimidation', 'medicine',
                'nature', 'occultism', 'performance', 'religion',
                'society', 'stealth', 'survival', 'thievery'
            ]));
        }
        return this._cache.get('SKILLS');
    }

    static get CHECK_TYPES() {
        if (!this._cache.has('CHECK_TYPES')) {
            this._cache.set('CHECK_TYPES', new ConfigCategory([
                'flat', 'lore', 'perception',
                ...this.SAVES.slugs,
                ...this.SKILLS.slugs
            ]));
        }
        return this._cache.get('CHECK_TYPES');
    }

    // ===== STATISTICS AND DC METHODS =====
    static get STATISTICS() {
        if (!this._cache.has('STATISTICS')) {
            this._cache.set('STATISTICS', new ConfigCategory([
                'ac', 'perception',
                ...this.SAVES.slugs,
                'class', 'spell', 'class-spell',
                ...this.SKILLS.slugs
            ], {
                ac: 'Armor Class',
                class: 'Class DC',
                spell: 'Spell DC',
                'class-spell': 'Class or Spell DC'
            }));
        }
        return this._cache.get('STATISTICS');
    }

    static get ALTERNATE_ROLL_STATISTICS() {
        if (!this._cache.has('ALTERNATE_ROLL_STATISTICS')) {
            this._cache.set('ALTERNATE_ROLL_STATISTICS', new ConfigCategory([
                'none','perception',
                ...this.SAVES.slugs,
                'class', 'spell', 'class-spell',
                ...this.SKILLS.slugs
            ], {
                none: 'Use Default',
                class: 'Class DC Roll',
                spell: 'Spell Attack Roll',
                'class-spell': 'Class or Spell Roll'
            }));
        }
        return this._cache.get('ALTERNATE_ROLL_STATISTICS');
    }

    static get DC_METHODS() {
        if (!this._cache.has('DC_METHODS')) {
            this._cache.set('DC_METHODS', new ConfigCategory(
                ['none', 'static', 'target', 'origin'],
                {
                    none: 'No DC',
                    static: 'Static DC',
                    target: 'Target\'s Statistic',
                    origin: 'Origin\'s Statistic'
                }
            ));
        }
        return this._cache.get('DC_METHODS');
    }

    static get ACTION_DC_METHODS() {
        if (!this._cache.has('DC_METHODS')) {
            this._cache.set('DC_METHODS', new ConfigCategory(
                ['none', 'static', 'target', 'origin'],
                {
                    none: 'No DC',
                    static: 'Static DC',
                    target: 'Target\'s Statistic'
                }
            ));
        }
        return this._cache.get('DC_METHODS');
    }

    static get SHOW_DCS() {
        if (!this._cache.has('SHOW_DCS')) {
            this._cache.set('SHOW_DCS', new ConfigCategory(
                ['owner', 'gm', 'all', 'none'],
                {
                    owner: 'Owner Only',
                    gm: 'GM Only',
                    all: 'Everyone',
                    none: 'No One'
                }
            ));
        }
        return this._cache.get('SHOW_DCS');
    }

    // ===== TEMPLATES =====
    static get TEMPLATE_TYPES() {
        if (!this._cache.has('TEMPLATE_TYPES')) {
            this._cache.set('TEMPLATE_TYPES', new ConfigCategory([
                'burst', 'cone', 'line', 'emanation'
            ]));
        }
        return this._cache.get('TEMPLATE_TYPES');
    }

    // Template mapping consolidated
    static get TEMPLATE_CONFIG() {
        if (!this._cache.has('TEMPLATE_CONFIG')) {
            const templateData = {
                alternateMapping: {
                    'radius': 'burst',
                    'circle': 'burst',
                    'sphere': 'burst',
                    'cylinder': 'burst',
                    'wall': 'line',
                    'square': 'line',
                    'cube': 'line'
                }
            };

            // Create combined categories
            const alternateNames = new ConfigCategory(Object.keys(templateData.alternateMapping));
            const allTemplateNames = new ConfigCategory([
                ...this.TEMPLATE_TYPES.slugs,
                ...alternateNames.slugs
            ]);

            this._cache.set('TEMPLATE_CONFIG', {
                standard: this.TEMPLATE_TYPES,
                alternates: alternateNames,
                all: allTemplateNames,
                getStandardType: (alternateName) => templateData.alternateMapping[alternateName] || alternateName
            });
        }
        return this._cache.get('TEMPLATE_CONFIG');
    }

    // ===== DURATIONS =====
    static get DURATION_UNITS() {
        if (!this._cache.has('DURATION_UNITS')) {
            this._cache.set('DURATION_UNITS', new ConfigCategory([
                'rounds', 'round', 'minutes', 'minute', 'hours', 'hour', 'days', 'day', 'weeks', 'week', 'months', 'month', 'years', 'year'
            ]));
        }
        return this._cache.get('DURATION_UNITS');
    }

    // ===== ACTIONS =====
    static get ACTIONS() {
        if (!this._cache.has('ACTIONS')) {
            this._cache.set('ACTIONS', new ConfigCategory([
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
            ]));
        }
        return this._cache.get('ACTIONS');
    }

    static get ACTION_VARIANTS() {
        if (!this._cache.has('ACTION_VARIANTS')) {
            this._cache.set('ACTION_VARIANTS', {
                'administer-first-aid': new ConfigCategory(['stabilize', 'stop-bleeding']),
                'create-a-diversion': new ConfigCategory(['distracting-words', 'gesture', 'trick']),
                'perform': new ConfigCategory([
                    'acting', 'comedy', 'dance', 'keyboards', 'oratory', 
                    'percussion', 'singing', 'strings', 'winds'
                ])
            });
        }
        return this._cache.get('ACTION_VARIANTS');
    }

    // ===== Action helper methods =====

    /**
     * Check if an action has variants
     * @param {string} action - Action slug to check
     * @returns {boolean} - True if action has variants
     */
    static actionHasVariants(action) {
        return action && this.ACTION_VARIANTS.hasOwnProperty(action);
    }

    /**
     * Get variants for an action (safe - returns empty array if no variants)
     * @param {string} action - Action slug
     * @returns {ConfigCategory|null} - ConfigCategory with variants or null
     */
    static getActionVariants(action) {
        return this.actionHasVariants(action) ? this.ACTION_VARIANTS[action] : null;
    }

    /**
     * Get variant slugs for an action (safe - returns empty array if no variants)
     * @param {string} action - Action slug  
     * @returns {Array} - Array of variant slugs
     */
    static getActionVariantSlugs(action) {
        const variants = this.getActionVariants(action);
        return variants ? variants.slugs : [];
    }

    /**
     * Check if a specific variant exists for an action
     * @param {string} action - Action slug
     * @param {string} variant - Variant slug to check
     * @returns {boolean} - True if variant exists for this action
     */
    static isValidActionVariant(action, variant) {
        const variants = this.getActionVariants(action);
        return variants ? variants.includes(variant) : false;
    }

    /**
     * Get variant options for UI (safe - returns empty array if no variants)
     * @param {string} action - Action slug
     * @returns {Array} - Array of {value, label} objects for UI
     */
    static getActionVariantOptions(action) {
        const variants = this.getActionVariants(action);
        return variants ? variants.options : [];
    }

    /**
     * Get the first/default variant for an action
     * @param {string} action - Action slug
     * @returns {string|null} - First variant slug or null if no variants
     */
    static getDefaultActionVariant(action) {
        const slugs = this.getActionVariantSlugs(action);
        return slugs.length > 0 ? slugs[0] : '';
    }

    // ===== UTILITY METHODS =====
    
    // Clear cache (useful for testing or memory management)
    static clearCache() {
        this._cache.clear();
    }

    // Get cache statistics
    static getCacheStats() {
        return {
            size: this._cache.size,
            keys: Array.from(this._cache.keys())
        };
    }

    // Pre-warm cache (optional - load all configs at startup)
    static warmCache() {
        // Access all getters to initialize cache
        const configs = [
            this.DAMAGE_TYPES, this.LEGACY_DAMAGE_TYPES, this.ALL_DAMAGE_TYPES,
            this.CONDITIONS, this.SAVES, this.SKILLS, this.CHECK_TYPES,
            this.STATISTICS, this.DC_METHODS, this.SHOW_DCS,
            this.TEMPLATE_TYPES, this.TEMPLATE_CONFIG, this.ACTIONS, this.ACTION_VARIANTS,
            this.DURATION_UNITS, this.ACTION_DC_METHODS, this.ALTERNATE_ROLL_STATISTICS,  this.HEALING_TERMS
        ];
        console.log(`[ConfigManager] Pre-warmed cache with ${configs.length} configurations`);
    }
}

/**
 * Base Pattern class that provides common functionality for all pattern types
 * Eliminates code duplication across pattern implementations
 */
class BasePattern {
    static type = 'base';
    static priority = 0;
    static description = 'Base pattern class';
    static PATTERNS = []; // Must be defined by subclasses
    static EXTRACTORS = {}; // Must be defined by subclasses

    /**
     * Test text against all patterns defined by the subclass
     * @param {string} text - Text to test
     * @returns {Array} Array of match objects
     */
    static test(text) {
        const matches = [];
        
        for (const pattern of this.PATTERNS) {
            let match;
            pattern.regex.lastIndex = 0;
            while ((match = pattern.regex.exec(text)) !== null) {
                if (this.validateMatch(match)) {
                    // Extract parameters and check if they're valid
                    const parameters = this.extractParametersForPattern(match, pattern);
                    
                    // If extractor returns null, skip this match
                    if (parameters === null) {
                        continue;
                    }
                    
                    matches.push({
                        match: match,
                        type: pattern.type || this.type,
                        priority: pattern.priority || this.priority,
                        config: { 
                            pattern: pattern,
                            parameters: parameters
                        }
                    });
                }
            }
        }
        
        return matches;
    }

    /**
     * Validate a regex match object
     * @param {Array} match - Regex match array
     * @returns {boolean} Whether the match is valid
     */
    static validateMatch(match) {
        return match && match[0] && typeof match.index === 'number';
    }

    /**
     * Create a replacement object from a match and parameters
     * @param {Array} match - Regex match array
     * @param {Object} parameters - Extracted parameters
     * @returns {Replacement} Replacement instance
     */
    static createReplacement(match, parameters) {
        return new Replacement(match, this.type, parameters);
    }

    /**
     * Flexible extraction resolution with support for pattern-level extractors.
     * If no extractor is specified, fallback to the class extractParameters(match, pattern).
     * Returns null if the match should be ignored.
     */
    static extractParametersForPattern(match, pattern) {
        if (pattern.extractor && this.EXTRACTORS && typeof this.EXTRACTORS[pattern.extractor] === 'function') {
            try {
                return this.EXTRACTORS[pattern.extractor](match, pattern);
            } catch (e) {
                console.warn(`[${this.type}] extractor '${pattern.extractor}' failed:`, e);
                return null;
            }
        }
        // Fallback: class-level extractor method
        try {
            return this.extractParameters(match, pattern);
        } catch (e) {
            console.warn(`[${this.type}] extractParameters fallback failed:`, e);
            return null;
        }
    }

    /**
     * Extract parameters from a match based on subtype
     * Must be implemented by subclasses
     * @param {Array} match - Regex match array
     * @param {string} subtype - Pattern subtype
     * @param {Object} pattern - Full pattern object for additional context
     * @returns {Object|null} Extracted parameters, or null to skip this match
     */
    static extractParameters(match, pattern) {
        throw new Error(`${this.type} pattern must implement extractParameters() method`);
    }

    /**
     * Helper method to extract text from match
     * @param {Array} match - Regex match array
     * @returns {string} Matched text
     */
    static getMatchedText(match) {
        return match[0] || '';
    }

    /**
     * Helper method to extract DC from text
     * @param {string} text - Text to search
     * @returns {number|null} Extracted DC or null
     */
    static extractDC(text) {
        const dcMatch = text.match(/\bdc\s*(\d{1,2})\b/i);
        return dcMatch ? parseInt(dcMatch[1]) : null;
    }

    /**
     * Helper method to extract dice from text
     * @param {string} text - Text to search
     * @returns {string} Extracted dice string
     */
    static extractDice(text) {
        const diceMatch = text.match(/(\d+(?:d\d+)?(?:[+-]\d+)?)/);
        return diceMatch ? diceMatch[1] : '';
    }

    /**
     * Helper method to check if text contains a word (case-insensitive)
     * @param {string} text - Text to search
     * @param {string} word - Word to find
     * @returns {boolean} Whether the word is found
     */
    static containsWord(text, word) {
        return text.toLowerCase().includes(word.toLowerCase());
    }
}

/**
 * Automation pattern class for detecting existing inline automations
 */
class AutomationPattern extends BasePattern {
    static type = 'automation';
    static priority = 200;
    static description = 'Existing automation syntax detection';

    static EXTRACTORS = {
        damage: (match, pattern) => AutomationPattern.extractDamageParameters(match[1] || '', match[2] || ''),
        check: (match, pattern) => AutomationPattern.extractCheckParameters(match[1] || '', match[2] || ''),
        template: (match, pattern) => AutomationPattern.extractTemplateParameters(match[1] || '', match[2] || ''),
        generic: (match, pattern) => AutomationPattern.extractGenericParameters(match),
        action: (match, pattern) => AutomationPattern.extractActionParameters(match),
        condition: (match, pattern) => AutomationPattern.extractConditionParameters(match)
    };

    static PATTERNS = [
        {
            regex: /@Damage\[((?:[^\[\]]+|\[[^\]]*\])*)\](?:\{([^}]+)\})?/gi,
            priority: 210,
            type: 'damage',
            extractor: 'damage'
        },
        {
            regex: /@Check\[([^\]]+)\](?:\{([^}]+)\})?/gi,
            priority: 205,
            type: 'check',
            extractor: 'check'
        },
        {
            regex: /@Template\[([^\]]+)\](?:\{([^}]+)\})?/gi,
            priority: 200,
            type: 'template',
            extractor: 'template'
        },
        {
            regex: /@UUID\[(Compendium\.pf2e\.conditionitems\.Item\.[^\]]+)\](?:\{([^}]+)\})?/gi,
            priority: 198,
            type: 'condition',
            extractor: 'condition'
        },
        {
            regex: /\[\[\/(?:r|gmr)\s+([^\]#]+?)(?:\s*#([^\]]+))?\]\](?:\{([^}]+)\})?/gi,
            priority: 195,
            type: 'generic',
            extractor: 'generic'
        },
        {
            regex: /\[\[\/act\s+([^\]]+)\]\](?:\{([^}]+)\})?/gi,
            priority: 190,
            type: 'action',
            extractor: 'action'
        }
    ];

    // Extract condition parameters from @UUID links
    static extractConditionParameters(match) {
        const uuid = match[1] || '';
        const displayText = match[2] || '';
        
        // First, validate that this UUID is actually a condition
        const conditionName = this.extractConditionNameFromUUID(uuid);
        
        // If we can't find a matching condition, return null to indicate
        // this match should not create a replacement
        if (!conditionName) {
            return null;
        }
        
        // Extract value from display text if present
        const value = this.extractConditionValueFromDisplayText(displayText);
        
        return {
            condition: conditionName,
            value: value,
            uuid: uuid,
            displayText: displayText
        };
    }

    // Helper: Extract condition name from UUID
    static extractConditionNameFromUUID(uuid) {
        // Look up condition name from the UUID in ConfigManager
        const conditions = ConfigManager.CONDITIONS;
        
        // Find the condition by UUID
        for (const [conditionSlug, conditionUUID] of Object.entries(conditions.metadata.uuids)) {
            if (conditionUUID === uuid) {
                return conditionSlug;
            }
        }
        
        // Return null if no matching condition found
        // This indicates the UUID is not a condition link
        return null;
    }

    // Helper: Extract condition value from display text
    static extractConditionValueFromDisplayText(displayText) {
        if (!displayText) return null;
        
        // Look for numbers in the display text
        // Examples: "Frightened 2", "Stupefied 1", "Off-Guard" (no number)
        const numberMatch = displayText.match(/(\d+)/);
        
        if (numberMatch) {
            return parseInt(numberMatch[1]);
        }
        
        return null;
    }

    // Centralized options parser used by automation extractors
    static parseOptionsFromSegment(paramContent) {
        if (!paramContent || typeof paramContent !== 'string') {
            return [];
        }
        const optionsMatch = paramContent.match(/options:\s*([^|\]]*)/i);
        if (!optionsMatch || optionsMatch[1] === undefined) {
            return [];
        }
        const raw = optionsMatch[1]
            .split(',')
            .map((option) => option.trim().toLowerCase())
            .filter((option) => option.length > 0);
        // Deduplicate while preserving order
        return raw.filter((option, index) => raw.indexOf(option) === index);
    }

    static extractDamageParameters(paramContent, displayText) {
        const result = {
            components: [],
            options: [],
            healing: /healing/.test(paramContent),
            displayText: displayText || ''
        };
        // Parse options early so we capture them even if no dice are found
        result.options = this.parseOptionsFromSegment(paramContent);
    
        // Find all dice expressions and their positions
        const dicePattern = /(\d+(?:d\d+)?(?:[+-]\d+)?)/g;
        const diceMatches = [...paramContent.matchAll(dicePattern)];
    
        if (diceMatches.length === 0) return result;
    
        // Create component boundaries based on dice positions
        const componentBoundaries = [];
        
        for (let i = 0; i < diceMatches.length; i++) {
            const currentDice = diceMatches[i];
            const nextDice = diceMatches[i + 1];
            
            const startPos = i === 0 ? 0 : componentBoundaries[i - 1].end;
            const endPos = nextDice ? nextDice.index : paramContent.length;
            
            componentBoundaries.push({
                start: startPos,
                end: endPos,
                diceMatch: currentDice
            });
        }
    
        // Process each component
        componentBoundaries.forEach(boundary => {
            const componentText = paramContent.substring(boundary.start, boundary.end);
            const dice = boundary.diceMatch[1];
            
            const component = {
                dice: dice,
                damageType: this.findDamageTypeInComponent(componentText),
                category: this.findDamageCategoryInComponent(componentText)
            };
    
            result.components.push(component);
        });
    
        return result;
    }

    /**
 * Find damage type in a component text using ConfigManager
 * @param {string} componentText - The component text to search
 * @returns {string} - The damage type, defaults to 'untyped'
 */
static findDamageTypeInComponent(componentText) {
    const lowerText = componentText.toLowerCase();
    
    // Search for damage types from ConfigManager
    for (const damageType of ConfigManager.ALL_DAMAGE_TYPES.slugs) {
        if (damageType && lowerText.includes(damageType)) {
            // Convert legacy damage types if needed
            return LegacyConversionManager.convertLegacyDamageType(damageType);
        }
    }
    
    return 'untyped';
}

/**
 * Find damage category in a component text using ConfigManager
 * @param {string} componentText - The component text to search
 * @returns {string} - The damage category, defaults to empty string
 */
static findDamageCategoryInComponent(componentText) {
    const lowerText = componentText.toLowerCase();
    
    // Search for damage categories from ConfigManager (excluding empty string)
    for (const category of ConfigManager.DAMAGE_CATEGORIES.slugs) {
        if (category && lowerText.includes(category)) {
            return category;
        }
    }
    
    return '';
}

    static extractCheckParameters(paramContent, displayText) {
        const result = {
            checkType: 'flat',
            dcMethod: 'none',
            dc: null,
            statistic: '',
            basic: false,
            options: [],
            displayText: displayText || ''
        };

        const segments = paramContent.split('|').map((s) => s.trim()).filter((s) => s !== '');
        if (segments.length > 0) {
            result.checkType = segments[0].toLowerCase();
        }

        segments.slice(1).forEach((segment) => {
            if (segment.startsWith('dc:')) {
                result.dcMethod = 'static';
                const parsed = parseInt(segment.substring(3));
                result.dc = Number.isFinite(parsed) ? parsed : null;
            } else if (segment.startsWith('against:')) {
                result.dcMethod = 'target';
                result.statistic = segment.substring(8);
            } else if (segment === 'basic') {
                result.basic = true;
            }
        });

        // Parse options using centralized method
        result.options = this.parseOptionsFromSegment(paramContent);

        return result;
    }

    static extractTemplateParameters(paramContent, displayText) {
        const result = {
            templateType: null,
            distance: null,
            width: 5,
            displayText: displayText || ''
        };

        // First, search the whole match for template type using all template types from ConfigManager
        const allTemplateTypes = ConfigManager.TEMPLATE_CONFIG.all.slugs;
        for (const templateType of allTemplateTypes) {
            // Check if this template type appears in the paramContent
            if (paramContent.toLowerCase().includes(templateType.toLowerCase())) {
                result.templateType = templateType;
                break; // Use the first one found
            }
        }

        // Then go segment by segment to determine the rest of the parameters
        const segments = paramContent.split('|').map((s) => s.trim());

        segments.forEach((segment) => {
            if (segment.startsWith('type:')) {
                // Override with explicit type if present
                result.templateType = segment.substring(5);
            } else if (segment.startsWith('distance:')) {
                const parsed = parseInt(segment.substring(9));
                if (Number.isFinite(parsed)) result.distance = parsed;
            } else if (segment.startsWith('width:')) {
                const parsed = parseInt(segment.substring(6));
                if (Number.isFinite(parsed)) result.width = parsed;
            }
        });

        // If either templateType or distance is still null, return null to skip this match
        if (result.templateType === null || result.distance === null) {
            return null;
        }

        // Convert alternate template types to standard types
        const standardType = ConfigManager.TEMPLATE_CONFIG.getStandardType(result.templateType);
        if (standardType) {
            result.templateType = standardType;
        }

        return result;
    }

    static extractGenericParameters(match) {
        const dice = (match[1] || '').trim();
        const label = (match[2] || '').trim() || 'Roll';
        const displayText = match[3] || '';
        const gmOnly = /\[\[\/gmr/i.test(match[0] || '');
        return {
            dice: dice,
            label: label,
            gmOnly: gmOnly,
            displayText: displayText
        };
    }

    static extractActionParameters(match) {
        const paramContent = match[1] || '';
        const displayText = match[2] || '';
        const segments = paramContent.split(' ').map((s) => s.trim()).filter((s) => s !== '');

        const result = {
            action: segments[0] || 'grapple',
            variant: '',
            dcMethod: 'none',
            dc: null,
            statistic: '',
            alternateRollStatistic: 'none',
            displayText: displayText || ''
        };

        segments.slice(1).forEach((segment) => {
            if (segment.startsWith('variant=')) {
                result.variant = segment.substring(8);
            } else if (segment.startsWith('dc=')) {
                const dcValue = segment.substring(3);
                if (/^\d+$/.test(dcValue)) {
                    result.dcMethod = 'static';
                    result.dc = parseInt(dcValue);
                } else {
                    result.dcMethod = 'target';
                    result.statistic = dcValue;
                }
            } else if (segment.startsWith('statistic=')) {
                result.alternateRollStatistic = segment.substring(10);
            }
        });

        return result;
    }

    static createFallbackParameters(subtype) {
        switch (subtype) {
            case 'damage':
                return {
                    components: [{ dice: '1d1', damageType: 'untyped', category: '' }],
                    options: [],
                    healing: false,
                    displayText: ''
                };
            case 'check':
                return {
                    checkType: 'flat',
                    dcMethod: 'none',
                    dc: null,
                    options: [],
                    displayText: ''
                };
            case 'template':
                return {
                    templateType: 'burst',
                    distance: 30,
                    width: 5,
                    displayText: ''
                };
            case 'generic':
                return {
                    dice: '1d20',
                    label: 'Roll',
                    gmOnly: false,
                    displayText: ''
                };
            case 'action':
                return {
                    action: 'grapple',
                    variant: '',
                    dcMethod: 'none',
                    dc: null,
                    statistic: '',
                    alternateRollStatistic: 'none',
                    displayText: ''
                };
            case 'condition':
                return {
                    condition: 'off-guard',
                    value: null,
                    uuid: 'Compendium.pf2e.conditionitems.Item.AJh5ex99aV6VTggg',
                    displayText: ''
                };
            default:
                return {};
        }
    }
}

/**
 * Damage pattern class extending BasePattern
 */
class DamagePattern extends BasePattern {
    static type = 'damage';
    static priority = 100;
    static description = 'Damage roll patterns';

    static EXTRACTORS = {
        multi: (match) => DamagePattern.extractMultiDamageParameters(match),
        single: (match) => DamagePattern.extractSingleDamageParameters(match)
    };

    static PATTERNS = [
        // Multi-damage pattern (highest priority)
        {
            regex: new RegExp(`((?:\\d+(?:d\\d+)?(?:[+-]\\d+)?\\s+(?:(?:persistent\\s+)?(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})(?:\\s+persistent)?|(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})\\s+splash|splash\\s+(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})|(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})\\s+precision|precision\\s+(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})|precision|(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern}))(?:\\s+damage)?(?:\\s*,\\s*|\\s*,\\s*and\\s*|\\s*,\\s*plus\\s*|\\s+and\\s+|\\s+plus\\s+))*\\d+(?:d\\d+)?(?:[+-]\\d+)?\\s+(?:(?:persistent\\s+)?(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})(?:\\s+persistent)?|(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})\\s+splash|splash\\s+(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})|(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})\\s+precision|precision\\s+(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})|precision|(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern}))(?:\\s+damage)?)`, 'gi'),
            priority: 110,
            extractor: 'multi'
        },
        // Persistent damage
        {
            regex: new RegExp(`(\\d+(?:d\\d+)?(?:[+-]\\d+)?)\\s+(?:persistent\\s+(${ConfigManager.ALL_DAMAGE_TYPES.pattern})|(${ConfigManager.ALL_DAMAGE_TYPES.pattern})\\s+persistent)(?:\\s+damage)?`, 'gi'),
            priority: 100,
            extractor: 'single'
        }
    ];

    static extractMultiDamageParameters(match) {
        // Parse multiple damage components from the match
        const singlePattern = new RegExp(`(\\d+(?:d\\d+)?(?:[+-]\\d+)?)\\s+(?:(?:persistent\\s+)?(?:(${ConfigManager.ALL_DAMAGE_TYPES.pattern}))(?:\\s+persistent)?|(?:(${ConfigManager.ALL_DAMAGE_TYPES.pattern}))\\s+splash|splash\\s+(${ConfigManager.ALL_DAMAGE_TYPES.pattern})|(?:(${ConfigManager.ALL_DAMAGE_TYPES.pattern}))\\s+precision|precision\\s+(${ConfigManager.ALL_DAMAGE_TYPES.pattern})|precision|(?:(${ConfigManager.ALL_DAMAGE_TYPES.pattern})))(?:\\s+damage)?`, 'gi');
        
        const components = [];
        let m;
        while ((m = singlePattern.exec(match[0])) !== null) {
            const component = this.extractSingleDamageComponent(m);
            if (component) {
                components.push(component);
            }
        }
        
        return {
            components: components,
            options: [],
            healing: false
        };
    }

    static extractSingleDamageParameters(match) {
        const component = this.extractSingleDamageComponent(match);
        return {
            components: component ? [component] : [],
            options: [],
            healing: false
        };
    }

    static extractSingleDamageComponent(match) {
        const dice = match[1] || '';
        const originalText = match[0].toLowerCase();
        
        // Extract damage type from various capture groups
        const type = match[2] || match[3] || match[4] || match[5] || match[6] || match[7] || match[8] || '';
        
        const isPersistent = this.containsWord(originalText, 'persistent');
        const isPrecision = this.containsWord(originalText, 'precision');
        const isSplash = this.containsWord(originalText, 'splash');
        
        // Convert legacy types
        let remasterType = type;
        if (type && LegacyConversionManager.isLegacyDamageType(type)) {
            remasterType = LegacyConversionManager.convertLegacyDamageType(type);
        }
        
        let category = '';
        if (isPersistent) category = 'persistent';
        else if (isPrecision) category = 'precision';
        else if (isSplash) category = 'splash';
        
        return {
            dice: dice,
            damageType: remasterType.toLowerCase().trim(),
            category: category
        };
    }

    /**
     * Create a replacement object from a match and parameters
     * Override to trim trailing "damage" from the match
     * @param {Array} match - Regex match array
     * @param {Object} parameters - Extracted parameters
     * @returns {Replacement} Replacement instance
     */
    static createReplacement(match, parameters) {
        const trimmedMatch = this.trimTrailingDamage(match);
        return new Replacement(trimmedMatch, this.type, parameters);
    }

    /**
     * Trim trailing "damage" from a match to prevent it from being replaced
     * @param {Array} match - Regex match array
     * @returns {Array} - Modified match array with "damage" trimmed
     */
    static trimTrailingDamage(match) {
        if (!match || !match[0]) return match;
        
        const originalText = match[0];
        const trimmedText = originalText.replace(/\s+damage\s*$/i, '');
        
        // If we trimmed something, create a new match object with the shorter text
        if (trimmedText.length !== originalText.length) {
            // Create a new match array that preserves all properties
            const newMatch = Array.from(match); // Copy all elements
            newMatch[0] = trimmedText; // Update the matched text
            newMatch.index = match.index; // Preserve the index
            newMatch.input = match.input; // Preserve the input
            newMatch.groups = match.groups; // Preserve groups if they exist
            
            // Preserve any other properties that might exist on the match object
            Object.setPrototypeOf(newMatch, Object.getPrototypeOf(match));
            
            return newMatch;
        }
        
        return match;
    }
}

/**
 * Check pattern class extending BasePattern
 */
class CheckPattern extends BasePattern {
    static type = 'check';
    static priority = 90;
    static description = 'Check patterns';

    static EXTRACTORS = {
        save: (match) => CheckPattern.extractSaveParameters(CheckPattern.getMatchedText(match)),
        perception: (match) => CheckPattern.extractPerceptionParameters(CheckPattern.getMatchedText(match)),
        lore: (match) => CheckPattern.extractLoreParameters(CheckPattern.getMatchedText(match)),
        flat: (match) => CheckPattern.extractFlatParameters(CheckPattern.getMatchedText(match)),
        skill: (match) => CheckPattern.extractSkillParameters(CheckPattern.getMatchedText(match))
    };

    static PATTERNS = [
        // Comprehensive save pattern (highest priority)
        {
            regex: /(?:\(?)((?:basic\s+)?(?:DC\s*(\d{1,2})\s*[,;:\(\)]?\s*)?\b(fort(?:itude)?|ref(?:lex)?|will)\b(?:\s+(?:save|saving\s+throw))?(?:\s*[,;:\(\)]?\s*(?:basic\s+)?(?:DC\s*(\d{1,2}))?)?|(?:basic\s+)?\b(fort(?:itude)?|ref(?:lex)?|will)\b(?:\s+(?:save|saving\s+throw))?\s*(?:basic)?(?:\s*[,;:\(\)]?\s*(?:DC\s*(\d{1,2}))?)?|(?:basic\s+)?(?:DC\s*(\d{1,2})\s+)?\b(fort(?:itude)?|ref(?:lex)?|will)\b|(?:DC\s*(\d{1,2})\s+)?(?:basic\s+)?\b(fort(?:itude)?|ref(?:lex)?|will)\b)(?:\)?)/gi,
            priority: 95,
            extractor: 'save'
        },
        // Perception checks
        {
            regex: /(?:DC\s+(\d+)\s+)?Perception(?:\s+check)?/gi,
            priority: 90,
            extractor: 'perception'
        },
        // Lore skill checks (DC first)
        {
            regex: /(?:DC\s+(\d+)\s+)?([^0-9\n]+?)\s+Lore(?:\s+check)?/gi,
            priority: 90,
            extractor: 'lore'
        },
        // Lore skill checks (lore name first)
        {
            regex: /([^0-9\n]+?)\s+Lore\s+(?:DC\s+(\d+)\s+)?check/gi,
            priority: 90,
            extractor: 'lore'
        },
        // Lore skill checks (DC at end)
        {
            regex: /([^0-9\n]+?)\s+Lore(?:\s+check)?(?:\s+DC\s+(\d+))?/gi,
            priority: 90,
            extractor: 'lore'
        },
        // Flat checks
        {
            regex: /DC\s+(\d+)\s+flat\s+check/gi,
            priority: 85,
            extractor: 'flat'
        },
        // Single skill checks
        {
            regex: new RegExp(`(?:DC\\s+(\\d+)\\s+)?(${ConfigManager.SKILLS.pattern})(?:\\s+check)?`, 'gi'),
            priority: 80,
            extractor: 'skill'
        }
    ];

    static extractSaveParameters(text) {
        const normalizedText = text.toLowerCase().trim();
        
        // Extract DC
        const dc = this.extractDC(normalizedText);
        
        // Extract save type
        let checkType = 'reflex'; // default
        if (this.containsWord(normalizedText, 'fort')) checkType = 'fortitude';
        else if (this.containsWord(normalizedText, 'ref')) checkType = 'reflex';
        else if (this.containsWord(normalizedText, 'will')) checkType = 'will';
        
        // Check for basic
        const basic = this.containsWord(normalizedText, 'basic');
        
        return {
            checkType: checkType,
            dcMethod: 'static',
            dc: dc,
            basic: basic
        };
    }

    static extractPerceptionParameters(text) {
        const dc = this.extractDC(text);
        
        return {
            checkType: 'perception',
            dcMethod: 'static',
            dc: dc
        };
    }

    static extractLoreParameters(text) {
        const dc = this.extractDC(text);
        
        // Extract lore name
        const loreMatch = text.match(/^(.*?)\s+lore/i);
        let loreName = 'Warfare';
        if (loreMatch) {
            loreName = loreMatch[1]
                .replace(/\bdc\s*\d{1,2}\b/gi, '')
                .trim();
            if (loreName) {
                loreName = loreName.charAt(0).toUpperCase() + loreName.slice(1);
            } else {
                loreName = 'Warfare';
            }
        }
        
        return {
            checkType: 'lore',
            loreName: loreName.toLowerCase().trim(),
            dcMethod: 'static',
            dc: dc
        };
    }

    static extractFlatParameters(text) {
        const dc = this.extractDC(text);
        
        return {
            checkType: 'flat',
            dcMethod: 'static',
            dc: dc
        };
    }

    static extractSkillParameters(text) {
        const dc = this.extractDC(text);
        
        // Find which skill was matched
        const normalizedText = text.toLowerCase();
        let skill = 'acrobatics'; // default
        for (const skillName of ConfigManager.SKILLS.slugs) {
            if (this.containsWord(normalizedText, skillName)) {
                skill = skillName;
                break;
            }
        }
        
        return {
            checkType: skill.toLowerCase().trim(),
            dcMethod: 'static',
            dc: dc
        };
    }
}

/**
 * Healing pattern class extending BasePattern
 */
class HealingPattern extends BasePattern {
    static type = 'damage';
    static priority = 80;
    static description = 'Healing roll patterns';

    static EXTRACTORS = {
        healing: (match) => HealingPattern.extractHealingParameters(match)
    };

    static PATTERNS = [
        {
            regex: new RegExp(`(\\d+(?:d\\d+)?(?:[+-]\\d+)?)(?:\\s+\\b(?:${ConfigManager.HEALING_TERMS.pattern})\\b)(?:\\s+(?:healed|damage))?`, 'gi'),
            priority: 80,
            extractor: 'healing'
        }
    ];

    static extractHealingParameters(match) {
        const dice = match[1] || '';
        const healingComponent = { dice: dice, damageType: 'untyped', category: '' };
        return { components: [healingComponent], options: [], healing: true };
    }
}

/**
 * Condition pattern class extending BasePattern
 */
class ConditionPattern extends BasePattern {
    static type = 'condition';
    static priority = 70;
    static description = 'Condition patterns';

    static EXTRACTORS = {
        legacy: (match) => ConditionPattern.extractLegacyParameters(match),
        condition: (match) => ConditionPattern.extractConditionParameters(match)
    };

    static PATTERNS = [
        // Legacy flat-footed
        {
            regex: /(?<!@UUID\[[^\]]*\]\{[^}]*\})\b(flat-footed)\b(?!\})/gi,
            priority: 75,
            extractor: 'legacy'
        },
        // Condition linking
        {
            regex: new RegExp(`(?<!@UUID\\[[^\\]]*\\]\\{[^}]*\\})\\b(${ConfigManager.CONDITIONS.pattern})(?:\\s+(\\d+))?\\b(?!\\})`, 'gi'),
            priority: 70,
            extractor: 'condition'
        }
    ];

    static extractLegacyParameters(match) {
        const text = match[1] || '';
        const converted = LegacyConversionManager.isLegacyCondition(text)
            ? (LegacyConversionManager.convertLegacyCondition(text) || text)
            : text;
        return {
            condition: converted.toLowerCase().trim(),
            value: null,
            uuid: ConfigManager.getConditionUUID(converted) || ''
        };
    }

    static extractConditionParameters(match) {
        let conditionText = match[1] || '';
        let value = null;
        if (LegacyConversionManager.isLegacyCondition(conditionText)) {
            const converted = LegacyConversionManager.convertLegacyCondition(conditionText);
            if (converted) conditionText = converted;
        }
        if (match[2]) value = parseInt(match[2]);
        const valueMatch = conditionText.match(/^(.+?)\s+(\d+)$/);
        if (valueMatch) {
            conditionText = valueMatch[1];
            value = parseInt(valueMatch[2]);
        }
        return {
            condition: conditionText.toLowerCase().trim(),
            value: value,
            uuid: ConfigManager.getConditionUUID(conditionText) || ''
        };
    }
}

/**
 * Template pattern class extending BasePattern
 */
class TemplatePattern extends BasePattern {
    static type = 'template';
    static priority = 60;
    static description = 'Template patterns';

    static EXTRACTORS = {
        area: (match) => TemplatePattern.extractAreaParameters(match),
        within: (match) => TemplatePattern.extractWithinParameters(match)
    };

    static PATTERNS = [
        // Standard template patterns
        {
            regex: new RegExp(`(\\d+)(?:[\\s-]+)(?:foot|feet)\\s+(${ConfigManager.TEMPLATE_CONFIG.all.pattern})`, 'gi'),
            priority: 60,
            extractor: 'area'
        },
        // "within X feet" pattern
        {
            regex: /within\s+(\d+)\s+(?:foot|feet)/gi,
            priority: 60,
            extractor: 'within'
        }
    ];

    static extractAreaParameters(match) {
        const distance = parseInt(match[1]) || 30;
        let templateType = match[2] ? match[2].toLowerCase() : 'burst';
        
        // Handle alternate shape mappings
        const standardType = ConfigManager.TEMPLATE_CONFIG.getStandardType(templateType);
        if (standardType) {
            templateType = standardType;
        }
        
        // Extract width for line templates from the full text
        let width = 5; // default
        if (templateType === 'line') {
            const text = this.getMatchedText(match).toLowerCase();
            const widthMatch = text.match(/(\d+)(?:-|\s+)?(?:foot|feet|ft)\s+wide/);
            if (widthMatch) {
                width = parseInt(widthMatch[1]);
            }
        }
        
        return {
            templateType: templateType,
            distance: distance,
            width: width
        };
    }

    static extractWithinParameters(match) {
        const distance = parseInt(match[1]) || 15;
        
        return {
            templateType: 'emanation',
            distance: distance,
            width: 5,
            displayText: `within ${distance} feet`
        };
    }
}

/**
 * Duration pattern class extending BasePattern
 */
class DurationPattern extends BasePattern {
    static type = 'generic';
    static priority = 50;
    static description = 'Duration roll patterns';

    static EXTRACTORS = {
        duration: (match) => DurationPattern.extractDurationParameters(match)
    };

    static PATTERNS = [
        {
            regex: new RegExp(`(\\d+d\\d+(?:[+-]\\d+)?|\\d+)(?:\\s+)(${ConfigManager.DURATION_UNITS.pattern})`, 'gi'),
            priority: 50,
            extractor: 'duration'
        }
    ];

    static extractDurationParameters(match) {
        const dice = match[1] || '';
        const text = this.getMatchedText(match);
        return { dice: dice, label: 'Duration', gmOnly: true, displayText: text };
    }
}

/**
 * Action pattern class extending BasePattern
 */
class ActionPattern extends BasePattern {
    static type = 'action';
    static priority = 40;
    static description = 'Action patterns';

    static EXTRACTORS = {
        action: (match) => ActionPattern.extractActionParameters(match)
    };

    static PATTERNS = [
        {
            regex: new RegExp(`\\b(${ConfigManager.ACTIONS.pattern})\\b`, 'gi'),
            priority: 40,
            extractor: 'action'
        }
    ];

    static extractActionParameters(match) {
        const actionText = match[1] || '';
        const actionSlug = this.actionToSlug(actionText);
        let variant = '';
        if (ConfigManager.actionHasVariants(actionSlug)) {
            const variants = ConfigManager.ACTION_VARIANTS[actionSlug];
            if (variants && variants.slugs && variants.slugs.length > 0) {
                variant = variants.slugs[0];
            }
        }
        return { action: actionSlug, variant: variant, dcMethod: 'none', dc: null, statistic: '', alternateRollStatistic: '' };
    }

    static actionToSlug(actionText) {
        const text = actionText.toLowerCase().trim();
        return text.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
}

class PatternDetector {
    // All patterns defined as a static constant - no runtime changes
    static PATTERN_CLASSES = [
        AutomationPattern,
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
        
        const parameters = matchResult.config?.parameters || {};
        return PatternClass.createReplacement(matchResult.match, parameters);
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

// class PatternTester {
//     // Test a specific pattern against text
//     static testPattern(patternType, text) {
//         const PatternClass = PatternDetector.PATTERN_CLASSES.find(cls => cls.type === patternType);
//         if (!PatternClass) {
//             return { error: `Pattern type '${patternType}' not found` };
//         }

//         const matches = PatternClass.test(text);
//         return {
//             pattern: patternType,
//             text: text,
//             matches: matches.length,
//             results: matches.map(match => ({
//                 matched: PatternDetector.getMatchObject(match.match)?.[0],
//                 position: PatternDetector.getMatchPosition(match.match),
//                 priority: match.priority
//             }))
//         };
//     }

//     /**
//      * Test all patterns against text
//      */
//     static testAll(text) {
//         const results = {};
//         const allMatches = PatternDetector.detectAll(text);
        
//         // Test each pattern individually
//         for (const PatternClass of PatternDetector.PATTERN_CLASSES) {
//             results[PatternClass.type] = this.testPattern(PatternClass.type, text);
//         }

//         // Add summary
//         results._summary = {
//             totalPatterns: PatternDetector.PATTERN_CLASSES.length,
//             totalMatches: allMatches.length,
//             finalMatches: allMatches.map(match => ({
//                 type: match.type,
//                 matched: PatternDetector.getMatchObject(match.match)?.[0],
//                 position: PatternDetector.getMatchPosition(match.match),
//                 priority: match.priority
//             }))
//         };

//         return results;
//     }

//     /**
//      * Run a test suite with predefined test cases
//      */
//     static runTestSuite(testCases) {
//         const results = {
//             passed: 0,
//             failed: 0,
//             total: testCases.length,
//             details: []
//         };

//         for (const testCase of testCases) {
//             try {
//                 const result = this.testAll(testCase.input);
//                 const passed = this.validateTestCase(result, testCase.expected);
                
//                 results.details.push({
//                     input: testCase.input,
//                     expected: testCase.expected,
//                     actual: result,
//                     passed: passed
//                 });

//                 if (passed) {
//                     results.passed++;
//                 } else {
//                     results.failed++;
//                 }
//             } catch (error) {
//                 results.failed++;
//                 results.details.push({
//                     input: testCase.input,
//                     error: error.message,
//                     passed: false
//                 });
//             }
//         }

//         return results;
//     }

//     static validateTestCase(actual, expected) {
//         if (expected.matchCount !== undefined) {
//             return actual._summary.totalMatches === expected.matchCount;
//         }
        
//         if (expected.patterns !== undefined) {
//             const actualPatterns = actual._summary.finalMatches.map(m => m.type);
//             const expectedPatterns = expected.patterns;
//             return JSON.stringify(actualPatterns.sort()) === JSON.stringify(expectedPatterns.sort());
//         }

//         return true;
//     }
// }

// // ===================== PATTERN TESTING SUITE =====================

// // Comprehensive test cases
// const COMPREHENSIVE_TEST_CASES = [
//     // Single pattern tests
//     { input: '2d6 fire damage', expected: { matchCount: 1, patterns: ['damage'] } },
//     { input: '1d4 persistent acid damage', expected: { matchCount: 1, patterns: ['damage'] } },
//     { input: 'DC 15 Reflex save', expected: { matchCount: 1, patterns: ['check'] } },
//     { input: 'heal 3d8 hit points', expected: { matchCount: 1, patterns: ['healing'] } },
//     { input: 'becomes frightened 2', expected: { matchCount: 1, patterns: ['condition'] } },
//     { input: '30-foot cone', expected: { matchCount: 1, patterns: ['template'] } },
//     { input: '1d4 rounds', expected: { matchCount: 1, patterns: ['duration'] } },
//     { input: 'Use the Shove action', expected: { matchCount: 1, patterns: ['action'] } },
    
//     // Multi-damage tests
//     { input: '2d6 fire damage and 1d4 acid damage', expected: { matchCount: 1, patterns: ['damage'] } },
    
//     // Complex combinations
//     { 
//         input: 'Deal 2d6 fire damage. DC 15 Reflex save. Target becomes frightened 1.',
//         expected: { matchCount: 3, patterns: ['damage', 'check', 'condition'] }
//     },
    
//     // Edge cases
//     { input: '', expected: { matchCount: 0, patterns: [] } },
//     { input: 'No patterns here', expected: { matchCount: 0, patterns: [] } },
// ];

// function runComprehensiveTestSuite() {
//     console.log('=== Comprehensive Test Suite ===');
//     const results = PatternTester.runTestSuite(COMPREHENSIVE_TEST_CASES);
    
//     console.log(`Total: ${results.total}`);
//     console.log(`Passed: ${results.passed}`);
//     console.log(`Failed: ${results.failed}`);
//     console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    
//     if (results.failed > 0) {
//         console.log('\n=== Failed Tests ===');
//         results.details.filter(d => !d.passed).forEach(detail => {
//             console.log(`❌ "${detail.input}"`);
//             console.log(`   Expected: ${JSON.stringify(detail.expected)}`);
//             if (detail.error) {
//                 console.log(`   Error: ${detail.error}`);
//             }
//         });
//     }
    
//     return results;
// }

// runComprehensiveTestSuite();

// ===================== REPLACEMENT CLASS SYSTEM =====================
// Replacement base class is extended by a class for each type of replacement.
// ====================================================================

// Utility for unique IDs
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

class Replacement {
    constructor(match, type, parameters = {}) {
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
        this.type = type;
        
        // Store original parameters directly - much cleaner!
        this._originalParameters = JSON.parse(JSON.stringify(parameters));
        
        // Create InlineAutomation instance with parameters
        this.inlineAutomation = this.createInlineAutomation(type, parameters);
        
        // Create renderer instance
        this.renderer = this.getRenderer(type);
        
        // Store original render
        this.originalRender = this.render();
        
        console.log(`[Replacement] Created ${type} replacement with parameters:`, parameters);
    }

    createInlineAutomation(type, parameters) {
        switch (type) {
            case 'damage':
                return new InlineDamage(parameters);
            case 'check':
                return new InlineCheck(parameters);
            case 'condition':
                return new InlineCondition(parameters);
            case 'template':
                return new InlineTemplate(parameters);
            case 'generic':
                return new InlineGenericRoll(parameters);
            case 'action':
                return new InlineAction(parameters);
            default:
                throw new Error(`Unknown type: ${type}`);
        }
    }

    getRenderer(type) {
        switch (type) {
            case 'damage':
                return new DamageRenderer();
            case 'check':
                return new CheckRenderer();
            case 'condition':
                return new ConditionRenderer();
            case 'template':
                return new TemplateRenderer();
            case 'generic':
                return new GenericRollRenderer();
            case 'action':
                return new ActionRenderer();
            default:
                throw new Error(`Unknown type: ${type}`);
        }
    }

    // Much simpler reset method!
    resetToOriginal() {
        console.log('[Replacement] Resetting to original state');
        console.log('[Replacement] Original parameters:', this._originalParameters);
        
        // Recreate the InlineAutomation object with original parameters
        this.inlineAutomation = this.createInlineAutomation(
            this.type, 
            this._originalParameters
        );
        
        // Reset enabled state
        this.enabled = true;
        
        // Clear any custom display text
        this.displayText = this.inlineAutomation.displayText || '';
        
        console.log('[Replacement] Reset completed');
    }

    // Return the original or converted text depending on the enabled state
    render() {
        if (!this.enabled) return this.originalText;
        return this.conversionRender();
    }

    conversionRender() {
        return this.inlineAutomation.render();
    }

    getInteractiveParams() {
        const params = { 
            type: this.type, 
            id: this.id, 
            displayText: this.displayText,
            inlineAutomation: this.inlineAutomation
        };
        return params;
    }

    // Render the interactive element
    renderInteractive(state = null) {
        const params = this.getInteractiveParams();
        
        if (state && state.interactiveElements) {
            state.interactiveElements[this.id] = this;
        }
        
        // Build CSS classes array
        const cssClasses = ['rollconverter-interactive'];
        
        if (this.enabled && this.isModified && this.isModified()) {
            cssClasses.push('rollconverter-modified');
        }
        
        if (!this.enabled) {
            cssClasses.push('rollconverter-disabled');
        }
        
        const classString = cssClasses.join(' ');
        const content = this.enabled ? this.render() : this.originalText;
        
        return `<span class="${classString}" data-id="${this.id}" data-type="${params.type}" data-params='${JSON.stringify(params)}'>${content}</span>`;
    }

    validate() { 
        return this.inlineAutomation && this.inlineAutomation.validate ? this.inlineAutomation.validate() : true;
    }

    getText() { return this.originalText; }
    getLength() { return this.endPos - this.startPos; }

    isModified() {
        return this.render() !== this.originalRender;
    }

    // Method to mark the replacement as modified (called by modifier panel)
    markModified() {
        // This method can be used by the modifier panel to trigger updates
        // The actual modification detection is done by comparing renders
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
        container.innerHTML = '<em class="rollconverter-output-placeholder"></em>';
        return;
    }

    try {
        const htmlText = text.replace(/\n/g, '<br>');

        const processedHTML = await TextEditor.enrichHTML(htmlText, {
            async: true,
            rollData: {},
            relativeTo: null
        });

        const previewContent = `
            <div class="rollconverter-preview-content">
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
                    const formula = roll.dataset.formula || roll.innerText;
                    const rollData = {};
                    
                    const actualRoll = new Roll(formula, rollData);
                    await actualRoll.evaluate();
                    
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
    
    // Inject CSS before creating dialog
    CSSManager.injectStyles();
    
    const dialogContent = `
            <div class="rollconverter-dialog">
            <div class="rollconverter-main">
                <fieldset class="rollconverter-modifier-fieldset">
                    <legend>Input Text</legend>
                    <div class="form-group">
                        <div class="form-fields">
                            <textarea 
                                id="input-text" 
                                name="inputText" 
                                rows="6" 
                                placeholder="Paste your spell, ability, or feat description here..."
                                class="rollconverter-input-textarea"
                                >${DEFAULT_TEST_INPUT}</textarea>
                        </div>
                        <p class="notes">Making changes here will clear any modifications made below.</p>
                    </div>
                </fieldset>
                <fieldset class="rollconverter-modifier-fieldset">
                    <legend>Converted Text</legend>
                    <div class="form-group">
                        <div class="form-fields">
                            <div id="output-html" class="rollconverter-output-area rollconverter-output-converted">
                                <em class="rollconverter-output-placeholder">Live preview will appear here...</em>
                            </div>
                        </div>
                        <p class="notes">Click an inline roll to modify it.</p>
                    </div>
                </fieldset>
                <fieldset class="rollconverter-modifier-fieldset">
                    <legend>Live Preview</legend>
                    <div class="form-group">
                        <div class="form-fields">
                            <div id="live-preview" class="rollconverter-output-area">
                                <em class="rollconverter-output-placeholder">Live preview will appear here...</em>
                            </div>
                        </div>
                        <p class="notes">Click inline rolls to test them.</p>
                    </div>
                </fieldset>
                <div class="rollconverter-controls">
                    <button type="button" id="copy-output" class="rollconverter-control-button">Copy Output</button>
                    <button type="button" id="clear-all" class="rollconverter-control-button">Clear All</button>
                </div>
            </div>
            <div class="rollconverter-sidebar">
                <div id="modifier-panel-content" class="rollconverter-modifier-panel-content">
                    <em class="rollconverter-modifier-panel-placeholder">Select an element to modify.</em>
                </div>
            </div>
        </div>
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
                converterDialog.initializeUI(html);
                converterDialog.setupEventHandlers();
                console.log('[PF2e Converter] Dialog render completed successfully');
            } catch (error) {
                console.error('[PF2e Converter] Error in dialog render callback:', error);
                console.error('[PF2e Converter] Error stack:', error.stack);
            }
        },
        close: () => {
            // Clean up CSS when dialog closes
            CSSManager.removeStyles();
            if (converterDialog) {
                converterDialog.cleanup();
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
            <div class="rollconverter-traits-wrapper">
                <div class="rollconverter-traits-selected">
                    <input 
                        type="text" 
                        class="rollconverter-traits-input"
                        placeholder="${this.options.placeholder}"
                    />
                </div>
                <div class="rollconverter-traits-dropdown"></div>
            </div>
        `;
        
        this.wrapper = container.querySelector('.rollconverter-traits-wrapper');
        this.selectedContainer = container.querySelector('.rollconverter-traits-selected');
        this.searchInput = container.querySelector('.rollconverter-traits-input');
        this.dropdown = container.querySelector('.rollconverter-traits-dropdown');
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
        const options = this.dropdown.querySelectorAll('.rollconverter-trait-option');
        options.forEach((option, index) => {
            option.classList.toggle('rollconverter-active', index === this.activeIndex);
        });
        
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
                    <div class="rollconverter-traits-dropdown-empty">
                        No matching traits found. Press Enter to add "${query}" as custom trait.
                    </div>
                `;
            } else {
                this.dropdown.innerHTML = '';
            }
            return;
        }
        
        this.dropdown.innerHTML = this.filteredOptions.map((trait, index) => `
            <div class="rollconverter-trait-option ${index === this.activeIndex ? 'rollconverter-active' : ''}" data-value="${trait.value}">
                ${trait.label}
            </div>
        `).join('');
        
        // Add click handlers
        this.dropdown.querySelectorAll('.rollconverter-trait-option').forEach((option, index) => {
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
        const existingTags = this.selectedContainer.querySelectorAll('.rollconverter-trait-tag');
        existingTags.forEach(tag => tag.remove());
        
        this.selectedTraits.forEach(trait => {
            const tag = document.createElement('div');
            tag.className = 'rollconverter-trait-tag';
            
            tag.innerHTML = `
                ${trait.label}
                <span class="rollconverter-trait-remove">&times;</span>
            `;
            
            tag.querySelector('.rollconverter-trait-remove').addEventListener('click', (e) => {
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

// Utility: Check if a dice expression is just a number (no 'd' present)
function isNumberOnlyDice(dice) {
    return /^\s*\d+\s*$/.test(dice);
}