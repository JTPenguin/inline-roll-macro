# Check/Save Refactor Implementation Plan

## Phase 1: Foundation Setup

* [ ] **1. Create Unified CheckReplacement Class Structure**
   * [ ] 1.1 Create new unified CheckReplacement class
      * [ ] 1.1.1 Use existing `CheckReplacement` class as starting point
      * [ ] 1.1.2 Add new properties: `checkCategory`, `basic`, `loreName`
      * [ ] 1.1.3 Keep existing properties: `checkType`, `dc`
      * [ ] 1.1.4 Update constructor to initialize all new properties
   * [ ] 1.2 Add category detection methods
      * [ ] 1.2.1 Implement `determineCategory(match, config)` method
      * [ ] 1.2.2 Implement `resetCategoryProperties()` method
      * [ ] 1.2.3 Add logic to detect save vs skill vs lore vs perception vs flat
   * [ ] 1.3 Create category-specific option methods
      * [ ] 1.3.1 Implement `getCategoryOptions()` method
      * [ ] 1.3.2 Return appropriate skill/save/flat options based on category
      * [ ] 1.3.3 Handle dynamic dropdown population

* [ ] **2. Migrate SaveReplacement Logic**
   * [ ] 2.1 Copy save-specific parsing logic
      * [ ] 2.1.1 Move `SaveReplacement.parseMatch()` logic into `parseSaveMatch()`
      * [ ] 2.1.2 Copy save-specific regex handling and DC extraction
      * [ ] 2.1.3 Preserve `basic` save detection logic
      * [ ] 2.1.4 Handle parentheses wrapping logic for saves
   * [ ] 2.2 Copy save-specific rendering logic
      * [ ] 2.2.1 Move `SaveReplacement.conversionRender()` into category-specific method
      * [ ] 2.2.2 Preserve save term detection (`saveTermInInput`)
      * [ ] 2.2.3 Handle basic save parameter addition
      * [ ] 2.2.4 Maintain parentheses preservation logic
   * [ ] 2.3 Copy save validation logic
      * [ ] 2.3.1 Integrate save validation into unified `validate()` method
      * [ ] 2.3.2 Preserve save-specific validation rules

* [ ] **3. Migrate FlatCheckReplacement Logic**
   * [ ] 3.1 Copy flat check parsing logic
      * [ ] 3.1.1 Move `FlatCheckReplacement.parseMatch()` logic into `parseFlatMatch()`
      * [ ] 3.1.2 Copy flat check DC extraction logic
      * [ ] 3.1.3 Preserve simple flat check pattern handling
   * [ ] 3.2 Copy flat check rendering logic
      * [ ] 3.2.1 Move `FlatCheckReplacement.conversionRender()` into `renderFlatCheck()`
      * [ ] 3.2.2 Preserve flat check parameter structure
      * [ ] 3.2.3 Maintain simple `@Check[flat|dc:X]` output format
   * [ ] 3.3 Copy flat check validation logic
      * [ ] 3.3.1 Integrate flat check validation (DC required) into unified `validate()` method
      * [ ] 3.3.2 Preserve flat check-specific validation rules

## Phase 2: Parsing Logic Integration

* [ ] **4. Implement Unified parseMatch Method**
   * [ ] 4.1 Create main parseMatch method
      * [ ] 4.1.1 Call `super.parseMatch(match, config)`
      * [ ] 4.1.2 Call `resetCategoryProperties()` to clear state
      * [ ] 4.1.3 Call `determineCategory()` to identify check type
      * [ ] 4.1.4 Route to appropriate category-specific parser
   * [ ] 4.2 Implement category-specific parsers
      * [ ] 4.2.1 `parseSaveMatch(match, config)` - handle save patterns
      * [ ] 4.2.2 `parseSkillMatch(match, config)` - handle skill patterns
      * [ ] 4.2.3 `parsePerceptionMatch(match, config)` - handle perception patterns
      * [ ] 4.2.4 `parseLoreMatch(match, config)` - handle lore patterns
      * [ ] 4.2.5 `parseFlatMatch(match, config)` - handle flat check patterns
      * [ ] 4.2.6 `parseGenericMatch(match, config)` - fallback parser
   * [ ] 4.3 Preserve existing special case handling
      * [ ] 4.3.1 Lore check name extraction
      * [ ] 4.3.2 DC extraction from various positions
      * [ ] 4.3.3 Match replacement handling

