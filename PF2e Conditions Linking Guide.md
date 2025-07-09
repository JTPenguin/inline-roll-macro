# Pathfinder 2e Standard Conditions List for Foundry VTT Macro

This list contains all standard Pathfinder 2e conditions that your inline roll converter macro should be able to detect and link. The UUIDs follow the format: `Compendium.pf2e.conditionitems.Item.{ID}`

## Standard PF2e Conditions

Your macro should detect and link the following conditions using dynamic UUID retrieval via `game.pf2e.conditions`. This ensures compatibility across PF2e system versions without hardcoding UUIDs that may change.

### Basic Conditions
- Blinded
- Broken
- Clumsy *(can have value: clumsy 1, clumsy 2, etc.)*
- Concealed
- Confused
- Controlled
- Dazzled
- Deafened
- Doomed *(can have value: doomed 1, doomed 2, etc.)*
- Drained *(can have value: drained 1, drained 2, etc.)*
- Dying *(can have value: dying 1, dying 2, etc.)*
- Enfeebled *(can have value: enfeebled 1, enfeebled 2, etc.)*
- Fascinated
- Fatigued
- Fleeing
- Frightened *(can have value: frightened 1, frightened 2, etc.)*
- Grabbed
- Immobilized
- Invisible
- Off-Guard *(note: hyphenated, also "flat-footed" in older content)*
- Paralyzed
- Petrified
- Prone
- Quickened
- Restrained
- Sickened *(can have value: sickened 1, sickened 2, etc.)*
- Slowed *(can have value: slowed 1, slowed 2, etc.)*
- Stunned *(can have value: stunned 1, stunned 2, etc.)*
- Stupefied *(can have value: stupefied 1, stupefied 2, etc.)*
- Unconscious
- Undetected
- Wounded *(can have value: wounded 1, wounded 2, etc.)*

### Attitude Conditions (NPCs)
- Helpful
- Friendly
- Indifferent
- Unfriendly
- Hostile

### Additional Conditions
- Encumbered
- Observed
- Hidden
- Unnoticed

## Implementation Notes for Your Macro

### Detection Patterns
Your macro should handle these variations:
- **Case variations**: "Frightened", "frightened", "FRIGHTENED"
- **With values**: "frightened 2", "enfeebled 1", "drained 3"
- **Hyphenated**: "off-guard" (note the hyphen)
- **Legacy terms**: "flat-footed" should map to "off-guard"

### Condition Detection Rules
1. **First occurrence only**: Link only the first occurrence of each condition per text block (treat different values of the condition as separate conditions, linking the first occurence of the condition with each value)
2. **Preserve capitalization**: Maintain original text capitalization in the link
3. **Value handling**: Support conditions with numeric values (e.g., "frightened 2")
4. **Validation**: Use `game.pf2e.conditions` to validate condition names exist

### Code Implementation Strategy
```javascript
// Build condition mapping at macro initialization
const conditionMap = buildConditionMap();

// Detection regex pattern for conditions with optional values
const conditionPattern = /\b(off-guard|(?:[a-z-]+(?:\s+\d+)?))\b/gi;

// Process text to link conditions
function linkConditions(text) {
    const linkedConditions = new Set(); // Track already linked conditions
    
    return text.replace(conditionPattern, (match, conditionText) => {
        const baseCondition = conditionText.split(/\s+/)[0].toLowerCase();
        
        // Skip if already linked or not a valid condition
        if (linkedConditions.has(baseCondition)) return match;
        
        const uuid = getConditionUUID(baseCondition);
        if (!uuid) return match;
        
        linkedConditions.add(baseCondition);
        return `@UUID[${uuid}]{${match}}`;
    });
}
```

### UUID Format
All condition links use this format, with UUIDs retrieved dynamically:
```
@UUID[{dynamically-retrieved-uuid}]{Original Text}
```

Example:
```javascript
const uuid = getConditionUUID("frightened");
if (uuid) {
    const link = `@UUID[${uuid}]{Frightened 2}`;
}
```

### Testing Recommendations
Test your macro with these condition detection scenarios:
- "The target becomes frightened 2 and off-guard."
- "All Blinded creatures take a penalty."
- "The poison causes enfeebled 1, or enfeebled 2 on a critical failure."
- "While paralyzed, the creature is also unconscious."

### Dynamic UUID Retrieval (Recommended Approach)
Since UUIDs can change between PF2e system versions, always retrieve them dynamically:
```javascript
// Initialize condition mapping at macro start
function buildConditionMap() {
    const conditionMap = new Map();
    
    if (!game.pf2e?.conditions) {
        ui.notifications.error("PF2e system conditions not available");
        return conditionMap;
    }
    
    for (const condition of game.pf2e.conditions) {
        // Map by name (lowercased for case-insensitive lookup)
        const name = condition.name.toLowerCase();
        conditionMap.set(name, {
            uuid: condition.uuid,
            name: condition.name,
            slug: condition.slug
        });
        
        // Also map by slug if different from name
        const slug = condition.slug.toLowerCase();
        if (slug !== name) {
            conditionMap.set(slug, {
                uuid: condition.uuid,
                name: condition.name,
                slug: condition.slug
            });
        }
    }
    
    return conditionMap;
}

// Usage in condition detection
function getConditionUUID(conditionName) {
    const normalizedName = conditionName.toLowerCase().trim();
    const condition = conditionMap.get(normalizedName);
    return condition?.uuid;
}
```

This approach ensures your macro remains compatible with future PF2e system updates.
