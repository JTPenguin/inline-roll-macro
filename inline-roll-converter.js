/**
 * Pathfinder 2e Inline Roll Converter
 * 
 * v 1.1.1
 * 
 * Converts plain text descriptions into Pathfinder 2e inline automation syntax for Foundry VTT.
 */

// Default input text for the converter
const DEFAULT_INPUT = `You conjure an exploding glass container filled with a sight-
stealing poison and hurl it across enemy lines. Upon impact,
the bottle bursts and exposes all creatures in the area to
the toxin within. Each creature in the area must attempt a
Fortitude save.
Critical Success The creature is unaffected.
Success The creature takes 3d6 poison damage.
Failure The creature is afflicted with blinding poison at stage 1.
Critical Failure The creature is afflicted with blinding poison
at stage 2.
Blinding Poison (incapacitation, poison) Level 9; Maximum
Duration 4 rounds; Stage 1 3d6 poison damage and blinded
for 1 round (1 round); Stage 2 4d6 poison damage and
blinded for 1 round (1 round); Stage 3 5d6 poison damage
and blinded for 1 round (1 round); Stage 4 6d6 poison
damage and blinded for 1 minute (1 round)`;

// ==================== INLINE AUTOMATIONS SYSTEM ====================
// Classes that define objects which represent individual inline automations,
// each tracking its own parameters and syntax rendering

// Base class for all inline automations
class InlineAutomation {
    constructor(type, params = {}) {
        this.type = type;
        this.params = {...params};
        this.traits = params.traits ? [...params.traits] : [];
        this.options = params.options ? [...params.options] : [];
        this.displayText = params.displayText || '';
    }
    
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

    // Return true if the trait is in the traits array
    // @param {string} trait - The trait to check
    // @returns {boolean} - True if the trait is in the traits array
    hasTrait(trait) {
        return this.traits.includes(trait);
    }

    // Add a trait if the trait is not already in the traits array
    // @param {string} trait - The trait to add
    // @returns {void}
    addTrait(trait) {
        if (!this.hasTrait(trait)) {
            this.traits.push(trait);
        }
    }

    // Remove a trait if the trait is in the traits array
    // @param {string} trait - The trait to remove
    // @returns {void}
    removeTrait(trait) {
        if (this.hasTrait(trait)) {
            this.traits = this.traits.filter(t => t !== trait);
        }
    }

    // Add or remove a trait based on a boolean value
    // @param {string} trait - The trait to set
    // @param {boolean} value - The value to set the trait to
    // @returns {void}
    setTrait(trait, value) {
        if (value) {
            this.addTrait(trait);
        } else {
            this.removeTrait(trait);
        }
    }

    // Render the options as a string for the inline roll syntax (in alphabetical order)
    // @returns {string} - The rendered options syntax
    renderOptions() {
        return this.options.length > 0 ? `|options:${this.options.sort().join(',')}` : '';
    }

    // Render the traits as a string for the inline roll syntax (in alphabetical order)
    // @returns {string} - The rendered traits syntax
    renderTraits() {
        return this.traits.length > 0 ? `|traits:${this.traits.sort().join(',')}` : '';
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
     * @returns {boolean} - True if the component has a dice expression
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

// Inline Damage Roll
class InlineDamage extends InlineAutomation {
    constructor(params = {}) {
        super('damage', params);
        
        this.healing = params.healing || false;
        
        // Convert component parameter objects to DamageComponent instances
        this.components = (params.components ? [...params.components] : []).map(comp => 
            new DamageComponent(comp.dice, comp.damageType, comp.category)
        );
        
        // Ensure we always have at least one component
        if (this.components.length === 0) {
            this.components.push(new DamageComponent('1d6', 'untyped', ''));
        }
    }

    /**
     * Add a new damage component
     * @param {string} dice - Dice expression (default: '1d6')
     * @param {string} damageType - Damage type (default: 'untyped')
     * @param {string} category - Damage category (default: '')
     * @returns {DamageComponent} The newly added component
     */
    addComponent(dice = '1d6', damageType = 'untyped', category = '') {
        const newComponent = new DamageComponent(dice, damageType, category);
        this.components.push(newComponent);
        return newComponent;
    }

    /**
     * Remove a damage component by index
     * @param {number} index - Index of component to remove
     * @returns {boolean} True if component was removed, false otherwise
     */
    removeComponent(index) {
        if (index < 0 || index >= this.components.length) {
            console.warn(`[InlineDamage] Cannot remove component at index ${index}: out of bounds`);
            return false;
        }

        // Prevent removing the last component
        if (this.components.length <= 1) {
            console.warn('[InlineDamage] Cannot remove last damage component');
            return false;
        }

        const removedComponent = this.components.splice(index, 1)[0];
        return true;
    }

    /**
     * Get a component by index
     * @param {number} index - Index of component to get
     * @returns {DamageComponent|null} The component or null if not found
     */
    getComponent(index) {
        if (index < 0 || index >= this.components.length) {
            return null;
        }
        return this.components[index];
    }

    /**
     * Update a component at a specific index
     * @param {number} index - Index of component to update
     * @param {Object} updates - Object with properties to update
     * @returns {boolean} True if component was updated, false otherwise
     */
    updateComponent(index, updates) {
        const component = this.getComponent(index);
        if (!component) {
            console.warn(`[InlineDamage] Cannot update component at index ${index}: not found`);
            return false;
        }

        if (updates.dice !== undefined) component.dice = updates.dice;
        if (updates.damageType !== undefined) component.damageType = updates.damageType;
        if (updates.category !== undefined) component.category = updates.category;

        return true;
    }

    /**
     * Get the number of components
     * @returns {number} Number of damage components
     */
    getComponentCount() {
        return this.components.length;
    }

    /**
     * Ensure we always have at least one valid component
     */
    ensureMinimumComponents() {
        if (this.components.length === 0) {
            this.addComponent();
            console.log('[InlineDamage] Added default component to ensure minimum');
        }
    }

    /**
     * Check if all components are valid
     * @returns {boolean} True if all components are valid
     */
    validate() {
        if (this.components.length === 0) {
            console.warn('[InlineDamage] No damage components found');
            return false;
        }

        const validComponents = this.components.filter(component => component.validate());
        
        if (validComponents.length === 0) {
            console.warn('[InlineDamage] No valid damage components found');
            return false;
        }

        if (validComponents.length !== this.components.length) {
            console.warn(`[InlineDamage] ${this.components.length - validComponents.length} invalid components found`);
        }

        return true;
    }

    render() {
        // Ensure we have at least one component before rendering
        this.ensureMinimumComponents();
    
        // Render the syntax for each damage component
        const componentSyntax = [];
        this.components.forEach((component, index) => {
            componentSyntax.push(component.render(this.healing));
        });
    
        const optionsSyntax = this.renderOptions();
        const displayTextSyntax = this.displayText !== '' ? `{${this.displayText}}` : '';
    
        // Return the complete syntax
        return `@Damage[${componentSyntax.join(',')}${optionsSyntax}]${displayTextSyntax}`;
    }
}

// Inline Checks and Saves
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

        // Add traits syntax to parts, minus the leading '|'
        const traitsSyntax = this.renderTraits().slice(1); // Remove the leading '|'
        if (traitsSyntax !== '') { parts.push(traitsSyntax); } // Add traits syntax if traits is not empty

        // Add options syntax to parts, minus the leading '|'
        const optionsSyntax = this.renderOptions().slice(1); // Remove the leading '|'
        if (optionsSyntax !== '') { parts.push(optionsSyntax); }

        const displayTextSyntax = this.displayText !== '' ? `{${this.displayText}}` : ''; // Add display text syntax if it's not empty

        return `@Check[${parts.join('|')}]${displayTextSyntax}`; // Return the complete syntax
    }

    isSave() {  return this.checkType === 'reflex' || this.checkType === 'fortitude' || this.checkType === 'will'; }

    isSkillCheck() { return ConfigManager.SKILLS.slugs.includes(this.checkType); }

    isPerceptionCheck() { return this.checkType === 'perception'; }

    isLoreCheck() { return this.checkType === 'lore'; }

    isFlatCheck() { return this.checkType === 'flat'; }

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

// Inline UUID Link
class InlineLink extends InlineAutomation {
    constructor(params = {}) {
        super('link', params);
        this.uuid = params.uuid || '';
    }

    render() {
        const displayTextSyntax = this.displayText !== '' ? `{${this.displayText}}` : ''; // Add display text syntax if it's not empty
        return `@UUID[${this.uuid}]${displayTextSyntax}`;
    }
}

// Inline Condition Link
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
        if (typeof newValue === 'number' || newValue === '') {
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

// Inline Template Link
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

// Inline Generic Roll
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

// Inline Action
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

// ==================== RENDERERS ====================
// Classes that define how to render the modifier panel
// for each type of inline automation

// Base class for type-specific renderers
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
                setValue: (r, value) => { r.enabled = value; }
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

//Utility class for consistent field rendering
// Provides static methods for generating field HTML
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
                        <div class="form-fields" style="flex: 0 0 50px;">
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

            case 'button':
                const action = options.action || '';
                const componentIndex = options.componentIndex !== undefined ? 
                    `data-component-index="${options.componentIndex}"` : '';
                return `
                    <div id="${fieldId}-container" class="form-group" style="${containerStyle}" data-field-id="${fieldId}">
                        <div class="form-fields">
                            <button type="button" id="${fieldId}" class="rollconverter-action-button" 
                                    data-action="${action}" ${componentIndex}>
                                ${label}
                            </button>
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

// Renderer for Inline Damage Rolls
class DamageRenderer extends BaseRenderer {
    getTitle(replacement) {
        return 'Inline Damage Roll';
    }

    getTypeSpecificFieldConfigs(replacement) {
        const configs = [];
    
        // Ensure components array exists and has minimum components
        replacement.inlineAutomation.ensureMinimumComponents();
        
        // Generate field configs for each existing component
        const componentCount = replacement.inlineAutomation.getComponentCount();
        
        for (let index = 0; index < componentCount; index++) {
            // Component removal button - triggers config refresh because it changes structure
            if (componentCount > 1) {
                configs.push({
                    id: `remove-component-${index}`,
                    type: 'button',
                    label: '<i class="fas fa-trash"></i>',
                    action: 'remove-component',
                    componentIndex: index,
                    triggersUpdate: 'config-refresh',
                    isComponentField: true
                });
            }
            
            // Component data fields
            configs.push({
                id: `component-${index}-dice`,
                type: 'text',
                label: `Dice`,
                getValue: (r) => {
                    const component = r.inlineAutomation.getComponent(index);
                    return component ? component.dice : '';
                },
                setValue: (r, value) => {
                    r.inlineAutomation.updateComponent(index, { dice: value });
                },
                placeholder: 'e.g., 2d6+3',
                isComponentField: true,
                componentIndex: index,
                componentField: 'dice'
            });
            
            configs.push({
                id: `component-${index}-damage-type`,
                type: 'select',
                label: `Type`,
                options: ConfigManager.DAMAGE_TYPES.options,
                getValue: (r) => {
                    const component = r.inlineAutomation.getComponent(index);
                    return component ? component.damageType : '';
                },
                setValue: (r, value) => {
                    r.inlineAutomation.updateComponent(index, { damageType: value });
                },
                isComponentField: true,
                componentIndex: index,
                componentField: 'damageType'
            });
            
            configs.push({
                id: `component-${index}-damage-category`,
                type: 'select',
                label: `Category`,
                options: ConfigManager.DAMAGE_CATEGORIES.options,
                getValue: (r) => {
                    const component = r.inlineAutomation.getComponent(index);
                    return component ? component.category : '';
                },
                setValue: (r, value) => {
                    r.inlineAutomation.updateComponent(index, { category: value });
                },
                isComponentField: true,
                componentIndex: index,
                componentField: 'category'
            });
        }

        // Add component button - triggers config refresh because it changes structure
        configs.push({
            id: 'add-component',
            type: 'button',
            label: 'Add Damage Partial',
            action: 'add-component',
            triggersUpdate: 'config-refresh'
        });

        // Global fields
        configs.push({
            id: 'area-damage',
            type: 'checkbox',
            label: 'Area Damage',
            notes: 'For automating features like a swarm\'s weakness to area damage.',
            getValue: (r) => r.inlineAutomation.hasOption('area-damage') || false,
            setValue: (r, value) => r.inlineAutomation.setOption('area-damage', value)
        });

        configs.push({
            id: 'healing',
            type: 'checkbox',
            label: 'Healing',
            notes: 'Use with Vitality, Void, or Untyped. Not compatible with Persistent.',
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

// Renderer for Inline Checks and Saves
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
            notes: 'Don\'t include the word "Lore".',
            getValue: (r) => r.inlineAutomation.loreName || '',
            setValue: (r, value) => { r.inlineAutomation.loreName = value; },
            placeholder: 'e.g., Sailing',
            dependsOn: ['check-type'],
            showIf: (r) => r.inlineAutomation.checkType === 'lore'
        });
        
        configs.push({
            id: 'dc-method',
            type: 'select',
            label: 'DC Method',
            notes: '"Origin" is the actor that has this ability. "Target" is the targeted actor when the roll is made.',
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
            notes: 'For automating Bulwark and similar features.',
            getValue: (r) => r.inlineAutomation.hasOption('damaging-effect') || false,
            setValue: (r, value) => r.inlineAutomation.setOption('damaging-effect', value),
            showIf: (r) => r.inlineAutomation.isOptionRelevant('damaging-effect')
        });

        configs.push({
            id: 'area-effect',
            type: 'checkbox',
            label: 'Area Effect',
            notes: 'For automating certain features.',
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

// Renderer for Inline Condition Links
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

// Renderer for Inline Template Links
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

// Renderer for Inline Generic Rolls
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
            notes: 'Leave blank to use Display Text as label.',
            getValue: (r) => r.inlineAutomation.label || '',
            setValue: (r, value) => { r.inlineAutomation.label = value; },
            placeholder: 'e.g., Duration'
        });
        
        configs.push({
            id: 'gm-only',
            type: 'checkbox',
            label: 'GM Only',
            notes: 'Only show the roll to the GM.',
            getValue: (r) => r.inlineAutomation.gmOnly || false,
            setValue: (r, value) => { r.inlineAutomation.gmOnly = value; }
        });

        return configs;
    }

    // Generic rolls don't support traits
    supportsTraits(replacement) {
        return false;
    }
}

// Renderer for Inline Actions
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
            notes: 'Only applicable for actions that involve a check.',
            getValue: (r) => r.inlineAutomation.alternateRollStatistic || 'none',
            setValue: (r, value) => { r.inlineAutomation.alternateRollStatistic = value; },
            options: ConfigManager.ALTERNATE_ROLL_STATISTICS.options
        });

        configs.push({
            id: 'dc-method',
            type: 'select',
            label: 'DC Method',
            notes: '"Target" is the targeted actor when the roll is made.',
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

// Handles injection and management of styles
class CSSManager {
    static STYLE_ID = 'rollconverter-styles';
    static isInjected = false;

    // Inject the centralized CSS into the document head
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
    }

    // Remove the injected CSS (for cleanup)
    static removeStyles() {
        const existingStyle = document.getElementById(this.STYLE_ID);
        if (existingStyle) {
            existingStyle.remove();
            this.isInjected = false;
        }
    }

    // Get the complete CSS for the converter
    static getCSS() {
        return `
            /* ===== FOUNDRY DIALOG OVERRIDES ===== */
            .rollconverter-dialog-window .window-content {
                height: 100%;
                display: flex;
                flex-direction: column;
                padding: 10px;
            }

            /* ===== CONVERTER DIALOG LAYOUT ===== */
            .rollconverter-dialog {
                display: flex;
                flex-direction: row;
                height: 100%;
                min-height: 500px;
                max-height: 700px;
                min-width: 800px;
                gap: 10px;
            }

            .rollconverter-main {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                height: 100%;
                gap: 3px;
            }

            .rollconverter-sidebar {
                width: 300px;
                flex-shrink: 0;
                display: flex;
                flex-direction: column;
                height: 620px;
                gap: 3px;
            }

            .rollconverter-fieldset {
                margin: 0;
            }

            /* ===== MAIN CONTENT SECTIONS ===== */
            .rollconverter-input-section,
            .rollconverter-output-section,
            .rollconverter-preview-section {
                flex: 1;
                display: flex;
                flex-direction: column;
                min-height: 0;
                max-height: 33.33%;
                max-width: 100%;
                margin: 0;
            }

            .rollconverter-section-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                min-height: 0;
                max-height: 200px;
                overflow: hidden;
            }