* [ ] **5. Implement Unified Rendering Logic**
   * [ ] 5.1 Create main conversionRender method
      * [ ] 5.1.1 Handle `match.replacement` special cases
      * [ ] 5.1.2 Route to appropriate rendering method based on category
      * [ ] 5.1.3 Preserve all existing display text logic
   * [ ] 5.2 Implement category-specific renderers
      * [ ] 5.2.1 `renderSingleCheck()` - standard single check rendering
      * [ ] 5.2.2 `renderLoreCheck()` - lore-specific parameter handling
      * [ ] 5.2.3 `renderSaveCheck()` - save-specific parameter handling
      * [ ] 5.2.4 `renderFlatCheck()` - flat check parameter handling
   * [ ] 5.3 Preserve special formatting
      * [ ] 5.3.1 Parentheses wrapping for saves
      * [ ] 5.3.2 Save term appending logic
      * [ ] 5.3.3 Custom display text handling
      * [ ] 5.3.4 Trait parameter integration

## Phase 3: UI and Configuration

* [ ] **6. Create Unified Panel Configuration**
   * [ ] 6.1 Design dynamic panel config
      * [ ] 6.1.1 Create `static get panelConfig()` method
      * [ ] 6.1.2 Implement category selector field (skill/save/perception/lore/flat)
      * [ ] 6.1.3 Add conditional field visibility using `hideIf`
      * [ ] 6.1.4 Preserve all existing field configurations
   * [ ] 6.2 Implement field visibility logic
      * [ ] 6.2.1 Check-type field: hide for lore and flat categories
      * [ ] 6.2.2 Lore name field: show only for lore category
      * [ ] 6.2.3 Basic save field: show only for save category
      * [ ] 6.2.4 DC field: show for all categories
      * [ ] 6.2.5 Display text field: show for all categories
   * [ ] 6.3 Add field interaction handlers
      * [ ] 6.3.1 Category change resets type-specific fields
      * [ ] 6.3.2 Dynamic options population based on category
      * [ ] 6.3.3 Form validation updates

* [ ] **7. Update Interactive Parameters**
   * [ ] 7.1 Enhance getInteractiveParams method
      * [ ] 7.1.1 Add all new properties to parameter object
      * [ ] 7.1.2 Preserve existing parameter structure
      * [ ] 7.1.3 Ensure backward compatibility for UI
   * [ ] 7.2 Update parameter handling
      * [ ] 7.2.1 Include `checkCategory` in parameters
      * [ ] 7.2.2 Include all save-specific parameters
      * [ ] 7.2.3 Include all skill-specific parameters
      * [ ] 7.2.4 Include all flat check-specific parameters
      * [ ] 7.2.5 Remove multiple skills parameters
      * [ ] 7.2.6 Maintain parameter consistency

## Phase 4: Pattern System Updates

* [ ] **8. Update Pattern Definitions**
   * [ ] 8.1 Change pattern types
      * [ ] 8.1.1 Update all `type: 'skill'` to `type: 'check'`
      * [ ] 8.1.2 Update all `type: 'save'` to `type: 'check'`
      * [ ] 8.1.3 Update all `type: 'flat'` to `type: 'check'`
      * [ ] 8.1.4 Preserve all existing regex patterns
      * [ ] 8.1.5 Maintain priority levels
   * [ ] 8.2 Update pattern handlers
      * [ ] 8.2.1 Add `checkCategory` assignment to save pattern handlers
      * [ ] 8.2.2 Add `checkCategory` assignment to skill pattern handlers
      * [ ] 8.2.3 Add `checkCategory` assignment to flat check pattern handlers
      * [ ] 8.2.4 Preserve all existing pattern logic
      * [ ] 8.2.5 Maintain special case handling (lore checks)
   * [ ] 8.3 Verify pattern priority ordering
      * [ ] 8.3.1 Ensure save patterns maintain highest priority
      * [ ] 8.3.2 Ensure skill patterns maintain medium priority
      * [ ] 8.3.3 Ensure flat check patterns maintain appropriate priority
      * [ ] 8.3.4 Check for conflicts with other pattern types

