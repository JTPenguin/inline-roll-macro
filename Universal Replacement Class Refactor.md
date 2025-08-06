# PF2e Inline Roll Converter Refactor Specification

## Overview

This refactor transforms the PF2e Inline Roll Converter from a complex inheritance-based system with multiple specialized replacement classes to a streamlined universal replacement system that leverages standalone InlineAutomation classes for syntax generation.

## Core Objectives

1. **Unify Replacement Architecture**: Replace the current 6+ specialized replacement classes (DamageReplacement, CheckReplacement, etc.) with a single universal `Replacement` class.

2. **Separate Concerns**: Clearly delineate responsibilities between:
   - **Pattern Classes**: Handle text parsing and pattern detection
   - **InlineAutomation Classes**: Generate PF2e inline roll syntax
   - **Renderer Classes**: Manage UI and modifier panels
   - **Replacement Class**: Coordinate between the above and manage state

3. **Align UI with InlineAutomation**: Modify UI components to directly map to InlineAutomation class properties, using the existing InlineAutomation structure as the source of truth.

4. **Eliminate Type-Specific Logic**: Remove all type-specific logic from the universal Replacement class and distribute it to appropriate specialized classes.

## Current State Analysis

### Existing InlineAutomation Classes (Source of Truth)
- `InlineAutomation` (base class)
- `InlineDamage` - handles damage with `components`, `areaDamage`
- `InlineCheck` - handles checks with `checkType`, `loreName`, `dcMethod`, `dc`, `statistic`, `showDC`, `basic`, `damagingEffect`
- `InlineLink` - handles UUID links with `uuid`
- `InlineCondition` (extends InlineLink) - handles conditions with `condition`, `value`
- `InlineTemplate` - handles templates with `templateType`, `distance`, `width`
- `InlineGenericRoll` - handles generic rolls with `dice`, `label`, `gmOnly`
- `InlineAction` - handles actions with `action`, `variant`, `dcMethod`, `dc`, `statistic`, `alternateRollStatistic`

### Current Replacement Classes (To Be Replaced)
- `DamageReplacement`
- `CheckReplacement` 
- `HealingReplacement`
- `ConditionReplacement`
- `TemplateReplacement`
- `DurationReplacement`
- `ActionReplacement`

## Target Architecture

### Universal Replacement Class
```javascript
class Replacement {
    constructor(match, type, config)
    createInlineAutomationFromType(type)
    getRendererForType(type)
    parseMatch(match, config) // Delegates to Pattern classes
    render() // Uses InlineAutomation.render()
    renderInteractive(state)
    // State management methods
}
```

### Enhanced Pattern Classes
Pattern classes gain new responsibility for parsing matches into InlineAutomation objects:
- `DamagePattern.parseIntoInlineAutomation(match, inlineAutomation, config)`
- `CheckPattern.parseIntoInlineAutomation(match, inlineAutomation, config)`
- etc.

### Renderer Class Updates
Renderer classes are updated to work directly with InlineAutomation properties:
```javascript
getValue: (r) => r.inlineAutomation.propertyName
setValue: (r, value) => { r.inlineAutomation.propertyName = value; }
```

## Type Consolidation

### Healing → Damage
- `HealingReplacement` eliminated
- Healing patterns create `InlineDamage` with healing-specific configuration
- Renderer uses existing `DamageRenderer`

### Duration → Generic
- `DurationReplacement` eliminated  
- Duration patterns create `InlineGenericRoll` with duration-specific configuration
- Renderer uses existing `DurationRenderer` (potentially renamed to `GenericRenderer`)

## Property Alignment Strategy

The InlineAutomation classes represent the desired final state. All UI modifications must align with these existing property structures:

### InlineCheck Property Mapping
- UI `checkType` maps to `InlineCheck.checkType` (direct match)
- UI `loreName` maps to `InlineCheck.loreName` (direct match)
- UI `dcMethod` maps to `InlineCheck.dcMethod` (direct match)
- etc.

### InlineDamage Property Mapping
- UI `components` maps to `InlineDamage.components` (direct match)
- UI `areaDamage` maps to `InlineDamage.areaDamage` (direct match)

## Migration Benefits

