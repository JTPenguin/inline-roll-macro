# PF2e Inline Roll Converter - Project Requirements Document

## 1. Overview

### 1.1 Purpose
The PF2e Inline Roll Converter is a Foundry VTT macro that automatically converts plain text descriptions of spells, abilities, and feats into Foundry's inline automation syntax for the Pathfinder 2e system. This tool streamlines content creation by eliminating manual conversion of rollable expressions and automatically linking PF2e conditions for quick reference.

### 1.2 Target Users
- **Primary**: Personal use for GM content creation
- **Secondary**: Potential sharing with friends and PF2e community

### 1.3 Success Metrics
- Conversion accuracy rate > 95% for common roll types
- Condition linking accuracy rate > 98% for standard PF2e conditions
- Time savings of 70%+ compared to manual conversion

## 2. Implementation Context

### 2.1 Development Environment
- **Foundry VTT Macro System**: Single JavaScript file executed in Foundry's macro context
- **Available APIs**: Foundry's game object, ui.notifications, Dialog class, TextEditor
- **PF2e System Integration**: Access to game.pf2e.conditions for condition validation
- **No External Dependencies**: Must work with vanilla JavaScript and Foundry's built-in libraries
- **Execution Context**: Runs in GM's browser with full access to world data

### 2.2 Key Technical Patterns
- **Regex Processing**: Use `String.match()` and `String.replace()` for pattern detection
- **Dialog Creation**: Use Foundry's `Dialog` class for user interface
- **Condition Validation**: Use game.pf2e.conditions to validate condition names
- **Error Handling**: Wrap operations in try-catch blocks with user-friendly notifications
- **Data Persistence**: Use game.settings.set/get for user preferences if needed

## 3. Functional Requirements

### 3.1 Core Features

#### 3.1.1 Text Processing
- **FR-001**: Parse input text using regex patterns for roll detection
- **FR-002**: Support case-insensitive pattern matching
- **FR-003**: Handle multiple roll types within single text block
- **FR-004**: Preserve original text formatting and structure
- **FR-005**: Process text in priority order to avoid conversion conflicts
- **FR-006**: Detect and link PF2e conditions on first occurrence

#### 3.1.2 Conversion Types
- **FR-007**: Convert damage expressions to `@Damage[...]` syntax
- **FR-008**: Convert saving throws to `@Check[...]` syntax
- **FR-009**: Convert skill checks to `@Check[...]` syntax
- **FR-010**: Convert area effects to `@Template[...]` syntax
- **FR-011**: Convert duration/utility rolls to `[[/r ...]]` syntax
- **FR-012**: Support persistent damage conversion
- **FR-013**: Support precision and splash damage conversion
- **FR-014**: Support multiple damage types in single expression
- **FR-015**: Support basic save detection and conversion

#### 3.1.3 Condition Linking
- **FR-016**: Automatically detect standard PF2e conditions in text
- **FR-017**: Convert first occurrence of each condition to clickable link
- **FR-018**: Capitalize linked conditions for consistency
- **FR-019**: Validate conditions against PF2e system condition list
- **FR-020**: Support conditions with degrees (e.g., "enfeebled 2")

#### 3.1.4 User Interface
- **FR-021**: Simple dialog interface with input/output text areas
- **FR-022**: Show real-time preview of conversions
- **FR-023**: Provide copy-to-clipboard functionality
- **FR-024**: Allow selective conversion enabling/disabling
- **FR-025**: Visual indicators for condition links in preview

### 3.2 Advanced Features (Future Enhancement)

#### 3.2.1 Configuration Options
- **FR-026**: Enable/disable specific conversion types
- **FR-027**: Adjust conversion sensitivity settings
- **FR-028**: Set preferred flavor text formats

#### 3.2.2 Quality Assurance
- **FR-029**: Highlight converted text for review
- **FR-030**: Provide conversion confidence indicators
- **FR-031**: Offer manual override for edge cases
- **FR-032**: Show statistics on conditions found and linked

#### 3.2.3 Utility Features
- **FR-033**: Import text from clipboard automatically
- **FR-034**: Process multiple text blocks simultaneously

