# Check/Save Refactor Specification

## Overview

This specification describes the refactoring of the PF2e Inline Roll Converter's `CheckReplacement` and `SaveReplacement` classes into a single unified `CheckReplacement` class. This change aligns the macro's architecture with the PF2e system's unified `@Check` syntax and improves maintainability.

## Current Architecture

### Existing Classes
- `CheckReplacement` - Handles skill checks, perception checks, lore checks
- `SaveReplacement` - Handles fortitude, reflex, and will saves
- `FlatCheckReplacement` - Handles flat checks

### Current Pattern Types
- `skill` - Maps to `CheckReplacement`
- `save` - Maps to `SaveReplacement`  
- `flat` - Maps to `FlatCheckReplacement`

## Target Architecture

### Unified Class Structure
- `CheckReplacement` - Handles all check types including skills, saves, perception, lore, flat checks
- Remove: `SaveReplacement` and `FlatCheckReplacement` classes entirely

### New Pattern Type Mapping
- `check` - Maps to unified `CheckReplacement`

## Unified CheckReplacement Class Specification

### Core Properties

```javascript
class CheckReplacement extends RollReplacement {
    // Inherited from RollReplacement
    rollType = 'check'
    
    // Check identification
    checkCategory = ''     // 'skill', 'save', 'perception', 'lore', 'flat'
    checkType = ''         // specific skill/save name
    
    // Common check properties
    dc = null              // DC value
    
    // Save-specific properties
    basic = false          // basic save flag
    
    // Skill-specific properties (removed multipleSkills functionality)
    
    // Lore-specific properties
    loreName = ''          // name of the lore skill
    
    // Inherited common properties
    displayText = ''
    traits = []
    options = []
}
```

### Check Categories

| Category | Description | Examples |
|----------|-------------|----------|
| `skill` | Standard skill checks | Athletics, Stealth, Medicine |
| `save` | Saving throws | Fortitude, Reflex, Will |
| `perception` | Perception checks | Perception |
| `lore` | Lore skill checks | Warfare Lore, Local Politics Lore |
| `flat` | Flat checks | DC 5 flat check, concealment checks |

### Pattern Detection Changes

#### New Pattern Configuration
All check-related patterns will use type `'check'` instead of separate `'skill'`, `'save'`, and `'flat'` types.

#### Pattern Handler Enhancement
Pattern handlers will set a `checkCategory` property on the match object to help the unified class determine the appropriate parsing logic.

```javascript
// Example save pattern handler
handler: (match) => {
    match.checkCategory = 'save';
    return match;
}

// Example skill pattern handler  
handler: (match) => {
    match.checkCategory = 'skill';
    return match;
}

// Example flat check pattern handler
handler: (match) => {
    match.checkCategory = 'flat';
    return match;
}
```

### Parsing Logic Specification

#### Primary Parse Method
```javascript
parseMatch(match, config) {
    super.parseMatch(match, config);
    
    // Reset all category-specific properties
    this.resetCategoryProperties();
    
    // Determine category from match data or pattern config
    this.checkCategory = this.determineCategory(match, config);
    
    // Parse based on category
    switch (this.checkCategory) {
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
            this.parseGenericMatch(match, config);
    }
}
```

#### Category Detection Logic
```javascript
determineCategory(match, config) {
    // Priority 1: Explicit category from pattern handler
    if (match.checkCategory) return match.checkCategory;
    
    // Detect from match content
    if (match.isLoreCheck) return 'lore';
    
    // Detect from checkType content
    const checkType = this.extractCheckType(match);
    if (['fortitude', 'reflex', 'will'].includes(checkType)) return 'save';
    if (checkType === 'perception') return 'perception';
    if (SKILLS.map(s => s.toLowerCase()).includes(checkType)) return 'skill';
    
    // Check for flat check patterns
    if (match[0] && /flat\s+check/i.test(match[0])) return 'flat';
    
    // Default
    return 'skill';
}
```

### Rendering Logic Specification

#### Unified Render Method
The `conversionRender()` method will generate appropriate `@Check` syntax based on the check category and properties.

```javascript
conversionRender() {
    // Handle special replacement cases
    if (this.match && this.match.replacement) {
        return this.match.replacement;
    }
    
    // Handle multiple skills
    if (this.multipleSkills && this.skills.length > 0) {
        return this.renderMultipleSkills();
    }
    
    // Handle lore checks
    if (this.checkCategory === 'lore' && this.loreName) {
        return this.renderLoreCheck();
    }
    
    // Handle flat checks
    if (this.checkCategory === 'flat') {
        return this.renderFlatCheck();
    }
    
    // Standard single check
    return this.renderSingleCheck();
}
```

#### Render Method Implementations
```javascript
renderSingleCheck() {
    let params = [this.checkType];
    if (this.dc) params.push(`dc:${this.dc}`);
    if (this.basic) params.push('basic');
    if (this.traits && this.traits.length > 0) {
        params.push(`traits:${this.traits.join(',')}`);
    }
    
    const baseRoll = `@Check[${params.join('|')}]`;
    const displayText = this.getDisplayText();
    
    return baseRoll + (displayText ? `{${displayText}}` : '');
}

renderLoreCheck() {
    let params = [`type:lore`];
    if (this.dc) params.push(`dc:${this.dc}`);
    params.push(`name:${this.loreName}`);
    if (this.traits && this.traits.length > 0) {
        params.push(`traits:${this.traits.join(',')}`);
    }
    
    const baseRoll = `@Check[${params.join('|')}]`;
    const displayText = this.displayText || `${this.loreName} Lore`;
    
    return baseRoll + `{${displayText}}`;
}

renderFlatCheck() {
    let params = ['flat'];
    if (this.dc) params.push(`dc:${this.dc}`);
    if (this.traits && this.traits.length > 0) {
        params.push(`traits:${this.traits.join(',')}`);
    }
    
    const baseRoll = `@Check[${params.join('|')}]`;
    const displayText = this.displayText;
    
    return baseRoll + (displayText ? `{${displayText}}` : '');
}
```

