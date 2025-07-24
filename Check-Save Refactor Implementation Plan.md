# Check/Save Refactor Implementation Plan

## Phase 1: Foundation Setup

* [x] **1. Create Unified CheckReplacement Class Structure**
   * [x] 1.1 Create new unified CheckReplacement class
      * [x] 1.1.1 Use existing `CheckReplacement` class as starting point
      * [x] 1.1.2 Add new properties: `checkCategory`, `basic`, `loreName`
      * [x] 1.1.3 Keep existing properties: `checkType`, `dc`
      * [x] 1.1.4 Update constructor to initialize all new properties
   * [x] 1.2 Add category detection methods
      * [x] 1.2.1 Implement `determineCategory(match, config)` method
      * [x] 1.2.2 Implement `resetCategoryProperties()` method
      * [x] 1.2.3 Add logic to detect save vs skill vs lore vs perception vs flat
   * [x] 1.3 Create category-specific option methods
      * [x] 1.3.1 Implement `getCategoryOptions()` method
      * [x] 1.3.2 Return appropriate skill/save/flat options based on category
      * [x] 1.3.3 Handle dynamic dropdown population

* [x] **2. Migrate SaveReplacement Logic**
   * [x] 2.1 Copy save-specific parsing logic
      * [x] 2.1.1 Move `SaveReplacement.parseMatch()` logic into `parseSaveMatch()`
      * [x] 2.1.2 Copy save-specific regex handling and DC extraction
      * [x] 2.1.3 Preserve `basic` save detection logic
      * [x] 2.1.4 Handle parentheses wrapping logic for saves
   * [x] 2.2 Copy save-specific rendering logic
      * [x] 2.2.1 Move `SaveReplacement.conversionRender()` into category-specific method
      * [x] 2.2.2 Preserve save term detection (`saveTermInInput`)
      * [x] 2.2.3 Handle basic save parameter addition
      * [x] 2.2.4 Maintain parentheses preservation logic
   * [x] 2.3 Copy save validation logic
      * [x] 2.3.1 Integrate save validation into unified `validate()` method
      * [x] 2.3.2 Preserve save-specific validation rules

* [x] **3. Migrate FlatCheckReplacement Logic**
   * [x] 3.1 Copy flat check parsing logic
      * [x] 3.1.1 Move `FlatCheckReplacement.parseMatch()` logic into `parseFlatMatch()`
      * [x] 3.1.2 Copy flat check DC extraction logic
      * [x] 3.1.3 Preserve simple flat check pattern handling
   * [x] 3.2 Copy flat check rendering logic
      * [x] 3.2.1 Move `FlatCheckReplacement.conversionRender()` into `renderFlatCheck()`
      * [x] 3.2.2 Preserve flat check parameter structure
      * [x] 3.2.3 Maintain simple `@Check[flat|dc:X]` output format
   * [x] 3.3 Copy flat check validation logic
      * [x] 3.3.1 Integrate flat check validation (DC required) into unified `validate()` method
      * [x] 3.3.2 Preserve flat check-specific validation rules

## Phase 2: Parsing Logic Integration

* [x] **4. Implement Unified parseMatch Method**
   * [x] 4.1 Create main parseMatch method
      * [x] 4.1.1 Call `super.parseMatch(match, config)`
      * [x] 4.1.2 Call `resetCategoryProperties()` to clear state
      * [x] 4.1.3 Call `determineCategory()` to identify check type
      * [x] 4.1.4 Route to appropriate category-specific parser
   * [x] 4.2 Implement category-specific parsers
      * [x] 4.2.1 `parseSaveMatch(match, config)` - handle save patterns
      * [x] 4.2.2 `parseSkillMatch(match, config)` - handle skill patterns
      * [x] 4.2.3 `parsePerceptionMatch(match, config)` - handle perception patterns
      * [x] 4.2.4 `parseLoreMatch(match, config)` - handle lore patterns
      * [x] 4.2.5 `parseFlatMatch(match, config)` - handle flat check patterns
      * [x] 4.2.6 `parseGenericMatch(match, config)` - fallback parser
   * [x] 4.3 Preserve existing special case handling
      * [x] 4.3.1 Lore check name extraction
      * [x] 4.3.2 DC extraction from various positions
      * [x] 4.3.3 Match replacement handling