## 4. Technical Requirements

### 4.1 Compatibility
- **TR-001**: Compatible with Foundry VTT v12+
- **TR-002**: Compatible with PF2e system v5.3+
- **TR-003**: Cross-platform support (Windows, Mac, Linux)
- **TR-004**: Access to game.pf2e.conditions API for condition validation

### 4.2 Performance
- **TR-005**: Process typical spell description (<1000 chars) in <200ms
- **TR-006**: Handle large text blocks (10,000+ chars) in <2 seconds
- **TR-007**: Condition detection adds <50ms to processing time
- **TR-008**: No impact on Foundry performance when inactive

### 4.3 Code Quality
- **TR-009**: Follow Foundry macro development best practices
- **TR-010**: Include comprehensive error handling
- **TR-011**: Modular, maintainable code structure
- **TR-012**: Separate condition processing from roll conversion logic

## 5. User Experience Requirements

### 5.1 Usability
- **UX-001**: Launch macro with single click from macro bar
- **UX-002**: Intuitive interface requiring minimal learning
- **UX-003**: Clear visual feedback for all operations
- **UX-004**: Non-destructive conversion (preserve original text)
- **UX-005**: Clear indication of linked conditions in output

### 5.2 Workflow Integration
- **UX-006**: Seamless integration with existing content creation workflow
- **UX-007**: Quick access to converted content
- **UX-008**: Clear error messages and help text
- **UX-009**: Condition links work immediately in Foundry chat/journal entries

## 6. Quality Standards

### 6.1 Accuracy Requirements
- **QA-001**: 95%+ accuracy for common damage expressions
- **QA-002**: 90%+ accuracy for saving throw expressions
- **QA-003**: 85%+ accuracy for complex multi-type expressions
- **QA-004**: Zero false positives for non-rollable text
- **QA-005**: 98%+ accuracy for standard PF2e condition detection
- **QA-006**: Zero false positives for condition linking

### 6.2 Reliability
- **QA-007**: No crashes or errors during normal operation
- **QA-008**: Graceful degradation when parsing fails
- **QA-009**: Consistent results across multiple runs
- **QA-010**: Condition linking works with all standard PF2e conditions

## 7. Condition Linking Specifications

### 7.1 Standard PF2e Conditions
Support for all core PF2e conditions including but not limited to:
- **Basic Conditions**: blinded, broken, clumsy, concealed, confused, controlled, dazzled, deafened, doomed, drained, dying, enfeebled, fascinated, fatigued, fleeing, frightened, grabbed, immobilized, invisible, off-guard, paralyzed, persistent damage, petrified, prone, quickened, restrained, sickened, slowed, stunned, stupefied, unconscious, undetected, wounded

### 7.2 Condition Detection Rules
- **CD-001**: Case-insensitive detection (e.g., "Blinded", "blinded", "BLINDED")
- **CD-002**: Support conditions with numeric values (e.g., "enfeebled 2", "drained 3")
- **CD-003**: Handle hyphenated conditions (e.g., "off-guard")
- **CD-004**: Only link first occurrence of each condition per text block
- **CD-005**: Capitalize linked conditions for consistency
- **CD-006**: Use proper PF2e condition UUID format for links

### 7.3 Condition Link Format
Conditions should be converted to Foundry's condition link format:
```
@UUID[Compendium.pf2e.conditionitems.Item.{condition-id}]{Original Text}
```

## 8. Constraints and Limitations

### 8.1 Technical Constraints
- **C-001**: Limited to Foundry VTT macro capabilities
- **C-002**: Cannot modify core PF2e system files
- **C-003**: Dependent on current PF2e inline syntax
- **C-004**: Subject to Foundry API changes
- **C-005**: Requires PF2e system for condition validation

### 8.2 Scope Limitations
- **C-006**: English language support only
- **C-007**: PF2e system specific
- **C-008**: Text-based conversion only
- **C-009**: Limited to officially supported inline formats
- **C-010**: Only links standard PF2e conditions (not custom conditions)

## 9. Implementation Plan