## Modifier Panel Specification

### Panel Configuration
The unified class will have a dynamic panel configuration that shows relevant fields based on the `checkCategory`.

```javascript
static get panelConfig() {
    return {
        title: 'Check/Save',
        fields: [
            ENABLED_FIELD,
            
            // Category selector
            {
                id: 'check-category',
                type: 'select',
                label: 'Type',
                options: [
                    { value: 'skill', label: 'Skill Check' },
                    { value: 'save', label: 'Saving Throw' },
                    { value: 'perception', label: 'Perception' },
                    { value: 'lore', label: 'Lore' },
                    { value: 'flat', label: 'Flat Check' }
                ],
                getValue: (rep) => rep.checkCategory || 'skill',
                setValue: (rep, value) => { 
                    rep.checkCategory = value;
                    rep.resetCategoryProperties();
                }
            },
            
            // Dynamic skill/save selector
            {
                id: 'check-type',
                type: 'select',
                label: 'Skill/Save',
                options: (rep) => rep.getCategoryOptions(),
                getValue: (rep) => rep.checkType || '',
                setValue: (rep, value) => { rep.checkType = value; },
                hideIf: (rep) => ['lore', 'flat'].includes(rep.checkCategory)
            },
            
            // Lore name field
            {
                id: 'lore-name',
                type: 'text',
                label: 'Lore Name',
                placeholder: 'e.g., Warfare, Local Politics',
                getValue: (rep) => rep.loreName || '',
                setValue: (rep, value) => { rep.loreName = value; },
                hideIf: (rep) => rep.checkCategory !== 'lore'
            },
            
            // DC field
            {
                id: 'check-dc',
                type: 'number',
                label: 'DC',
                min: 0,
                getValue: (rep) => rep.dc || '',
                setValue: (rep, value) => { rep.dc = value; }
            },
            
            // Basic save checkbox
            {
                id: 'basic-save',
                type: 'checkbox',
                label: 'Basic Save',
                getValue: (rep) => !!rep.basic,
                setValue: (rep, value) => { rep.basic = value; },
                hideIf: (rep) => rep.checkCategory !== 'save'
            },
            
            DISPLAY_TEXT_FIELD
        ],
        commonTraits: ['secret']
    };
}
```

### Dynamic Options Method
```javascript
getCategoryOptions() {
    switch (this.checkCategory) {
        case 'save':
            return [
                { value: 'fortitude', label: 'Fortitude' },
                { value: 'reflex', label: 'Reflex' },
                { value: 'will', label: 'Will' }
            ];
        case 'skill':
            return SKILLS.map(skill => ({ 
                value: skill.toLowerCase(), 
                label: skill 
            }));
        case 'perception':
            return [{ value: 'perception', label: 'Perception' }];
        case 'flat':
            return [{ value: 'flat', label: 'Flat Check' }];
        default:
            return [];
    }
}
```

## Pattern Definition Changes

### Updated Pattern Priorities
- Save patterns: `PRIORITY.SAVE` (highest)
- Skill patterns: `PRIORITY.SKILL` (medium)
- All use type `'check'` instead of separate types

### Pattern Handler Updates
All check-related patterns will be updated to:
1. Use type `'check'`
2. Set appropriate `checkCategory` on match object
3. Maintain existing regex patterns and priority levels

## Migration Specification

### Class Mapping Update
```javascript
// OLD
const REPLACEMENT_CLASS_MAP = {
    skill: CheckReplacement,
    save: SaveReplacement,
    flat: FlatCheckReplacement,
    // ... other types
};

// NEW  
const REPLACEMENT_CLASS_MAP = {
    check: CheckReplacement,  // unified class for all @Check syntax
    // ... other types
};
```

### Pattern Type Updates
All patterns in `PATTERN_DEFINITIONS` that currently use `type: 'skill'`, `type: 'save'`, or `type: 'flat'` will be changed to `type: 'check'`.

## Validation Specification

### Validation Logic
```javascript
validate() {
    if (this.match && this.match.replacement) return true;
    
    // Category-specific validation
    switch (this.checkCategory) {
        case 'lore':
            return !!this.loreName;
        case 'flat':
            return this.dc !== null && this.dc !== undefined;
        case 'skill':
            return !!this.checkType;
        case 'save':
        case 'perception':
            return !!this.checkType;
        default:
            return !!this.checkType;
    }
}
```

## Interactive Parameters Specification

### Enhanced Parameters
```javascript
getInteractiveParams() {
    return {
        ...super.getInteractiveParams(),
        checkCategory: this.checkCategory,
        checkType: this.checkType,
        dc: this.dc,
        basic: this.basic,
        loreName: this.loreName,
        originalText: this.originalText
    };
}
```

This specification provides the complete architectural blueprint for unifying the check and save replacement classes while maintaining all existing functionality and improving the overall system design.