* [x] **5. Implement Unified Rendering Logic**
   * [x] 5.1 Create main conversionRender method
      * [x] 5.1.1 Handle `match.replacement` special cases
      * [x] 5.1.2 Route to appropriate rendering method based on category
      * [x] 5.1.3 Preserve all existing display text logic
   * [x] 5.2 Implement category-specific renderers
      * [x] 5.2.1 `renderSingleCheck()` - standard single check rendering
      * [x] 5.2.2 `renderLoreCheck()` - lore-specific parameter handling
      * [x] 5.2.3 `renderSaveCheck()` - save-specific parameter handling
      * [x] 5.2.4 `renderFlatCheck()` - flat check parameter handling
   * [x] 5.3 Preserve special formatting
      * [x] 5.3.1 Parentheses wrapping for saves
      * [x] 5.3.2 Save term appending logic
      * [x] 5.3.3 Custom display text handling
      * [x] 5.3.4 Trait parameter integration

## Phase 3: UI and Configuration

* [x] **6. Create Unified Panel Configuration**
   * [x] 6.1 Design dynamic panel config
      * [x] 6.1.1 Create `static get panelConfig()` method
      * [x] 6.1.2 Implement category selector field (skill/save/perception/lore/flat)
      * [x] 6.1.3 Add conditional field visibility using `hideIf`
      * [x] 6.1.4 Preserve all existing field configurations
   * [x] 6.2 Implement field visibility logic
      * [x] 6.2.1 Check-type field: hide for lore and flat categories
      * [x] 6.2.2 Lore name field: show only for lore category
      * [x] 6.2.3 Basic save field: show only for save category
      * [x] 6.2.4 DC field: show for all categories
      * [x] 6.2.5 Display text field: show for all categories
   * [x] 6.3 Add field interaction handlers
      * [x] 6.3.1 Category change resets type-specific fields
      * [x] 6.3.2 Dynamic options population based on category
      * [x] 6.3.3 Form validation updates

* [x] **7. Update Interactive Parameters**
   * [x] 7.1 Enhance getInteractiveParams method
      * [x] 7.1.1 Add all new properties to parameter object
      * [x] 7.1.2 Preserve existing parameter structure
      * [x] 7.1.3 Ensure backward compatibility for UI
   * [x] 7.2 Update parameter handling
      * [x] 7.2.1 Include `checkCategory` in parameters
      * [x] 7.2.2 Include all save-specific parameters
      * [x] 7.2.3 Include all skill-specific parameters
      * [x] 7.2.4 Include all flat check-specific parameters
      * [x] 7.2.5 Remove multiple skills parameters
      * [x] 7.2.6 Maintain parameter consistency

## Phase 4: Pattern System Updates

* [x] **8. Remove Old Save/FlatCheck Classes**
   * [x] 8.1 Remove SaveReplacement class
   * [x] 8.2 Remove FlatCheckReplacement class
   * [x] 8.3 Remove SaveReplacement and FlatCheckReplacement from REPLACEMENT_CLASS_MAP
   * [x] 8.4 Remove SaveReplacement and FlatCheckReplacement from pattern registration and usage
   * [x] 8.5 Remove any references to SaveReplacement and FlatCheckReplacement in documentation/comments

* [x] **9. Update Pattern Definitions**
   * [x] 9.1 Change pattern types
      * [x] 9.1.1 Update all `type: 'skill'` to `type: 'check'`
      * [x] 9.1.2 Update all `type: 'save'` to `type: 'check'`
      * [x] 9.1.3 Update all `type: 'flat'` to `type: 'check'`
      * [x] 9.1.4 Preserve all existing regex patterns
      * [x] 9.1.5 Maintain priority levels
   * [x] 9.2 Update pattern handlers
      * [x] 9.2.1 Add `checkCategory` assignment to save pattern handlers
      * [x] 9.2.2 Add `checkCategory` assignment to skill pattern handlers
      * [x] 9.2.3 Add `checkCategory` assignment to flat check pattern handlers
      * [x] 9.2.4 Preserve all existing pattern logic
      * [x] 9.2.5 Maintain special case handling (lore checks)
   * [x] 9.3 Verify pattern priority ordering
      * [x] 9.3.1 Ensure save patterns maintain highest priority
      * [x] 9.3.2 Ensure skill patterns maintain medium priority
      * [x] 9.3.3 Ensure flat check patterns maintain appropriate priority
      * [x] 9.3.4 Check for conflicts with other pattern types

