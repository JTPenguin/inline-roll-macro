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

// Time unit patterns
const TIME_UNITS = ['rounds?', 'minutes?', 'hours?', 'days?'];
const TIME_UNITS_PATTERN = TIME_UNITS.join('|');

// Ability type patterns
const ABILITY_TYPES = ['ability', 'action', 'feature', 'spell'];
const ABILITY_TYPES_PATTERN = ABILITY_TYPES.join('|');

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
const DEFAULT_TEST_INPUT = "The creature is paralyzed. While paralyzed, it can't see or speak.";

// Utility for unique IDs
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// -------------------- Base Classes --------------------
class Replacement {
    constructor(match) {
        if (!match || typeof match !== 'object' || typeof match[0] !== 'string' || typeof match.index !== 'number') {
            throw new Error('Replacement: Invalid match object passed to constructor.');
        }
        this.id = generateId();
        this.startPos = match.index;
        this.endPos = match.index + match[0].length;
        this.originalText = match[0];
        this.enabled = true;
        this.priority = 0;
    }
    render() { throw new Error('Must implement render()'); }
    validate() { return true; }
    getText() { return this.originalText; }
    getLength() { return this.endPos - this.startPos; }
}

class RollReplacement extends Replacement {
    constructor(match) {
        super(match);
        this.rollType = '';
        this.traits = [];
        this.options = [];
    }
    addTrait(trait) { if (!this.traits.includes(trait)) this.traits.push(trait); }
    addOption(option) { if (!this.options.includes(option)) this.options.push(option); }
    hasTag(tag) { return this.traits.includes(tag) || this.options.includes(tag); }
    buildParameters(baseParams) {
        const params = [...baseParams];
        if (this.traits.length > 0) params.push(`traits:${this.traits.join(',')}`);
        if (this.options.length > 0) params.push(`options:${this.options.join(',')}`);
        return params;
    }
}

// -------------------- Damage Replacement --------------------
class DamageComponent {
    constructor(dice, damageType = '', persistent = false, precision = false, splash = false, healing = false) {
        this.dice = dice;
        this.damageType = damageType;
        this.persistent = persistent;
        this.precision = precision;
        this.splash = splash;
        this.healing = healing;
    }
    render() {
        let formula = this.dice;
        if (this.healing) {
            return `${formula}[healing]`;
        }
        if (this.precision) formula = `(${formula})[precision]`;
        if (this.splash) formula = `(${formula})[splash]`;
        if (this.persistent && this.damageType) {
            return `${formula}[persistent,${this.damageType}]`;
        }
        if (this.damageType) {
            formula = `(${formula})[${this.damageType}]`;
        }
        return formula;
    }
    validate() { return this.dice && this.dice.length > 0; }
}

class DamageReplacement extends RollReplacement {
    constructor(match, config) {
        super(match);
        this.rollType = 'damage';
        this.priority = 100;
        this.damageComponents = [];
        this.parseMatch(match, config);
    }
    parseMatch(match, config) {
        // If this is a multi-damage match, match[0] is the whole string, match[1] is the repeated group
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
        const isHealing = originalText.includes('healing') || originalText.includes('hit point') || originalText.includes('hp');
        
        if (isHealing) {
            this.addDamageComponent(dice, '', false, false, false, true);
        } else {
            this.addDamageComponent(dice, type, isPersistent, isPrecision, isSplash);
        }
    }
    addDamageComponent(dice, damageType = '', persistent = false, precision = false, splash = false, healing = false) {
        // Convert legacy types to remaster types
        let remasterType = damageType;
        if (damageType && LEGACY_TO_REMASTER_DAMAGE_TYPE[damageType]) {
            remasterType = LEGACY_TO_REMASTER_DAMAGE_TYPE[damageType];
        }
        this.damageComponents.push(new DamageComponent(dice, remasterType, persistent, precision, splash, healing));
    }
    render() {
        let roll;
        if (this.damageComponents.length === 1) {
            roll = `@Damage[${this.damageComponents[0].render()}]`;
        } else {
            const componentStrings = this.damageComponents.map(comp => comp.render());
            roll = `@Damage[${componentStrings.join(',')}]`;
        }
        return roll + ' damage';
    }
    validate() {
        return this.damageComponents.length > 0 && this.damageComponents.every(comp => comp.validate());
    }
}

