/**
 * PF2e Inline Roll Converter
 * 
 * Converts plain text descriptions into Foundry VTT inline automation syntax
 * for the Pathfinder 2e Remaster system.
 */

// Remaster damage types for validation
const DAMAGE_TYPES = [
    'acid', 'bludgeoning', 'cold', 'electricity', 'fire', 'force', 'mental', 
    'piercing', 'slashing', 'sonic', 'spirit', 'vitality', 'void', 'bleed', 'poison',
    'chaotic', 'evil', 'good', 'lawful', 'positive', 'negative'
];

// Skills list for skill check patterns
const SKILLS = [
    'Acrobatics', 'Arcana', 'Athletics', 'Crafting', 'Deception', 'Diplomacy', 
    'Intimidation', 'Medicine', 'Nature', 'Occultism', 'Performance', 'Religion', 
    'Society', 'Stealth', 'Survival', 'Thievery'
];

// Legacy to Remaster damage type mapping
const LEGACY_TO_REMASTER_DAMAGE_TYPE = {
    chaotic: 'spirit',
    evil: 'spirit',
    good: 'spirit',
    lawful: 'spirit',
    positive: 'vitality',
    negative: 'void'
};

// Patterns for legacy types
const LEGACY_ALIGNMENT_PATTERN = 'chaotic|evil|good|lawful';
const LEGACY_POSITIVE = 'positive';
const LEGACY_NEGATIVE = 'negative';

// Condition patterns for regexes
const CONDITIONS_WITH_VALUES = [
    'clumsy', 'doomed', 'drained', 'dying', 'enfeebled', 'frightened', 
    'sickened', 'slowed', 'stunned', 'stupefied', 'wounded'
];
const CONDITIONS_WITHOUT_VALUES = [
    'blinded', 'broken', 'concealed', 'confused', 'controlled', 'dazzled', 
    'deafened', 'fascinated', 'fatigued', 'fleeing', 'grabbed', 'immobilized', 
    'invisible', 'off-guard', 'paralyzed', 'petrified', 'prone', 'quickened', 
    'restrained', 'unconscious', 'undetected'
];
const CONDITIONS_WITH_VALUES_PATTERN = CONDITIONS_WITH_VALUES.join('|');
const CONDITIONS_WITHOUT_VALUES_PATTERN = CONDITIONS_WITHOUT_VALUES.join('|');

// Template patterns
const TEMPLATE_SHAPES = ['burst', 'cone', 'line', 'emanation'];
const TEMPLATE_SHAPES_PATTERN = TEMPLATE_SHAPES.join('|');

// Mapping of alternate shape names to standard shapes (for display text)
const ALTERNATE_SHAPE_NAMES = {
    'radius': 'burst',
    'sphere': 'burst',
    'cylinder': 'burst',
    'wedge': 'cone',
    'wall': 'line',
    // Special: square/cube are lines with width = distance
    'square': 'line',
    'cube': 'line'
};

// Healing patterns
const HEALING_TERMS = ['hit\\s+points?', 'HP', 'healing'];
const HEALING_TERMS_PATTERN = HEALING_TERMS.join('|');

// Duration patterns
const DURATION_UNITS = ['rounds?', 'seconds?', 'minutes?', 'hours?', 'days?'];
const DURATION_UNITS_PATTERN = DURATION_UNITS.join('|');

// Condition mapping for dynamic UUID retrieval
let conditionMap = new Map();

// Create regex patterns from type arrays
const DAMAGE_TYPE_PATTERN = DAMAGE_TYPES.join('|');
const SKILL_PATTERN = SKILLS.join('|');

/**
 * Try to get condition UUID from compendium
 * @param {string} conditionName - The condition name to look up
 * @returns {string|null} - The condition UUID or null if not found
 */
function getConditionUUIDFromCompendium(conditionName) {
    try {
        const conditionCompendium = game.packs.get('pf2e.conditionitems');
        if (!conditionCompendium) return null;
        
        const normalizedName = conditionName.toLowerCase().trim();
        
        // Search through the compendium index
        const entries = conditionCompendium.index.contents;
        for (const entry of entries) {
            if (entry.name.toLowerCase() === normalizedName) {
                return entry.uuid;
            }
        }
        
        return null;
    } catch (error) {
        // Silently fail - fallback UUIDs will be used
        return null;
    }
}

/**
 * Build condition mapping for dynamic UUID retrieval
 * @returns {Map} - Map of condition names to UUIDs
 */
