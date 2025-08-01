# Phase 3 Implementation Plan: Event Handling Streamlining

Check off tasks as they are completed. [ ] --> [x]

## 3.1: Core Event System Infrastructure

### 3.1.1: Update Scope System
- [ ] 3.1.1.1: Create UpdateScope constants
    - [ ] 3.1.1.1.1: Define FIELD_ONLY constant
    - [ ] 3.1.1.1.2: Define VISIBILITY constant  
    - [ ] 3.1.1.1.3: Define PANEL_PARTIAL constant
    - [ ] 3.1.1.1.4: Define PANEL_FULL constant
- [ ] 3.1.1.2: Implement update scope detection logic
    - [ ] 3.1.1.2.1: Create `getUpdateScope()` method in ModifierPanelManager
    - [ ] 3.1.1.2.2: Add logic to determine scope based on field config
    - [ ] 3.1.1.2.3: Add logic to determine scope based on field type
    - [ ] 3.1.1.2.4: Add fallback logic for unknown field types

### 3.1.2: Unified Event Handler Infrastructure
- [ ] 3.1.2.1: Create optimal event type detection
    - [ ] 3.1.2.1.1: Implement `getOptimalEventType()` method
    - [ ] 3.1.2.1.2: Map field types to appropriate event types (input vs change)
    - [ ] 3.1.2.1.3: Add default fallback for unknown field types
- [ ] 3.1.2.2: Create field value extraction utilities
    - [ ] 3.1.2.2.1: Implement `extractFieldValue()` method for all field types
    - [ ] 3.1.2.2.2: Handle checkbox boolean values
    - [ ] 3.1.2.2.3: Handle number field numeric conversion
    - [ ] 3.1.2.2.4: Handle select and text field string values
- [ ] 3.1.2.3: Create field value setting utilities
    - [ ] 3.1.2.3.1: Implement `setFieldValue()` method for all field types
    - [ ] 3.1.2.3.2: Handle checkbox checked property
    - [ ] 3.1.2.3.3: Handle input/select value property
    - [ ] 3.1.2.3.4: Add validation for value types

### 3.1.3: Core Event Handler Implementation
- [ ] 3.1.3.1: Implement unified field event handler
    - [ ] 3.1.3.1.1: Create `setupFieldListener()` method signature
    - [ ] 3.1.3.1.2: Implement event listener attachment logic
    - [ ] 3.1.3.1.3: Add old/new value comparison
    - [ ] 3.1.3.1.4: Call setValue if provided in field config
    - [ ] 3.1.3.1.5: Determine update scope based on change
    - [ ] 3.1.3.1.6: Route to appropriate update handler
- [ ] 3.1.3.2: Implement field update coordinator
    - [ ] 3.1.3.2.1: Create `handleFieldUpdate()` method
    - [ ] 3.1.3.2.2: Add switch statement for update scope handling
    - [ ] 3.1.3.2.3: Route FIELD_ONLY scope (no additional action)
    - [ ] 3.1.3.2.4: Route VISIBILITY scope to visibility updater
    - [ ] 3.1.3.2.5: Route PANEL_PARTIAL scope to dependent field updater
    - [ ] 3.1.3.2.6: Route PANEL_FULL scope to panel regeneration
    - [ ] 3.1.3.2.7: Always call onChangeCallback at end

## 3.2: Enhanced Field Configuration System

### 3.2.1: Field Configuration Schema Extensions
- [ ] 3.2.1.1: Extend base field configuration interface
    - [ ] 3.2.1.1.1: Add `affects` property for field dependencies
    - [ ] 3.2.1.1.2: Add `dependsOn` property for reverse dependencies
    - [ ] 3.2.1.1.3: Add `triggersUpdate` property for update scope
    - [ ] 3.2.1.1.4: Add `validate` property for field validation
- [ ] 3.2.1.2: Update existing field configurations
    - [ ] 3.2.1.2.1: Review all field configs in renderer classes
    - [ ] 3.2.1.2.2: Add dependency information where needed
    - [ ] 3.2.1.2.3: Add update scope specifications
    - [ ] 3.2.1.2.4: Ensure backward compatibility