// -------------------- Check Replacement --------------------
class CheckReplacement extends RollReplacement {
    constructor(match, config) {
        super(match);
        this.rollType = 'check';
        this.priority = 90;
        this.checkType = '';
        this.dc = null;
        this.basic = false;
        this.secret = false;
        this.defense = '';
        this.against = '';
        this.match = match; // Save the match object for render()
        this.multipleSkills = false;
        this.skills = [];
        this.parseMatch(match, config);
    }
    parseMatch(match, config) {
        // Extract check type, DC, and modifiers
        if (config && config.groups) {
            for (const group of config.groups) {
                if (group.type && match[group.type]) this.checkType = match[group.type].toLowerCase();
                if (group.dc && match[group.dc]) this.dc = match[group.dc];
                if (group.basic && match[group.basic]) this.basic = true;
            }
        } else {
            // Defensive: if match.replacement exists, skip parsing (already replaced)
            if (match && match.replacement) return;
            
            // Check if this is a multiple skills match
            if (match.multipleSkills && match.skills) {
                this.multipleSkills = true;
                this.skills = match.skills;
                this.dc = match.dc || match[1] || null;
            } else {
                this.checkType = match[2] ? match[2].toLowerCase() : '';
                this.dc = match[1] || null;
            }
        }
    }
    render() {
        // If match.replacement exists, use it directly
        if (this.match && this.match.replacement) {
            return this.match.replacement;
        }
        
        // Handle multiple skills
        if (this.multipleSkills && this.skills.length > 0) {
            const skillChecks = this.skills.map(skill => {
                const params = [skill.toLowerCase()];
                if (this.dc) params.push(`dc:${this.dc}`);
                if (this.basic) params.push('basic');
                return `@Check[${params.join('|')}]`;
            });
            return skillChecks.join(' or ') + ' check';
        }
        
        // Handle single skill
        let params = [`${this.checkType}`];
        if (this.dc) params.push(`dc:${this.dc}`);
        if (this.basic) params.push('basic');
        return `@Check[${params.join('|')}] check`;
    }
    validate() {
        if (this.match && this.match.replacement) return true;
        if (this.multipleSkills) {
            return this.skills.length > 0 && this.dc;
        }
        return this.checkType && (this.dc || this.defense || this.against);
    }
}

// -------------------- Template Replacement --------------------
class TemplateReplacement extends RollReplacement {
    constructor(match, config) {
        super(match);
        this.rollType = 'template';
        this.priority = 80;
        this.shape = '';
        this.distance = 0;
        this.width = 5;
        this.parseMatch(match, config);
    }
    parseMatch(match, config) {
        this.shape = match[2] ? match[2].toLowerCase() : '';
        this.distance = match[1] ? parseInt(match[1], 10) : 0;
    }
    render() {
        return `@Template[type:${this.shape}|distance:${this.distance}]`;
    }
}

// -------------------- Utility Replacement --------------------
class UtilityReplacement extends RollReplacement {
    constructor(match, config) {
        super(match);
        this.rollType = 'utility';
        this.priority = 70;
        this.expression = '';
        this.flavor = '';
        this.gmOnly = false;
        this.parseMatch(match, config);
    }
    parseMatch(match, config) {
        this.expression = match[1] || '';
    }
    render() {
        return `[[/gmr ${this.expression} #Recharge]]{${this.expression}}`;
    }
}

// -------------------- Action Replacement --------------------
class ActionReplacement extends RollReplacement {
    constructor(match, config) {
        super(match);
        this.rollType = 'action';
        this.priority = 60;
        this.actionName = '';
        this.variant = '';
        this.statistic = '';
        this.parseMatch(match, config);
    }
    parseMatch(match, config) {
        this.actionName = match[1] || '';
    }
    render() {
        return `[[/act ${this.actionName}]]`;
    }
}