            .rollconverter-section-content .form-fields {
                flex: 1;
                display: flex;
                flex-direction: column;
                min-height: 0;
                overflow: hidden;
            }

            .rollconverter-input-textarea {
                flex: 1;
                min-height: 100px;
                max-height: 100%;
                resize: none;
                font-family: 'Signika', sans-serif;
                overflow-y: auto;
            }

            .rollconverter-output-area {
                flex: 1;
                min-height: 100px;
                max-height: 100%;
                max-width: 100%;
                overflow-y: auto;
                overflow-x: hidden;
                font-family: 'Signika', sans-serif;
                padding: 2px;
                word-wrap: break-word;
            }

            /* ===== MODIFIER PANEL ===== */
            .rollconverter-modifier-panel {
                flex: 1;
                display: flex;
                flex-direction: column;
                min-height: 0;
                margin: 0;
                height: 100%;
            }

            .rollconverter-modifier-content {
                flex: 1;
                min-height: 0;
                max-height: 100%;
                overflow-y: auto;
                padding-left: 5px;
                padding-right: 5px;
                padding-bottom: 10px;
            }

            /* ===== SIDEBAR CONTROLS ===== */
            .rollconverter-sidebar-controls {
                display: flex;
                gap: 8px;
                flex-shrink: 0;
                margin-top: 7px;
            }

            .rollconverter-control-button {
                flex: 1;
                padding: 8px;
                background: var(--color-button-primary);
                color: var(--color-text-light-primary);
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }

            .rollconverter-control-button:hover {
                background: var(--color-button-primary-hover);
            }

            /* ===== MODIFIER PANEL HEADER CONTROLS ===== */
            .rollconverter-header-controls .form-fields {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 8px;
            }

            .rollconverter-enabled-label {
                display: flex;
                align-items: center;
                gap: 4px;
                margin: 0;
            }

            /* ===== FORM GROUPS ===== */
            .rollconverter-fieldset.rollconverter-modifier-panel {
                padding-left: 5px;
                padding-right: 5px;
                padding-bottom: 0;
            }

            .rollconverter-fieldset p.notes {
                font-size: 12px;
                margin: 4px 0 0 0;
                color: var(--color-text-dark-secondary);
                flex-shrink: 0;
            }

            /* ===== OUTPUT AREAS ===== */
            .rollconverter-output-converted {
                line-height: 1.5;
            }

            .rollconverter-output-placeholder {
                color: #999;
                font-style: italic;
            }

            /* ===== INTERACTIVE ELEMENTS ===== */
            .rollconverter-interactive {
                cursor: pointer;
                background: #dddddd;
                padding: 0 2px;
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

            .rollconverter-trait-tag div {
                margin: 0 1px 0 4px;
            }

            .rollconverter-trait-tag .rollconverter-trait-remove {
                cursor: pointer;
                color: inherit;
                opacity: 0.7;
                font-size: 12px;
                line-height: 1;
                padding: 0 2px;
                border-radius: 2px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }

            .rollconverter-trait-tag .rollconverter-trait-remove:hover {
                opacity: 1;
                background: rgba(211, 47, 47, 0.1);
                color: #d32f2f;
            }

            .rollconverter-trait-tag .rollconverter-trait-text {
                display: inline;
            }

            .rollconverter-traits-dropdown-empty {
                padding: 8px;
                color: #666;
                font-style: italic;
            }

            /* ===== DAMAGE COMPONENT LAYOUT ===== */
            .rollconverter-damage-component {
                background: var(--color-bg-option);
                border: 1px solid var(--color-border-light-secondary);
                border-radius: 4px;
                margin: 8px 0;
                padding: 8px 10px;
            }

            .rollconverter-damage-component legend {
                display: flex;
                gap: 8px;
                justify-content: space-between;
                align-items: center;
                padding: 0 4px;
            }

            /* ===== COMPONENT MANAGEMENT CONTROLS ===== */
            #add-component-container .form-fields {
                display: flex;
                justify-content: right;
            }

            .rollconverter-action-button[data-action="add-component"] {
                min-width: 140px;
                white-space: nowrap;
            }

            .rollconverter-action-button[data-action="remove-component"] {
                background: var(--color-warning);
                color: white;
                font-size: 10px;
                line-height: 10px !important;
                height: 17px !important;
            }

            .rollconverter-action-button[data-action="remove-component"]:hover {
                background: var(--color-danger);
            }