### 3.2.2: Dynamic Field Handling
- [ ] 3.2.2.1: Implement dynamic options updating
    - [ ] 3.2.2.1.1: Create `updateSelectOptions()` method
    - [ ] 3.2.2.1.2: Add option generation from function configs
    - [ ] 3.2.2.1.3: Preserve selected value if still valid
    - [ ] 3.2.2.1.4: Clear selection if no longer valid
- [ ] 3.2.2.2: Implement field visibility management
    - [ ] 3.2.2.2.1: Create `shouldFieldBeVisible()` method
    - [ ] 3.2.2.2.2: Evaluate showIf conditions
    - [ ] 3.2.2.2.3: Evaluate hideIf conditions
    - [ ] 3.2.2.2.4: Apply visibility to field containers

### 3.2.3: Field Dependency Resolution
- [ ] 3.2.3.1: Implement dependency tracking
    - [ ] 3.2.3.1.1: Create dependency map from field configurations
    - [ ] 3.2.3.1.2: Build reverse dependency lookup
    - [ ] 3.2.3.1.3: Detect circular dependencies
    - [ ] 3.2.3.1.4: Add warnings for invalid dependencies
- [ ] 3.2.3.2: Implement dependent field updates
    - [ ] 3.2.3.2.1: Create `updateDependentFields()` method
    - [ ] 3.2.3.2.2: Find all fields affected by a change
    - [ ] 3.2.3.2.3: Update each dependent field
    - [ ] 3.2.3.2.4: Update field visibility after changes

## 3.3: Targeted Update Implementation

### 3.3.1: Single Field Update Logic
- [ ] 3.3.1.1: Implement individual field updating
    - [ ] 3.3.1.1.1: Create `updateSingleField()` method
    - [ ] 3.3.1.1.2: Update dynamic options if field is select type
    - [ ] 3.3.1.1.3: Sync field value with replacement object
    - [ ] 3.3.1.1.4: Update field visibility
    - [ ] 3.3.1.1.5: Preserve user focus and cursor position
- [ ] 3.3.1.2: Implement field visibility updates
    - [ ] 3.3.1.2.1: Create `updateFieldVisibility()` method for single field
    - [ ] 3.3.1.2.2: Find field container element
    - [ ] 3.3.1.2.3: Apply display style based on visibility conditions
    - [ ] 3.3.1.2.4: Handle nested field containers

### 3.3.2: Partial Panel Update Logic
- [ ] 3.3.2.1: Implement partial panel updates
    - [ ] 3.3.2.1.1: Create `updatePartialPanel()` method
    - [ ] 3.3.2.1.2: Identify fields that need updating
    - [ ] 3.3.2.1.3: Update fields in dependency order
    - [ ] 3.3.2.1.4: Preserve form state and focus
- [ ] 3.3.2.2: Implement bulk visibility updates
    - [ ] 3.3.2.2.1: Create `updateAllFieldVisibility()` method
    - [ ] 3.3.2.2.2: Iterate through all field configurations
    - [ ] 3.3.2.2.3: Update visibility for each field
    - [ ] 3.3.2.2.4: Handle special component visibility

### 3.3.3: Full Panel Regeneration (Fallback)
- [ ] 3.3.3.1: Enhance existing panel regeneration
    - [ ] 3.3.3.1.1: Preserve user input state before regeneration
    - [ ] 3.3.3.1.2: Store current field values
    - [ ] 3.3.3.1.3: Store current focus element
    - [ ] 3.3.3.1.4: Restore state after regeneration

## 3.4: Centralized Event Management

### 3.4.1: Event Setup Coordination
- [ ] 3.4.1.1: Update main event setup method
    - [ ] 3.4.1.1.1: Modify `addFormListeners()` method signature
    - [ ] 3.4.1.1.2: Store current form references for updates
    - [ ] 3.4.1.1.3: Store current field configurations
    - [ ] 3.4.1.1.4: Store current replacement and callback references
