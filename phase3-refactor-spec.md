# Phase 3 Refactor Specification: Event Handling Streamlining

## Overview

Phase 3 refactors the event handling system in the PF2e Converter Macro to provide consistent, efficient, and maintainable field interactions in modifier panels. This phase eliminates the current inconsistent event patterns and implements a declarative dependency system for field relationships.

## Current State Analysis

### Problems to Solve

1. **Inconsistent Event Patterns**: Mixed use of `input` and `change` events across different field types
2. **Manual Dependency Tracking**: Hardcoded field relationship checks in `checkForFieldDependencies()`
3. **Expensive Full Regeneration**: Dynamic field changes trigger complete panel rebuilds
4. **Event Handler Duplication**: Similar event handling patterns repeated across field types
5. **Focus/State Loss**: Panel regeneration loses user focus and input state

### What Works Well (To Preserve)

1. **Field Configuration System**: The renderer-based field config approach from Phase 2
2. **Replacement Update Flow**: The pattern of field change → replacement update → UI update
3. **Validation Integration**: Existing field validation patterns
4. **Error Callback Pattern**: Current `onChangeCallback` mechanism

## Target Architecture

### Core Components

1. **Unified Event Handler**: Single event handling pattern for all field types
2. **Declarative Dependencies**: Field configurations declare their relationships
3. **Smart Update Scopes**: Targeted updates based on change impact
4. **Centralized Event Setup**: Consistent event listener management

### Event Flow Design

```
User Input → Unified Handler → Value Update → Scope Detection → Targeted Update → Callback
```

## Detailed Design

### 1. Enhanced Field Configuration Schema

Field configurations are extended to include dependency and update behavior:

```javascript
const fieldConfig = {
    // Existing properties
    id: 'field-id',
    type: 'select',
    label: 'Field Label',
    getValue: (rep) => rep.value,
    setValue: (rep, val) => { rep.value = val; },
    
    // New dependency properties
    affects: ['other-field-id'],           // Fields this field affects
    dependsOn: ['source-field-id'],        // Fields this field depends on
    triggersUpdate: 'panel-partial',       // Update scope when changed
    
    // Enhanced conditional properties
    showIf: (rep) => boolean,              // When to show field
    hideIf: (rep) => boolean,              // When to hide field
    dynamicOptions: (rep) => options,      // Dynamic options function
    validate: (value, rep) => boolean      // Field validation
};
```

### 2. Update Scope System

Four distinct update scopes handle different levels of change impact:

- **FIELD_ONLY**: No additional updates needed (default for most fields)
- **VISIBILITY**: Update field visibility based on showIf/hideIf conditions
- **PANEL_PARTIAL**: Update dependent fields while preserving panel structure
- **PANEL_FULL**: Complete panel regeneration (rare, only for structural changes)

### 3. Unified Event Handler

Single event handling pattern replaces the current mixed approach:

```javascript
setupFieldListener(fieldElement, fieldConfig, replacement, onChangeCallback) {
    const eventType = this.getOptimalEventType(fieldConfig.type);
    
    fieldElement.addEventListener(eventType, (event) => {
        const oldValue = fieldConfig.getValue(replacement);
        const newValue = this.extractFieldValue(event.target);
        
        if (fieldConfig.setValue) {
            fieldConfig.setValue(replacement, newValue);
        }
        
        const updateScope = this.getUpdateScope(fieldConfig, oldValue, newValue);
        this.handleFieldUpdate(replacement, fieldConfig, updateScope, onChangeCallback);
    });
}
```

### 4. Smart Update Logic

Targeted updates minimize DOM manipulation and preserve user state:

```javascript
handleFieldUpdate(replacement, fieldConfig, updateScope, onChangeCallback) {
    switch (updateScope) {
        case UpdateScope.FIELD_ONLY:
            // No additional updates
            break;
        case UpdateScope.VISIBILITY:
            this.updateFieldVisibility();
            break;
        case UpdateScope.PANEL_PARTIAL:
            this.updateDependentFields(fieldConfig, replacement);
            break;
        case UpdateScope.PANEL_FULL:
            this.regeneratePanel(replacement, onChangeCallback);
            break;
    }
    
    if (onChangeCallback) {
        onChangeCallback(replacement, fieldConfig.id);
    }
}
```

### 5. Centralized Event Management

All event listener setup is centralized and tracked:

```javascript
addFormListeners(formElement, type, replacement, onChangeCallback) {
    // Store references for update operations
    this.currentForm = formElement;
    this.currentFieldConfigs = this.renderers[type].getFieldConfigs(replacement);
    
    // Setup listeners for all fields
    this.setupStandardFieldListeners(formElement, replacement, onChangeCallback);
    this.setupSpecialComponentListeners(formElement, type, replacement, onChangeCallback);
    
    // Initial state sync
    this.updateFieldVisibility(formElement, this.currentFieldConfigs, replacement);
}
```