1. **Simplified Architecture**: Single replacement class instead of complex inheritance
2. **Better Separation of Concerns**: Each class has a single, clear responsibility
3. **Improved Maintainability**: Type-specific logic is properly encapsulated
4. **Enhanced Reusability**: InlineAutomation classes can be used independently
5. **Cleaner UI Integration**: Direct property mapping eliminates translation layers
6. **Easier Extension**: New types require only Pattern + InlineAutomation + Renderer classes

## Compatibility Considerations

- All existing functionality must be preserved
- UI behavior should remain unchanged from user perspective
- All inline roll syntax generation must produce identical output
- Pattern detection and matching must remain unchanged

---

# PF2e Inline Roll Converter Implementation Plan

## Phase 1: Enhance Pattern Classes with Parsing Logic

### Step 1.1: Add parseIntoInlineAutomation Methods to Pattern Classes

**DamagePattern Updates:**
1. Add `static parseIntoInlineAutomation(match, inlineAutomation, config)` method
2. Move logic from `DamageReplacement.parseMatch()` and `DamageReplacement._parseSingleDamage()`
3. Update to populate `inlineAutomation.components` array with `DamageComponent` objects
4. Handle `inlineAutomation.areaDamage` flag
5. Apply legacy damage type conversions during parsing

**CheckPattern Updates:**
1. Add `static parseIntoInlineAutomation(match, inlineAutomation, config)` method
2. Move logic from `CheckReplacement.parseMatch()` and related methods:
   - `parseSaveMatch()`, `parseSkillMatch()`, `parsePerceptionMatch()`, `parseLoreMatch()`, `parseFlatMatch()`
3. Map to `InlineCheck` properties:
   - Set `inlineAutomation.checkType` (specific check like 'acrobatics', 'reflex', etc.)
   - Set `inlineAutomation.loreName`, `inlineAutomation.dcMethod`, `inlineAutomation.dc`, etc.
4. Handle category determination logic

**ConditionPattern Updates:**
1. Add `static parseIntoInlineAutomation(match, inlineAutomation, config)` method
2. Move logic from `ConditionReplacement.parseMatch()`
3. Handle legacy condition conversions
4. Set `inlineAutomation.condition`, `inlineAutomation.value`
5. Handle UUID lookup and assignment

**TemplatePattern Updates:**
1. Add `static parseIntoInlineAutomation(match, inlineAutomation, config)` method
2. Move logic from `TemplateReplacement.parseMatch()`
3. Set `inlineAutomation.templateType`, `inlineAutomation.distance`, `inlineAutomation.width`
4. Handle alternate shape mappings and display text logic

**HealingPattern Updates:**
1. Add `static parseIntoInlineAutomation(match, inlineAutomation, config)` method
2. Parse into `InlineDamage` object with healing configuration
3. Set appropriate damage component with `[healing]` type

**DurationPattern Updates:**
1. Add `static parseIntoInlineAutomation(match, inlineAutomation, config)` method
2. Parse into `InlineGenericRoll` object
3. Set `inlineAutomation.dice`, determine appropriate `label` from unit
4. Handle GM-only roll detection

**ActionPattern Updates:**
1. Add `static parseIntoInlineAutomation(match, inlineAutomation, config)` method
2. Move logic from `ActionReplacement.parseMatch()` and `actionToSlug()`
3. Set `inlineAutomation.action`, handle variant detection and correction

### Step 1.2: Create InlineCondition Class
1. Extend `InlineLink` class
2. Add constructor accepting `condition`, `value` parameters
3. Implement UUID lookup logic in constructor
4. Handle display text generation for conditions with/without values

### Step 1.3: Update InlineAutomation Factory Method
1. Update `createInlineAutomationFromType()` mapping:
   - `healing` → `InlineDamage`
   - `duration` → `InlineGenericRoll`
   - `condition` → `InlineCondition`

## Phase 2: Create Universal Replacement Class