// -------------------- Condition Replacement --------------------
class ConditionReplacement extends Replacement {
    constructor(matchObj, config) {
        // matchObj: { match, args }
        // Use the original match object for startPos/endPos, but allow overriding the replacement text
        super(matchObj.match); // Pass the regex match array to super
        this.priority = 50;
        this.conditionName = '';
        this.degree = null;
        this.uuid = '';
        this.linkedConditions = config && config.linkedConditions ? config.linkedConditions : new Set();
        this.args = matchObj.args || [];
        this.parseMatch();
        // Always deduplicate using the *final* condition name (e.g., 'off-guard')
        let dedupKey = this.degree ? `${this.conditionName.toLowerCase()}-${this.degree}` : this.conditionName.toLowerCase();
        // Special case: treat 'flat-footed' as 'off-guard' for deduplication
        if (dedupKey === 'flat-footed') dedupKey = 'off-guard';
        if (this.linkedConditions.has(dedupKey)) {
            this.enabled = false;
        } else {
            this.linkedConditions.add(dedupKey);
            this.enabled = true;
        }
    }
    parseMatch() {
        // args: [condition, value?]
        const args = this.args;
        this.conditionName = args[0] || '';
        this.degree = args[1] || null;
        this.uuid = getConditionUUID(this.conditionName);
    }
    render() {
        if (!this.uuid) return this.originalText;
        const capitalized = this.conditionName.charAt(0).toUpperCase() + this.conditionName.slice(1);
        if (this.degree) {
            return `@UUID[${this.uuid}]{${capitalized} ${this.degree}}`;
        } else {
            return `@UUID[${this.uuid}]{${capitalized}}`;
        }
    }
    validate() {
        return this.conditionName && this.uuid;
    }
}

// Replacement class mapping for pattern types
const REPLACEMENT_CLASS_MAP = {
    damage: DamageReplacement,
    save: CheckReplacement,
    skill: CheckReplacement,
    template: TemplateReplacement,
    utility: UtilityReplacement,
    action: ActionReplacement,
    condition: ConditionReplacement,
    legacy: DamageReplacement // Use DamageReplacement for legacy damage type conversions
};