function buildConditionMap() {
    const conditionMap = new Map();
    
    // List of all conditions we want to support
    const conditionNames = [
        ...CONDITIONS_WITHOUT_VALUES,
        ...CONDITIONS_WITH_VALUES
    ];
    
    // Conditions that can have values (for validation and documentation)
    const conditionsWithValues = CONDITIONS_WITH_VALUES;
    
    // Try to get all conditions from the compendium
    for (const conditionName of conditionNames) {
        const uuid = getConditionUUIDFromCompendium(conditionName);
        if (uuid) {
            conditionMap.set(conditionName, {
                uuid: uuid,
                name: conditionName,
                slug: conditionName
            });
        } else {
            console.warn(`PF2e Converter: Could not find UUID for condition "${conditionName}"`);
        }
    }
    
    // Fallback condition UUIDs (common PF2e conditions) - Updated for Remaster
    const fallbackConditions = {
        'blinded': 'Compendium.pf2e.conditionitems.Item.blinded',
        'broken': 'Compendium.pf2e.conditionitems.Item.broken',
        'clumsy': 'Compendium.pf2e.conditionitems.Item.clumsy',
        'concealed': 'Compendium.pf2e.conditionitems.Item.concealed',
        'confused': 'Compendium.pf2e.conditionitems.Item.confused',
        'controlled': 'Compendium.pf2e.conditionitems.Item.controlled',
        'dazzled': 'Compendium.pf2e.conditionitems.Item.dazzled',
        'deafened': 'Compendium.pf2e.conditionitems.Item.deafened',
        'doomed': 'Compendium.pf2e.conditionitems.Item.doomed',
        'drained': 'Compendium.pf2e.conditionitems.Item.drained',
        'dying': 'Compendium.pf2e.conditionitems.Item.dying',
        'enfeebled': 'Compendium.pf2e.conditionitems.Item.enfeebled',
        'fascinated': 'Compendium.pf2e.conditionitems.Item.fascinated',
        'fatigued': 'Compendium.pf2e.conditionitems.Item.fatigued',
        'fleeing': 'Compendium.pf2e.conditionitems.Item.fleeing',
        'frightened': 'Compendium.pf2e.conditionitems.Item.frightened',
        'grabbed': 'Compendium.pf2e.conditionitems.Item.grabbed',
        'immobilized': 'Compendium.pf2e.conditionitems.Item.immobilized',
        'invisible': 'Compendium.pf2e.conditionitems.Item.invisible',
        'off-guard': 'Compendium.pf2e.conditionitems.Item.off-guard',
        'paralyzed': 'Compendium.pf2e.conditionitems.Item.paralyzed',
        'petrified': 'Compendium.pf2e.conditionitems.Item.petrified',
        'prone': 'Compendium.pf2e.conditionitems.Item.prone',
        'quickened': 'Compendium.pf2e.conditionitems.Item.quickened',
        'restrained': 'Compendium.pf2e.conditionitems.Item.restrained',
        'sickened': 'Compendium.pf2e.conditionitems.Item.sickened',
        'slowed': 'Compendium.pf2e.conditionitems.Item.slowed',
        'stunned': 'Compendium.pf2e.conditionitems.Item.stunned',
        'stupefied': 'Compendium.pf2e.conditionitems.Item.stupefied',
        'unconscious': 'Compendium.pf2e.conditionitems.Item.unconscious',
        'undetected': 'Compendium.pf2e.conditionitems.Item.undetected',
        'wounded': 'Compendium.pf2e.conditionitems.Item.wounded'
    };
    
    // If we didn't get any conditions from the compendium, use fallbacks
    if (conditionMap.size === 0) {
        console.warn('PF2e Converter: No conditions found from compendium, using fallback mapping');
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
    
    return conditionMap;
}

/**
 * Get condition UUID by name
 * @param {string} conditionName - The condition name to look up
 * @returns {string|null} - The condition UUID or null if not found
 */
function getConditionUUID(conditionName) {
    const normalizedName = conditionName.toLowerCase().trim();
    
    // Get from our pre-loaded map
    const condition = conditionMap.get(normalizedName);
    
    return condition?.uuid || null;
}

/**
 * Initialize condition mapping
 */
function initializeConditionMap() {
    conditionMap = buildConditionMap();
}

// ===================== OOP PIPELINE ARCHITECTURE =====================

// Define a test input for demonstration and testing
const DEFAULT_TEST_INPUT = `Deal 4d6 fire damage and 2d4 persistent acid damage. The target becomes frightened 2 and clumsy 1. DC 21 Reflex save. DC 18 Arcana check or DC 18 Occultism check. Heal 3d8 hit points. 30-foot cone. Within 15 feet. Can't use this action again for 1d4 rounds. Use the Shove action.`;

// Utility for unique IDs
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// At the top, after other globals:
if (!window.pf2eInteractiveElements) window.pf2eInteractiveElements = {};

// === 1. Persistent Replacement List ===
if (!window.pf2eReplacements) window.pf2eReplacements = [];

// ===================== MODIFIER PANEL SYSTEM: CLASS-BASED CONFIGURATION =====================
/**
 * Modifier Panel Configuration Pattern (2024 Refactor)
 *
 * Each Replacement subclass (e.g., DamageReplacement, CheckReplacement, etc.) defines its own
 * modifier panel configuration as a static property or static getter named `panelConfig`.
 *
 * - The static `panelConfig` describes the panel's title, fields, and any special options.
 * - All modifier panel configuration should be done via these static properties, not via registration or mutation.
 * - Shared field definitions (e.g., DISPLAY_TEXT_FIELD, DAMAGE_COMPONENT_FIELDS) should be referenced for DRYness.
 * - The ModifierPanelManager and UI always access configs via the static property on the class (e.g., REPLACEMENT_CLASS_MAP[type].panelConfig).
 *
 * Example minimal panelConfig:
 *
 *   static get panelConfig() {
 *     return {
 *       title: 'My Type',
 *       fields: [DISPLAY_TEXT_FIELD]
 *     };
 *   }
 *
 * See each Replacement subclass for its specific configuration.
 */

// -------------------- Base Classes --------------------
class Replacement {
    constructor(match, type) {
        if (!match || typeof match !== 'object' || typeof match[0] !== 'string' || typeof match.index !== 'number') {
            throw new Error('Replacement: Invalid match object passed to constructor.');
        }
        this.id = generateId();
        this.startPos = match.index;
        this.endPos = match.index + match[0].length;
        this.originalText = match[0];
        this.enabled = true;
        this.priority = 0;
        this.displayText = '';
        this.type = type; // Store the type string for UI/lookup
        // For reset: store the last match/config used
        this._lastMatch = match;
        this._lastConfig = undefined;
        // originalRender will be set after parsing in subclasses
    }
    render() {
        // Logging for debugging render output
        console.log(`[render] id=${this.id} enabled=${this.enabled} returning=${this.enabled ? 'converted' : 'originalText'}`);
        if (!this.enabled) return this.originalText;
        return this.conversionRender();
    }
    // Subclasses must implement this
    conversionRender() { throw new Error('Must implement conversionRender()'); }
    getInteractiveParams() {
        const params = { type: this.type, id: this.id, displayText: this.displayText };
        return params;
    }
    renderInteractive() {
        const params = this.getInteractiveParams();
        window.pf2eInteractiveElements[this.id] = { ...params };
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
        
        if (['precision', 'splash'].includes(this.category)) formula = `(${formula})[${this.category}]`; // Handle precision and splash (they wrap the formula)
        if (this.category === 'persistent' && this.damageType) return `(${formula})[persistent,${this.damageType}]`; // Handle persistent damage (special case with damage type)
        if (this.damageType) formula = `(${formula})[${this.damageType}]`; // Handle regular damage type

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
        // Convert legacy types to remaster types
        let remasterType = damageType;
        if (damageType && LEGACY_TO_REMASTER_DAMAGE_TYPE[damageType]) {
            remasterType = LEGACY_TO_REMASTER_DAMAGE_TYPE[damageType];
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
        // Handle legacy damage type conversions
        if (this.rollType === 'legacy') {
            return this.renderLegacyConversion();
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
    
    renderLegacyConversion() {
        const originalText = this.originalText;
        
        // Handle alignment damage to spirit
        if (originalText.includes('chaotic') || originalText.includes('evil') || 
            originalText.includes('good') || originalText.includes('lawful')) {
            return originalText.replace(/(chaotic|evil|good|lawful)/g, 'spirit');
        }
        
        // Handle positive to vitality
        if (originalText.includes('positive')) {
            return originalText.replace(/positive/g, 'vitality');
        }
        
        // Handle negative to void
        if (originalText.includes('negative')) {
            return originalText.replace(/negative/g, 'void');
        }
        
        return originalText;
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
        this.dc = null;
        this.secret = false;
        this.defense = '';
        this.against = '';
        this.match = match;
        this.multipleSkills = false;
        this.skills = [];
        this.loreName = '';
        this.parseMatch(match, config);
        this.originalRender = this.render();
    }
    parseMatch(match, config) {
        super.parseMatch(match, config);
        this.secret = false;
        this.defense = '';
        this.against = '';
        this.multipleSkills = false;
        this.skills = [];
        // Extract check type, DC, and modifiers
        if (config && config.groups) {
            for (const group of config.groups) {
                if (group.type && match[group.type]) this.checkType = match[group.type].toLowerCase();
                if (group.dc && match[group.dc]) this.dc = match[group.dc];
            }
        } else {
            // Defensive: if match.replacement exists, skip parsing (already replaced)
            if (match && match.replacement) return;
            // Check if this is a lore check
            if (match.isLoreCheck) {
                this.checkType = 'lore';
                this.loreName = match.loreName;
                this.dc = match[1] || null;
                return;
            }
            // Check if this is a multiple skills match
            if (match.multipleSkills && match.skills) {
                this.multipleSkills = true;
                this.skills = match.skills;
                this.dc = match.dc || match[1] || null;
            } else {
                // Handle multiple skills logic (moved from pattern handler)
                if (match[2] && match[2].includes(' or ')) {
                    this.multipleSkills = true;
                    this.skills = match[2].split(/\s+or\s+/).map(s => s.trim());
                    this.dc = match[1] || null;
                } else {
                    this.checkType = match[2] ? match[2].toLowerCase() : '';
                    this.dc = match[1] || null;
                }
            }
        }
    }
    render() { return super.render(); }
    conversionRender() {
        // If match.replacement exists, use it directly
        if (this.match && this.match.replacement) {
            return this.match.replacement;
        }
        // Handle lore checks
        if (this.checkType === 'lore' && this.loreName) {
            let params = [`type:lore`];
            if (this.dc) params.push(`dc:${this.dc}`);
            params.push(`name:${this.loreName}`);
            if (this.traits && this.traits.length > 0) {
                params.push(`traits:${this.traits.join(',')}`);
            }
            if (this.displayText && this.displayText.trim()) {
                return `@Check[${params.join('|')}]` + `{${this.displayText}} check`;
            }
            return `@Check[${params.join('|')}]` + `{${this.loreName} Lore} check`;
        }
        // Handle multiple skills
        if (this.multipleSkills && this.skills.length > 0) {
            const skillChecks = this.skills.map(skill => {
                const params = [skill.toLowerCase()];
                if (this.dc) params.push(`dc:${this.dc}`);
                if (this.traits && this.traits.length > 0) {
                    params.push(`traits:${this.traits.join(',')}`);
                }
                if (this.displayText && this.displayText.trim()) {
                    return `@Check[${params.join('|')}]` + `{${this.displayText}}`;
                }
                return `@Check[${params.join('|')}]`;
            });
            return skillChecks.join(' or ') + ' check';
        }
        let params = [`${this.checkType}`];
        if (this.dc) params.push(`dc:${this.dc}`);
        if (this.traits && this.traits.length > 0) {
            params.push(`traits:${this.traits.join(',')}`);
        }
        if (this.displayText && this.displayText.trim()) {
            return `@Check[${params.join('|')}]` + `{${this.displayText}} check`;
        }
        return `@Check[${params.join('|')}] check`;
    }
    validate() {
        if (this.match && this.match.replacement) return true;
        if (this.multipleSkills) {
            return this.skills.length > 0 && this.dc;
        }
        return this.checkType && (this.dc || this.defense || this.against);
    }
    getInteractiveParams() {
        return {
            ...super.getInteractiveParams(),
            checkType: this.checkType,
            dc: this.dc,
            secret: this.secret,
            defense: this.defense,
            against: this.against,
            multipleSkills: this.multipleSkills,
            skills: this.skills,
            loreName: this.loreName,
            originalText: this.originalText
        };
    }
    static get panelConfig() {
        return {
            ...super.panelConfig,
            title: 'Skill Check',
            fields: [
                ENABLED_FIELD,
                {
                    id: 'skill-select',
                    type: 'select',
                    label: 'Skill',
                    options: [
                        'Acrobatics', 'Arcana', 'Athletics', 'Crafting', 'Deception', 'Diplomacy',
                        'Intimidation', 'Medicine', 'Nature', 'Occultism', 'Performance', 'Religion',
                        'Society', 'Stealth', 'Survival', 'Thievery', 'Lore'
                    ],
                    getValue: (rep) => rep.checkType ? rep.checkType.charAt(0).toUpperCase() + rep.checkType.slice(1) : '',
                    setValue: (rep, value) => { rep.checkType = value.toLowerCase(); }
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
                    id: 'skill-dc',
                    type: 'number',
                    label: 'DC',
                    min: 0,
                    getValue: (rep) => rep.dc || '',
                    setValue: (rep, value) => { rep.dc = value; }
                },
                ...super.panelConfig.fields.slice(1)
            ],
            commonTraits: ['secret']
        };
    }
    resetToOriginal() {
        super.resetToOriginal();
        // Removed secret, defense, against, multipleSkills, skills reset (now in parseMatch)
    }
}

// -------------------- Save Replacement --------------------
class SaveReplacement extends RollReplacement {
    constructor(match, type, config) {
        super(match, type);
        this.rollType = 'save';
        this.priority = 90;
        this.saveType = '';
        this.dc = null;
        this.basic = false;
        this.match = match;
        this.saveTermInInput = false; // Track if 'save' or 'saving throw' is present
        this.parseMatch(match, config);
        this.originalRender = this.render();
    }
    parseMatch(match, config) {
        super.parseMatch(match, config);
        if (match && match.replacement) return;
        for (let i = 1; i < match.length; i++) {
            const value = match[i];
            if (!value) continue;
            if (/^\d{1,2}$/.test(value)) {
                this.dc = value;
            } else if (/^(fort(?:itude)?|ref(?:lex)?|will)$/i.test(value)) {
                this.saveType = value.toLowerCase();
                if (this.saveType.startsWith('fort')) this.saveType = 'fortitude';
                else if (this.saveType.startsWith('ref')) this.saveType = 'reflex';
                else if (this.saveType.startsWith('will')) this.saveType = 'will';
            }
        }
        this.basic = /\bbasic\b/i.test(match[0]);
        // Detect if 'save' or 'saving throw' is present anywhere in the matched phrase
        this.saveTermInInput = /\b(save|saving throw)\b/i.test(match[0]);
    }
    render() { return super.render(); }
    conversionRender() {
        if (this.match && this.match.replacement) {
            return this.match.replacement;
        }
        let params = [`${this.saveType}`];
        if (this.dc) params.push(`dc:${this.dc}`);
        if (this.basic) params.push('basic');
        if (this.traits && this.traits.length > 0) {
            params.push(`traits:${this.traits.join(',')}`);
        }
        const originalText = this.match[0];
        const hasWrappingParentheses = originalText.startsWith('(') && originalText.endsWith(')');
        // Only append 'save' or 'saving throw' if it was present in the input
        let saveTerm = '';
        if (this.saveTermInInput) {
            // Use the exact term found in the input (prefer 'saving throw' if present)
            const found = originalText.match(/\b(saving throw|save)\b/i);
            saveTerm = found ? ` ${found[1]}` : '';
        }
        const replacement = `@Check[${params.join('|')}]` + (this.displayText && this.displayText.trim() ? `{${this.displayText}}` : '') + saveTerm;
        return hasWrappingParentheses ? `(${replacement})` : replacement;
    }
    validate() {
        if (this.match && this.match.replacement) return true;
        return this.saveType && this.dc;
    }
    getInteractiveParams() {
        return {
            ...super.getInteractiveParams(),
            saveType: this.saveType,
            dc: this.dc,
            basic: this.basic,
            secret: this.secret,
            traits: this.traits,
            originalText: this.originalText
        };
    }
    static get panelConfig() {
        return {
            ...super.panelConfig,
            title: 'Saving Throw',
            fields: [
                ENABLED_FIELD,
                {
                    id: 'save-type',
                    type: 'select',
                    label: 'Type',
                    options: [
                        { value: 'fortitude', label: 'Fortitude' },
                        { value: 'reflex', label: 'Reflex' },
                        { value: 'will', label: 'Will' }
                    ],
                    getValue: (rep) => rep.saveType || '',
                    setValue: (rep, value) => { rep.saveType = value; }
                },
                {
                    id: 'save-dc',
                    type: 'number',
                    label: 'DC',
                    min: 0,
                    getValue: (rep) => rep.dc || '',
                    setValue: (rep, value) => { rep.dc = value; }
                },
                {
                    id: 'save-basic',
                    type: 'checkbox',
                    label: 'Basic',
                    getValue: (rep) => !!rep.basic,
                    setValue: (rep, value) => { rep.basic = value; }
                },
                ...super.panelConfig.fields.slice(1)
            ],
            commonTraits: ['secret']
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
        const isAlternateShape = Object.prototype.hasOwnProperty.call(ALTERNATE_SHAPE_NAMES, shapeName);
        this.shape = ALTERNATE_SHAPE_NAMES[shapeName] || shapeName;
        // Special handling for square/cube: width = distance
        if ((shapeName === 'square' || shapeName === 'cube') && this.distance) {
            this.width = this.distance;
        } else {
            this.width = 5; // default for lines
        }
        // If displayText is provided by the match, use it. Otherwise, if alternate shape, set displayText to the original phrase.
        if (match.displayText) {
            this.displayText = match.displayText;
        } else if (isAlternateShape && this.distance) {
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
                    options: TEMPLATE_SHAPES.map(shape => ({ value: shape, label: shape.charAt(0).toUpperCase() + shape.slice(1) })),
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
        this.linkedConditions = config && config.linkedConditions ? config.linkedConditions : new Set();
        this.args = matchObj.args || [];
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
        // args: [condition, value?]
        super.parseMatch();
        const args = this.args;
        this.conditionName = args[0] || '';
        this.degree = args[1] || null;
        this.uuid = getConditionUUID(this.conditionName);
    }
    render() { return super.render(); }
    conversionRender() {
        if (!this.uuid) return this.originalText;
        const capitalized = this.conditionName.charAt(0).toUpperCase() + this.conditionName.slice(1);
        let display = this.displayText && this.displayText.trim() ? this.displayText : (this.degree ? `${capitalized} ${this.degree}` : capitalized);
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
        // Combine and sort all conditions alphabetically
        const allConditions = [...CONDITIONS_WITH_VALUES, ...CONDITIONS_WITHOUT_VALUES]
            .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
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
                    options: allConditions.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) })),
                    getValue: (rep) => rep.conditionName || '',
                    setValue: (rep, value) => {
                        rep.conditionName = value;
                        rep.uuid = getConditionUUID(value);
                        if (!CONDITIONS_WITH_VALUES.includes(value)) {
                            rep.degree = null;
                        }
                    }
                },
                {
                    id: 'condition-value',
                    type: 'number',
                    label: 'Value',
                    min: 1,
                    getValue: (rep) => rep.degree || '',
                    setValue: (rep, value) => { rep.degree = value ? String(value) : null; },
                    hideIf: (rep) => !CONDITIONS_WITH_VALUES.includes(rep.conditionName)
                },
                ...super.panelConfig.fields.slice(1)
            ]
        };
    }
    resetToOriginal() {
        super.resetToOriginal();
    }
}