## Specific Field Behaviors

### Field Visibility Updates

Fields with `showIf`/`hideIf` conditions are updated when their dependencies change:

```javascript
updateFieldVisibility(formElement, fieldConfigs, replacement) {
    fieldConfigs.forEach(config => {
        const fieldElement = formElement.querySelector(`#${config.id}`);
        const container = fieldElement?.closest('.modifier-field-row');
        
        if (container) {
            const isVisible = this.shouldFieldBeVisible(config, replacement);
            container.style.display = isVisible ? '' : 'none';
        }
    });
}
```

### Dynamic Options Updates

Select fields with dynamic options are updated when their source fields change:

```javascript
updateDependentFields(changedFieldConfig, replacement) {
    const affectedFields = changedFieldConfig.affects || [];
    
    affectedFields.forEach(fieldId => {
        const fieldElement = this.currentForm.querySelector(`#${fieldId}`);
        const fieldConfig = this.currentFieldConfigs.find(config => config.id === fieldId);
        
        if (fieldElement && fieldConfig) {
            this.updateSingleField(fieldElement, fieldConfig, replacement);
        }
    });
}
```

### Special Component Handling

Complex components (damage components, traits input) retain their specialized handling:

```javascript
setupSpecialComponentListeners(formElement, type, replacement, onChangeCallback) {
    if (type === 'damage') {
        this.addDamageFormListeners(formElement, replacement, renderer, onChangeCallback);
    }
    
    // Setup traits inputs
    const traitsContainers = formElement.querySelectorAll('[id*="traits-container"]');
    traitsContainers.forEach(container => {
        this.setupTraitsInput(container, replacement, onChangeCallback);
    });
}
```

## Field Configuration Updates

### Enhanced Field Configs for Key Renderers

**ActionRenderer**: Action selection affects variant options
```javascript
{
    id: 'action-name',
    affects: ['action-variant'],
    triggersUpdate: 'panel-partial'
},
{
    id: 'action-variant',
    dependsOn: ['action-name'],
    showIf: (rep) => rep.action && ConfigManager.actionHasVariants(rep.action),
    dynamicOptions: (rep) => ConfigManager.ACTION_VARIANTS[rep.action]?.options || []
}
```

**CheckRenderer**: Check type affects conditional fields
```javascript
{
    id: 'check-type',
    affects: ['skill', 'save', 'lore-name', 'dc-method'],
    triggersUpdate: 'visibility'
},
{
    id: 'dc-method', 
    affects: ['statistic', 'check-dc'],
    triggersUpdate: 'visibility'
}
```

## Error Handling

Centralized error handling prevents silent failures:

```javascript
handleFieldUpdate(replacement, fieldConfig, updateScope, onChangeCallback) {
    try {
        // Validate new value
        if (fieldConfig.validate && !fieldConfig.validate(fieldConfig.getValue(replacement), replacement)) {
            this.showFieldError(fieldConfig.id, 'Invalid value');
            return;
        }
        
        this.clearFieldError(fieldConfig.id);
        
        // Proceed with updates...
        
    } catch (error) {
        console.error(`[ModifierPanelManager] Error updating field ${fieldConfig.id}:`, error);
        this.showFieldError(fieldConfig.id, 'Update failed');
    }
}
```

## Integration Points

### ConverterDialog Integration

The ConverterDialog class continues to coordinate overall state management:

```javascript
handleModifierChange(rep, changedFieldId) {
    console.log('[PF2e Converter] Handling modifier change:', changedFieldId);
    if (rep.markModified) {
        rep.markModified();
    }
    this.renderOutput();
    this.renderLivePreview();
    this.updateElementHighlighting();
}
```

### Renderer Integration

Renderers provide enhanced field configurations:

```javascript
class BaseRenderer {
    getFieldConfigs(replacement) {
        // Return field configurations with dependency information
        return this.fieldConfigs.map(config => ({
            ...config,
            affects: this.getFieldAffects(config.id),
            dependsOn: this.getFieldDependencies(config.id),
            triggersUpdate: this.getUpdateScope(config.id)
        }));
    }
}
```

## Backward Compatibility

The refactor maintains backward compatibility with existing patterns:

1. **Replacement Classes**: No changes to replacement object interfaces
2. **Callback Signatures**: Existing `onChangeCallback` signature preserved  
3. **Field Rendering**: Current field rendering methods unchanged
4. **Validation**: Existing validation patterns continue to work

## Success Criteria

1. **Consistent Event Handling**: All fields use the same event handling pattern
2. **Efficient Updates**: Dynamic field changes use targeted updates instead of full regeneration
3. **Preserved User State**: Field updates maintain focus and input state
4. **Declarative Dependencies**: Field relationships are explicit in configuration
5. **Maintainable Code**: Adding new field types and behaviors follows clear patterns