class ReplacementFactory {
    static createFromMatch(match, patternType, patternConfig) {
        const Cls = REPLACEMENT_CLASS_MAP[patternType];
        if (!Cls) throw new Error(`Unknown pattern type: ${patternType}`);
        return new Cls(match, patternConfig);
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
        regex: new RegExp(`((?:\\d+d\\d+(?:[+-]\\d+)?\\s+(?:(?:persistent\\s+)?(?:${DAMAGE_TYPE_PATTERN})(?:\\s+persistent)?|(?:${DAMAGE_TYPE_PATTERN})\\s+splash|splash\\s+(?:${DAMAGE_TYPE_PATTERN})|(?:${DAMAGE_TYPE_PATTERN})\\s+precision|precision\\s+(?:${DAMAGE_TYPE_PATTERN})|precision|(?:${DAMAGE_TYPE_PATTERN}))(?:\\s+damage)?(?:\\s*,\\s*|\\s*,\\s*and\\s*|\\s+and\\s+))*\\d+d\\d+(?:[+-]\\d+)?\\s+(?:(?:persistent\\s+)?(?:${DAMAGE_TYPE_PATTERN})(?:\\s+persistent)?|(?:${DAMAGE_TYPE_PATTERN})\\s+splash|splash\\s+(?:${DAMAGE_TYPE_PATTERN})|(?:${DAMAGE_TYPE_PATTERN})\\s+precision|precision\\s+(?:${DAMAGE_TYPE_PATTERN})|precision|(?:${DAMAGE_TYPE_PATTERN}))(?:\\s+damage)?)`, 'gi'),
        priority: PRIORITY.DAMAGE + 10, // Higher than all other damage patterns
        handler: function(match) {
            // Find all dice/type pairs in the match[0] string
            // Accepts: '1d4 acid, 1d6 persistent bleed, and 1d4 slashing damage' (with or without 'damage' after each type)
            const singlePattern = new RegExp(`(\\d+d\\d+(?:[+-]\\d+)?)\\s+(?:(?:persistent\\s+)?(?:(${DAMAGE_TYPE_PATTERN}))(?:\\s+persistent)?|(?:(${DAMAGE_TYPE_PATTERN}))\\s+splash|splash\\s+(?:(${DAMAGE_TYPE_PATTERN}))|(?:(${DAMAGE_TYPE_PATTERN}))\\s+precision|precision\\s+(?:(${DAMAGE_TYPE_PATTERN}))|precision|(?:(${DAMAGE_TYPE_PATTERN})))(?:\\s+damage)?`, 'gi');
            let m;
            const multiMatches = [];
            while ((m = singlePattern.exec(match[0])) !== null) {
                multiMatches.push(m);
            }
            // Attach all submatches for DamageReplacement
            match.multiMatches = multiMatches;
            return match;
        },
        description: 'Multi-damage grouping (comma, and, or both separated, trailing damage allowed) - includes persistent, splash, precision'
    },
    // Priority 1: Comprehensive save pattern
    {
        type: 'save',
        regex: /(?:\(?)((?:basic\s+)?(?:DC\s*(\d{1,2})\s*[,;:\(\)]?\s*)?(fort(?:itude)?|ref(?:lex)?|will)(?:\s+(?:save|saving\s+throw))?(?:\s*[,;:\(\)]?\s*(?:basic\s+)?DC\s*(\d{1,2}))|(?:basic\s+)?(fort(?:itude)?|ref(?:lex)?|will)(?:\s+(?:save|saving\s+throw))?\s+basic(?:\s*[,;:\(\)]?\s*DC\s*(\d{1,2}))|(?:basic\s+)?DC\s*(\d{1,2})\s+(fort(?:itude)?|ref(?:lex)?|will)(?:\s+(?:save|saving\s+throw))?|DC\s*(\d{1,2})\s+(?:basic\s+)?(fort(?:itude)?|ref(?:lex)?|will)(?:\s+(?:save|saving\s+throw))?)(?:\)?)/gi,
        priority: PRIORITY.SAVE,
        handler: (match) => {
            // Defensive extraction of save type and DC from match array
            let save = '';
            let dc = '';
            save = match[3] || match[5] || match[8] || match[10] || '';
            dc = match[2] || match[4] || match[6] || match[7] || match[9] || '';
            if (save) save = save.toLowerCase();
            let normalizedSave = '';
            if (save.startsWith('fort')) normalizedSave = 'fortitude';
            else if (save.startsWith('ref')) normalizedSave = 'reflex';
            else if (save.startsWith('will')) normalizedSave = 'will';
            else normalizedSave = save;
            const isBasic = /\bbasic\b/i.test(match[0]);
            const basicStr = isBasic ? '|basic' : '';
            // Always use 'save' for the output, never 'saving throw'
            const saveTerm = 'save';
            const replacement = `@Check[${normalizedSave}${dc ? `|dc:${dc}` : ''}${basicStr}] ${saveTerm}`;
            // Return a match-like object for resolveConflicts, with 0 as the original matched text and 'replacement' property
            return {
                0: match[0],
                index: match.index,
                length: match[0].length,
                replacement: replacement
            };
        },
        description: 'Comprehensive save pattern (all variations including parenthetical)'
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
    {
        type: 'healing',
        regex: /(\d+(?:d\d+)?(?:[+-]\d+)?)\s+(?:hit\s+points?|HP)(?:\s+healed)?/gi,
        priority: PRIORITY.HEALING,
        handler: (match) => match,
        description: 'Healing hit points'
    },
    {
        type: 'healing',
        regex: /(\d+(?:d\d+)?(?:[+-]\d+)?)\s+healing(?:\s+damage)?/gi,
        priority: PRIORITY.HEALING,
        handler: (match) => match,
        description: 'Generic healing'
    },
    {
        type: 'skill',
        regex: new RegExp(`DC\\s+(\\d+)\\s+((?:${SKILL_PATTERN})(?:\\s*,\\s*(?:${SKILL_PATTERN}))*\\s*(?:,\\s*)?(?:or\\s+)?(?:${SKILL_PATTERN}))\\s+check`, 'gi'),
        priority: PRIORITY.SKILL,
        handler: function(match) {
            // Check if this contains "or" separators for multiple skills
            const skillText = match[2];
            if (skillText.includes(' or ')) {
                // Split by "or" and create multiple matches
                const skills = skillText.split(/\s+or\s+/).map(s => s.trim());
                const dc = match[1];
                
                // Create a special match object that indicates multiple skills
                return {
                    ...match,
                    multipleSkills: true,
                    skills: skills,
                    dc: dc
                };
            }
            return match;
        },
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
        type: 'flat',
        regex: /DC\s+(\d+)\s+flat\s+check/gi,
        priority: PRIORITY.FLAT,
        handler: (match) => match,
        description: 'Flat checks'
    },
    {
        type: 'utility',
        regex: new RegExp(`again for (\\d+(?:d\\d+)?(?:[+-]\\d+)?)\\s+(${TIME_UNITS_PATTERN})`, 'gi'),
        priority: PRIORITY.UTILITY,
        handler: (match, dice, unit) => `again for [[/gmr ${dice} #Recharge]]{${dice} ${unit}}`,
        description: 'Ability recharge pattern'
    },
    {
        type: 'utility',
        regex: new RegExp(`can't use this (?:${ABILITY_TYPES_PATTERN}) again for (\\d+(?:d\\d+)?(?:[+-]\\d+)?)\\s+(${TIME_UNITS_PATTERN})`, 'gi'),
        priority: PRIORITY.UTILITY,
        handler: (match, dice, unit) => `can't use this ability again for [[/gmr ${dice} #Recharge]]{${dice} ${unit}}`,
        description: 'Generic ability recharge'
    },
    {
        type: 'utility',
        regex: new RegExp(`recharges? (?:in|after) (\\d+(?:d\\d+)?(?:[+-]\\d+)?)\\s+(${TIME_UNITS_PATTERN})`, 'gi'),
        priority: PRIORITY.UTILITY,
        handler: (match, dice, unit) => `recharges in [[/gmr ${dice} #Recharge]]{${dice} ${unit}}`,
        description: 'Recharge timing pattern'
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
        handler: (match, prefix, before, legacyType, after, suffix) => `@Damage[${prefix}${before}spirit${after}]${suffix}]`,
        description: 'Legacy alignment damage to spirit (within @Damage, anywhere in type list)'
    },
    {
        type: 'legacy',
        regex: new RegExp(`@Damage\\[(.*?\\[)([^\\]]*?)(${LEGACY_POSITIVE})([^\\]]*?)\\](.*?)\\]`, 'gi'),
        priority: PRIORITY.LEGACY,
        handler: (match, prefix, before, legacyType, after, suffix) => `@Damage[${prefix}${before}vitality${after}]${suffix}]`,
        description: 'Legacy positive damage to vitality (within @Damage, anywhere in type list)'
    },
    {
        type: 'legacy',
        regex: new RegExp(`@Damage\\[(.*?\\[)([^\\]]*?)(${LEGACY_NEGATIVE})([^\\]]*?)\\](.*?)\\]`, 'gi'),
        priority: PRIORITY.LEGACY,
        handler: (match, prefix, before, legacyType, after, suffix) => `@Damage[${prefix}${before}void${after}]${suffix}]`,
        description: 'Legacy negative damage to void (within @Damage, anywhere in type list)'
    },
    // Priority 5: Damage consolidation
    {
        type: 'damage',
        regex: /@Damage\[[^\@]*\](?:\s+(?:(?:splash|precision)\s+)?damage|(?:\s+(?:splash|precision)))?(?:\s*,\s*(?:and\s+)?|\s+and\s+)@Damage\[[^\@]*\](?:\s+(?:splash|precision))?(?:(?:\s*,\s*(?:and\s+)?|\s+and\s+)@Damage\[[^\@]*\](?:\s+(?:(?:splash|precision)\s+)?damage|(?:\s+(?:splash|precision)))?)*(?:\s+(?:splash|precision))?/gi,
        priority: PRIORITY.DAMAGE_CONSOLIDATION,
        handler: (match) => {
            const damageRolls = [];
            const regex = /@Damage\[/g;
            let startMatch;
            while ((startMatch = regex.exec(match)) !== null) {
                const startPos = startMatch.index + startMatch[0].length;
                let bracketCount = 1;
                let endPos = startPos;
                while (endPos < match.length && bracketCount > 0) {
                    if (match[endPos] === '[') bracketCount++;
                    else if (match[endPos] === ']') bracketCount--;
                    if (bracketCount > 0) endPos++;
                }
                if (bracketCount === 0) {
                    const damageContent = match.substring(startPos, endPos);
                    damageRolls.push(damageContent);
                }
            }
            if (damageRolls.length >= 2) return `@Damage[${damageRolls.join(',')}]`;
            return match;
        },
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
        type: 'condition',
        regex: new RegExp(`(?<!@UUID\\[[^\\]]*\\]\\{[^}]*\\})\\b(${CONDITIONS_WITH_VALUES_PATTERN})\\s+(\\d+)\\b(?!\\})`, 'gi'),
        priority: PRIORITY.CONDITION,
        handler: function(match) { return { match, args: match.slice(1) }; },
        description: 'Condition linking with values (only for conditions that support values)'
    },
    {
        type: 'condition',
        regex: new RegExp(`(?<!@UUID\\[[^\\]]*\\]\\{[^}]*\\})\\b(${CONDITIONS_WITHOUT_VALUES_PATTERN})\\b(?!\\s+\\d+)(?!\\})`, 'gi'),
        priority: PRIORITY.CONDITION,
        handler: function(match) { return { match, args: [match[1]] }; },
        description: 'Condition linking without values (conditions that cannot have values)'
    },
    {
        type: 'condition',
        regex: new RegExp(`(?<!@UUID\\[[^\\]]*\\]\\{[^}]*\\})\\b(stunned)\\b(?!\\s+\\d+)(?!\\})`, 'gi'),
        priority: PRIORITY.CONDITION,
        handler: function(match) { return { match, args: [match[1]] }; },
        description: 'Stunned condition without value (special case)'
    },
    // Priority 7: Area effects
    {
        type: 'template',
        regex: new RegExp(`(\\d+)-foot\\s+(${TEMPLATE_SHAPES_PATTERN})`, 'gi'),
        priority: PRIORITY.TEMPLATE,
        handler: (match) => match,
        description: 'Basic area effects'
    },
    {
        type: 'template',
        regex: /(\d+)-foot\s+radius/gi,
        priority: PRIORITY.TEMPLATE,
        handler: (match) => match,
        description: 'Radius area effects'
    }
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
                    console.warn('[PatternDetector] Skipping malformed handler result:', handlerResult, 'for pattern', pattern);
                    continue;
                }
                // For condition patterns, handlerResult should be { match, args }
                // For others, it should be a string or match array
                console.log('[PatternDetector] Pattern matched:', pattern.type, pattern.regex, 'Match:', match, 'Handler result:', handlerResult);
                allMatches.push({
                    match: handlerResult,
                    type: pattern.type,
                    config: pattern.config,
                    priority: pattern.priority,
                    index: match.index
                });
            }
        }
        console.log('[PatternDetector] All matches:', allMatches);
        return this.resolveConflicts(allMatches);
    }
    resolveConflicts(matches) {
        // Remove overlaps: keep highest priority, then leftmost
        matches.sort((a, b) => a.priority !== b.priority ? b.priority - a.priority : a.index - b.index);
        const result = [];
        const covered = new Array();
        for (const m of matches) {
            let matchArr = m.match && m.match.match ? m.match.match : m.match;
            if (!matchArr || typeof matchArr[0] !== 'string' || typeof matchArr.index !== 'number') {
                console.warn('[PatternDetector] Skipping match in resolveConflicts due to invalid matchArr:', matchArr, m);
                continue;
            }
            const start = matchArr.index;
            const end = start + matchArr[0].length;
            if (!covered.some(([s, e]) => (start < e && end > s))) {
                result.push(m);
                covered.push([start, end]);
            }
        }
        console.log('[PatternDetector] Non-overlapping matches:', result);
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
        console.log('[TextProcessor] Input text:', inputText);
        const rollMatches = this.detector.detectAll(inputText);
        const replacements = this.createReplacements(rollMatches);
        console.log('[TextProcessor] Replacements created:', replacements);
        const result = this.applyReplacements(inputText, replacements);
        console.log('[TextProcessor] Final converted text:', result);
        return result;
    }
    createReplacements(rollMatches) {
        // Sort by startPos so deduplication always enables the first occurrence
        rollMatches.sort((a, b) => {
            const aPos = a.match && a.match.match && typeof a.match.match.index === 'number' ? a.match.match.index : a.match.index;
            const bPos = b.match && b.match.match && typeof b.match.match.index === 'number' ? b.match.match.index : b.match.index;
            return aPos - bPos;
        });
        const replacements = [];
        rollMatches.forEach(matchObj => {
            try {
                if (matchObj.type === 'condition') {
                    const rep = ReplacementFactory.createFromMatch(matchObj.match, matchObj.type, { linkedConditions: this.linkedConditions });
                    console.log('[TextProcessor] Created ConditionReplacement:', rep);
                    replacements.push(rep);
                } else {
                    const rep = ReplacementFactory.createFromMatch(matchObj.match, matchObj.type, matchObj.config);
                    console.log('[TextProcessor] Created Replacement:', rep);
                    replacements.push(rep);
                }
            } catch (err) {
                console.error('[TextProcessor] Error creating replacement:', err, matchObj);
            }
        });
        return this.sortByPriority(replacements);
    }
    sortByPriority(replacements) {
        return replacements.sort((a, b) => b.priority - a.priority || a.startPos - b.startPos);
    }
    applyReplacements(text, replacements) {
        // Apply all replacements in reverse position order
        const sorted = replacements.sort((a, b) => b.startPos - a.startPos);
        let result = text;
        for (const replacement of sorted) {
            if (replacement.enabled && replacement.validate()) {
                result = this.applyReplacement(result, replacement);
            }
        }
        // After all replacements, replace any remaining 'flat-footed' with 'off-guard'
        result = result.replace(/\bflat-footed\b/gi, 'off-guard');
        return result;
    }
    applyReplacement(text, replacement) {
        const before = text.substring(0, replacement.startPos);
        const after = text.substring(replacement.endPos);
        return before + replacement.render() + after;
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
    processText(input) {
        try {
            return this.processor.process(input);
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
                background: white;
                border: 1px solid #ccc;
                border-radius: 4px;
                padding: 10px;
                font-family: 'Signika', sans-serif;
                font-size: 14px;
                line-height: 1.4;
                color: #191813;
                max-height: 200px;
                overflow-y: auto;
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
                    console.error('Error executing preview roll:', rollError);
                    ui.notifications.warn(`Could not execute roll: ${rollError.message}`);
                }
            });
        });

    } catch (error) {
        console.error('Error creating live preview:', error);
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
        console.error('Failed to copy text:', error);
        ui.notifications.error("Failed to copy text to clipboard.");
    }
}