* [x] **10. Update Class Mapping**
   * [x] 10.1 Modify REPLACEMENT_CLASS_MAP
      * [x] 10.1.1 Remove `skill: CheckReplacement` entry
      * [x] 10.1.2 Remove `save: CheckReplacement` entry
      * [x] 10.1.3 Remove `flat: CheckReplacement` entry
      * [x] 10.1.4 Add unified `check: CheckReplacement` entry
   * [x] 10.2 Update factory method
      * [x] 10.2.1 Ensure `ReplacementFactory.createFromMatch()` works with new mapping
      * [x] 10.2.2 Verify condition replacement special case handling
      * [x] 10.2.3 Test all replacement type creation

## Phase 5: Cleanup and Validation

* [x] **11. Remove Legacy Classes**
   * [x] 11.1 Delete SaveReplacement and FlatCheckReplacement classes
      * [x] 11.1.1 Remove SaveReplacement class definition entirely
      * [x] 11.1.2 Remove FlatCheckReplacement class definition entirely
      * [x] 11.1.3 Remove from file/module exports
      * [x] 11.1.4 Update any documentation references
   * [x] 11.2 Clean up imports/references
      * [x] 11.2.1 Remove SaveReplacement and FlatCheckReplacement from imports
      * [x] 11.2.2 Update any remaining references
      * [x] 11.2.3 Clean up unused constants or helpers

* [x] **12. Update Method Implementations**
   * [x] 12.1 Implement resetToOriginal method
      * [x] 12.1.1 Call `super.resetToOriginal()`
      * [x] 12.1.2 Reset category-specific properties
      * [x] 12.1.3 Re-parse using original match data
   * [x] 12.2 Update validation logic
      * [x] 12.2.1 Implement category-specific validation
      * [x] 12.2.2 Handle lore name requirement
      * [x] 12.2.3 Handle flat check DC requirement
      * [x] 12.2.4 Preserve existing validation rules
   * [x] 12.3 Update toJSON method (if needed)
      * [x] 12.3.1 Include all new properties in serialization
      * [x] 12.3.2 Maintain backward compatibility
      * [x] 12.3.3 Handle category-specific property inclusion

## Phase 6: Integration Testing

* [ ] **13. Functional Verification**
   * [ ] 13.1 Test all existing patterns
      * [ ] 13.1.1 Verify save patterns still work correctly
      * [ ] 13.1.2 Verify skill patterns still work correctly
      * [ ] 13.1.3 Verify lore patterns still work correctly
      * [ ] 13.1.4 Test flat check patterns
   * [ ] 13.2 Test UI interactions
      * [ ] 13.2.1 Verify modifier panel shows correct fields
      * [ ] 13.2.2 Test category switching behavior
      * [ ] 13.2.3 Test field visibility logic
      * [ ] 13.2.4 Verify form submission works
   * [ ] 13.3 Test edge cases
      * [ ] 13.3.1 Parentheses handling in saves
      * [ ] 13.3.2 Lore check name extraction
      * [ ] 13.3.3 Basic save flag handling
      * [ ] 13.3.4 Display text preservation
      * [ ] 13.3.5 Flat check DC validation

* [ ] **14. Integration Validation**
   * [ ] 14.1 Test with existing content
      * [ ] 14.1.1 Run converter with known working inputs
      * [ ] 14.1.2 Verify output matches previous behavior
      * [ ] 14.1.3 Check interactive element creation
      * [ ] 14.1.4 Validate parameter passing
   * [ ] 14.2 Test pattern conflicts
      * [ ] 14.2.1 Verify no conflicts with damage patterns
      * [ ] 14.2.2 Check template pattern interactions
      * [ ] 14.2.3 Validate condition pattern priorities
      * [ ] 14.2.4 Test action pattern compatibility

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