// -------------------- Flat Check Replacement --------------------
class FlatCheckReplacement extends RollReplacement {
    constructor(match, type, config) {
        super(match, type);
        this.rollType = 'flat';
        this.priority = 80;
        this.dc = null;
        this.match = match;
        this.parseMatch(match, config);
        this.originalRender = this.render();
    }
    parseMatch(match, config) {
        super.parseMatch(match, config);
        // Defensive: if match.replacement exists, skip parsing (already replaced)
        if (match && match.replacement) return;
        // Flat check pattern: match[1] is DC
        this.dc = match[1] || null;
    }
    render() { return super.render(); }
    conversionRender() {
        if (this.match && this.match.replacement) {
            return this.match.replacement;
        }
        let params = ['flat'];
        if (this.dc) params.push(`dc:${this.dc}`);
        if (this.displayText && this.displayText.trim()) {
            return `@Check[${params.join('|')}]` + `{${this.displayText}}`;
        }
        return `@Check[${params.join('|')}]`;
    }
    validate() {
        if (this.match && this.match.replacement) return true;
        return this.dc !== null;
    }
    getInteractiveParams() {
        return {
            ...super.getInteractiveParams(),
            dc: this.dc,
            originalText: this.originalText
        };
    }
    static get panelConfig() {
        return {
            ...super.panelConfig,
            title: 'Flat Check',
            fields: [
                ENABLED_FIELD,
                {
                    id: 'flat-dc',
                    type: 'number',
                    label: 'DC',
                    min: 0,
                    getValue: (rep) => rep.dc || '',
                    setValue: (rep, value) => { rep.dc = value; }
                },
                DISPLAY_TEXT_FIELD
            ],
            showTraits: false
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
                    id: 'duration-unit',
                    type: 'select',
                    label: 'Unit',
                    options: [
                        { value: 'rounds', label: 'Rounds' },
                        { value: 'seconds', label: 'Seconds' },
                        { value: 'minutes', label: 'Minutes' },
                        { value: 'hours', label: 'Hours' },
                        { value: 'days', label: 'Days' }
                    ],
                    getValue: (rep) => rep.unit.replace(/s$/, ''),
                    setValue: (rep, value) => { rep.unit = value; }
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

// Replacement class mapping for pattern types
const REPLACEMENT_CLASS_MAP = {
    damage: DamageReplacement,
    healing: HealingReplacement, // Dedicated healing replacement class
    save: SaveReplacement, // Dedicated save replacement class
    skill: CheckReplacement,
    template: TemplateReplacement,
    condition: ConditionReplacement,
    legacy: DamageReplacement, // Use DamageReplacement for legacy damage type conversions
    flat: FlatCheckReplacement, // Flat check support
    duration: DurationReplacement, // Duration replacement
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



// ===================== PATTERN DEFINITIONS =====================
// Centralized pattern definitions
const PATTERN_DEFINITIONS = [
    // NEW: Multi-damage pattern (highest priority)
    {
        type: 'damage',
        // Comprehensive regex: matches a sequence of dice/type pairs including persistent, splash, precision, and basic damage
        // Updated to handle both dice expressions (3d6) and fixed numbers (4)
        regex: new RegExp(`((?:\\d+(?:d\\d+)?(?:[+-]\\d+)?\\s+(?:(?:persistent\\s+)?(?:${DAMAGE_TYPE_PATTERN})(?:\\s+persistent)?|(?:${DAMAGE_TYPE_PATTERN})\\s+splash|splash\\s+(?:${DAMAGE_TYPE_PATTERN})|(?:${DAMAGE_TYPE_PATTERN})\\s+precision|precision\\s+(?:${DAMAGE_TYPE_PATTERN})|precision|(?:${DAMAGE_TYPE_PATTERN}))(?:\\s+damage)?(?:\\s*,\\s*|\\s*,\\s*and\\s*|\\s*,\\s*plus\\s*|\\s+and\\s+|\\s+plus\\s+))*\\d+(?:d\\d+)?(?:[+-]\\d+)?\\s+(?:(?:persistent\\s+)?(?:${DAMAGE_TYPE_PATTERN})(?:\\s+persistent)?|(?:${DAMAGE_TYPE_PATTERN})\\s+splash|splash\\s+(?:${DAMAGE_TYPE_PATTERN})|(?:${DAMAGE_TYPE_PATTERN})\\s+precision|precision\\s+(?:${DAMAGE_TYPE_PATTERN})|precision|(?:${DAMAGE_TYPE_PATTERN}))(?:\\s+damage)?)`, 'gi'),
        priority: PRIORITY.DAMAGE + 10, // Higher than all other damage patterns
        handler: function(match) {
            // Find all dice/type pairs in the match[0] string
            // Accepts: '1d4 acid, 1d6 persistent bleed, and 1d4 slashing damage' (with or without 'damage' after each type)
            // Updated to handle both dice expressions (3d6) and fixed numbers (4)
            const singlePattern = new RegExp(`(\\d+(?:d\\d+)?(?:[+-]\\d+)?)\\s+(?:(?:persistent\\s+)?(?:(${DAMAGE_TYPE_PATTERN}))(?:\\s+persistent)?|(?:(${DAMAGE_TYPE_PATTERN}))\\s+splash|splash\\s+(${DAMAGE_TYPE_PATTERN})|(?:(${DAMAGE_TYPE_PATTERN}))\\s+precision|precision\\s+(${DAMAGE_TYPE_PATTERN})|precision|(?:(${DAMAGE_TYPE_PATTERN})))(?:\\s+damage)?`, 'gi');
            let m;
            const multiMatches = [];
            while ((m = singlePattern.exec(match[0])) !== null) {
                multiMatches.push(m);
            }
            // Attach all submatches for DamageReplacement
            match.multiMatches = multiMatches;
            return match;
        },
        description: 'Multi-damage grouping (comma, and, or both separated, trailing damage allowed) - includes persistent, splash, precision - now handles both dice and fixed numbers'
    },
    // Priority 1: Comprehensive save pattern
    {
        type: 'save',
        // Updated regex: do NOT look for 'save' or 'saving throw' at the end at all
        regex: /(?:\(?)((?:basic\s+)?(?:DC\s*(\d{1,2})\s*[,;:\(\)]?\s*)?(fort(?:itude)?|ref(?:lex)?|will)(?:\s+(?:save|saving\s+throw))?(?:\s*[,;:\(\)]?\s*(?:basic\s+)?DC\s*(\d{1,2}))|(?:basic\s+)?(fort(?:itude)?|ref(?:lex)?|will)(?:\s+(?:save|saving\s+throw))?\s+basic(?:\s*[,;:\(\)]?\s*DC\s*(\d{1,2}))|(?:basic\s+)?DC\s*(\d{1,2})\s+(fort(?:itude)?|ref(?:lex)?|will)|DC\s*(\d{1,2})\s+(?:basic\s+)?(fort(?:itude)?|ref(?:lex)?|will))(?:\)?)/gi,
        priority: PRIORITY.SAVE,
        handler: (match) => match,
        description: 'Comprehensive save pattern (all variations, does not look for save/saving throw at end at all)'
    },
    // Priority 2: Damage and skill patterns
    {
        type: 'damage',
        regex: new RegExp(`(\\d+(?:d\\d+)?(?:[+-]\\d+)?)\\s+(?:persistent\\s+(${DAMAGE_TYPE_PATTERN})|(${DAMAGE_TYPE_PATTERN})\\s+persistent)(?:\\s+damage)?`, 'gi'),
        priority: PRIORITY.DAMAGE,
        handler: (match) => match,
        description: 'Persistent damage'
    },
    {
        type: 'damage',
        regex: new RegExp(`(\\d+(?:d\\d+)?(?:[+-]\\d+)?)\\s+(?:(${DAMAGE_TYPE_PATTERN})\\s+splash|splash\\s+(${DAMAGE_TYPE_PATTERN}))(?:\\s+damage)?`, 'gi'),
        priority: PRIORITY.DAMAGE,
        handler: (match) => match,
        description: 'Splash damage'
    },
    {
        type: 'damage',
        regex: new RegExp(`(\\d+(?:d\\d+)?(?:[+-]\\d+)?)\\s+(?:precision\\s+(${DAMAGE_TYPE_PATTERN})|(${DAMAGE_TYPE_PATTERN})\\s+precision)(?:\\s+damage)?`, 'gi'),
        priority: PRIORITY.DAMAGE,
        handler: (match) => match,
        description: 'Precision damage with type'
    },
    {
        type: 'damage',
        regex: /(\d+(?:d\d+)?(?:[+-]\d+)?)\s+precision(?:\s+damage)?/gi,
        priority: PRIORITY.DAMAGE,
        handler: (match) => match,
        description: 'Generic precision damage'
    },
    // Healing patterns - consolidated handler
    {
        type: 'healing',
        regex: new RegExp(`(\\d+(?:d\\d+)?(?:[+-]\\d+)?)(?:\\s+${HEALING_TERMS_PATTERN})(?:\\s+(?:healed|damage))?`, 'gi'),
        priority: PRIORITY.HEALING,
        handler: (match) => match,
        description: 'Healing patterns (hit points, HP, healing)'
    },
    {
        type: 'skill',
        regex: new RegExp(`DC\\s+(\\d+)\\s+((?:${SKILL_PATTERN})(?:\\s*,\\s*(?:${SKILL_PATTERN}))*\\s*(?:,\\s*)?(?:or\\s+)?(?:${SKILL_PATTERN}))\\s+check`, 'gi'),
        priority: PRIORITY.SKILL,
        handler: (match) => match,
        description: 'Multiple skill checks with "or" separators'
    },
    {
        type: 'skill',
        regex: /DC\s+(\d+)\s+Perception\s+check/gi,
        priority: PRIORITY.SKILL,
        handler: (match) => match,
        description: 'Perception checks'
    },
    {
        type: 'skill',
        regex: /DC\s+(\d+)\s+([^0-9\n]+?)\s+Lore\s+check/gi,
        priority: PRIORITY.SKILL,
        handler: (match) => {
            // Mark this as a lore check for special handling
            match.isLoreCheck = true;
            match.loreName = match[2].trim();
            return match;
        },
        description: 'Lore skill checks (DC first)'
    },
    {
        type: 'skill',
        regex: /([^0-9\n]+?)\s+Lore\s+DC\s+(\d+)\s+check/gi,
        priority: PRIORITY.SKILL,
        handler: (match) => {
            // Mark this as a lore check for special handling  
            match.isLoreCheck = true;
            match.loreName = match[1].trim();
            // Normalize: put DC in position [1] like other patterns
            match[1] = match[2]; // DC
            match[2] = match.loreName; // Lore name
            return match;
        },
        description: 'Lore skill checks (lore name first)'
    },
    {
        type: 'skill',
        regex: /([^0-9\n]+?)\s+Lore\s+check\s+DC\s+(\d+)/gi,
        priority: PRIORITY.SKILL,
        handler: (match) => {
            // Mark this as a lore check for special handling
            match.isLoreCheck = true;
            match.loreName = match[1].trim();
            // Normalize: put DC in position [1] like other patterns
            match[1] = match[2]; // DC
            match[2] = match.loreName; // Lore name
            return match;
        },
        description: 'Lore skill checks (DC at end)'
    },
    {
        type: 'flat',
        regex: /DC\s+(\d+)\s+flat\s+check/gi,
        priority: PRIORITY.FLAT,
        handler: (match) => match,
        description: 'Flat checks'
    },
    
    // Priority 3: Basic damage and skill patterns (lowered priority)
    {
        type: 'damage',
        regex: new RegExp(`(\\d+(?:d\\d+)?(?:[+-]\\d+)?)\\s+(${DAMAGE_TYPE_PATTERN})(?:\\s+damage)?`, 'gi'),
        priority: PRIORITY.BASIC_DAMAGE - 10, // Lowered priority
        handler: (match) => match,
        description: 'Basic damage rolls (single)'
    },
    {
        type: 'skill',
        regex: new RegExp(`DC\\s+(\\d+)\\s+(${SKILL_PATTERN})\\s+check`, 'gi'),
        priority: PRIORITY.BASIC_SKILL,
        handler: (match) => match,
        description: 'Single skill checks'
    },
    // Priority 4: Legacy damage type conversions
    {
        type: 'legacy',
        regex: new RegExp(`@Damage\\[(.*?\\[)([^\\]]*?)(${LEGACY_ALIGNMENT_PATTERN})([^\\]]*?)\\](.*?)\\]`, 'gi'),
        priority: PRIORITY.LEGACY,
        handler: (match) => match,
        description: 'Legacy alignment damage to spirit (within @Damage, anywhere in type list)'
    },
    {
        type: 'legacy',
        regex: new RegExp(`@Damage\\[(.*?\\[)([^\\]]*?)(${LEGACY_POSITIVE})([^\\]]*?)\\](.*?)\\]`, 'gi'),
        priority: PRIORITY.LEGACY,
        handler: (match) => match,
        description: 'Legacy positive damage to vitality (within @Damage, anywhere in type list)'
    },
    {
        type: 'legacy',
        regex: new RegExp(`@Damage\\[(.*?\\[)([^\\]]*?)(${LEGACY_NEGATIVE})([^\\]]*?)\\](.*?)\\]`, 'gi'),
        priority: PRIORITY.LEGACY,
        handler: (match) => match,
        description: 'Legacy negative damage to void (within @Damage, anywhere in type list)'
    },
    // Priority 5: Damage consolidation
    {
        type: 'damage',
        regex: /@Damage\[[^\@]*\](?:\s+(?:(?:splash|precision)\s+)?damage|(?:\s+(?:splash|precision)))?(?:\s*,\s*(?:and\s+)?|\s+and\s+)@Damage\[[^\@]*\](?:\s+(?:splash|precision))?(?:(?:\s*,\s*(?:and\s+)?|\s+and\s+)@Damage\[[^\@]*\](?:\s+(?:(?:splash|precision)\s+)?damage|(?:\s+(?:splash|precision)))?)*(?:\s+(?:splash|precision))?/gi,
        priority: PRIORITY.DAMAGE_CONSOLIDATION,
        handler: (match) => match,
        description: 'Multiple damage types consolidation'
    },
    // Priority 5: Legacy flat-footed
    {
        type: 'condition',
        regex: /(?<!@UUID\[[^\]]*\]\{[^}]*\})\bflat-footed\b(?!\})/gi,
        priority: PRIORITY.LEGACY_CONDITION,
        handler: function(match) {
            // Pass the original match object for correct span, but set args to 'off-guard'
            return { match, args: ['off-guard'] };
        },
        description: 'Legacy flat-footed to off-guard conversion (before condition linking)'
    },
    // Priority 6: Condition linking
    {
        // Value-conditions: match name, optionally followed by a value
        type: 'condition',
        regex: new RegExp(`(?<!@UUID\\[[^\\]]*\\]\\{[^}]*\\})\\b(${CONDITIONS_WITH_VALUES_PATTERN})(?:\\s+(\\d+))?\\b(?!\\})`, 'gi'),
        priority: PRIORITY.CONDITION,
        handler: match => ({ match, args: [match[1], match[2]] }),
        description: 'Condition (with or without value) for value-conditions'
    },
    {
        // Value-less conditions: match name, but not if followed by a value
        type: 'condition',
        regex: new RegExp(`(?<!@UUID\\[[^\\]]*\\]\\{[^}]*\\})\\b(${CONDITIONS_WITHOUT_VALUES_PATTERN})\\b(?!\\s+\\d+)(?!\\})`, 'gi'),
        priority: PRIORITY.CONDITION,
        handler: match => ({ match, args: [match[1]] }),
        description: 'Condition (no value allowed) for value-less conditions'
    },
    // Priority 7: Area effects (consolidated)
    {
        type: 'template',
        regex: new RegExp(`(\\d+)\\s*-?(?:foot|feet)\\s+(${TEMPLATE_SHAPES_PATTERN}|${Object.keys(ALTERNATE_SHAPE_NAMES).join('|')})`, 'gi'),
        priority: PRIORITY.TEMPLATE,
        handler: (match) => match,
        description: 'Consolidated area effects (standard and alternate shape names, with optional hyphen) - accepts both foot and feet'
    },
    // Priority 7: "within X feet" pattern
    {
        type: 'template',
        regex: /within\s+(\d+)\s+(?:foot|feet)/gi,
        priority: PRIORITY.TEMPLATE,
        handler: (match) => {
            // Simulate a template match for an emanation
            return {
                0: match[0],
                1: match[1], // distance
                2: 'emanation', // shape
                index: match.index,
                displayText: `within ${match[1]} feet`,
                isWithin: true // optional flag for future use
            };
        },
        description: '"within X feet" pattern for inline template generation'
    },
    // Duration pattern: dice expression followed by a time unit
    {
        type: 'duration',
        regex: new RegExp(`(\\d+d\\d+(?:[+-]\\d+)?|\\d+)(?:\\s+)(rounds?|seconds?|minutes?|hours?|days?)`, 'gi'),
        priority: 75,
        handler: (match) => match,
        description: 'Duration rolls (dice expression followed by a time unit)'
    },
];

// Update all patterns in PATTERN_DEFINITIONS to use a handler function
// (Most already do, but ensure all do, including those with static replacements)
PATTERN_DEFINITIONS.forEach(def => {
    if (typeof def.handler !== 'function') {
        // If the handler is a string, wrap it in a function
        const staticValue = def.handler;
        def.handler = () => staticValue;
    }
});

// Update condition pattern handlers in PATTERN_DEFINITIONS to just return match data
PATTERN_DEFINITIONS.forEach(def => {
    if (def.type === 'condition' && def.description !== 'Legacy flat-footed to off-guard conversion (before condition linking)') {
        def.handler = function(match) {
            // Return the original RegExp match object and arguments for ConditionReplacement
            return { match, args: match.slice(1) };
        };
    }
});

class PatternDetector {
    constructor() {
        this.patterns = [];
        this.initializePatterns();
    }
    initializePatterns() {
        for (const def of PATTERN_DEFINITIONS) {
            this.registerPattern(def.type, def.regex, def.priority, { handler: def.handler, description: def.description });
        }
    }
    registerPattern(type, regex, priority, config = {}) {
        this.patterns.push({ type, regex, priority, config });
    }
    detectAll(text) {
        const allMatches = [];
        for (const pattern of this.patterns) {
            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                const handler = pattern.config && pattern.config.handler;
                const handlerResult = handler ? handler(match) : match;
                // Defensive: skip undefined or malformed handler results
                if (!handlerResult || (typeof handlerResult !== 'string' && typeof handlerResult !== 'object')) {
                    continue;
                }
                allMatches.push({
                    match: handlerResult,
                    type: pattern.type,
                    config: pattern.config,
                    priority: pattern.priority,
                    index: match.index
                });
            }
        }
        const resolvedMatches = this.resolveConflicts(allMatches);
        return resolvedMatches;
    }
    resolveConflicts(matches) {
        // Remove overlaps: keep highest priority, then leftmost
        matches.sort((a, b) => a.priority !== b.priority ? b.priority - a.priority : a.index - b.index);
        const result = [];
        const covered = new Array();
        for (const m of matches) {
            let matchArr = m.match && m.match.match ? m.match.match : m.match;
            if (!matchArr || typeof matchArr[0] !== 'string' || typeof matchArr.index !== 'number') {
                continue;
            }
            const start = matchArr.index;
            const end = start + matchArr[0].length;
            if (!covered.some(([s, e]) => (start < e && end > s))) {
                result.push(m);
                covered.push([start, end]);
            }
        }
        return result;
    }
}