            .rollconverter-damage-component legend .form-group {
                margin-bottom: 0;
                margin-top: 0;
            }
        `;
    }
}

// Handles the generation and management of modifier panels
class ModifierPanelManager {
    // Shared label width for all modifier panel labels
    static labelWidth = '100px';
    
    // Update scope constants for targeted updates
    static UpdateScope = {
        FIELD_ONLY: 'field-only',           // No additional updates needed
        VISIBILITY: 'visibility',           // Update field visibility only
        PANEL_PARTIAL: 'panel-partial',     // Update dependent fields
        PANEL_FULL: 'panel-full',          // Complete panel regeneration (preserves configs)
        CONFIG_REFRESH: 'config-refresh'    // Regenerate configs and full panel (no preservation)
    };
    
    constructor() {        
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
            // Debug logging - only if getValue exists (not for synthetic field configs)
            if (fieldConfig.getValue) {
                const oldValue = fieldConfig.getValue(replacement);
                this.debugFieldUpdate(fieldConfig.id, oldValue, fieldConfig.getValue(replacement), updateScope);
            } else {
                // For synthetic field configs (like component actions), just log the action
                this.debugFieldUpdate(fieldConfig.id, 'synthetic', 'synthetic', updateScope);
            }
            
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
                    
                case ModifierPanelManager.UpdateScope.CONFIG_REFRESH:
                    // Clean refresh: regenerate configs and panel without preservation
                    this.refreshConfigsAndRegeneratePanel(this.currentForm, replacement, onChangeCallback);
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
     * Clean config refresh without state preservation complexity
     * When field configurations need to be regenerated (e.g., after structural changes),
     * we start fresh rather than trying to preserve potentially stale state.
     * 
     * @param {HTMLElement} formElement - The form element
     * @param {Object} replacement - The replacement object
     * @param {Function} onChangeCallback - Callback function
     */
    refreshConfigsAndRegeneratePanel(formElement, replacement, onChangeCallback) {        
        const renderer = this.renderers[replacement.type];
        if (!renderer) return;
        
        // Clean up ALL existing listeners
        this.cleanupEventListeners();
        
        // Generate completely fresh panel HTML
        const panelHTML = this.generatePanelHTML(replacement.type, replacement);
        
        // Replace the entire form content
        formElement.innerHTML = panelHTML;
        
        // Re-setup all event listeners with fresh configurations
        this.addFormListeners(formElement, replacement.type, replacement, onChangeCallback);
        
        // Setup the header controls (including reset button)
        this.setupHeaderControlListeners(formElement, replacement, onChangeCallback);
    }

    /**
     * Setup header control listeners (enabled checkbox and reset button)
     * This method should be called whenever the panel is regenerated
     * @param {HTMLElement} formElement - The form element
     * @param {Object} replacement - The replacement object
     * @param {Function} onChangeCallback - Change callback function
     */
    setupHeaderControlListeners(formElement, replacement, onChangeCallback) {
        // Setup enabled checkbox
        const enabledCheckbox = formElement.querySelector('#enabled');
        if (enabledCheckbox) {
            const listenerKey = `${enabledCheckbox.id}-change`;
            
            // Prevent duplicate listeners
            if (!this.attachedListeners.has(listenerKey)) {
                const listener = (e) => {
                    replacement.enabled = e.target.checked;
                    if (onChangeCallback) {
                        onChangeCallback(replacement, 'enabled');
                    }
                };
                
                enabledCheckbox.addEventListener('change', listener);
                this.attachedListeners.set(listenerKey, { 
                    element: enabledCheckbox, 
                    type: 'change', 
                    listener 
                });
            }
        }
        
        // Setup reset button
        const resetButton = formElement.querySelector('#modifier-reset-btn');
        if (resetButton) {
            const listenerKey = `${resetButton.id}-click`;
            
            // Prevent duplicate listeners
            if (!this.attachedListeners.has(listenerKey)) {
                const listener = () => {
                    replacement.resetToOriginal();
                    if (onChangeCallback) {
                        onChangeCallback(replacement, 'reset');
                    }
                };
                
                resetButton.addEventListener('click', listener);
                this.attachedListeners.set(listenerKey, { 
                    element: resetButton, 
                    type: 'click', 
                    listener 
                });
            }
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
    
        // Return the form content with header controls
        return `
            <form id="${type}-modifier-form" class="rollconverter-modifier-form">
                ${this.renderHeaderControls(rep)}
                ${fields}
            </form>
        `;
    }

    renderHeaderControls(rep) {
        return `
            <div class="form-group rollconverter-header-controls">
                <div class="form-fields">
                    <label class="rollconverter-enabled-label">
                        Enabled
                        <input type="checkbox" id="enabled" class="rollconverter-field-checkbox" ${rep.enabled !== false ? 'checked' : ''}>
                    </label>
                    <button type="button" id="modifier-reset-btn" class="rollconverter-reset-button">Reset</button>
                </div>
            </div>
        `;
    }

    /**
     * Special field rendering for damage components with containers
     */
    renderDamageFields(fieldConfigs, rep) {
        let html = '';
        const processedComponents = new Set();
        
        // Filter out any undefined or invalid configs first
        const validConfigs = fieldConfigs.filter(config => 
            config && typeof config === 'object' && config.id
        );
        
        // Process each field config in order
        validConfigs.forEach(config => {
            if (config.isComponentField && config.componentIndex !== undefined) {
                const componentIndex = config.componentIndex;
                
                // If we haven't processed this component yet, render its container
                if (!processedComponents.has(componentIndex)) {
                    processedComponents.add(componentIndex);
                    
                    // Get all fields for this component
                    const componentFields = validConfigs.filter(cfg => 
                        cfg.isComponentField && cfg.componentIndex === componentIndex
                    );
                    
                    html += this.renderDamageComponentContainer(componentFields, rep, componentIndex);
                }
            } else {
                // Regular field (not part of a component)
                html += this.renderFieldFromConfig(config, rep);
            }
        });
        
        return html;
    }

    /**
     * Render a damage component container with its fields
     */
    renderDamageComponentContainer(componentFields, rep, componentIndex) {
        // Separate data fields from action buttons for this specific component
        const dataFields = componentFields.filter(cfg => 
            cfg.isComponentField && 
            cfg.componentIndex === componentIndex && 
            cfg.componentField !== undefined  // Make sure it's actually a data field
        );
        
        const removeButton = componentFields.find(cfg => 
            cfg.action === 'remove-component' && 
            cfg.componentIndex === componentIndex
        );
        
        const fieldsHtml = dataFields
            .map(config => this.renderFieldFromConfig(config, rep)).join('');
        
        const removeButtonHtml = removeButton ? 
            this.renderFieldFromConfig(removeButton, rep) : '';
        
        return `
            <fieldset class="rollconverter-damage-component">
                <legend>
                    <span>Damage Partial ${componentIndex + 1}</span>
                    ${removeButtonHtml}
                </legend>
                ${fieldsHtml}
            </fieldset>
        `;
    }
    
    renderFieldFromConfig(config, rep) {
        // Handle button fields that don't have getValue functions
        if (config.type === 'button') {
            const options = {
                hidden: config.hideIf && config.hideIf(rep),
                action: config.action,
                componentIndex: config.componentIndex,
                notes: config.notes
            };
            return FieldRenderer.render(config.type, config.id, config.label, null, options);
        }
        
        // Handle regular fields with getValue functions
        if (!config.getValue) {
            console.error(`[ModifierPanelManager] Field config missing getValue function: ${config.id}`);
            return '';
        }
        
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
        
        // CRITICAL FIX: Setup header controls (enabled checkbox and reset button)
        this.setupHeaderControlListeners(formElement, rep, onChangeCallback);
        
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
        // Setup traits inputs
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
        
        // Setup action button listeners for component management
        if (type === 'damage') {
            const actionButtons = formElement.querySelectorAll('.rollconverter-action-button');
            actionButtons.forEach(button => {
                const action = button.dataset.action;
                const componentIndex = button.dataset.componentIndex;
                
                const listenerKey = `${button.id}-click`;
                if (!this.attachedListeners.has(listenerKey)) {
                    const listener = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.handleComponentAction(action, componentIndex, replacement, onChangeCallback);
                    };
                    
                    button.addEventListener('click', listener);
                    this.attachedListeners.set(listenerKey, { 
                        element: button, 
                        type: 'click', 
                        listener 
                    });
                }
            });
        }
    }

    /**
     * Handle component management actions (add/remove)
     * @param {string} action - The action to perform ('add-component' or 'remove-component')
     * @param {string} componentIndex - Index of component (for removal)
     * @param {Object} replacement - The replacement object
     * @param {Function} onChangeCallback - Change callback function
     */
    handleComponentAction(action, componentIndex, replacement, onChangeCallback) {
        let success = false;
        
        switch (action) {
            case 'add-component':
                replacement.inlineAutomation.addComponent();
                success = true;
                break;
                
            case 'remove-component':
                const indexToRemove = parseInt(componentIndex);
                
                success = replacement.inlineAutomation.removeComponent(indexToRemove);
                if (!success) {
                    ui.notifications.warn("Cannot remove the last damage component");
                    return;
                }
                break;
                
            default:
                console.warn(`[ModifierPanelManager] Unknown component action: ${action}`);
                return;
        }
        
        if (success) {
            // Mark the replacement as modified
            if (replacement.markModified) {
                replacement.markModified();
            }
            
            // For structural changes like add/remove, we need a full config refresh
            // This ensures component indices are recalculated correctly
            this.handleFieldUpdate(
                replacement, 
                { 
                    id: action, 
                    triggersUpdate: ModifierPanelManager.UpdateScope.CONFIG_REFRESH 
                }, 
                ModifierPanelManager.UpdateScope.CONFIG_REFRESH, 
                onChangeCallback
            );
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
            } else if (!isChecked && replacement.inlineAutomation.traits.includes(trait)) {
                replacement.inlineAutomation.traits = replacement.inlineAutomation.traits.filter(t => t !== trait);
            }
            
            // Sync with traits input if it exists
            this.syncTraitsInputFromArray(replacement.inlineAutomation.traits);
            
            if (onChangeCallback) {
                onChangeCallback(replacement, `trait-${trait}`);
            }
        };
        
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
            placeholder: '',
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
        } else {
            // Debug: log what containers we actually have
            const allContainers = this.currentForm?.querySelectorAll('[id*="traits"]');
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
            
            // Restore form state (this works because configs are preserved)
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
                fieldConfig.setValue(replacement, '');
                selectElement.value = '';
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

// Central state management for the PF2e Converter
class ConverterDialog {
    constructor() {
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
        this.processor = new TextProcessor();
        this.modifierManager = new ModifierPanelManager();
        
        // DOM element references
        this.ui = {};
    }
    
    /**
     * Update replacements and trigger UI updates
     * @param {Array} newReplacements - Array of replacement objects
     */
    updateReplacements(newReplacements) {
        this.data.replacements = newReplacements;
        this.renderOutput();
        this.renderLivePreview();
    }
    
    /**
     * Handle element selection and modifier panel updates
     * @param {string} elementId - ID of the selected element
     */
    selectElement(elementId) {
        this.data.selectedElementId = elementId;
        this.renderModifierPanel();
        this.updateElementHighlighting();
    }
    
    /**
     * Handle element deselection and modifier panel updates
     */
    deselectElement() {
        this.data.selectedElementId = null;
        this.renderModifierPanel();
        this.updateElementHighlighting();
    }
    
    /**
     * Process input text and generate replacements
     * @param {string} inputText - Text to process
     */
    processInput(inputText) {
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
        if (this.modifierManager) {
            this.modifierManager.cleanupEventListeners();
        }
        this.data.selectedElementId = null;
    }

    /**
     * Clear all state and reset UI
     */
    clearAll() {
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
        // Use formatting applied, HTML not escaped for copying
        const outputText = this.processor.renderFromReplacements(
            this.data.inputText, 
            this.data.replacements, 
            false, // interactive = false
            this.data,
            true,  // applyFormatting = true
            false  // escapeHtml = false
        );
        copyToClipboard(outputText);
    }
    
    /**
     * Render the converted output
     */
    renderOutput() {
        if (!this.data.isInitialized) {
            return;
        }
        
        // Get the output with formatting applied and HTML escaped, plus interactive elements
        const outputText = this.processor.renderFromReplacements(
            this.data.inputText, 
            this.data.replacements, 
            true,  // interactive = true (to get clickable elements)
            this.data, 
            true,  // applyFormatting = true
            true   // escapeHtml = true (to show formatting tags as text)
        );
        
        // Store the raw version for copying (formatting applied, HTML not escaped)
        this.data.lastRawOutput = this.processor.renderFromReplacements(
            this.data.inputText, 
            this.data.replacements, 
            false, // interactive = false
            this.data,
            true,  // applyFormatting = true
            false  // escapeHtml = false
        );
        
        if (this.ui.outputHtmlDiv) {
            this.ui.outputHtmlDiv.innerHTML = `<div class="rollconverter-output-formatted">${outputText}</div>`;
            this.setupInteractiveElementHandlers();
        }
    }
    
    /**
     * Escape HTML for display
     * @param {string} html - HTML to escape
     * @returns {string} Escaped HTML
     */
    escapeHtml(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }
    
    /**
     * Render the live preview
     */
    renderLivePreview() {
        if (!this.data.isInitialized) {
            return;
        }
        
        // Use formatting applied, HTML not escaped for live preview
        const outputText = this.processor.renderFromReplacements(
            this.data.inputText, 
            this.data.replacements, 
            false, // interactive = false
            this.data,
            true,  // applyFormatting = true
            false  // escapeHtml = false
        );
        
        if (this.ui.livePreview) {
            createLivePreview(outputText, this.ui.livePreview);
        }
    }
    
    /**
     * Render the modifier panel
     */
    renderModifierPanel() {
        if (!this.data.isInitialized) {
            return;
        }
        
        const selectedElementId = this.data.selectedElementId;
        
        // Update the title in the legend
        const titleElement = document.querySelector('.rollconverter-modifier-title');
        
        if (selectedElementId && this.data.interactiveElements[selectedElementId]) {
            const rep = this.data.interactiveElements[selectedElementId];
            const renderer = this.modifierManager.renderers[rep.type];
            const title = renderer ? renderer.getTitle(rep) : 'Unknown Type';
            
            if (titleElement) {
                titleElement.textContent = title;
            }
            
            const panelHTML = this.modifierManager.generatePanelHTML(rep.type, rep);
            
            if (this.ui.modifierPanelContent) {
                this.ui.modifierPanelContent.innerHTML = panelHTML;
                this.setupModifierPanelHandlers(rep);
            }
        } else {
            if (titleElement) {
                titleElement.textContent = 'Modifier Panel';
            }
            
            if (this.ui.modifierPanelContent) {
                this.ui.modifierPanelContent.innerHTML = '<p>Select an element to modify.</p>';
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
            // Setup form listeners - this now includes header controls
            this.modifierManager.addFormListeners(
                formElement, 
                rep.type, 
                rep, 
                (modifiedRep, changedFieldId) => this.handleModifierChange(modifiedRep, changedFieldId)
            );
        }
    }
    
    /**
     * Setup interactive element handlers for the output area
     */
    setupInteractiveElementHandlers() {
        if (!this.ui.outputHtmlDiv) {
            console.log('[PF2e Converter] No output element found');
            return;
        }
        
        const interactiveElements = this.ui.outputHtmlDiv.querySelectorAll('.rollconverter-interactive');
        
        interactiveElements.forEach(element => {
            const elementId = element.getAttribute('data-id');
            if (elementId) {
                // Remove any existing click handlers to prevent duplicates
                element.style.cursor = 'pointer';
                
                // Use a new event handler each time
                element.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Toggle selection: deselect if already selected, select if not
                    if (this.data.selectedElementId === elementId) {
                        this.deselectElement();
                    } else {
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
        if (rep.markModified) {
            rep.markModified();
        }
        
        // Re-render everything to reflect changes
        this.renderOutput();
        this.renderLivePreview();
        this.updateElementHighlighting();
        
        // Special handling for reset - regenerate the modifier panel
        if (changedFieldId === 'reset') {
            this.renderModifierPanel();
        }
    }
    
    /**
     * Setup all event handlers
     */
    setupEventHandlers() {
        this.setupInputHandlers();
        this.setupButtonHandlers();
    }
    
    /**
     * Setup input handlers
     */
    setupInputHandlers() {
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
     * Setup formatting options handlers
     */
    setupFormattingHandlers() {
        const removeLineBreaksCheckbox = document.getElementById('remove-line-breaks');
        const htmlFormattingCheckbox = document.getElementById('html-formatting');
        
        if (removeLineBreaksCheckbox) {
            removeLineBreaksCheckbox.addEventListener('change', (e) => {
                const isEnabled = e.target.checked;
                this.processor.formattingRules.setCategoryEnabled(
                    FormattingRule.CATEGORIES.TEXT, 
                    isEnabled
                );
                
                // Re-render output and preview
                this.renderOutput();
                this.renderLivePreview();
            });
        }
        
        if (htmlFormattingCheckbox) {
            htmlFormattingCheckbox.addEventListener('change', (e) => {
                const isEnabled = e.target.checked;
                this.processor.formattingRules.setCategoryEnabled(
                    FormattingRule.CATEGORIES.HTML, 
                    isEnabled
                );
                
                // Re-render output and preview
                this.renderOutput();
                this.renderLivePreview();
            });
        }
    }
    
    /**
     * Initialize UI references
     * @param {Object} html - jQuery object containing the dialog HTML
     */
    initializeUI(html) {
        this.ui.inputTextarea = html.find('#input-text');
        this.ui.outputHtmlDiv = html.find('#output-html')[0];
        this.ui.livePreview = html.find('#live-preview')[0];
        this.ui.modifierPanelContent = html.find('#modifier-panel-content')[0];
        this.ui.copyButton = html.find('#copy-output');
        this.ui.clearButton = html.find('#clear-all');
        this.ui.formattingOptionsContent = html.find('#formatting-options-form')[0];
        
        // Generate formatting options HTML using FieldRenderer
        this.renderFormattingOptions();
        
        // Process initial input if present
        const initialText = this.ui.inputTextarea.val();
        if (initialText && initialText.trim()) {
            this.data.inputText = initialText;
        }
        else {
            this.data.inputText = '';
        }
    
        this.data.isInitialized = true;
        this.processInput(this.data.inputText);
    }

    /**
     * Render formatting options using FieldRenderer for consistency
     */
    renderFormattingOptions() {
        if (!this.ui.formattingOptionsContent) return;
        
        // Use FieldRenderer to create consistent checkbox styling
        const removeLineBreaksHtml = FieldRenderer.render(
            'checkbox', 
            'remove-line-breaks', 
            'Remove Line Breaks', 
            true // checked by default
        );
        
        const htmlFormattingHtml = FieldRenderer.render(
            'checkbox', 
            'html-formatting', 
            'HTML Formatting', 
            true // checked by default
        );
        
        this.ui.formattingOptionsContent.innerHTML = removeLineBreaksHtml + htmlFormattingHtml;
        
        // Setup event handlers after rendering
        this.setupFormattingHandlers();
    }
}

// ConfigCategory is a class that represents a category of items.
// It provides these items in various formats for use in
// the UI, Pattern regex, and other systems.
class ConfigCategory {
    constructor(items, customLabels = {}, metadata = {}, alternates = {}) {
        this.slugs = items; // Only canonical forms - used for UI
        this.metadata = metadata;
        this.alternates = alternates; // Alternates for pattern matching only
        
        // Lazy initialization
        this._options = null;
        this._pattern = null;
        this._patternWithAlternates = null;
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

    // Original pattern - only canonical forms
    get pattern() {
        if (this._pattern === null) {
            this._pattern = this.slugs
                .map(item => this._unslug(item))
                .filter(item => item !== '')
                .sort((a, b) => b.length - a.length)
                .map(item => this.escapeRegex(item))
                .join('|');
        }
        return this._pattern;
    }

    // Enhanced pattern - includes alternates for matching
    get patternWithAlternates() {
        if (this._patternWithAlternates === null) {
            const allForms = [];
            
            // Add canonical forms
            this.slugs.forEach(item => {
                const unsluggedBase = this._unslug(item);
                allForms.push(unsluggedBase);
            });
            
            // Add alternates for pattern matching
            Object.entries(this.alternates).forEach(([baseItem, alternateList]) => {
                if (this.slugs.includes(baseItem)) {
                    alternateList.forEach(alternate => {
                        allForms.push(alternate);
                    });
                }
            });
            
            this._patternWithAlternates = allForms
                .filter(form => form !== '')
                .sort((a, b) => b.length - a.length) // Longest first
                .map(form => this.escapeRegex(form))
                .join('|');
        }
        return this._patternWithAlternates;
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Method to find canonical form from an alternate
    findCanonicalForm(text) {
        const normalizedText = text.toLowerCase().trim();
        
        // First check if it's already a canonical form
        for (const item of this.slugs) {
            const canonical = this._unslug(item).toLowerCase();
            if (normalizedText === canonical) {
                return item;
            }
        }
        
        // Then check alternates
        for (const [baseItem, alternateList] of Object.entries(this.alternates)) {
            if (this.slugs.includes(baseItem)) {
                for (const alternate of alternateList) {
                    if (normalizedText === alternate.toLowerCase()) {
                        return baseItem;
                    }
                }
            }
        }
        
        return null; // Not found
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

// Manages the conversion of legacy damage types and conditions to remaster equivalents
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

// Stores the configuration of the converter, including damage types,
// conditions, skills, saves, statistics, template types, actions,
// action variants, healing terms, and legacy conditions.
class ConfigManager {
    // Private cache for memoization
    static _cache = new Map();
    
    // ===== DAMAGE =====
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

    // ===== CONDITIONS =====
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

    // ===== CHECKS AND SAVES =====
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
        if (!this._cache.has('ACTION_DC_METHODS')) {
            this._cache.set('ACTION_DC_METHODS', new ConfigCategory(
                ['none', 'static', 'target'],
                {
                    none: 'No DC',
                    static: 'Static DC',
                    target: 'Target\'s Statistic'
                }
            ));
        }
        return this._cache.get('ACTION_DC_METHODS');
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

    // Template mapping
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
    static get ACTION_DEFINITIONS() {
        if (!this._cache.has('ACTION_DEFINITIONS')) {
            const definitions = {
                'administer-first-aid': {
                    alternates: [ 'administer first aid', 'administers first aid', 'administered first aid', 'administering first aid' ],
                    variants: ['stabilize', 'stop-bleeding'] },
                'affix-a-talisman': {
                    alternates: [ 'affix a talisman', 'affixes a talisman', 'affixed a talisman', 'affixing a talisman' ] },
                'aid': {
                    alternates: [ 'aid', 'aids', 'aided', 'aiding' ] },
                'arrest-a-fall': {
                    alternates: [ 'arrest a fall', 'arrests a fall', 'arrested a fall', 'arresting a fall' ] },
                'avert-gaze': {
                    alternates: [
                        'avert gaze', 'averts gaze', 'averted gaze', 'averting gaze',
                        'avert its gaze', 'averts its gaze', 'averted its gaze', 'averting its gaze',
                        'avert their gaze', 'averts their gaze', 'averted their gaze', 'averting their gaze' ] },
                'avoid-notice': {
                    alternates: [ 'avoid notice', 'avoids notice', 'avoided notice', 'avoiding notice' ] },
                'balance': {
                    alternates: [ 'balance', 'balances', 'balanced', 'balancing' ] },
                'burrow': {
                    alternates: [ 'burrow', 'burrows', 'burrowed', 'burrowing' ] },
                'climb': {
                    alternates: [ 'climb', 'climbs', 'climbed', 'climbing' ] },
                'coerce': {
                    alternates: [ 'coerce', 'coerces', 'coerced', 'coercing' ] },
                'command-an-animal': {
                    alternates: [ 'command an animal', 'commands an animal', 'commanded an animal', 'commanding an animal' ] },
                'conceal-an-object': {
                    alternates: [ 'conceal an object', 'conceals an object', 'concealed an object', 'concealing an object' ] },
                'crawl': {
                    alternates: [ 'crawl', 'crawls', 'crawled', 'crawling' ] },
                'create-a-diversion': {
                    alternates: [ 'create a diversion', 'creates a diversion', 'created a diversion', 'creating a diversion' ],
                    variants: ['distracting-words', 'gesture', 'trick'] },
                'create-forgery': {
                    alternates: [
                        'create forgery', 'creates forgery', 'created forgery', 'creating forgery',
                        'create a forgery', 'creates a forgery', 'created a forgery', 'creating a forgery'
                    ] },
                'decipher-writing': {
                    alternates: [ 'decipher writing', 'deciphers writing', 'deciphered writing', 'deciphering writing' ] },
                'delay': {
                    alternates: [ 'delay', 'delays', 'delayed', 'delaying' ] },
                'demoralize': {
                    alternates: [ 'demoralize', 'demoralizes', 'demoralized', 'demoralizing' ] },
                'disable-device': {
                    alternates: [
                        'disable device', 'disables device', 'disabled device', 'disabling device',
                        'disable a device', 'disables a device', 'disabled a device', 'disabling a device'
                    ] },
                'disarm': {
                    alternates: [ 'disarm', 'disarms', 'disarmed', 'disarming' ] },
                'dismiss': {
                    alternates: [ 'dismiss', 'dismisses', 'dismissed', 'dismissing' ] },
                'drop-prone': {
                    alternates: [ 'drop prone', 'drops prone', 'dropped prone', 'dropping prone' ] },
                'escape': {
                    alternates: [ 'escape', 'escapes', 'escaped', 'escaping' ] },
                'feint': { 
                    alternates: [ 'feint', 'feints', 'feinted', 'feinting' ] },
                'fly': {
                    alternates: [ 'fly', 'flies', 'flew', 'flying' ] },
                'force-open': {
                    alternates: [ 'force open', 'forces open', 'forced open', 'forcing open' ] },
                'gather-information': { 
                    alternates: [ 'gather information', 'gathers information', 'gathered information', 'gathering information' ] },
                'grab-an-edge': {
                    alternates: [ 'grab an edge', 'grabs an edge', 'grabbed an edge', 'grabbing an edge' ] },
                'grapple': {
                    alternates: [ 'grapple', 'grapples', 'grappled', 'grappling' ] },
                'hide': {
                    alternates: [ 'hide', 'hides', 'hid', 'hiding' ] },
                'high-jump': {
                    alternates: [ 'high jump', 'high jumps', 'high jumped', 'high jumping' ] },
                'identify-alchemy': {
                    alternates: [ 'identify alchemy', 'identifies alchemy', 'identified alchemy', 'identifying alchemy' ] },
                'identify-magic': {
                    alternates: [ 'identify magic', 'identifies magic', 'identified magic', 'identifying magic' ] },
                'impersonate': {
                    alternates: [ 'impersonate', 'impersonates', 'impersonated', 'impersonating' ] },
                'interact': {
                    alternates: [ 'interact', 'interacts', 'interacted', 'interacting' ] },
                'leap': { 
                    alternates: [ 'leap', 'leaps', 'leaped', 'leaping' ] },
                'learn-a-spell': {
                    alternates: [ 'learn a spell', 'learns a spell', 'learned a spell', 'learning a spell' ] },
                'lie': {
                    alternates: [ 'lie', 'lies', 'lied', 'lying' ] },
                'long-jump': {
                    alternates: [ 'long jump', 'long jumps', 'long jumped', 'long jumping' ] },
                'make-an-impression': {
                    alternates: [ 'make an impression', 'makes an impression', 'made an impression', 'making an impression' ] },
                'maneuver-in-flight': {
                    alternates: [ 'maneuver in flight', 'maneuvers in flight', 'maneuvered in flight', 'maneuvering in flight' ] },
                'mount': {
                    alternates: [ 'mount', 'mounts', 'mounted', 'mounting' ] },
                'palm-an-object': {
                    alternates: [ 'palm an object', 'palms an object', 'palmed an object', 'palming an object' ] },
                'perform': {
                    alternates: [ 'perform', 'performs', 'performed', 'performing' ],
                    variants: ['acting', 'comedy', 'dance', 'keyboards', 'oratory', 'percussion', 'singing', 'strings', 'winds'] },
                'pick-a-lock': {
                    alternates: [ 'pick a lock', 'picks a lock', 'picked a lock', 'picking a lock' ] },
                'point-out': {
                    alternates: [ 'point out', 'points out', 'pointed out', 'pointing out' ] },
                'ready': {
                    alternates: [ 'ready', 'readies', 'readied', 'readying' ] },
                'recall-knowledge': { 
                    alternates: [ 'recall knowledge', 'recalls knowledge', 'recalled knowledge', 'recalling knowledge' ] },
                'release': {
                    alternates: [ 'release', 'releases', 'released', 'releasing' ] },
                'reposition': {
                    alternates: [ 'reposition', 'repositions', 'repositioned', 'repositioning' ] },
                'request': {
                    alternates: [ 'request', 'requests', 'requested', 'requesting' ] },
                'seek': {
                    alternates: [ 'seek', 'seeks', 'sought', 'seeking' ] },
                'sense-direction': {
                    alternates: [ 'sense direction', 'senses direction', 'sensed direction', 'sensing direction' ] },
                'sense-motive': {
                    alternates: [ 'sense motive', 'senses motive', 'sensed motive', 'sensing motive' ] },
                'shove': {
                    alternates: [ 'shove', 'shoves', 'shoved', 'shoving' ] },
                'sneak': {
                    alternates: [ 'sneak', 'sneaks', 'sneaked', 'sneaking' ] },
                'squeeze': {
                    alternates: [ 'squeeze', 'squeezes', 'squeezed', 'squeezing' ] },
                'stand': {
                    alternates: [ 'stand', 'stands', 'stood', 'standing' ] },
                'steal': {
                    alternates: [ 'steal', 'steals', 'stole', 'stealing' ] },
                'step': {
                    alternates: [ 'step', 'steps', 'stepped', 'stepping' ] },
                'stride': {
                    alternates: [ 'stride', 'strides', 'strided', 'strode', 'striding' ] },
                'subsist': {
                    alternates: [ 'subsist', 'subsists', 'subsisted', 'subsisting' ] },
                'sustain': {
                    alternates: [ 'sustain', 'sustains', 'sustained', 'sustaining' ] },
                'swim': {
                    alternates: [ 'swim', 'swims', 'swam', 'swimming' ] },
                'take-cover': {
                    alternates: [ 'take cover', 'takes cover', 'took cover', 'taken cover', 'taking cover' ] },
                'track': {
                    alternates: [ 'track', 'tracks', 'tracked', 'tracking' ] },
                'treat-disease': {
                    alternates: [
                        'treat disease', 'treats disease', 'treated disease', 'treating disease',
                        'treat a disease', 'treats a disease', 'treated a disease', 'treating a disease'
                    ] },
                'treat-poison': {
                    alternates: [
                        'treat poison', 'treats poison', 'treated poison', 'treating poison',
                        'treat a poison', 'treats a poison', 'treated a poison', 'treating a poison'
                    ] },
                'trip': {
                    alternates: [ 'trip', 'trips', 'tripped', 'tripping' ] },
                'tumble-through': {
                    alternates: [ 'tumble through', 'tumbles through', 'tumbled through', 'tumbling through' ] },
                'exploit-vulnerability': {
                    alternates: [ 'exploit vulnerability', 'exploits vulnerability', 'exploited vulnerability', 'exploiting vulnerability' ] },
                'daring-swing': {
                    alternates: [ 'daring swing', 'daring swings', 'daring swung', 'daring swinging' ] },
                'haughty-correction': {
                    alternates: [ 'haughty correction', 'haughty corrections', 'haughty corrected', 'haughty correcting' ] },
                'entrap-confession': {
                    alternates: [ 'entrap confession', 'entraps confession', 'entraped confession', 'entrapping confession' ] }
            };

            this._cache.set('ACTION_DEFINITIONS', definitions);
        }
        return this._cache.get('ACTION_DEFINITIONS');
    }

    static get ACTIONS() {
        if (!this._cache.has('ACTIONS')) {
            const definitions = this.ACTION_DEFINITIONS;
            
            // Extract canonical action names
            const canonicalActions = Object.keys(definitions);
            
            // Extract alternates for pattern matching
            const actionAlternates = {};
            Object.entries(definitions).forEach(([action, config]) => {
                if (config.alternates) {
                    actionAlternates[action] = config.alternates;
                }
            });

            this._cache.set('ACTIONS', new ConfigCategory(
                canonicalActions,
                {}, // custom labels
                {}, // metadata  
                actionAlternates // alternates for pattern matching
            ));
        }
        return this._cache.get('ACTIONS');
    }

    static get ACTION_VARIANTS() {
        if (!this._cache.has('ACTION_VARIANTS')) {
            const definitions = this.ACTION_DEFINITIONS;
            const variants = {};
            
            Object.entries(definitions).forEach(([action, config]) => {
                if (config.variants) {
                    variants[action] = new ConfigCategory(config.variants);
                }
            });

            this._cache.set('ACTION_VARIANTS', variants);
        }
        return this._cache.get('ACTION_VARIANTS');
    }

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
    }
}

// ==================== PATTERNS ====================
// Classes that define the patterns that the macro will match and replace
// Each pattern includes regex for matching, and logic for extracting parameters,

// Base class for all patterns
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

// Pattern that recognizes existing automation syntax
// so that it can be recreated
class AutomationPattern extends BasePattern {
    static type = 'automation';
    static priority = 200;
    static description = 'Existing automation syntax detection';

    static EXTRACTORS = {
        damage: (match, pattern) => AutomationPattern.extractGenericParameters(match, 'damage'),
        check: (match, pattern) => AutomationPattern.extractGenericParameters(match, 'check'),
        template: (match, pattern) => AutomationPattern.extractGenericParameters(match, 'template'),
        generic: (match, pattern) => AutomationPattern.extractGenericParameters(match, 'generic'),
        action: (match, pattern) => AutomationPattern.extractGenericParameters(match, 'action'),
        condition: (match, pattern) => AutomationPattern.extractGenericParameters(match, 'condition')
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

    /**
     * Generic parameter extraction method
     * @param {Array} match - Regex match array
     * @param {string} type - The automation type (damage, check, template, etc.)
     * @returns {Object|null} Extracted parameters or null to skip
     */
    static extractGenericParameters(match, type) {
        // Get the appropriate handler for this type
        const handler = this.PARAMETER_HANDLERS[type];
        if (!handler) {
            console.warn(`[AutomationPattern] No handler found for type: ${type}`);
            return null;
        }

        // Use the handler to process the raw match directly
        // Each handler knows how to parse its own syntax
        return handler.call(this, match);
    }

    /**
     * Generic parameter segment parser with configurable separators
     * @param {string} paramContent - The parameter content string
     * @param {Object} options - Configuration options for parsing
     * @param {string} options.segmentSeparator - Character to split segments (default: '|')
     * @param {string} options.keyValueSeparator - Character to split key-value pairs (default: ':')
     * @returns {Object} Object with main value, parameters, options, traits, and flags
     */
    static parseParameterSegments(paramContent, options = {}) {
        const {
            segmentSeparator = '|',
            keyValueSeparator = ':'
        } = options;

        if (!paramContent || typeof paramContent !== 'string') {
            return { main: '', parameters: {}, options: [], traits: [], flags: [] };
        }

        const segments = paramContent.split(segmentSeparator).map(s => s.trim()).filter(s => s !== '');
        const result = {
            main: '',
            parameters: {},
            options: [],
            traits: [],
            flags: []
        };

        // First segment is typically the main identifier (unless it has a key-value separator)
        if (segments.length > 0 && !segments[0].includes(keyValueSeparator)) {
            result.main = segments[0];
            segments.shift(); // Remove first segment as we've processed it
        }

        // Process remaining segments by their prefixes
        segments.forEach(segment => {
            const separatorIndex = segment.indexOf(keyValueSeparator);
            
            if (separatorIndex > 0) {
                // Has prefix (e.g., "dc:20", "variant=stop-bleeding", "options:area-damage,basic")
                const prefix = segment.substring(0, separatorIndex).toLowerCase();
                const content = segment.substring(separatorIndex + 1);
                
                // Handle special multi-value parameters
                if (prefix === 'options') {
                    const values = content.split(',')
                        .map(v => v.trim().toLowerCase())
                        .filter(v => v.length > 0);
                    result.options.push(...values);
                } else if (prefix === 'traits') {
                    const values = content.split(',')
                        .map(v => v.trim().toLowerCase())
                        .filter(v => v.length > 0);
                    result.traits.push(...values);
                } else {
                    // Single-value parameter
                    result.parameters[prefix] = content;
                }
            } else {
                // No separator - treat as flag (e.g., "basic", "secret")
                const flag = segment.toLowerCase();
                result.flags.push(flag);
            }
        });

        return result;
    }

    /**
     * Parse parameter list from parameter content (backward compatibility)
     * @param {string} paramContent - The parameter content to search
     * @param {string} paramType - The parameter type ('options' or 'traits')
     * @returns {Array} Array of parsed parameter values
     */
    static parseParameterList(paramContent, paramType) {
        if (!paramContent || typeof paramContent !== 'string') {
            return [];
        }
        
        // Create regex pattern for the parameter type (e.g., "options:" or "traits:")
        const paramPattern = new RegExp(`${paramType}:\\s*([^|\\]]*?)(?:\\||$)`, 'i');
        const paramMatch = paramContent.match(paramPattern);
        
        if (!paramMatch || paramMatch[1] === undefined) {
            return [];
        }
        
        // Split by comma, trim, convert to lowercase, and filter empty values
        const raw = paramMatch[1]
            .split(',')
            .map((item) => item.trim().toLowerCase())
            .filter((item) => item.length > 0);
        
        // Deduplicate while preserving order
        return raw.filter((item, index) => raw.indexOf(item) === index);
    }

    /**
     * Parameter handlers for each automation type
     * Each handler receives the raw match and handles its own syntax parsing
     */
    static PARAMETER_HANDLERS = {
        damage: function(match) {
            const paramContent = match[1] || '';
            const displayText = match[2] || '';
            
            const result = {
                components: [],
                options: [],
                healing: /healing/.test(paramContent),
                displayText: displayText
            };

            // Parse options from pipe-delimited segments (only for options, not damage components)
            result.options = this.parseParameterList(paramContent, 'options');

            // Parse damage components from the parameter content
            const dicePattern = /(\d+(?:d\d+)?(?:[+-]\d+)?)/g;
            const diceMatches = [...paramContent.matchAll(dicePattern)];

            if (diceMatches.length === 0) return result;

            // Create component boundaries based on dice positions
            const componentBoundaries = this.createComponentBoundaries(diceMatches, paramContent);

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
        },

        check: function(match) {
            const paramContent = match[1] || '';
            const displayText = match[2] || '';
            
            // Parse pipe-delimited segments with colon separators for checks
            const segments = this.parseParameterSegments(paramContent, {
                segmentSeparator: '|',
                keyValueSeparator: ':'
            });
            
            const result = {
                checkType: segments.main || 'flat',
                dcMethod: 'none',
                dc: null,
                statistic: '',
                basic: segments.flags.includes('basic'),
                options: segments.options,
                traits: segments.traits,
                displayText: displayText
            };

            // Handle DC method and value
            if (segments.parameters.dc) {
                result.dcMethod = 'static';
                const dcValue = parseInt(segments.parameters.dc);
                result.dc = Number.isFinite(dcValue) ? dcValue : null;
            } else if (segments.parameters.against) {
                result.dcMethod = 'target';
                result.statistic = segments.parameters.against;
            }

            return result;
        },

        template: function(match) {
            const paramContent = match[1] || '';
            const displayText = match[2] || '';
            
            // Parse pipe-delimited segments with colon separators for templates
            const segments = this.parseParameterSegments(paramContent, {
                segmentSeparator: '|',
                keyValueSeparator: ':'
            });
            
            const result = {
                templateType: null,
                distance: null,
                width: 5,
                displayText: displayText
            };

            // Find template type - could be in main or type parameter
            result.templateType = segments.parameters.type || segments.main;
            
            // Get distance
            if (segments.parameters.distance) {
                const distanceValue = parseInt(segments.parameters.distance);
                if (Number.isFinite(distanceValue)) {
                    result.distance = distanceValue;
                }
            }

            // Get width
            if (segments.parameters.width) {
                const widthValue = parseInt(segments.parameters.width);
                if (Number.isFinite(widthValue)) {
                    result.width = widthValue;
                }
            }

            // Validate required fields
            if (result.templateType === null || result.distance === null) {
                return null;
            }

            // Convert alternate template types to standard types
            const standardType = ConfigManager.TEMPLATE_CONFIG.getStandardType(result.templateType);
            if (standardType) {
                result.templateType = standardType;
            }

            return result;
        },

        condition: function(match) {
            const uuid = match[1] || '';
            const displayText = match[2] || '';
            
            // Validate that this UUID is actually a condition
            const conditionName = this.extractConditionNameFromUUID(uuid);
            
            if (!conditionName) {
                return null; // Not a condition UUID
            }
            
            // Extract value from display text if present
            const value = this.extractConditionValueFromDisplayText(displayText);
            
            return {
                condition: conditionName,
                value: value,
                uuid: uuid,
                displayText: displayText
            };
        },

        generic: function(match) {
            const dice = (match[1] || '').trim();
            const label = (match[2] || '').trim() || '';
            const displayText = match[3] || '';
            const gmOnly = /\[\[\/gmr/i.test(match[0] || '');
            
            return {
                dice: dice,
                label: label,
                gmOnly: gmOnly,
                displayText: displayText
            };
        },

        action: function(match) {
            const paramContent = match[1] || '';
            const displayText = match[2] || '';
            
            // Actions use space-separated key=value pairs
            const segments = this.parseParameterSegments(paramContent, {
                segmentSeparator: ' ',
                keyValueSeparator: '='
            });
            
            const result = {
                action: segments.main || 'grapple',
                variant: '',
                dcMethod: 'none',
                dc: null,
                statistic: '',
                alternateRollStatistic: 'none',
                displayText: displayText
            };

            // Handle variant parameter
            if (segments.parameters.variant) {
                result.variant = segments.parameters.variant;
            }

            // Handle DC parameter
            if (segments.parameters.dc) {
                const dcValue = segments.parameters.dc;
                if (/^\d+$/.test(dcValue)) {
                    result.dcMethod = 'static';
                    result.dc = parseInt(dcValue);
                } else {
                    result.dcMethod = 'target';
                    result.statistic = dcValue;
                }
            }

            // Handle statistic parameter
            if (segments.parameters.statistic) {
                result.alternateRollStatistic = segments.parameters.statistic;
            }

            return result;
        }
    };

    // Helper methods for handlers
    static createComponentBoundaries(diceMatches, paramContent) {
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
        
        return componentBoundaries;
    }

    // Keep existing helper methods
    static findDamageTypeInComponent(componentText) {
        const lowerText = componentText.toLowerCase();
        
        for (const damageType of ConfigManager.ALL_DAMAGE_TYPES.slugs) {
            if (damageType && lowerText.includes(damageType)) {
                return LegacyConversionManager.convertLegacyDamageType(damageType);
            }
        }
        
        return 'untyped';
    }

    static findDamageCategoryInComponent(componentText) {
        const lowerText = componentText.toLowerCase();
        
        for (const category of ConfigManager.DAMAGE_CATEGORIES.slugs) {
            if (category && lowerText.includes(category)) {
                return category;
            }
        }
        
        return '';
    }

    static extractConditionNameFromUUID(uuid) {
        const conditions = ConfigManager.CONDITIONS;
        
        for (const [conditionSlug, conditionUUID] of Object.entries(conditions.metadata.uuids)) {
            if (conditionUUID === uuid) {
                return conditionSlug;
            }
        }
        
        return null;
    }

    static extractConditionValueFromDisplayText(displayText) {
        if (!displayText) return null;
        
        const numberMatch = displayText.match(/(\d+)/);
        return numberMatch ? parseInt(numberMatch[1]) : null;
    }
}

// Pattern that matches damage rolls
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
            regex: new RegExp(`((?:\\d+(?:d\\d+)?(?:[+-]\\d+)?\\s+(?:(?:persistent\\s+)?(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})(?:\\s+(?:persistent|splash|precision))?|(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})\\s+(?:splash|precision)|(?:splash|precision)\\s+(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})|(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern}))(?:\\s+damage)?(?:\\s*,\\s*|\\s*,\\s*and\\s*|\\s*,\\s*plus\\s*|\\s+and\\s+|\\s+plus\\s+))*\\d+(?:d\\d+)?(?:[+-]\\d+)?\\s+(?:(?:persistent\\s+)?(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})(?:\\s+(?:persistent|splash|precision))?|(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})\\s+(?:splash|precision)|(?:splash|precision)\\s+(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern})|(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern}))(?:\\s+damage)?)`, 'gi'),
            priority: 110,
            extractor: 'multi'
        },
        // Single damage pattern (handles persistent, splash, precision)
        {
            regex: new RegExp(`(\\d+(?:d\\d+)?(?:[+-]\\d+)?)\\s+(?:(?:persistent\\s+(${ConfigManager.ALL_DAMAGE_TYPES.pattern})|(${ConfigManager.ALL_DAMAGE_TYPES.pattern})\\s+(?:persistent|splash|precision))|(?:(${ConfigManager.ALL_DAMAGE_TYPES.pattern})\\s+(splash|precision))|(?:(splash|precision)\\s+(${ConfigManager.ALL_DAMAGE_TYPES.pattern})))(?:\\s+damage)?`, 'gi'),
            priority: 100,
            extractor: 'single'
        },
        // Untyped damage with categories or "damage" keyword
        {
            regex: new RegExp(`(\\d+(?:d\\d+)?(?:[+-]\\d+)?)\\s+(?:(persistent|splash|precision)\\s+)?damage`, 'gi'),
            priority: 95,
            extractor: 'single'
        },
        // Category-only damage (without "damage" keyword)
        {
            regex: new RegExp(`(\\d+(?:d\\d+)?(?:[+-]\\d+)?)\\s+(persistent|splash|precision)(?!\\s+(?:${ConfigManager.ALL_DAMAGE_TYPES.pattern}))`, 'gi'),
            priority: 90,
            extractor: 'single'
        }
    ];

    static extractMultiDamageParameters(match) {
        // Parse multiple damage components from the match
        const singlePattern = new RegExp(`(\\d+(?:d\\d+)?(?:[+-]\\d+)?)\\s+(?:(?:persistent\\s+)?(?:(${ConfigManager.ALL_DAMAGE_TYPES.pattern}))(?:\\s+(persistent|splash|precision))?|(?:(${ConfigManager.ALL_DAMAGE_TYPES.pattern}))\\s+(splash|precision)|(?:(splash|precision))\\s+(${ConfigManager.ALL_DAMAGE_TYPES.pattern})|(?:(${ConfigManager.ALL_DAMAGE_TYPES.pattern})))(?:\\s+damage)?`, 'gi');
        
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

    // Extract damage type and category by scanning the entire match text
    static extractSingleDamageComponent(match) {
        const dice = match[1] || '';
        const originalText = match[0].toLowerCase();
        
        // Find damage type by scanning the entire match text for known damage types
        let damageType = this.findDamageTypeInText(originalText);
        
        // Find category by scanning for category keywords
        let category = this.findDamageCategoryInText(originalText);
        
        // Convert legacy types
        if (damageType && LegacyConversionManager.isLegacyDamageType(damageType)) {
            damageType = LegacyConversionManager.convertLegacyDamageType(damageType);
        }
        
        return {
            dice: dice,
            damageType: damageType || 'untyped',
            category: category || ''
        };
    }

    /**
     * Find damage type by scanning text for any known damage type
     * @param {string} text - Text to scan
     * @returns {string} Found damage type or empty string
     */
    static findDamageTypeInText(text) {
        const normalizedText = text.toLowerCase().trim();
        
        // Check all damage types (including legacy) - longest first to avoid partial matches
        const allDamageTypes = [...ConfigManager.ALL_DAMAGE_TYPES.slugs]
            .filter(type => type && type.length > 0)
            .sort((a, b) => b.length - a.length);
        
        for (const damageType of allDamageTypes) {
            // Use word boundaries to avoid partial matches
            const regex = new RegExp(`\\b${this.escapeRegex(damageType)}\\b`, 'i');
            if (regex.test(normalizedText)) {
                return damageType;
            }
        }
        
        return '';
    }

    /**
     * Find damage category by scanning text for category keywords  
     * @param {string} text - Text to scan
     * @returns {string} Found category or empty string
     */
    static findDamageCategoryInText(text) {
        const normalizedText = text.toLowerCase().trim();
        
        // Check for categories in priority order (persistent first, then precision, then splash)
        const categories = ['persistent', 'precision', 'splash'];
        
        for (const category of categories) {
            if (this.containsWord(normalizedText, category)) {
                return category;
            }
        }
        
        return '';
    }

    /**
     * Helper method to escape regex special characters
     * @param {string} string - String to escape
     * @returns {string} Escaped string
     */
    static escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

// Pattern that matches checks and saves
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
            regex: /\b(?:(?:basic\s+)?(?:DC\s*(\d{1,2})\s*[,;:]?\s*)?(fort(?:itude)?|ref(?:lex)?|will)(?:\s+(?:save|saving\s+throw))?(?:\s*[,;:]?\s*(?:basic\s+)?(?:DC\s*(\d{1,2}))?)?|(?:basic\s+)?(fort(?:itude)?|ref(?:lex)?|will)(?:\s+(?:save|saving\s+throw))?\s*(?:basic)?(?:\s*[,;:]?\s*(?:DC\s*(\d{1,2}))?)?|(?:basic\s+)?(?:DC\s*(\d{1,2})\s+)?(fort(?:itude)?|ref(?:lex)?|will)|(?:DC\s*(\d{1,2})\s+)?(?:basic\s+)?(fort(?:itude)?|ref(?:lex)?|will))\b/gi,
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

    /**
     * Create a replacement object from a match and parameters
     * Override to trim trailing "check" from the match
     * @param {Array} match - Regex match array
     * @param {Object} parameters - Extracted parameters
     * @returns {Replacement} Replacement instance
     */
    static createReplacement(match, parameters) {
        const trimmedMatch = this.trimTrailingWord(match);
        return new Replacement(trimmedMatch, this.type, parameters);
    }

    /**
     * Trim trailing word from a match to prevent it from being replaced
     * @param {Array} match - Regex match array
     * @returns {Array} - Modified match array with word trimmed
     */
    static trimTrailingWord(match) {
        if (!match || !match[0]) return match;
        
        const originalText = match[0];
        let trimmedText = originalText.replace(/\s+check\s*$/i, '');
        trimmedText = trimmedText.replace(/\s+save\s*$/i, '');
        trimmedText = trimmedText.replace(/\s+saving\s+throw\s*$/i, '');
        
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
            dcMethod: dc !== null ? 'static' : 'none',
            dc: dc,
            basic: basic
        };
    }

    static extractPerceptionParameters(text) {
        const dc = this.extractDC(text);
        
        return {
            checkType: 'perception',
            dcMethod: dc !== null ? 'static' : 'none',
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
            dcMethod: dc !== null ? 'static' : 'none',
            dc: dc
        };
    }

    static extractFlatParameters(text) {
        const dc = this.extractDC(text);
        
        return {
            checkType: 'flat',
            dcMethod: dc !== null ? 'static' : 'none',
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
            dcMethod: dc !== null ? 'static' : 'none',
            dc: dc
        };
    }
}

// Pattern that matches healing rolls
class HealingPattern extends BasePattern {
    static type = 'damage';
    static priority = 80;
    static description = 'Healing roll patterns';

    static EXTRACTORS = {
        healing: (match) => HealingPattern.extractHealingParameters(match)
    };

    static PATTERNS = [
        {
            regex: new RegExp(`(\\d+(?:d\\d+)?(?:[+-]\\d+)?)(?=\\s+\\b(?:${ConfigManager.HEALING_TERMS.pattern})\\b)`, 'gi'),
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

// Pattern that matches condition links
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

// Pattern that matches template links
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

// Pattern that matches duration rolls (such as ability recharge rolls)
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

// Pattern that matches counteract rolls
class CounteractPattern extends BasePattern {
    static type = 'generic';
    static priority = 45;
    static description = 'Counteract modifier patterns';

    static EXTRACTORS = {
        counteract: (match) => CounteractPattern.extractCounteractParameters(match)
    };

    static PATTERNS = [
        // Match only the modifier part in "counteract modifier of +25"
        {
            regex: /(?<=\bcounteracts?\s+(?:check\s+)?modifier\s+of\s+)((?:\d+d\d+)?[+-]?\d+)/gi,
            priority: 45,
            extractor: 'counteract'
        },
        // Match only the modifier part in "+25 counteract modifier"
        {
            regex: /((?:\d+d\d+)?[+-]?\d+)(?=\s+counteracts?\s+(?:check\s+)?modifier)/gi,
            priority: 45,
            extractor: 'counteract'
        }
    ];

    static extractCounteractParameters(match) {
        const modifierText = match[0] || ''; // Now match[0] is just the modifier
        
        // If the modifier already includes dice (like 1d20+25), use it as-is
        // Otherwise, prepend 1d20+ to make it a full roll
        let dice;
        if (/\d+d\d+/.test(modifierText)) {
            // Already contains dice, use as-is
            dice = modifierText;
        } else {
            // Just a modifier, prepend 1d20
            const cleanModifier = modifierText.startsWith('+') || modifierText.startsWith('-') 
                ? modifierText 
                : `+${modifierText}`;
            dice = `1d20${cleanModifier}`;
        }
        
        return {
            dice: dice,
            label: 'Counteract',
            gmOnly: false,
            displayText: ''
        };
    }
}

// Pattern that matches actions
class ActionPattern extends BasePattern {
    static type = 'action';
    static priority = 40;
    static description = 'Action patterns';

    static EXTRACTORS = {
        action: (match) => ActionPattern.extractActionParameters(match)
    };

    static PATTERNS = [
        {
            // Action with DC in parentheses: "Escape (DC 34)"
            regex: new RegExp(`\\b(${ConfigManager.ACTIONS.patternWithAlternates})\\s*\\(\\s*DC\\s*(\\d{1,2})\\s*\\)`, 'gi'),
            priority: 45,
            extractor: 'action'
        },
        {
            // Action with DC after: "Treat Poison DC 28"
            regex: new RegExp(`\\b(${ConfigManager.ACTIONS.patternWithAlternates})\\s+DC\\s*(\\d{1,2})\\b`, 'gi'),
            priority: 45,
            extractor: 'action'
        },
        {
            // Plain actions without DC
            regex: new RegExp(`\\b(${ConfigManager.ACTIONS.patternWithAlternates})\\b`, 'gi'),
            priority: 40,
            extractor: 'action'
        }
    ];

    static extractActionParameters(match) {
        const actionText = match[1] || '';
        const dc = match[2] ? parseInt(match[2]) : null;
        
        // Find the canonical action form
        const canonicalAction = ConfigManager.ACTIONS.findCanonicalForm(actionText);
        const actionSlug = canonicalAction || this.actionToSlug(actionText);
        
        let variant = '';
        if (ConfigManager.actionHasVariants(actionSlug)) {
            const variants = ConfigManager.ACTION_VARIANTS[actionSlug];
            if (variants && variants.slugs && variants.slugs.length > 0) {
                variant = variants.slugs[0];
            }
        }
        
        // Determine display text - preserve original phrasing if it's an alternate
        let displayText = '';
        if (canonicalAction) {
            const canonicalForm = ConfigManager.ACTIONS._unslug(canonicalAction);
            const originalText = actionText.trim();
            
            // If the original text differs from canonical form, use it as display text
            if (originalText.toLowerCase() !== canonicalForm.toLowerCase()) {
                displayText = ConfigManager.ACTIONS._toTitleCase(originalText);
            }
        }
        
        return { 
            action: actionSlug, 
            variant: variant, 
            dcMethod: dc !== null ? 'static' : 'none', 
            dc: dc, 
            statistic: '', 
            alternateRollStatistic: '',
            displayText: displayText
        };
    }
}

// PatternDetector - detects all patterns in text
class PatternDetector {
    static PATTERN_CLASSES = [
        AutomationPattern,
        DamagePattern,
        CheckPattern,
        HealingPattern,
        ConditionPattern,
        TemplatePattern,
        DurationPattern,
        CounteractPattern,
        ActionPattern
    ];

    /**
     * Detect all patterns in text
     * @param {string} text - Text to analyze
     * @returns {Array} - All matches with conflicts resolved
     */
    static detectAll(text) {
        const allMatches = [];
        
        // Test each pattern class directly
        for (const PatternClass of this.PATTERN_CLASSES) {
            try {
                const matches = PatternClass.test(text);
                allMatches.push(...matches);
            } catch (error) {
                console.error(`[PF2e Converter] Error in pattern ${PatternClass.type}:`, error);
                console.error('[PF2e Converter] Error stack:', error.stack);
            }
        }

        const resolvedMatches = this.resolveConflicts(allMatches);
        
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

// Utility for unique IDs
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// Replacement - represents a single detected pattern and the inline roll that replaces it
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
        this.enabled = true; // This will be set by business rules before storing original state
        this.priority = 0;
        this.displayText = '';
        this.type = type;
        
        // Store original parameters directly
        this._originalParameters = JSON.parse(JSON.stringify(parameters));
        
        // Create InlineAutomation instance with parameters
        this.inlineAutomation = this.createInlineAutomation(type, parameters);
        
        // Create renderer instance
        this.renderer = this.getRenderer(type);
        
        // The TextProcessor will call finalizeOriginalState() after business rules
        this._originalStateFinalized = false;
        this._originalEnabledState = true; // Will be overwritten
        this._originalRender = null; // Will be set later

    }

    /**
     * Called by TextProcessor after business rules have been applied
     * This finalizes what we consider the "original" state for reset purposes
     */
    finalizeOriginalState() {
        if (this._originalStateFinalized) {
            console.warn('[Replacement] Original state already finalized');
            return;
        }
        
        // Store the enabled state AFTER business rules have run
        this._originalEnabledState = this.enabled;
        
        // Store the original render AFTER business rules have run
        this._originalRender = this.render();
        
        this._originalStateFinalized = true;
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

    /**
     * Reset to the original state (including business-rules-determined enabled state)
     */
    resetToOriginal() {
        if (!this._originalStateFinalized) {
            console.warn('[Replacement] Cannot reset - original state not finalized yet');
            return;
        }
        
        // Recreate the InlineAutomation object with original parameters
        this.inlineAutomation = this.createInlineAutomation(
            this.type, 
            this._originalParameters
        );
        
        // Reset enabled state to what it was AFTER business rules
        this.enabled = this._originalEnabledState;
        
        // Clear any custom display text
        this.displayText = this.inlineAutomation.displayText || '';
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

    /**
     * Check if the replacement has been modified from its original state
     */
    isModified() {
        if (!this._originalStateFinalized) {
            return false; // Can't determine if not finalized
        }
        
        // Check if current render differs from original render
        const currentRender = this.render();
        const renderChanged = currentRender !== this._originalRender;
        
        // Check if enabled state differs from original enabled state
        const enabledChanged = this.enabled !== this._originalEnabledState;
        
        return renderChanged || enabledChanged;
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

// ==================== BUSINESS RULES ====================
// Handles post-processing business logic that determines
// which replacements should be enabled/disabled based on context.

// Base class for business rules
// Each rule can examine the full context and modify replacements
class BusinessRule {
    /**
     * Apply this rule to the replacements
     * @param {Array} replacements - Array of replacement objects
     * @param {string} originalText - The original input text
     * @param {Object} context - Additional context for rule processing
     * @returns {Array} - Modified array of replacements
     */
    apply(replacements, originalText, context = {}) {
        throw new Error('BusinessRule subclasses must implement apply() method');
    }

    /**
     * Get a description of what this rule does
     * @returns {string} Rule description
     */
    getDescription() {
        return 'Base business rule';
    }

    /**
     * Get the priority of this rule (higher numbers run first)
     * @returns {number} Rule priority
     */
    getPriority() {
        return 0;
    }
}

// Rule: Only enable the first occurrence of duplicate conditions
// Conditions with different values are considered separate
class DuplicateConditionRule extends BusinessRule {
    apply(replacements, originalText, context = {}) {
        const seenConditions = new Map(); // condition -> { value: firstOccurrenceIndex }
        
        replacements.forEach((replacement, index) => {
            if (replacement.type !== 'condition') return;
            
            const conditionName = replacement.inlineAutomation?.condition;
            const conditionValue = replacement.inlineAutomation?.value || null;
            
            if (!conditionName) return;
            
            // Create a unique key for condition + value combination
            const conditionKey = `${conditionName}:${conditionValue}`;
            
            if (seenConditions.has(conditionKey)) {
                // This is a duplicate - disable it
                replacement.enabled = false;
            } else {
                // First occurrence - keep it enabled and record it
                seenConditions.set(conditionKey, index);
            }
        });
        
        return replacements;
    }

    getDescription() {
        return 'Disables duplicate conditions (same condition with same value)';
    }

    getPriority() {
        return 100;
    }
}

// Rule: Disable generic rolls that are just numbers (no dice)
class NumberOnlyGenericRollRule extends BusinessRule {
    apply(replacements, originalText, context = {}) {
        replacements.forEach((replacement) => {
            if (replacement.type !== 'generic') return;
            
            const dice = replacement.inlineAutomation?.dice;
            if (!dice) return;
            
            // Check if it's just a number (no 'd' for dice)
            if (this.isNumberOnlyDice(dice)) {
                replacement.enabled = false;
            }
        });
        
        return replacements;
    }

    /**
     * Check if a dice expression is just a number (no 'd' present)
     * @param {string} dice - The dice expression to check
     * @returns {boolean} True if it's just a number
     */
    isNumberOnlyDice(dice) {
        if (!dice || typeof dice !== 'string') return false;
        return /^\s*\d+\s*$/.test(dice.trim());
    }

    getDescription() {
        return 'Disables generic rolls that are just numbers (no dice)';
    }

    getPriority() {
        return 50;
    }
}

// Business Rules Engine
// Manages and applies all business rules to replacements
class BusinessRulesEngine {
    constructor() {
        this.rules = [];
        this.enabled = true;
        
        // Register default rules
        this.registerRule(new DuplicateConditionRule());
        this.registerRule(new NumberOnlyGenericRollRule());
        
        // Example of conditionally registering rules
        // this.registerRule(new LowDamageRule(1));
    }

    /**
     * Register a new business rule
     * @param {BusinessRule} rule - The rule to register
     */
    registerRule(rule) {
        if (!(rule instanceof BusinessRule)) {
            throw new Error('Rule must be an instance of BusinessRule');
        }
        
        this.rules.push(rule);
        this.rules.sort((a, b) => b.getPriority() - a.getPriority());
    }

    /**
     * Remove a rule by class
     * @param {Function} RuleClass - The rule class to remove
     */
    unregisterRule(RuleClass) {
        this.rules = this.rules.filter(rule => !(rule instanceof RuleClass));
    }

    /**
     * Apply all registered rules to the replacements
     * @param {Array} replacements - Array of replacement objects
     * @param {string} originalText - The original input text
     * @param {Object} context - Additional context for rule processing
     * @returns {Array} - Modified array of replacements
     */
    applyRules(replacements, originalText, context = {}) {
        if (!this.enabled) {
            return replacements;
        }

        if (!Array.isArray(replacements)) {
            console.warn('[BusinessRulesEngine] Expected array of replacements, got:', typeof replacements);
            return replacements;
        }

        let processedReplacements = [...replacements]; // Create a copy
        
        for (const rule of this.rules) {
            try {
                processedReplacements = rule.apply(processedReplacements, originalText, context);
                
                if (!Array.isArray(processedReplacements)) {
                    console.error(`[BusinessRulesEngine] Rule ${rule.constructor.name} returned non-array result`);
                    processedReplacements = replacements; // Fallback to original
                    break;
                }
            } catch (error) {
                console.error(`[BusinessRulesEngine] Error applying rule ${rule.constructor.name}:`, error);
                // Continue with other rules rather than failing completely
            }
        }

        return processedReplacements;
    }

    /**
     * Enable or disable the rules engine
     * @param {boolean} enabled - Whether to enable the rules engine
     */
    setEnabled(enabled) {
        this.enabled = Boolean(enabled);
    }

    /**
     * Get information about all registered rules
     * @returns {Array} Array of rule information objects
     */
    getRulesInfo() {
        return this.rules.map(rule => ({
            name: rule.constructor.name,
            description: rule.getDescription(),
            priority: rule.getPriority()
        }));
    }

    /**
     * Clear all registered rules
     */
    clearRules() {
        this.rules = [];
    }
}

// ==================== FORMATTING RULES ====================
// Rules for formatting the text according to PF2e standards

class FormattingRule {
    apply (text) {
        throw new Error('FormattingRule subclasses must implement apply() method');
    }

    getPriority() {
        return 0;
    }

    getCategory() {
        throw new Error('FormattingRule subclasses must implement getCategory() method');
    }

    static get CATEGORIES() {
        return {
            TEXT: 'text',
            HTML: 'html'
        };
    }

    /**
     * Check if a match is already formatted with direct adjacent HTML tags
     * @param {string} text - The full text being processed
     * @param {number} matchStart - Start position of the match
     * @param {number} matchEnd - End position of the match
     * @param {string} tagName - The HTML tag name to check for (e.g., 'strong', 'em')
     * @returns {boolean} - True if the match has the specified tags directly adjacent
     */
    isAlreadyFormatted(text, matchStart, matchEnd, tagName) {
        const beforeMatch = text.substring(0, matchStart);
        const afterMatch = text.substring(matchEnd);
        
        // Check for direct adjacent tags (e.g., <strong>match</strong>)
        // Allow for optional whitespace between tags and content
        const hasOpeningTag = new RegExp(`<${tagName}\\b[^>]*>\\s*$`).test(beforeMatch);
        const hasClosingTag = new RegExp(`^\\s*</${tagName}>`).test(afterMatch);
        
        return hasOpeningTag || hasClosingTag;
    }

    /**
     * Apply a replacement function only to matches that aren't already formatted
     * @param {string} text - The text to process
     * @param {RegExp} pattern - The regex pattern to match
     * @param {Function} replacementFn - Function that returns the replacement text
     * @param {string} tagName - The HTML tag name to check for existing formatting
     * @returns {string} - The processed text
     */
    replaceUnformatted(text, pattern, replacementFn, tagName) {
        let result = text;
        let offset = 0;
        let match;
        
        // Reset regex lastIndex to ensure we start from the beginning
        pattern.lastIndex = 0;
        
        while ((match = pattern.exec(text)) !== null) {
            const matchStart = match.index + offset;
            const matchEnd = matchStart + match[0].length;
            
            // Check if this match is already formatted
            if (!this.isAlreadyFormatted(result, matchStart, matchEnd, tagName)) {
                const replacement = replacementFn(match);
                const lengthDiff = replacement.length - match[0].length;
                
                result = result.substring(0, matchStart) + 
                        replacement + 
                        result.substring(matchEnd);
                
                offset += lengthDiff;
            }
            
            // Prevent infinite loops for global regexes
            if (!pattern.global) break;
        }
        
        return result;
    }
}

class RemoveLineBreaksRule extends FormattingRule {
    apply(text) {
        let result = text.replace(/(?<=-)\n/g, ''); // Remove line breaks that are preceded by a hyphen
        result = result.replace(/\n/g, ' '); // Remove any remaining line breaks

        return result;
    }

    getPriority() {
        return 100;
    }

    getCategory() {
        return FormattingRule.CATEGORIES.TEXT;
    }
}

class DegreesOfSuccessRule extends FormattingRule {
    constructor() {
        super();
        this.criticalSuccessRegex = /(\s*)(Critical\s+Success)\b/g;
        this.degreesOfSuccessRegex = /(\s*)(Critical\s+Failure|(?<!Critical\s+)Success|(?<!Critical\s+)Failure)\b/g;
    }
    
    apply(text) {
        // Format critical success (avoiding already formatted text)
        text = this.replaceUnformatted(
            text,
            this.criticalSuccessRegex,
            (match) => `</p>\n<hr>\n<p><strong>${match[2]}</strong>`,
            'strong'
        );
        
        // Format other degrees of success
        text = this.replaceUnformatted(
            text,
            this.degreesOfSuccessRegex,
            (match) => `</p>\n<p><strong>${match[2]}</strong>`,
            'strong'
        );

        // Clean up start of text if needed
        if (text.startsWith('</p>\n<hr>\n<p><strong>')) {
            text = text.substring(10);
        }
        if (text.startsWith('</p>\n<p><strong>')) {
            text = text.substring(5);
        }

        return text;
    }

    getPriority() {
        return 50;
    }

    getCategory() {
        return FormattingRule.CATEGORIES.HTML;
    }
}

class BoldKeywordsRule extends FormattingRule {
    constructor() {
        super();
        this.keywords = [
            'Traditions',
            'Range',
            'Area',
            'Defense',
            'Duration',
            'Frequency',
            'Trigger',
            'Targets',
            'Requirements',
            'Prerequisites',
            'Cost',
            'Cast'
        ];
        this.patternNoSemicolon = new RegExp(`(?<!;\\s*)(${this.keywords.join('|')})`, 'g');
        this.patternWithSemicolon = new RegExp(`(?<=;\\s*)(${this.keywords.join('|')})`, 'g');
    }

    apply(text) {
        // Apply formatting only to unformatted matches
        text = this.replaceUnformatted(
            text, 
            this.patternNoSemicolon, 
            (match) => `</p>\n<p><strong>${match[1]}</strong>`,
            'strong'
        );
        
        text = this.replaceUnformatted(
            text,
            this.patternWithSemicolon,
            (match) => `<strong>${match[1]}</strong>`,
            'strong'
        );

        // Clean up start of text if needed
        if (text.startsWith('</p>\n<p><strong>')) {
            text = text.substring(5);
        }

        return text;
    }

    getPriority() {
        return 15;
    }

    getCategory() {
        return FormattingRule.CATEGORIES.HTML;
    }
}

class BackMatterRule extends FormattingRule {
    constructor() {
        super();
        // Match "Heightened" followed by level in parentheses
        // Supports formats like: (1st), (4th), (+1), (2nd), (3rd), etc.
        this.heightenedRegex = new RegExp(`(\\s*Heightened\\s*\\([^)]+\\))`, 'g');
        this.specialRegex = new RegExp(`(\\s*Special)`, 'g');
    }
    
    apply(text) {
        // Track first occurrence of Heightened
        let isFirstHeightened = true;
        
        text = this.replaceUnformatted(
            text,
            this.heightenedRegex,
            (match) => {
                if (isFirstHeightened) {
                    isFirstHeightened = false;
                    return `</p>\n<hr>\n<p><strong>${match[1]}</strong>`;
                } else {
                    return `</p>\n<p><strong>${match[1]}</strong>`;
                }
            },
            'strong'
        );

        text = this.replaceUnformatted(
            text,
            this.specialRegex,
            (match) => `</p>\n<hr>\n<p><strong>${match[1]}</strong>`,
            'strong'
        );

        // Clean up start of text if needed
        if (text.startsWith('</p>\n<hr>\n<p><strong>')) {
            text = text.substring(10);
        }

        return text;
    }

    getPriority() {
        return 60;
    }

    getCategory() {
        return FormattingRule.CATEGORIES.HTML;
    }
}

class AfflictionNameRule extends FormattingRule {
    constructor() {
        super();
        // Pattern to match affliction names:
        // - Start of line or preceded by whitespace/newline
        // - Affliction name (captured - the only thing we need to modify)
        // - Space and opening parenthesis
        // - Comma-separated traits containing curse, disease, or poison
        // - Closing parenthesis and " Level"
        this.afflictionRegex = /(\s*)([^(\n]+?)\s+\([^)]*(?:curse|disease|poison)[^)]*\)\s+Level/gi;
    }
    
    apply(text) {
        text = this.replaceUnformatted(
            text,
            this.afflictionRegex,
            (match) => {
                const leadingSpace = match[1];
                const afflictionName = match[2].trim();
                // Replace just the affliction name part with the bolded version
                return match[0].replace(match[2], `</p>\n<hr>\n<p><strong>${afflictionName}</strong>`);
            },
            'strong'
        );

        // Clean up start of text if needed
        if (text.startsWith('</p>\n<hr>\n<p><strong>')) {
            text = text.substring(10);
        }

        return text;
    }

    getPriority() {
        return 110;
    }

    getCategory() {
        return FormattingRule.CATEGORIES.HTML;
    }
}

class AfflictionPropertiesRule extends FormattingRule {
    constructor() {
        super();
        this.keywords = [
            'Maximum Duration',
            'Level'
        ];
        this.pattern = new RegExp(`(${this.keywords.join('|')})`, 'g');
    }

    apply(text) {
        text = this.replaceUnformatted(
            text,
            this.pattern,
            (match) => `<strong>${match[1]}</strong>`,
            'strong'
        );
        
        return text;
    }

    getPriority() {
        return 19;
    }

    getCategory() {
        return FormattingRule.CATEGORIES.HTML;
    }
}

class AfflictionStagesRule extends FormattingRule {
    constructor() {
        super();
        this.pattern = new RegExp(`(;?\\s*)(Stage\\s+\\d+)\\b`, 'g');
    }

    apply(text) {
        text = this.replaceUnformatted(
            text,
            this.pattern,
            (match) => `</p>\n<p><strong>${match[2]}</strong>`,
            'strong'
        );

        // Clean up start of text if needed
        if (text.startsWith('</p>\n<p><strong>')) {
            text = text.substring(5);
        }

        return text;
    }

    getPriority() {
        return 18;
    }

    getCategory() {
        return FormattingRule.CATEGORIES.HTML;
    }
}

class StartAndEndParagraphTagsRule extends FormattingRule {
    apply(text) {
        // Add <p> tags at the start and end of the text only if there are no <p> tags there already
        if (!text.startsWith('<p>')) {
            text = `<p>${text}`;
        }
        if (!text.endsWith('</p>')) {
            text = `${text}</p>`;
        }
        return text;
    }

    getPriority() {
        return 10;
    }

    getCategory() {
        return FormattingRule.CATEGORIES.HTML;
    }
}

class FormattingRulesEngine {
    constructor() {
        this.rules = [];
        this.enabled = true;
        this.enabledCategories = new Set([
            FormattingRule.CATEGORIES.TEXT,
            FormattingRule.CATEGORIES.HTML
        ]);

        this.registerRule(new DegreesOfSuccessRule());
        this.registerRule(new RemoveLineBreaksRule());
        this.registerRule(new StartAndEndParagraphTagsRule());
        this.registerRule(new BackMatterRule());
        this.registerRule(new AfflictionStagesRule());
        this.registerRule(new AfflictionNameRule());
        this.registerRule(new AfflictionPropertiesRule());
        this.registerRule(new BoldKeywordsRule());
    }

    /**
     * Register a new formatting rule
     * @param {FormattingRule} rule - The rule to register
     */
    registerRule(rule) {
        if (!(rule instanceof FormattingRule)) {
            throw new Error('Rule must be an instance of FormattingRule');
        }
        
        this.rules.push(rule);
        this.rules.sort((a, b) => b.getPriority() - a.getPriority());
    }

    /**
     * Remove a rule by class
     * @param {Function} RuleClass - The rule class to remove
     */
    unregisterRule(RuleClass) {
        this.rules = this.rules.filter(rule => !(rule instanceof RuleClass));
    }

    /**
     * Enable or disable specific categories of formatting rules
     * @param {string|Array} categories - Category or array of categories to enable
     * @param {boolean} enabled - Whether to enable (true) or disable (false) the categories
     */
    setCategoryEnabled(categories, enabled = true) {
        const categoryArray = Array.isArray(categories) ? categories : [categories];
        
        categoryArray.forEach(category => {
            if (enabled) {
                this.enabledCategories.add(category);
            } else {
                this.enabledCategories.delete(category);
            }
        });
    }

    /**
     * Check if a category is enabled
     * @param {string} category - The category to check
     * @returns {boolean} Whether the category is enabled
     */
    isCategoryEnabled(category) {
        return this.enabledCategories.has(category);
    }

    /**
     * Apply all registered and enabled rules to the text
     * @param {string} text - The text to apply the rules to
     * @returns {string} - The modified text
     */
    applyRules(text) {
        if (!this.enabled) {
            return text;
        }

        let processedText = text;
        
        // Filter rules by enabled categories
        const applicableRules = this.rules.filter(rule => {
            const ruleCategory = rule.getCategory ? rule.getCategory() : FormattingRule.CATEGORIES.TEXT;
            return this.isCategoryEnabled(ruleCategory);
        });
        
        // Apply the filtered rules
        for (const rule of applicableRules) {
            try {
                processedText = rule.apply(processedText);
            } catch (error) {
                console.error(`[FormattingRulesEngine] Error applying rule ${rule.constructor.name}:`, error);
                // Continue with other rules rather than failing completely
            }
        }

        return processedText;
    }

    /**
     * Enable or disable the rules engine
     * @param {boolean} enabled - Whether to enable the rules engine
     */
    setEnabled(enabled) {
        this.enabled = Boolean(enabled);
    }
}

// ==================== TEXT PROCESSOR ====================
// Processes the text and returns an array of replacements
class TextProcessor {
    constructor() {
        this.linkedConditions = new Set();
        this.businessRules = new BusinessRulesEngine();
        this.formattingRules = new FormattingRulesEngine();
    }

    process(inputText, state = null) {
        if (!inputText || !inputText.trim()) {
            return [];
        }
        
        try {
            this.linkedConditions = new Set();
            
            // Step 1: Pattern detection and replacement creation
            const matches = PatternDetector.detectAll(inputText);
            
            const replacements = [];

            for (const matchResult of matches) {
                try {
                    let replacement;
                    
                    if (matchResult.type === 'condition') {
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

            // Step 2: Sort by priority
            const sortedReplacements = this.sortByPriority(replacements);
            
            // Step 3: Apply business rules to set enabled state
            const processedReplacements = this.applyBusinessRules(sortedReplacements, inputText, state);
            
            // Step 4: Finalize original state after business rules
            processedReplacements.forEach(replacement => {
                replacement.finalizeOriginalState();
            });
            
            return processedReplacements;
        } catch (error) {
            console.error('[PF2e Converter] Error in TextProcessor.process:', error);
            console.error('[PF2e Converter] Error stack:', error.stack);
            return [];
        }
    }

    /**
     * Apply business rules to determine replacement enabled state
     */
    applyBusinessRules(replacements, originalText, state = null) {
        const context = {
            state: state,
            timestamp: Date.now(),
            enableLowDamageRule: false,
        };
        
        try {
            return this.businessRules.applyRules(replacements, originalText, context);
        } catch (error) {
            console.error('[PF2e Converter] Error applying business rules:', error);
            return replacements;
        }
    }

    sortByPriority(replacements) {
        return replacements.sort((a, b) => {
            return b.priority - a.priority || a.startPos - b.startPos;
        });
    }

    // Keep existing render methods unchanged
    renderFromReplacements(text, replacements, interactive = false, state = null, applyFormatting = true, escapeHtml = false) {
        // Step 1: Apply global legacy condition conversions to original text
        let processedText = this.applyGlobalLegacyConditionConversions(text);
        
        // Step 2: Apply replacements to the text BEFORE any other processing
        const sorted = replacements.slice().sort((a, b) => b.startPos - a.startPos);
        
        for (const replacement of sorted) {
            processedText = this.applyReplacement(processedText, replacement, interactive, state);
        }
        
        // Step 4: Apply formatting rules if requested
        if (applyFormatting && this.formattingRules.enabled) {
            processedText = this.formattingRules.applyRules(processedText);
        }
        
        // Step 3: If we're escaping HTML, protect original line breaks
        const protectedElements = [];
        if (escapeHtml) {
            processedText = this.protectOriginalLineBreaks(processedText, protectedElements);
        }
        
        // Step 5: Escape HTML if requested, passing the protected elements array
        if (escapeHtml) {
            processedText = this.escapeHtmlSelectively(processedText, protectedElements);
        }
        
        return processedText;
    }

    /**
     * Protect original line breaks by replacing them with placeholders
     * @param {string} text - Text with original line breaks
     * @param {Array} protectedElements - Array to store protected content
     * @returns {string} Text with line breaks replaced by placeholders
     */
    protectOriginalLineBreaks(text, protectedElements) {
        let result = text;
        
        // Handle different line break formats
        result = result.replace(/\r\n/g, '\n'); // Normalize Windows line breaks
        result = result.replace(/\r/g, '\n');   // Normalize Mac line breaks
        
        // Replace line breaks with placeholders and store the <br> replacement
        result = result.replace(/\n/g, () => {
            const placeholder = `___PROTECTED_ELEMENT_${protectedElements.length}___`;
            protectedElements.push('<br>');
            return placeholder;
        });
        
        return result;
    }

    /**
     * Escape formatting HTML while preserving interactive elements
     * This method processes the HTML string directly rather than DOM nodes
     * to avoid double-escaping issues with interactive element attributes
     */
    escapeHtmlSelectively(html, protectedElements = []) {
        let processedHtml = html;
        
        // Protect interactive spans (continue using the same array)
        processedHtml = processedHtml.replace(/<span[^>]*class="[^"]*rollconverter-interactive[^"]*"[^>]*>.*?<\/span>/gi, (match) => {
            const placeholder = `___PROTECTED_ELEMENT_${protectedElements.length}___`;
            protectedElements.push(match);
            return placeholder;
        });
        
        // Now escape all HTML in the remaining content
        processedHtml = this.escapeHtml(processedHtml);
        
        // Restore all protected elements (both line breaks and interactive spans)
        protectedElements.forEach((element, index) => {
            const placeholder = `___PROTECTED_ELEMENT_${index}___`;
            processedHtml = processedHtml.replace(placeholder, element);
        });
        
        return processedHtml;
    }

    /**
     * Escape HTML for display
     * @param {string} html - HTML to escape
     * @returns {string} Escaped HTML
     */
    escapeHtml(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
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
        const htmlText = text;
        // const htmlText = text.replace(/\n/g, '<br>');

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
        ui.notifications.info("Text copied to clipboard.");
    } catch (error) {
        ui.notifications.error("Failed to copy text to clipboard.");
    }
}

/**
 * Create and show the converter dialog
 */
function showConverterDialog() {
    // Inject CSS before creating dialog
    CSSManager.injectStyles();
    
    const dialogContent = `
        <div class="rollconverter-dialog">
            <div class="rollconverter-main">
                <fieldset class="rollconverter-fieldset rollconverter-input-section">
                    <legend>Input Text</legend>
                    <div class="form-group rollconverter-section-content">
                        <div class="form-fields">
                            <textarea 
                                id="input-text" 
                                name="inputText" 
                                placeholder="Paste your spell, ability, or feat description here..."
                                class="rollconverter-input-textarea"
                                >${DEFAULT_INPUT}</textarea>
                        </div>
                        <p class="notes">Making changes here will clear any modifications made below.</p>
                    </div>
                </fieldset>
                
                <fieldset class="rollconverter-fieldset rollconverter-output-section">
                    <legend>Converted Text</legend>
                    <div class="form-group rollconverter-section-content">
                        <div class="form-fields">
                            <div id="output-html" class="rollconverter-output-area rollconverter-output-converted">
                            </div>
                        </div>
                        <p class="notes">Click an inline roll to modify it.</p>
                    </div>
                </fieldset>
                
                <fieldset class="rollconverter-fieldset rollconverter-preview-section">
                    <legend>Live Preview</legend>
                    <div class="form-group rollconverter-section-content">
                        <div class="form-fields">
                            <div id="live-preview" class="rollconverter-output-area">
                                <em class="rollconverter-output-placeholder">Live preview will appear here...</em>
                            </div>
                        </div>
                        <p class="notes">Click inline rolls to test them.</p>
                    </div>
                </fieldset>
            </div>
            
            <div class="rollconverter-sidebar">
                <fieldset class="rollconverter-fieldset rollconverter-formatting-options">
                    <legend>Formatting Options</legend>
                        <form id="formatting-options-form" class="rollconverter-form">
                            <!-- Content will be generated by FieldRenderer -->
                        </form>
                </fieldset>
                
                <fieldset class="rollconverter-fieldset rollconverter-modifier-panel">
                    <legend class="rollconverter-modifier-legend">
                        <span class="rollconverter-modifier-title">Modifier Panel</span>
                    </legend>
                    <div class="rollconverter-modifier-content" id="modifier-panel-content">
                        <p>Select an element to modify.</p>
                    </div>
                </fieldset>
                
                <div class="rollconverter-sidebar-controls">
                    <button type="button" id="copy-output" class="rollconverter-control-button">Copy Output</button>
                </div>
            </div>
        </div>
    `;

    // Create the converter dialog instance
    const converterDialog = new ConverterDialog();

    const dialog = new Dialog({
        title: "PF2e Inline Roll Converter",
        content: dialogContent,
        buttons: {},
        render: (html) => {
            try {
                converterDialog.initializeUI(html);
                converterDialog.setupEventHandlers();
            } catch (error) {
                console.error('[PF2e Converter] Error in dialog render callback:', error);
                console.error('[PF2e Converter] Error stack:', error.stack);
            }
        },
        close: () => {
            // Clean up converter dialog data
            if (converterDialog) {
                converterDialog.cleanup();
            }
            
            // Schedule CSS cleanup after dialog window fully closes
            setTimeout(() => {
                CSSManager.removeStyles();
            }, 500); // Small delay to ensure window has closed
        }
    }, {
        width: 1000,
        height: 700,
        resizable: true,
        classes: ["rollconverter-dialog-window"] // Add custom class for additional styling if needed
    });
    
    dialog.render(true);
}

// Main execution
try {
    // Verify we're in a PF2e game
    if (game.system.id !== 'pf2e') {
        console.error('[PF2e Converter] Wrong game system detected:', game.system.id);
        ui.notifications.error("This macro is designed for the Pathfinder 2e system only.");
        return;
    }
    
    // Verify minimum Foundry version
    if (!game.version || parseInt(game.version.split('.')[0]) < 12) {
        console.warn('[PF2e Converter] Foundry version may be too old:', game.version);
        ui.notifications.warn("This macro is designed for Foundry VTT v12+. Some features may not work properly.");
    }
    
    // Show the converter dialog
    showConverterDialog();
    
} catch (error) {
    console.error('[PF2e Converter] Error during startup:', error);
    console.error('[PF2e Converter] Error stack:', error.stack);
    ui.notifications.error("Failed to start PF2e Inline Roll Converter. Check console for details.");
}

// ===================== TRAITS INPUT =====================

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

// Traits input component that mimics pf2e system behavior
// Supports typing, filtering, multiple selection, and tab completion
// Maintains alphabetical order when adding traits
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
                <tags class="tagify tags paizo-style" tabindex="-1">
                    <span 
                        contenteditable="true" 
                        tabindex="0" 
                        data-placeholder="${this.options.placeholder}" 
                        aria-placeholder="${this.options.placeholder}" 
                        class="tagify__input" 
                        role="textbox" 
                        aria-autocomplete="both" 
                        aria-multiline="false"
                    ></span>
                </tags>
                <div class="rollconverter-traits-dropdown"></div>
            </div>
        `;
        
        this.wrapper = container.querySelector('.rollconverter-traits-wrapper');
        this.selectedContainer = container.querySelector('tags.tagify');
        this.searchInput = container.querySelector('span.tagify__input');
        this.dropdown = container.querySelector('.rollconverter-traits-dropdown');
    }
    
    /**
     * Safe method to get the current input value from contenteditable span
     * @returns {string} Current input value
     */
    getCurrentInputValue() {
        if (!this.searchInput) return '';
        
        // For contenteditable spans, use textContent, fallback to innerText, then empty string
        const value = this.searchInput.textContent || this.searchInput.innerText || '';
        return value.trim();
    }
    
    /**
     * Safe method to set the input value
     * @param {string} value - Value to set
     */
    setCurrentInputValue(value) {
        if (!this.searchInput) return;
        
        // For contenteditable spans, set textContent
        this.searchInput.textContent = value || '';
    }
    
    /**
     * Sort traits alphabetically by label
     * @param {Array} traits - Array of trait objects to sort
     * @returns {Array} Sorted array of traits
     */
    sortTraitsAlphabetically(traits) {
        return traits.sort((a, b) => {
            if (!a || !a.label || !b || !b.label) return 0;
            return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
        });
    }
    
    bindEvents() {
        if (!this.searchInput || !this.dropdown) return;
        
        // Input events - note that we're now working with a contenteditable span
        this.searchInput.addEventListener('input', (e) => {
            e.stopPropagation();
            const query = this.getCurrentInputValue();
            this.handleInput({ target: { value: query } });
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
        const query = (e.target.value || '').toLowerCase();
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
                const inputText = this.getCurrentInputValue();
                if (inputText === '' && this.selectedTraits.length > 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.removeTrait(this.selectedTraits[this.selectedTraits.length - 1].value);
                }
                break;
        }
    }
    
    filterOptions(query) {
        const normalizedQuery = (query || '').toLowerCase().trim();
        
        if (normalizedQuery === '') {
            // When no query, show all available traits (not already selected)
            this.filteredOptions = this.traitOptions.filter(trait => 
                trait && trait.label &&
                !this.selectedTraits.some(selected => selected && selected.value === trait.value)
            );
            this.activeIndex = -1; // No auto-selection when showing all options
        } else {
            // When there's a query, filter by the search term
            this.filteredOptions = this.traitOptions.filter(trait => 
                trait && trait.label &&
                trait.label.toLowerCase().includes(normalizedQuery) &&
                !this.selectedTraits.some(selected => selected && selected.value === trait.value)
            );
            
            // Auto-select first option if we have results and query is not empty
            if (this.filteredOptions.length > 0) {
                this.activeIndex = 0;
            } else {
                this.activeIndex = -1;
            }
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
        } else {
            const inputText = this.getCurrentInputValue();
            if (inputText.trim()) {
                // Try to add based on typed text
                this.addTraitFromText(inputText.trim());
            }
        }
    }
    
    addTraitFromText(text) {
        const normalizedText = (text || '').toLowerCase().trim();
        
        if (!normalizedText) return;
        
        // First, try to find exact match by label
        let matchedTrait = this.traitOptions.find(trait => 
            trait && trait.label && trait.label.toLowerCase() === normalizedText
        );
        
        // If no exact match, try partial match
        if (!matchedTrait) {
            matchedTrait = this.traitOptions.find(trait => 
                trait && trait.label && trait.label.toLowerCase().includes(normalizedText)
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
        const query = this.getCurrentInputValue();
        
        // Always filter and show available options when dropdown opens
        this.filterOptions(query);
    }
    
    closeDropdown() {
        this.isOpen = false;
        this.dropdown.style.display = 'none';
        this.activeIndex = -1;
    }
    
    renderDropdown() {
        if (this.filteredOptions.length === 0) {
            const query = this.getCurrentInputValue();
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
    
    /**
     * Add a trait and maintain alphabetical order
     */
    addTrait(trait) {
        if (!trait || !trait.value) return;
        
        if (!this.selectedTraits.some(selected => selected && selected.value === trait.value)) {
            this.selectedTraits.push(trait);
            
            // UPDATED: Sort traits alphabetically after adding
            this.selectedTraits = this.sortTraitsAlphabetically(this.selectedTraits);
            
            this.renderSelected();
            this.setCurrentInputValue('');
            this.filterOptions('');
            this.closeDropdown();
            this.searchInput.blur();
            
            if (this.options.onChange) {
                this.options.onChange(this.selectedTraits);
            }
        }
    }
    
    removeTrait(value) {
        if (!value) return;
        
        this.selectedTraits = this.selectedTraits.filter(trait => trait && trait.value !== value);
        
        // No need to sort after removal since remaining items are already sorted
        this.renderSelected();
        
        const currentQuery = this.getCurrentInputValue();
        this.filterOptions(currentQuery);
        
        if (this.options.onChange) {
            this.options.onChange(this.selectedTraits);
        }
    }
    
    renderSelected() {
        // Remove existing trait tags (but keep the input span)
        const existingTags = this.selectedContainer.querySelectorAll('tag.tagify__tag');
        existingTags.forEach(tag => tag.remove());
        
        // Traits are already sorted, so render them in order
        this.selectedTraits.forEach((trait, index) => {
            if (!trait || !trait.value || !trait.label) return;
            
            const tag = document.createElement('tag');
            
            // Use exact PF2e Tagify structure and attributes
            tag.className = 'tagify__tag tagify--noAnim';
            tag.setAttribute('contenteditable', 'false');
            tag.setAttribute('spellcheck', 'false');
            tag.setAttribute('tabindex', '-1');
            tag.setAttribute('id', trait.value);
            tag.setAttribute('value', trait.label);
            tag.setAttribute('data-tooltip', `PF2E.TraitDescription${trait.label}`);
            tag.setAttribute('isvalid', 'true');
            tag.setAttribute('tagid', this.generateTagId());
            
            tag.innerHTML = `
                <x class="tagify__tag__removeBtn" role="button" aria-label="remove tag"></x>
                <div><span class="tagify__tag-text">${trait.label}</span></div>
            `;
            
            // Add remove functionality
            tag.querySelector('x.tagify__tag__removeBtn').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.removeTrait(trait.value);
            });
            
            // Insert before the input span
            this.selectedContainer.insertBefore(tag, this.searchInput);
        });
    }

    generateTagId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    /**
     * Set traits and maintain alphabetical order
     */
    setValue(traits, triggerChange = false) {
        if (!Array.isArray(traits)) {
            console.warn('[TraitsInput] setValue called with non-array:', traits);
            return;
        }
        
        // Convert string array to trait objects
        this.selectedTraits = traits.map(value => {
            if (!value) return null;
            const traitOption = this.traitOptions.find(option => option && option.value === value);
            return traitOption || { label: value, value: value };
        }).filter(trait => trait !== null);
        
        // Sort traits alphabetically when setting values
        this.selectedTraits = this.sortTraitsAlphabetically(this.selectedTraits);
        
        this.renderSelected();
        this.filterOptions('');
        
        // Optionally trigger onChange callback
        if (triggerChange && this.options.onChange) {
            this.options.onChange(this.selectedTraits);
        }
    }
    
    getValue() {
        return this.selectedTraits
            .filter(trait => trait && trait.value)
            .map(trait => trait.value);
    }
}