- [ ] 3.4.1.2: Implement standard field listener setup
    - [ ] 3.4.1.2.1: Create `setupStandardFieldListeners()` method
    - [ ] 3.4.1.2.2: Iterate through field configurations
    - [ ] 3.4.1.2.3: Set up listener for each field using unified handler
    - [ ] 3.4.1.2.4: Track which fields have listeners to prevent duplicates

### 3.4.2: Special Component Integration
- [ ] 3.4.2.1: Update special component handling
    - [ ] 3.4.2.1.1: Modify `setupSpecialComponentListeners()` method
    - [ ] 3.4.2.1.2: Integrate damage component listeners with new system
    - [ ] 3.4.2.1.3: Integrate traits input listeners with new system
    - [ ] 3.4.2.1.4: Ensure special components use same update flow
- [ ] 3.4.2.2: Update damage component handling
    - [ ] 3.4.2.2.1: Modify `addDamageFormListeners()` to use unified pattern
    - [ ] 3.4.2.2.2: Ensure damage component changes trigger appropriate updates
    - [ ] 3.4.2.2.3: Maintain existing damage component functionality

### 3.4.3: Event Listener Cleanup
- [ ] 3.4.3.1: Implement listener tracking
    - [ ] 3.4.3.1.1: Track attached event listeners
    - [ ] 3.4.3.1.2: Prevent duplicate listener attachment
    - [ ] 3.4.3.1.3: Add cleanup methods for listener removal
- [ ] 3.4.3.2: Add memory leak prevention
    - [ ] 3.4.3.2.1: Remove event listeners on panel destruction
    - [ ] 3.4.3.2.2: Clear stored references appropriately
    - [ ] 3.4.3.2.3: Handle dialog close cleanup

## 3.5: Renderer Configuration Updates

### 3.5.1: ActionRenderer Field Configuration Updates
- [ ] 3.5.1.1: Update action field configuration
    - [ ] 3.5.1.1.1: Add `affects: ['action-variant']` to action-name field
    - [ ] 3.5.1.1.2: Add `triggersUpdate: 'panel-partial'` to action-name field
    - [ ] 3.5.1.1.3: Add `dependsOn: ['action-name']` to action-variant field
    - [ ] 3.5.1.1.4: Convert variant options to dynamicOptions function
- [ ] 3.5.1.2: Test action-variant interaction
    - [ ] 3.5.1.2.1: Verify variant dropdown updates when action changes
    - [ ] 3.5.1.2.2: Verify variant field shows/hides appropriately
    - [ ] 3.5.1.2.3: Verify variant selection is preserved when valid

### 3.5.2: CheckRenderer Field Configuration Updates  
- [ ] 3.5.2.1: Update check type field configuration
    - [ ] 3.5.2.1.1: Add affects array for conditional fields
    - [ ] 3.5.2.1.2: Add `triggersUpdate: 'visibility'` to check-type field
    - [ ] 3.5.2.1.3: Add `triggersUpdate: 'visibility'` to dc-method field
    - [ ] 3.5.2.1.4: Update showIf/hideIf conditions for all conditional fields
- [ ] 3.5.2.2: Test check field interactions
    - [ ] 3.5.2.2.1: Verify skill/save/lore fields show based on check type
    - [ ] 3.5.2.2.2: Verify DC/statistic fields show based on DC method
    - [ ] 3.5.2.2.3: Verify basic save checkbox only shows for saves

### 3.5.3: Other Renderer Updates
- [ ] 3.5.3.1: Update DamageRenderer configuration
    - [ ] 3.5.3.1.1: Add dependency information for damage component fields
    - [ ] 3.5.3.1.2: Integrate with unified event system
- [ ] 3.5.3.2: Update TemplateRenderer configuration
    - [ ] 3.5.3.2.1: Add width field dependency on shape field
    - [ ] 3.5.3.2.2: Update showIf condition for width field
- [ ] 3.5.3.3: Update remaining renderer configurations
    - [ ] 3.5.3.3.1: Review HealingRenderer field configurations
    - [ ] 3.5.3.3.2: Review DurationRenderer field configurations
    - [ ] 3.5.3.3.3: Review ConditionRenderer field configurations

## 3.6: Error Handling and Validation