* [ ] **9. Update Class Mapping**
   * [ ] 9.1 Modify REPLACEMENT_CLASS_MAP
      * [ ] 9.1.1 Remove `skill: CheckReplacement` entry
      * [ ] 9.1.2 Remove `save: SaveReplacement` entry
      * [ ] 9.1.3 Remove `flat: FlatCheckReplacement` entry
      * [ ] 9.1.4 Add unified `check: CheckReplacement` entry
   * [ ] 9.2 Update factory method
      * [ ] 9.2.1 Ensure `ReplacementFactory.createFromMatch()` works with new mapping
      * [ ] 9.2.2 Verify condition replacement special case handling
      * [ ] 9.2.3 Test all replacement type creation

## Phase 5: Cleanup and Validation

* [ ] **10. Remove Legacy Classes**
   * [ ] 10.1 Delete SaveReplacement and FlatCheckReplacement classes
      * [ ] 10.1.1 Remove SaveReplacement class definition entirely
      * [ ] 10.1.2 Remove FlatCheckReplacement class definition entirely
      * [ ] 10.1.3 Remove from file/module exports
      * [ ] 10.1.4 Update any documentation references
   * [ ] 10.2 Clean up imports/references
      * [ ] 10.2.1 Remove SaveReplacement and FlatCheckReplacement from imports
      * [ ] 10.2.2 Update any remaining references
      * [ ] 10.2.3 Clean up unused constants or helpers

* [ ] **11. Update Method Implementations**
   * [ ] 11.1 Implement resetToOriginal method
      * [ ] 11.1.1 Call `super.resetToOriginal()`
      * [ ] 11.1.2 Reset category-specific properties
      * [ ] 11.1.3 Re-parse using original match data
   * [ ] 11.2 Update validation logic
      * [ ] 11.2.1 Implement category-specific validation
      * [ ] 11.2.2 Handle lore name requirement
      * [ ] 11.2.3 Handle flat check DC requirement
      * [ ] 11.2.4 Preserve existing validation rules
   * [ ] 11.3 Update toJSON method (if needed)
      * [ ] 11.3.1 Include all new properties in serialization
      * [ ] 11.3.2 Maintain backward compatibility
      * [ ] 11.3.3 Handle category-specific property inclusion

## Phase 6: Integration Testing

* [ ] **12. Functional Verification**
   * [ ] 12.1 Test all existing patterns
      * [ ] 12.1.1 Verify save patterns still work correctly
      * [ ] 12.1.2 Verify skill patterns still work correctly
      * [ ] 12.1.3 Verify lore patterns still work correctly
      * [ ] 12.1.4 Test flat check patterns
   * [ ] 12.2 Test UI interactions
      * [ ] 12.2.1 Verify modifier panel shows correct fields
      * [ ] 12.2.2 Test category switching behavior
      * [ ] 12.2.3 Test field visibility logic
      * [ ] 12.2.4 Verify form submission works
   * [ ] 12.3 Test edge cases
      * [ ] 12.3.1 Parentheses handling in saves
      * [ ] 12.3.2 Lore check name extraction
      * [ ] 12.3.3 Basic save flag handling
      * [ ] 12.3.4 Display text preservation
      * [ ] 12.3.5 Flat check DC validation

* [ ] **13. Integration Validation**
   * [ ] 13.1 Test with existing content
      * [ ] 13.1.1 Run converter with known working inputs
      * [ ] 13.1.2 Verify output matches previous behavior
      * [ ] 13.1.3 Check interactive element creation
      * [ ] 13.1.4 Validate parameter passing
   * [ ] 13.2 Test pattern conflicts
      * [ ] 13.2.1 Verify no conflicts with damage patterns
      * [ ] 13.2.2 Check template pattern interactions
      * [ ] 13.2.3 Validate condition pattern priorities
      * [ ] 13.2.4 Test action pattern compatibility

## Completion Criteria

* [ ] All existing save patterns produce identical output
* [ ] All existing skill patterns produce identical output  
* [ ] All existing lore patterns produce identical output
* [ ] All existing flat check patterns produce identical output
* [ ] Modifier panel shows appropriate fields for each category
* [ ] Category switching works correctly in UI
* [ ] Interactive parameters include all necessary data
* [ ] No regression in pattern detection or rendering
* [ ] SaveReplacement and FlatCheckReplacement classes completely removed
* [ ] All tests pass with new unified class
* [ ] Documentation updated to reflect new architecture

## Post-Implementation Benefits

After completion, the refactor will provide:
- Single class to maintain for all @Check syntax types
- Easier addition of new check categories
- Better support for compound checks
- Cleaner pattern detection logic
- Unified UI experience
- Architecture aligned with PF2e system design
- Complete elimination of special case classes for @Check syntax