/**
 * Create and show the converter dialog
 */
function showConverterDialog() {
    const dialogContent = `
        <div class="pf2e-converter-dialog">
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
                <textarea 
                    id="output-text" 
                    name="outputText" 
                    rows="6" 
                    readonly
                    style="width: 100%; resize: vertical; font-family: monospace; font-size: 12px; background-color: #f0f0f0;"
                ></textarea>
            </div>
            
            <div class="form-group">
                <label for="live-preview"><strong>Live Preview:</strong> <small>(Click inline rolls to test them)</small></label>
                <div 
                    id="live-preview" 
                    style="
                        width: 100%; 
                        min-height: 100px; 
                        border: 1px solid #ddd; 
                        border-radius: 4px; 
                        background-color: #fafafa;
                        padding: 8px;
                        font-family: 'Signika', sans-serif;
                        font-size: 13px;
                        overflow-y: auto;
                        max-height: 500px;
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
        
        <style>
            .pf2e-converter-dialog {
                min-width: 700px;
            }
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
        </style>
    `;

    const dialog = new Dialog({
        title: "PF2e Inline Roll Converter",
        content: dialogContent,
        buttons: {},
        render: (html) => {
            // Add real-time conversion on input change
            const inputTextarea = html.find('#input-text');
            const outputTextarea = html.find('#output-text');
            const livePreview = html.find('#live-preview')[0];

            inputTextarea.on('input', async () => {
                const inputText = inputTextarea.val();
                if (inputText.trim()) {
                    const result = convertText(inputText);
                    outputTextarea.val(result.convertedText);
                    // Update live preview
                    await createLivePreview(result.convertedText, livePreview);
                } else {
                    outputTextarea.val('');
                    livePreview.innerHTML = '<em style="color: #999;">Live preview will appear here...</em>';
                }
            });

            // Trigger initial conversion for the default test input
            setTimeout(() => {
                inputTextarea.trigger('input');
            }, 0);

            // Copy output button handler
            html.find('#copy-output').click((event) => {
                event.preventDefault();
                event.stopPropagation();

                const outputText = outputTextarea.val();
                if (outputText.trim()) {
                    copyToClipboard(outputText);
                } else {
                    ui.notifications.warn("No converted text to copy.");
                }
            });

            // Clear all button handler
            html.find('#clear-all').click((event) => {
                event.preventDefault();
                event.stopPropagation();

                inputTextarea.val('');
                outputTextarea.val('');
                livePreview.innerHTML = '<em style="color: #999;">Live preview will appear here...</em>';
            });
        }
    }, {
        width: 800,
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
    console.error('PF2e Converter: Failed to initialize:', error);
    ui.notifications.error("Failed to start PF2e Inline Roll Converter. Check console for details.");
}

// Provide a global convertText function for compatibility with UI and tests
function convertText(inputText) {
    const macro = new MacroInterface();
    const converted = macro.processText(inputText);
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