### 3.6.1: Field Validation System
- [ ] 3.6.1.1: Implement field validation infrastructure
    - [ ] 3.6.1.1.1: Add validation to handleFieldUpdate method
    - [ ] 3.6.1.1.2: Call field config validate function if present
    - [ ] 3.6.1.1.3: Show validation errors to user
    - [ ] 3.6.1.1.4: Prevent invalid updates from propagating
- [ ] 3.6.1.2: Create validation error display
    - [ ] 3.6.1.2.1: Implement `showFieldError()` method
    - [ ] 3.6.1.2.2: Add error styling to field elements
    - [ ] 3.6.1.2.3: Show error message in tooltip or inline
    - [ ] 3.6.1.2.4: Implement `clearFieldError()` method

### 3.6.2: Error Recovery and Logging
- [ ] 3.6.2.1: Add comprehensive error handling
    - [ ] 3.6.2.1.1: Wrap all update operations in try-catch blocks
    - [ ] 3.6.2.1.2: Log errors with context information
    - [ ] 3.6.2.1.3: Prevent single field errors from breaking entire panel
    - [ ] 3.6.2.1.4: Provide graceful degradation for failed updates
- [ ] 3.6.2.2: Add debugging utilities
    - [ ] 3.6.2.2.1: Add debug logging for field updates
    - [ ] 3.6.2.2.2: Add debug logging for dependency resolution
    - [ ] 3.6.2.2.3: Add debug logging for update scope decisions

## 3.7: Integration and Migration

### 3.7.1: Backward Compatibility Verification
- [ ] 3.7.1.1: Verify existing field rendering unchanged
    - [ ] 3.7.1.1.1: Test all field types render correctly
    - [ ] 3.7.1.1.2: Verify field values are populated correctly
    - [ ] 3.7.1.1.3: Ensure field styling is preserved
- [ ] 3.7.1.2: Verify replacement object compatibility
    - [ ] 3.7.1.2.1: Test all replacement classes work with new system
    - [ ] 3.7.1.2.2: Verify no breaking changes to replacement interfaces
    - [ ] 3.7.1.2.3: Test callback signatures are preserved

### 3.7.2: Legacy Code Migration
- [ ] 3.7.2.1: Remove deprecated event handling code
    - [ ] 3.7.2.1.1: Remove old event handler methods that are no longer used
    - [ ] 3.7.2.1.2: Remove hardcoded dependency checking logic
    - [ ] 3.7.2.1.3: Clean up any duplicate event handling patterns
- [ ] 3.7.2.2: Update method signatures
    - [ ] 3.7.2.2.1: Update any method calls to use new signatures
    - [ ] 3.7.2.2.2: Remove unused parameters from method signatures
    - [ ] 3.7.2.2.3: Update internal method calls to match new patterns

### 3.7.3: Final Integration Testing
- [ ] 3.7.3.1: Test all modifier panel types
    - [ ] 3.7.3.1.1: Test damage modifier panel functionality
    - [ ] 3.7.3.1.2: Test check modifier panel functionality
    - [ ] 3.7.3.1.3: Test condition modifier panel functionality
    - [ ] 3.7.3.1.4: Test template modifier panel functionality
    - [ ] 3.7.3.1.5: Test healing modifier panel functionality
    - [ ] 3.7.3.1.6: Test duration modifier panel functionality
    - [ ] 3.7.3.1.7: Test action modifier panel functionality
- [ ] 3.7.3.2: Test complex field interactions
    - [ ] 3.7.3.2.1: Test action → variant field dependency
    - [ ] 3.7.3.2.2: Test check type → conditional field visibility
    - [ ] 3.7.3.2.3: Test DC method → statistic field visibility
    - [ ] 3.7.3.2.4: Test damage component addition/removal
- [ ] 3.7.3.3: Verify output generation
    - [ ] 3.7.3.3.1: Test that field changes update replacement objects
    - [ ] 3.7.3.3.2: Test that replacement changes update output text
    - [ ] 3.7.3.3.3: Test that interactive elements work correctly
    - [ ] 3.7.3.3.4: Test that live preview updates appropriately