### Step 2.1: Implement Base Universal Replacement Class
```javascript
class Replacement {
    constructor(match, type, config) {
        // Basic properties (id, positions, originalText, etc.)
        // Create InlineAutomation instance
        // Create renderer instance
        // Parse match into InlineAutomation
        // Store original render
    }
    
    createInlineAutomationFromType(type) {
        // Factory method for InlineAutomation instances
    }
    
    getRendererForType(type) {
        // Factory method for renderer instances
    }
    
    parseMatch(match, config) {
        // Delegate to Pattern.parseIntoInlineAutomation()
    }
    
    render() {
        // Use inlineAutomation.render()
    }
    
    conversionRender() {
        // Use inlineAutomation.render()
    }
    
    renderInteractive(state) {
        // Standard interactive rendering
    }
    
    // Standard state management methods
}
```

### Step 2.2: Implement Type-Specific Factory Methods
1. `createInlineAutomationFromType()` - instantiate appropriate InlineAutomation class
2. `getRendererForType()` - instantiate appropriate renderer class
3. Handle type consolidation mapping (healing→damage, duration→generic)

### Step 2.3: Implement Parsing Delegation
1. Create mapping from type to Pattern class
2. Implement `parseMatch()` to call `Pattern.parseIntoInlineAutomation()`
3. Handle special cases (condition linking, state passing)

## Phase 3: Update Renderer Classes for Direct Property Access

### Step 3.1: Update All Renderer Field Configurations
For each renderer class, update all field configurations:

**Before:**
```javascript
getValue: (r) => r.someProperty
setValue: (r, value) => { r.someProperty = value; }
```

**After:**
```javascript
getValue: (r) => r.inlineAutomation.someProperty
setValue: (r, value) => { r.inlineAutomation.someProperty = value; }
```

### Step 3.2: Renderer-Specific Updates

**DamageRenderer:**
- Update to access `r.inlineAutomation.components`
- Update to access `r.inlineAutomation.areaDamage`
- Maintain special damage component rendering logic

**CheckRenderer:**
- Update all field configs to access `r.inlineAutomation.*` properties
- Map UI category concept to `inlineAutomation.checkType` appropriately
- Handle lore name and DC method logic

**ConditionRenderer:**
- Update to access `r.inlineAutomation.condition` and `r.inlineAutomation.value`
- Maintain UUID update logic integration

**TemplateRenderer:**
- Update to access `r.inlineAutomation.templateType`, `distance`, `width`

**DurationRenderer:**
- Rename to `GenericRenderer` or maintain name
- Update to access `r.inlineAutomation.dice`, `label`, `gmOnly`

**ActionRenderer:**
- Update to access `r.inlineAutomation.action`, `variant`, etc.

### Step 3.3: Handle Special UI Cases
1. Traits handling - ensure traits are accessible via `r.inlineAutomation.traits`
2. Display text handling - ensure `r.inlineAutomation.displayText`
3. Component rendering for damage - special handling for `r.inlineAutomation.components`

## Phase 4: Update Factory and Integration Points

### Step 4.1: Update ReplacementFactory
```javascript
class ReplacementFactory {
    static createFromMatch(matchResult) {
        return new Replacement(matchResult.match, matchResult.type, matchResult.config);
    }
}
```

### Step 4.2: Update PatternDetector Integration
1. Ensure `PatternDetector.createReplacement()` calls updated factory
2. Remove old pattern class `createReplacement()` methods or update them to use new factory

### Step 4.3: Update TextProcessor Integration
1. Verify `TextProcessor.process()` works with new Replacement class
2. Ensure condition linking logic still functions correctly
3. Test state passing for condition UUID lookups

## Phase 5: Cleanup and Validation

### Step 5.1: Remove Old Replacement Classes
1. Delete `DamageReplacement`, `CheckReplacement`, `HealingReplacement`, `ConditionReplacement`, `TemplateReplacement`, `DurationReplacement`, `ActionReplacement`
2. Remove `RollReplacement` base class
3. Clean up `REPLACEMENT_CLASS_MAP` constant

### Step 5.2: Update Method Names and References
1. Search for any remaining references to old replacement classes
2. Update any method calls that might reference old class-specific methods
3. Clean up imports/requires if any

## Phase 6: Type Consolidation Implementation

### Step 6.1: Update Pattern Registration
1. Ensure `HealingPattern` creates damage-type replacements
2. Ensure `DurationPattern` creates generic-type replacements
3. Update any type-specific logic in detector or processor