// -------------------- Condition Detector --------------------
class ConditionDetector {
    constructor() {
        this.conditions = new Map();
        this.initializeConditions();
    }
    initializeConditions() {
        // Build condition map from fallback (could use game.pf2e.conditions if available)
        for (const [name, obj] of conditionMap.entries()) {
            this.conditions.set(name, obj);
        }
    }
    detectConditions(text) {
        const found = [];
        const processed = new Set();
        for (const [key, condition] of this.conditions) {
            if (!processed.has(key)) {
                const regex = new RegExp(`\\b${key}\\b(\\s+\\d+)?`, 'gi');
                let match;
                while ((match = regex.exec(text)) !== null) {
                    found.push(match);
                    processed.add(key);
                }
            }
        }
        return found;
    }
}

// -------------------- Text Processor --------------------
class TextProcessor {
    constructor() {
        this.detector = new PatternDetector();
        this.conditionDetector = new ConditionDetector();
        this.linkedConditions = new Set();
    }
    process(inputText) {
        // Parse and create new replacements from scratch
        // Reset linkedConditions to ensure deduplication is fresh for each parse
        this.linkedConditions = new Set();
        const rollMatches = this.detector.detectAll(inputText);
        const replacements = this.createReplacements(rollMatches);
        return replacements;
    }
    createReplacements(rollMatches) {
        rollMatches.sort((a, b) => {
            const aPos = a.match && a.match.match && typeof a.match.match.index === 'number' ? a.match.match.index : a.match.index;
            const bPos = b.match && b.match.match && typeof b.match.match.index === 'number' ? b.match.match.index : b.match.index;
            return aPos - bPos;
        });
        const replacements = [];
        rollMatches.forEach((matchObj, index) => {
            try {
                let rep;
                if (matchObj.type === 'condition') {
                    rep = ReplacementFactory.createFromMatch(matchObj.match, matchObj.type, { linkedConditions: this.linkedConditions });
                } else {
                    rep = ReplacementFactory.createFromMatch(matchObj.match, matchObj.type, matchObj.config);
                }
                replacements.push(rep);
            } catch (err) {
                console.error('[TextProcessor] Error creating replacement:', err, matchObj);
            }
        });
        return this.sortByPriority(replacements);
    }
    sortByPriority(replacements) {
        return replacements.sort((a, b) => b.priority - a.priority || a.startPos - b.startPos);
    }
    // New: render from a list of replacements
    renderFromReplacements(text, replacements, interactive = false) {
        // Apply all replacements in reverse position order
        const sorted = replacements.slice().sort((a, b) => b.startPos - a.startPos);
        let result = text;
        for (let i = 0; i < sorted.length; i++) {
            const replacement = sorted[i];
            console.log(`[renderFromReplacements] id=${replacement.id} enabled=${replacement.enabled}`);
            result = this.applyReplacement(result, replacement, interactive);
        }
        // After all replacements, replace any remaining 'flat-footed' with 'off-guard'
        result = result.replace(/\bflat-footed\b/gi, 'off-guard');
        return result;
    }
    applyReplacement(text, replacement, interactive = false) {
        const before = text.substring(0, replacement.startPos);
        const after = text.substring(replacement.endPos);
        const rendered = interactive ? replacement.renderInteractive() : replacement.render();
        return before + rendered + after;
    }
}