### Phase 1: Core Development
- Basic conversion engine implementation
- Core pattern recognition system
- Simple user interface
- Basic testing

### Phase 2: Condition Integration
- Condition detection system
- PF2e condition validation
- Condition linking implementation
- Integration with existing conversion system

### Phase 3: Enhancement
- Advanced conversion patterns
- User interface improvements
- Error handling refinement
- Performance optimization

### Phase 4: Polish
- Final testing and bug fixes
- Documentation creation
- Community sharing preparation (if desired)

## 10. Success Criteria

### 10.1 Acceptance Criteria
- **AC-001**: Successfully converts 90%+ of common PF2e text patterns
- **AC-002**: Links 95%+ of standard PF2e conditions correctly
- **AC-003**: Processes typical spell descriptions in under 1 second
- **AC-004**: Provides clear feedback for failed conversions
- **AC-005**: Integrates seamlessly with existing Foundry workflow
- **AC-006**: Condition links are immediately functional in Foundry

### 10.2 Performance Benchmarks
- **AC-007**: Conversion accuracy meets or exceeds manual conversion
- **AC-008**: Time savings of 70%+ compared to manual process
- **AC-009**: Stable operation during extended use
- **AC-010**: Condition linking adds minimal processing overhead

## 11. Deliverables

### 11.1 Core Deliverables
- **D-001**: Functional macro file (.js)
- **D-002**: Basic user documentation
- **D-003**: Pattern reference guide
- **D-004**: Installation instructions

### 11.2 Optional Deliverables (if sharing)
- **D-005**: Community-friendly documentation
- **D-006**: Usage examples and tips
- **D-007**: Troubleshooting guide

## 12. Risk Management

### 12.1 Technical Risks
- **R-001**: Foundry API changes breaking compatibility
- **R-002**: PF2e system updates changing inline syntax
- **R-003**: Performance issues with large text blocks
- **R-004**: PF2e condition structure changes affecting linking
- **Mitigation**: Regular testing, version compatibility monitoring

### 12.2 Quality Risks
- **R-005**: Conversion accuracy below acceptable threshold
- **R-006**: Unhandled edge cases causing errors
- **R-007**: Condition false positives affecting readability
- **Mitigation**: Thorough testing, careful pattern design, comprehensive condition validation

## 13. AI Coding Context

### 13.1 Implementation Philosophy
- **Iterative Development**: Build core functionality first, then enhance
- **Fail Gracefully**: Preserve original text when conversion fails
- **User-Friendly**: Prioritize clear feedback over complex features
- **Performance-Conscious**: Optimize for typical use cases (spell descriptions)
- **Modular Design**: Separate condition linking from roll conversion logic

### 13.2 Code Organization Preferences
- **Single File**: Keep everything in one macro file for easy sharing
- **Modular Functions**: Separate concerns (parsing, UI, conversion, conditions)
- **Clear Naming**: Use descriptive function and variable names
- **Commented Code**: Include inline comments for complex regex patterns
- **Condition Management**: Dedicated functions for condition detection and linking

### 13.3 Common Development Patterns
- **Configuration Objects**: Store patterns and settings in easily editable objects
- **Functional Approach**: Use pure functions for text processing where possible
- **Event-Driven UI**: Attach listeners to form elements for real-time updates
- **Defensive Programming**: Check for null/undefined values before processing
- **Condition Validation**: Always validate conditions against PF2e system data

### 13.4 Debugging and Maintenance
- **Console Logging**: Include debug logs for pattern matching and condition detection
- **Version Comments**: Track changes and improvements in code comments
- **Pattern Testing**: Easy way to test new regex patterns and condition detection
- **Graceful Degradation**: Continue working even when new patterns fail
- **Condition Auditing**: Log condition detection results for debugging

### 13.5 Condition Processing Guidelines
- **System Integration**: Use game.pf2e.conditions for authoritative condition data
- **UUID Generation**: Proper UUID format for condition links
- **Performance**: Efficient condition detection to minimize processing overhead
- **Error Handling**: Graceful handling of missing or invalid condition data