// -------------------- Macro Interface --------------------
class MacroInterface {
    constructor() {
        this.processor = new TextProcessor();
    }
    showDialog() {
        showConverterDialog();
    }
    processText(input, opts) {
        try {
            const result = this.processor.process(input, opts);
            return result;
        } catch (error) {
            ui.notifications.error(`Conversion failed: ${error.message}`);
            return input;
        }
    }
}

// ===================== END OOP PIPELINE ARCHITECTURE =====================

/**
 * Validate damage types in text
 * @param {string} text - Text to validate
 * @returns {object} - Validation results
 */
function validateDamageTypes(text) {
    const foundTypes = [];
    
    // Find all damage type mentions
    const damageRegex = /(\w+)\s+damage/gi;
    let match;
    
    while ((match = damageRegex.exec(text)) !== null) {
        const damageType = match[1].toLowerCase();
        
        if (DAMAGE_TYPES.includes(damageType)) {
            foundTypes.push(damageType);
        }
    }
    
    return {
        validTypes: [...new Set(foundTypes)],
        hasLegacyTypes: false
    };
}

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
                margin-bottom: 5px;
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
            .modifier-field-row.flex-start {
                align-items: flex-start;
            }
            #damage-modifier-form,
            #modifier-panel form,
            .damage-component {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .pf2e-interactive.disabled {
                background: none;
            }
            .pf2e-interactive.disabled:hover {
                background: #dddddd;
            }
            .damage-component label {
                width: 88px !important;
            }
        </style>
    `;

    const dialog = new Dialog({
        title: "PF2e Inline Roll Converter",
        content: dialogContent,
        buttons: {},
        render: (html) => {
            const inputTextarea = html.find('#input-text');
            const outputHtmlDiv = html.find('#output-html')[0];
            const livePreview = html.find('#live-preview')[0];
            const modifierPanelContent = html.find('#modifier-panel-content')[0];
            let lastRawConvertedText = '';
            let lastInputText = '';
            let selectedElementId = null; // Track selected element
            const processor = new TextProcessor();
            const modifierPanelManager = new ModifierPanelManager();

            // === 2. Input Handler ===
            function handleInputChange() {
                const inputText = inputTextarea.val();
                lastInputText = inputText;
                selectedElementId = null; // Clear selection on input change
                // Always reset the modifier panel on input change
                modifierPanelContent.innerHTML = '<em>Select an element to modify.</em>';
                if (inputText.trim()) {
                    // Parse and create new replacements
                    window.pf2eReplacements = processor.process(inputText);
                    renderAll();
                } else {
                    window.pf2eReplacements = [];
                    outputHtmlDiv.innerHTML = '<em style="color: #999;">Live preview will appear here...</em>';
                    livePreview.innerHTML = '<em style="color: #999;">Live preview will appear here...</em>';
                    // modifierPanelContent.innerHTML = '<em>Select an element to modify.</em>'; // Already set above
                }
            }

            // === 3. Modifier Panel Handler ===
            function handleModifierChange(rep) {
                // rep is the replacement object to update
                console.log(`[handleModifierChange] id=${rep.id} enabled=${rep.enabled}`);
                renderAll();
            }

            // === 4. Rendering ===
            function renderAll() {
                // Render output and preview from pf2eReplacements
                if (!window.pf2eReplacements || !lastInputText.trim()) return;
                // Log enabled state of all replacements before rendering
                window.pf2eReplacements.forEach(r => {
                    console.log(`[renderAll] id=${r.id} enabled=${r.enabled}`);
                });
                // Render interactive output
                const htmlOutput = processor.renderFromReplacements(lastInputText, window.pf2eReplacements, true).replace(/\r?\n/g, '<br>');
                outputHtmlDiv.innerHTML = htmlOutput;
                // Add click handlers for interactive elements
                const interactiveEls = outputHtmlDiv.querySelectorAll('.pf2e-interactive');
                interactiveEls.forEach(el => {
                    el.addEventListener('click', (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const id = el.getAttribute('data-id');
                        // If this element is already selected, deselect it
                        if (selectedElementId === id && el.classList.contains('selected')) {
                            el.classList.remove('selected');
                            selectedElementId = null;
                            modifierPanelContent.innerHTML = '<em>Select an element to modify.</em>';
                            return;
                        }
                        // Otherwise, select this element and deselect others
                        interactiveEls.forEach(e => e.classList.remove('selected'));
                        el.classList.add('selected');
                        selectedElementId = id; // Track selected element
                        const type = el.getAttribute('data-type');
                        let rep = window.pf2eReplacements.find(r => r.id === id);
                        if (!rep) return;
                        const panelHTML = modifierPanelManager.generatePanelHTML(type, rep);
                        modifierPanelContent.innerHTML = panelHTML;
                        // Add event listeners to the form
                        const form = modifierPanelContent.querySelector(`#${type}-modifier-form`);
                        if (form) {
                            modifierPanelManager.addFormListeners(form, type, rep, handleModifierChange);
                        }
                        if (typeof el.scrollIntoView === 'function') {
                            el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                        }
                        // Attach reset button handler
                        attachResetButtonHandler(rep, type);
                    });
                });
                // Re-apply selection if there was a selected element
                if (selectedElementId) {
                    const selectedEl = outputHtmlDiv.querySelector(`[data-id="${selectedElementId}"]`);
                    if (selectedEl) {
                        selectedEl.classList.add('selected');
                    }
                }
                // Render non-interactive preview
                lastRawConvertedText = processor.renderFromReplacements(lastInputText, window.pf2eReplacements, false);
                createLivePreview(lastRawConvertedText, livePreview);
            }

            // Attach reset button handler (now has access to modifierPanelContent, outputHtmlDiv, etc.)
            function attachResetButtonHandler(rep, type) {
                const resetBtn = modifierPanelContent.querySelector('#modifier-reset-btn');
                if (resetBtn) {
                    resetBtn.onclick = function() {
                        if (!selectedElementId) return;
                        // Find the replacement
                        const idx = window.pf2eReplacements.findIndex(r => r.id === selectedElementId);
                        if (idx === -1) return;
                        const rep = window.pf2eReplacements[idx];
                        rep.resetToOriginal();
                        renderAll();
                        // Reselect in the UI and update modifier panel
                        const selectedEl = outputHtmlDiv.querySelector(`[data-id="${selectedElementId}"]`);
                        if (selectedEl) selectedEl.classList.add('selected');
                        const type = rep.type;
                        const panelHTML = modifierPanelManager.generatePanelHTML(type, rep);
                        modifierPanelContent.innerHTML = panelHTML;
                        const form = modifierPanelContent.querySelector(`#${type}-modifier-form`);
                        if (form) {
                            modifierPanelManager.addFormListeners(form, type, rep, handleModifierChange);
                        }
                        // Re-attach the reset button handler after rerender
                        attachResetButtonHandler(rep, type);
                    };
                }
            }

            // === 5. Hook up events ===
            inputTextarea.on('input', handleInputChange);
            setTimeout(() => {
                inputTextarea.trigger('input');
            }, 0);
            html.find('#copy-output').click((event) => {
                event.preventDefault();
                event.stopPropagation();
                const outputText = lastRawConvertedText;
                if (outputText.trim()) {
                    copyToClipboard(outputText);
                } else {
                    ui.notifications.warn("No converted text to copy.");
                }
            });
            html.find('#clear-all').click((event) => {
                event.preventDefault();
                event.stopPropagation();
                inputTextarea.val('');
                lastRawConvertedText = '';
                window.pf2eReplacements = [];
                outputHtmlDiv.innerHTML = '<em style="color: #999;">Live preview will appear here...</em>';
                livePreview.innerHTML = '<em style="color: #999;">Live preview will appear here...</em>';
                modifierPanelContent.innerHTML = '<em>Select an element to modify.</em>';
            });
        }
    }, {
        width: 1000,
        height: 700,
        resizable: true
    });
    dialog.render(true);
}

// Main execution
try {
    // Verify we're in a PF2e game
    if (game.system.id !== 'pf2e') {
        ui.notifications.error("This macro is designed for the Pathfinder 2e system only.");
        return;
    }
    
    // Verify minimum Foundry version
    if (!game.version || parseInt(game.version.split('.')[0]) < 12) {
        ui.notifications.warn("This macro is designed for Foundry VTT v12+. Some features may not work properly.");
    }
    
    // Initialize condition mapping
    initializeConditionMap();
    
    // Show the converter dialog
    showConverterDialog();
    
} catch (error) {
    ui.notifications.error("Failed to start PF2e Inline Roll Converter. Check console for details.");
}

// Provide a global convertText function for compatibility with UI and tests
function convertText(inputText, opts = {}) {
    const macro = new MacroInterface();
    const converted = macro.processText(inputText, opts);
    // For compatibility, wrap in the expected result object if needed
    if (typeof converted === 'string') {
        return {
            convertedText: converted,
            conversionsCount: 0,
            errors: [],
            patternMatches: {}
        };
    }
    return converted;
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

// Field configuration constants
const DAMAGE_TYPE_OPTIONS = [
    { value: '', label: 'None' },
    { value: 'acid', label: 'Acid' },
    { value: 'bludgeoning', label: 'Bludgeoning' },
    { value: 'cold', label: 'Cold' },
    { value: 'electricity', label: 'Electricity' },
    { value: 'fire', label: 'Fire' },
    { value: 'force', label: 'Force' },
    { value: 'mental', label: 'Mental' },
    { value: 'piercing', label: 'Piercing' },
    { value: 'slashing', label: 'Slashing' },
    { value: 'sonic', label: 'Sonic' },
    { value: 'spirit', label: 'Spirit' },
    { value: 'vitality', label: 'Vitality' },
    { value: 'void', label: 'Void' },
    { value: 'bleed', label: 'Bleed' },
    { value: 'poison', label: 'Poison' }
];

const DAMAGE_CATEGORY_OPTIONS = [
    { value: '', label: '' },
    { value: 'persistent', label: 'Persistent' },
    { value: 'precision', label: 'Precision' },
    { value: 'splash', label: 'Splash' }
];

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
        options: DAMAGE_TYPE_OPTIONS,
        getValue: (component) => component.damageType || '',
        setValue: (component, value) => { component.damageType = value; }
    },
    {
        id: 'category',
        type: 'select',
        label: 'Category',
        options: DAMAGE_CATEGORY_OPTIONS,
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
        console.log(`[ENABLED_FIELD] id=${rep.id} enabled changed: ${prev} -> ${value}`);
    }
};

class ModifierPanelManager {
    // Shared label width for all modifier panel labels
    static labelWidth = '100px';
    // DRY: Render the panel header (title + reset button)
    renderPanelHeader(title) {
        return `
            <div style="font-weight: bold; margin-bottom: 5px; color: #1976d2; display: flex; align-items: center; gap: 8px;">
                <span>${title}</span>
                <button type="button" id="modifier-reset-btn" title="Reset this roll to its original state" style="margin-left: auto; display: inline-flex; align-items: center; gap: 3px; font-size: 11px; padding: 2px 7px; height: 22px; width: auto; border-radius: 4px; background: #f4f4f4; border: 1px solid #bbb; color: #1976d2; cursor: pointer; transition: background 0.2s, border 0.2s; vertical-align: middle;">
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
            const commonAttrs = `id="${fieldId}" style="width: 100%;"`;
            const labelWidth = ModifierPanelManager.labelWidth;
            let containerStyle = '';
            if (field.hideIf && field.hideIf(target)) {
                containerStyle = 'display: none;';
            }
            // Use CSS class for all field containers
            let rowClass = 'modifier-field-row';
            // For textarea, multiselect, traits, use flex-start
            if (["textarea", "multiselect", "traits"].includes(field.type)) rowClass += ' flex-start';
            switch (field.type) {
                case 'select':
                    const options = field.options.map(option => {
                        const optionValue = typeof option === 'object' ? option.value : option;
                        const optionLabel = typeof option === 'object' ? option.label : option;
                        const selected = optionValue === value ? 'selected' : '';
                        return `<option value="${optionValue}" ${selected}>${optionLabel}</option>`;
                    }).join('');
                    return `
                        <div class="${rowClass}" style="${containerStyle}">
                            <label style="width: ${labelWidth}; flex-shrink: 0;"><strong>${field.label}</strong></label>
                            <select ${commonAttrs}>
                                ${options}
                            </select>
                        </div>
                    `;
                case 'number':
                    const minAttr = field.min !== undefined ? `min="${field.min}"` : '';
                    return `
                        <div id="${fieldId}-container" class="${rowClass}" style="${containerStyle}">
                            <label style="width: ${labelWidth}; flex-shrink: 0;"><strong>${field.label}</strong></label>
                            <input type="number" ${commonAttrs} ${minAttr} value="${value}" />
                        </div>
                    `;
                case 'checkbox':
                    const checked = value ? 'checked' : '';
                    return `
                        <div class="${rowClass}" style="${containerStyle}">
                            <label style="width: ${labelWidth}; flex-shrink: 0;"><strong>${field.label}</strong></label>
                            <input type="checkbox" id="${fieldId}" ${checked} style="width: auto; margin: 0;" />
                        </div>
                    `;
                case 'text':
                    const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
                    return `
                        <div id="${fieldId}-container" class="${rowClass}" style="${containerStyle}">
                            <label style="width: ${labelWidth}; flex-shrink: 0; font-weight: bold;">${field.label}</label>
                            <input type="text" ${commonAttrs} ${placeholder} value="${value}" onkeydown="event.stopPropagation();" />
                        </div>
                    `;
                case 'textarea':
                    const textareaPlaceholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
                    const rows = field.rows || 3;
                    return `
                        <div class="${rowClass}" style="${containerStyle}">
                            <label style="width: ${labelWidth}; flex-shrink: 0; margin-top: 4px;"><strong>${field.label}</strong></label>
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
                        <div class="${rowClass}" style="${containerStyle}">
                            <label style="width: ${labelWidth}; flex-shrink: 0; margin-top: 4px;"><strong>${field.label}</strong></label>
                            <select ${commonAttrs} multiple>
                                ${multiOptions}
                            </select>
                        </div>
                    `;
                case 'traits':
                    const uniqueId = `${fieldId}-container-${Math.random().toString(36).substr(2, 9)}`;
                    return `
                        <div class="${rowClass}" style="${containerStyle}">
                            <label style="width: ${labelWidth}; flex-shrink: 0; margin-top: 8px;"><strong>${field.label}</strong></label>
                            <div id="${uniqueId}" style="flex: 1;"></div>
                        </div>
                    `;
                default:
                    return `<div class="${rowClass}" style="${containerStyle}">Unknown field type: ${field.type}</div>`;
            }
        }).join('');
    }

    // DRY: Render common traits checkboxes
    renderCommonTraits(commonTraits, rep, type) {
        if (!commonTraits || !commonTraits.length) return '';
        const labelWidth = ModifierPanelManager.labelWidth;
        return commonTraits.map(trait => {
                const isChecked = rep.traits && rep.traits.includes(trait);
                return `
                    <div class="modifier-field-row">
                        <label style="width: ${labelWidth}; flex-shrink: 0;"><strong>${trait.charAt(0).toUpperCase() + trait.slice(1)}:</strong></label>
                        <input type="checkbox" id="${type}-trait-${trait}" style="width: auto; margin: 0;" ${isChecked ? 'checked' : ''} />
                    </div>
                `;
            }).join('');
    }

    // DRY: Render traits field
    renderTraitsField(config, type) {
        if (config.showTraits === false) return '';
            const traitsContainerId = `${type}-traits-container-${Math.random().toString(36).substr(2, 9)}`;
        const labelWidth = ModifierPanelManager.labelWidth;
        return `
                <div class="modifier-field-row flex-start">
                    <label style="width: ${labelWidth}; flex-shrink: 0; margin-top: 8px;"><strong>Traits:</strong></label>
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
                <div class="damage-component" data-component-index="${index}" style="
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 10px;
                    background: #f9f9f9;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-weight: bold; color: #1976d2;">Damage Partial ${index + 1}</div>
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
                        <label style="width: ${labelWidth}; flex-shrink: 0;"><strong>${field.label}</strong></label>
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
                        <label style="width: ${labelWidth}; flex-shrink: 0;"><strong>${field.label}</strong></label>
                        <input type="number" ${commonAttrs} ${minAttr} value="${value}" />
                    </div>
                `;
                return html;
            case 'checkbox':
                const checked = value ? 'checked' : '';
                return `
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <label style="width: ${labelWidth}; flex-shrink: 0;"><strong>${field.label}</strong></label>
                        <input type="checkbox" id="${field.id}" ${checked} style="width: auto; margin: 0;" />
                    </div>
                `;
            case 'text':
                const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
                return `
                    <div id="${field.id}-container" style="display: flex; align-items: center; gap: 8px; ${containerStyle}">
                        <label style="width: ${labelWidth}; flex-shrink: 0; font-weight: bold;">${field.label}</label>
                        <input type="text" ${commonAttrs} ${placeholder} value="${value}" onkeydown="event.stopPropagation();" />
                    </div>
                `;
            case 'textarea':
                const textareaPlaceholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
                const rows = field.rows || 3;
                return `
                    <div style="display: flex; align-items: flex-start; gap: 8px;">
                        <label style="width: ${labelWidth}; flex-shrink: 0; margin-top: 4px;"><strong>${field.label}</strong></label>
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
                    <div style="display: flex; align-items: flex-start; gap: 8px;">
                        <label style="width: ${labelWidth}; flex-shrink: 0; margin-top: 4px;"><strong>${field.label}</strong></label>
                        <select ${commonAttrs} multiple>
                            ${multiOptions}
                        </select>
                    </div>
                `;
            case 'traits':
                const uniqueId = `${field.id}-container-${Math.random().toString(36).substr(2, 9)}`;
                return `
                    <div style="display: flex; align-items: flex-start; gap: 8px;">
                        <label style="width: ${labelWidth}; flex-shrink: 0; margin-top: 8px;"><strong>${field.label}</strong></label>
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
                }
            });
            // Update all field visibility generically
            this.updateFieldVisibility(formElement, config.fields, rep);
            if (shouldTriggerCallback && onChangeCallback) {
                onChangeCallback(rep);
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
                onChangeCallback(rep);
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
                onChangeCallback(rep);
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

            function attachResetButtonHandler(rep, type) {
                const resetBtn = modifierPanelContent.querySelector('#modifier-reset-btn');
                if (resetBtn) {
                    resetBtn.onclick = function() {
                        if (!selectedElementId) return;
                        // Find the replacement
                        const idx = window.pf2eReplacements.findIndex(r => r.id === selectedElementId);
                        if (idx === -1) return;
                        const rep = window.pf2eReplacements[idx];
                        rep.resetToOriginal();
                        renderAll();
                        // Reselect in the UI and update modifier panel
                        const selectedEl = outputHtmlDiv.querySelector(`[data-id="${selectedElementId}"]`);
                        if (selectedEl) selectedEl.classList.add('selected');
                        const type = rep.type;
                        const panelHTML = modifierPanelManager.generatePanelHTML(type, rep);
                        modifierPanelContent.innerHTML = panelHTML;
                        const form = modifierPanelContent.querySelector(`#${type}-modifier-form`);
                        if (form) {
                            modifierPanelManager.addFormListeners(form, type, rep, handleModifierChange);
                        }
                        // Re-attach the reset button handler after rerender
                        attachResetButtonHandler(rep, type);
                    };
                }
            }

// Utility: Check if a dice expression is just a number (no 'd' present)
function isNumberOnlyDice(dice) {
    return /^\s*\d+\s*$/.test(dice);
}