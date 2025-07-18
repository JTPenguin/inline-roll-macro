# Foundry VTT v12 PF2e Rules Text Formatter Macro - Technical Specification

## Executive Summary

This document provides comprehensive technical specifications for a Foundry Virtual Tabletop (VTT) version 12 macro designed to automatically format homebrew rules text for the Pathfinder 2e system. The macro is a single JavaScript file that transforms plain text into properly formatted PF2e rules with inline rolls, compendium links, and standard formatting conventions. After initial processing, users can interactively modify converted elements to add advanced features like secret rolls, area effects, and custom traits.

## 1. Macro Overview

### 1.1 Core Functionality

The **PF2e Rules Text Formatter** macro serves as an intelligent text processing tool that converts plain text descriptions into fully formatted, automation-ready PF2e content. The macro operates in two distinct phases:

**Phase 1: Initial Processing**
- Automatically detects and converts dice expressions, skill checks, saving throws, and standard PF2e terminology
- Transforms plain text into PF2e system-compatible inline roll syntax
- Links conditions, spells, and actions to their compendium entries
- Formats keywords according to official Paizo standards

**Phase 2: Interactive Modification**
- Converts processed elements into clickable, modifiable components
- Provides context-sensitive modification panels for different element types
- Allows users to add advanced features like secret rolls, area effects, persistent damage
- Offers live preview mode showing exactly how elements will appear in Foundry

### 1.2 Target Users and Use Cases

**Primary Users**: Game Masters running Pathfinder 2e campaigns in Foundry VTT
**Secondary Users**: Homebrew content creators

**Primary Use Cases:**
- Converting creature stat blocks from external sources
- Formatting homebrew spell and action descriptions
- Creating standardized item descriptions with automation
- Preparing adventure content with consistent formatting
- Adding advanced automation features to converted content
- Fine-tuning inline rolls for specific mechanical needs

### 1.3 Macro Execution Flow

**Two-Phase Operation:**
1. User executes macro from Foundry's macro hotbar
2. Dialog window opens with three-panel interface
3. User pastes plain text into input area and selects options
4. **Phase 1**: Macro processes text and displays formatted output with interactive elements
5. **Phase 2**: User clicks on converted elements to modify properties
6. User applies modifications and sees live updates
7. User copies final formatted text for use in their content

## 2. User Interface Design

### 2.1 Dialog Framework

The macro creates a custom dialog using Foundry VTT's Dialog class with a sophisticated three-panel layout optimized for both initial processing and post-processing modification workflows.

### 2.2 Interface Layout

**Three-Panel Design:**

**Input Panel (Left Side, 40% width)**
- Large textarea for raw text input with monospace font
- Input validation indicators
- Actions:
	- Paste helper button for clipboard operations
	- Format Text (primary action)

**Output Panel (Center, 40% width)**
- Interactive display area for formatted output
- Live HTML rendering with clickable elements
- Visual indicators for modified elements
- Scroll synchronization with input when applicable
- Actions:
	- Copy Output (secondary action) 
	- Toggle Live Preview
	- Reset Modifications

**Modifier Panel (Right Side, 20% width)**
- Context-sensitive controls for selected elements
- Quick-access buttons for common modifications
- Element-specific property editors
- Validation feedback and error messages

### 2.3 Interactive Element System

**Visual Design Principles**
- Interactive elements are clearly distinguished with subtle borders and background colors
- Hover states provide immediate feedback about modification availability
- Selected elements display prominent highlighting
- Modified elements show distinct visual markers
- Consistent color coding across element types

**Element States**
- **Default**: Subtle background with thin border
- **Hover**: Enhanced background with drop shadow
- **Selected**: Bright highlight with thick border
- **Modified**: Green tint indicating successful changes
- **Error**: Red tint for validation failures

**Interaction Patterns**
- Single-click to select elements
- Context-sensitive modification panels appear immediately
- Real-time validation during input
- Visual feedback for all user actions
- Keyboard shortcuts for power users

### 2.5 Live Preview System

**Preview Mode Toggle**
The output panel can switch between two distinct rendering modes:

**Edit Mode (Default)**
- Shows interactive elements with modification borders and click handlers
- Displays data attributes and technical markup
- Optimized for element selection and modification workflow
- Visual indicators for element types and modification status

**Live Preview Mode**
- Renders output exactly as it would appear in a Foundry item or creature ability
- Inline rolls display as clickable buttons identical to PF2e system rendering
- Compendium links appear as standard Foundry UUID links with tooltips
- All PF2e system styling and interactivity preserved
- No modification interface elements visible

**Preview Functionality**
- Inline rolls are fully functional and can be clicked to execute
- Compendium links open appropriate sheets when clicked
- Damage rolls integrate with PF2e system damage application
- Check rolls respect secret flags and display appropriate UI
- All system automation features work exactly as in published content

**Preview Accuracy**
- Uses actual PF2e system rendering methods
- Applies correct CSS classes and styling
- Maintains full system integration and behavior
- Provides true WYSIWYG experience for final output

**Panel Flexibility**
- Resizable dialog with minimum width constraints
- Panels adjust proportionally on resize
- Overflow handling for long content
- Scrollbar styling consistent with Foundry theme

## 3. Text Processing Engine Architecture

### 3.1 Processing Pipeline Overview

The text processing system operates through a series of sequential stages, each responsible for specific transformations. The pipeline is designed to be modular, allowing for easy maintenance and feature expansion.

**Stage 1: Text Normalization**
- Standardizes whitespace and line endings
- Removes problematic characters
- Prepares text for pattern matching

**Stage 2: Dice Expression Detection and Conversion**
- Identifies dice notation patterns
- Distinguishes between damage rolls, checks, and saves
- Converts to PF2e inline roll syntax with placeholder parameters

**Stage 3: Keyword Formatting**
- Recognizes standard PF2e rule keywords
- Applies bold formatting to trigger words
- Preserves context and capitalization

**Stage 4: Compendium Item Linking**
- Matches text against standard PF2e compendium entries
- Generates UUID-based links for conditions, spells, and actions
- Handles partial matches and common variations

**Stage 5: Interactive Element Wrapping**
- Wraps converted elements in interactive containers
- Assigns unique identifiers for modification tracking
- Establishes data attributes for element properties

**Stage 6: Final Formatting Application**
- Applies final styling and structure
- Ensures proper HTML formatting
- Prepares content for interactive modification and live preview

### 3.2 Pattern Recognition System

**Dice Expression Patterns**
- Simple dice notation: 1d20+5, 2d6-1
- Damage with types: 1d6 fire damage, 2d8+3 slashing
- Complex expressions with modifiers and conditions
- Area and persistent damage indicators

**Skill Check and Save Patterns**
- Natural language variations: "Make a Perception check", "DC 15 Athletics"
- Saving throw formats: "Fortitude save (DC 20)", "basic Reflex save"
- Multiple DC formats and edge cases
- Trait and modifier recognition

**Keyword Recognition**
- Standard PF2e rule structure words
- Capitalization-agnostic matching
- Context-aware formatting decisions
- Preservation of sentence structure

**Compendium Item Patterns**
- Condition names with severity indicators
- Spell names with common variations
- Action names including compound actions
- Equipment and feat references

### 3.3 Interactive Element Management

**Element Creation Process**
- Generate unique identifiers for each converted element
- Establish data attributes containing original parameters
- Create clickable wrappers with appropriate CSS classes
- Maintain mapping between display text and underlying data

**Selection and Modification System**
- Track currently selected element
- Generate context-appropriate modification interfaces
- Validate user inputs in real-time
- Apply changes with immediate visual feedback

**State Management**
- Track element relationships and dependencies
- Preserve user changes across interface interactions
- Handle complex modification scenarios gracefully
- Support seamless switching between edit and preview modes

## 4. Modification System Specification

### 4.1 Check Roll Modifications

**Supported Modifications**
- **Skill/Save Type**: Change the type of check being made
- **DC Value**: Modify difficulty class with validation (1-50 range)
- **Secret Flag**: Toggle secret roll functionality
- **Basic Save**: Enable basic saving throw mechanics
- **Traits**: Add custom traits (fortune, misfortune, incapacitation, etc.)
- **Custom Modifiers**: Apply situational bonuses or penalties

**Modification Interface**
- Dropdown for common skill types
- Numeric input with validation for DC
- Checkboxes for boolean properties
- Text input for trait lists with autocomplete
- Quick-access buttons for common traits

**Validation Rules**
- DC must be numeric and within reasonable range
- Skill names must match PF2e system conventions
- Trait combinations must be mechanically valid
- Basic save flag only applies to Fortitude, Reflex, Will

### 4.2 Damage Roll Modifications

**Supported Modifications**
- **Dice Expression**: Modify the base damage roll
- **Damage Type**: Change damage type with dropdown selection
- **Persistent Flag**: Mark damage as persistent
- **Splash Flag**: Indicate splash damage
- **Area Effect**: Mark as area damage
- **Custom Notes**: Add descriptive text for special cases

**Modification Interface**
- Text input for dice expressions with validation
- Dropdown populated with all PF2e damage types
- Checkboxes for special damage properties
- Free-form text input for additional notes
- Visual preview of final damage roll

**Validation Rules**
- Dice expressions must follow standard notation (XdY+Z)
- Damage types must be valid PF2e types
- Combination flags must be mechanically sensible
- Notes must not interfere with roll parsing

### 4.3 Compendium Link Modifications

**Supported Modifications**
- **Display Text**: Custom text for link presentation
- **Target UUID**: Direct UUID modification for advanced users

**Modification Interface**
- Text input for display text customization

**Validation Rules**
- UUIDs must reference valid compendium entries

### 4.4 Modification Persistence and State

**State Tracking**
- Each element maintains current modification parameters
- Changes are applied immediately to element data
- Visual indicators show modification status
- State persists during dialog session and mode switching

**Change Application**
- Modifications update element data attributes immediately
- Display text reflects changes in real-time
- Visual indicators show modification status
- Final output generation incorporates all changes
- Live preview mode renders changes using actual PF2e system methods

**Validation and Error Handling**
- Real-time validation during input
- Clear error messages for invalid inputs
- Graceful recovery from validation failures
- Preservation of valid changes during error states

## 5. Input/Output Specifications

### 5.1 Supported Input Formats

**Plain Text Structures**
The macro recognizes and processes various plain text formats commonly found in RPG content:

**Basic Rule Text**
- Standard PF2e ability format with Trigger, Effect, Frequency keywords
- Creature stat blocks with attack and damage descriptions
- Spell descriptions with range, duration, and effect information
- Item descriptions with activation and usage details

**Dice Expressions**
- Simple notation: 1d20+5, 2d6+3, 1d4-1
- Damage with types: 1d6 fire damage, 2d8+4 slashing damage
- Healing expressions: 3d8+5 healing, 2d4+2 temporary hit points
- Complex combinations: 1d6+2 fire damage plus 1d4 persistent fire damage

**Skill Checks and Saves**
- Natural language: Make a Perception check against DC 15
- Abbreviated format: DC 20 Athletics check
- Save format: Fortitude save (DC 18, basic)
- Complex: DC 25 Stealth check with +2 circumstance bonus

### 5.2 Initial Processing Output

**Formatted Structure**
After initial processing, the output contains:
- Bolded keywords following PF2e conventions
- Interactive inline roll elements with data attributes
- Linked compendium references with proper UUIDs
- Formatted action symbols and glyphs
- Clean HTML structure ready for modification

**Interactive Element Properties**
Each converted element includes:
- Unique identifier for modification tracking
- Element type designation (check, damage, link, etc.)
- Parameter data for regenerating final output
- Visual styling classes for user interaction
- Click handlers for modification interface activation
- Data structure supporting both edit and live preview modes

### 5.3 Post-Modification Output Examples

**Enhanced Check Rolls**
Original: "Make a Perception check against DC 15"
Modified: Perception check with secret flag and fortune trait
Final Output: "Make a @Check[perception|dc:15|secret|traits:fortune]"

**Advanced Damage Rolls**
Original: "Deal 2d6 fire damage"
Modified: Area effect with persistent damage
Final Output: "Deal @Damage[2d6[persistent,fire]|options:area-damage]"

**Customized Compendium Links**
Original: "The target becomes frightened"
Modified: Specific condition level with custom text
Final Output: "The target becomes @UUID[Compendium.pf2e.conditionitems.Item.TBSHQspnbcqxsmjL]{terrified (Frightened 3)}."

### 5.5 Live Preview Output

**Preview Mode Rendering**
When live preview is enabled, the output panel renders content using actual PF2e system methods:

**Inline Roll Rendering**
- Check rolls appear as clickable buttons with PF2e styling
- Damage rolls display with appropriate damage type colors
- Secret rolls show proper GM-only indicators
- All rolls integrate with Foundry's dice system

**Compendium Link Rendering**
- Links appear with standard Foundry UUID styling
- Click behavior matches standard Foundry compendium links
- Broken links show appropriate error styling

**System Integration**
- All elements use actual PF2e CSS classes and styling
- Behavior matches published creature abilities and items exactly
- Full automation features are preserved and functional
- No visual difference from content created through standard Foundry tools

**Preview Accuracy**
- WYSIWYG representation of final output
- True functional testing of inline rolls and links
- Validation that all automation will work correctly
- Confidence in final output quality before copying

**Conversion Process**
The final output generation process:
1. Scans all interactive elements in the output panel
2. Extracts current parameter data from each element
3. Reconstructs proper PF2e inline roll syntax
4. Removes all interactive markup and click handlers
5. Preserves formatting and structure
6. Generates clean text suitable for copying

**Output Quality Assurance**
- All inline rolls follow exact PF2e system syntax
- Compendium links reference valid UUIDs
- Formatting matches official Paizo standards
- Text remains human-readable and editable
- No artifacts from interactive processing remain

## 6. Error Handling and Edge Cases

### 6.1 Processing Error Recovery

**Graceful Degradation Strategy**
If one or more processing steps fail, the other steps are unaffected.

**Common Processing Issues**
- Malformed dice expressions in source text
- Ambiguous skill check patterns
- Overlapping or conflicting text patterns
- Unusual punctuation and formatting
- Mixed case and spacing variations

**Recovery Mechanisms**
- Pattern matching tolerance for minor variations
- Contextual analysis for ambiguous cases
- User notification of processing limitations
- Preservation of original text when uncertain

### 6.2 Modification System Error Handling

**Input Validation**
Real-time validation prevents most modification errors:
- Numeric inputs constrained to valid ranges
- Text inputs checked against allowed values
- Combination validation for complex modifications
- Immediate feedback for invalid entries

**Error Recovery**
When modification errors occur:
- Clear error messages explain the problem
- Invalid changes are rejected with explanation
- Previous valid state is preserved
- User can retry with corrected input
- Live preview continues to function with last valid state

**Edge Case Management**
- Handling of extreme or unusual modifications
- Protection against infinite loops in modification chains
- Graceful handling of corrupted element states
- Recovery from unexpected DOM manipulation
- Consistent behavior across edit and preview modes

### 6.3 Live Preview Error Handling

**Preview Mode Stability**
- Live preview continues to function even when edit mode has issues
- Rendering errors in preview mode do not affect edit functionality
- Invalid elements gracefully degrade to text display in preview
- System integration errors are handled without breaking the interface

**Preview Validation**
- Elements are validated before live preview rendering
- Invalid inline roll syntax shows error indicators in preview
- Broken compendium links display warning styling
- Users receive feedback about elements that won't work in actual content

**Mode Switching Robustness**
- Seamless transitions between edit and preview modes
- State preservation during mode changes
- Error recovery when switching modes fails
- Consistent behavior regardless of current element modifications

## 7. Performance and Optimization

### 7.1 Processing Performance

**Target Performance Metrics**
- Initial text processing: Under 1 second for 10,000 characters
- Element selection response: Under 50 milliseconds
- Modification panel generation: Under 100 milliseconds
- Modification application: Under 200 milliseconds
- Live preview rendering: Under 300 milliseconds
- Preview mode switching: Under 200 milliseconds
- Final output generation: Under 500 milliseconds for 100 elements

**Optimization Strategies**
- Single-pass processing where possible
- Efficient regex patterns with minimal backtracking
- Lazy loading of compendium data
- Caching of frequently accessed elements
- Debounced modification updates
- Efficient live preview rendering using native PF2e methods

### 7.2 Memory Management

**Resource Usage Targets**
- Base memory usage: Under 5MB
- Processing overhead: Under 10MB additional
- Interactive state: Under 5MB for 100 elements
- Live preview overhead: Under 3MB additional
- Total session usage: Under 25MB maximum

**Memory Optimization**
- Efficient element identifier generation
- Cleanup of unused DOM references
- Garbage collection of obsolete state data
- Optimized live preview rendering pipeline

### 7.3 User Interface Performance

**Responsiveness Requirements**
- Element highlighting: Immediate visual feedback
- Panel updates: Under 100 milliseconds
- Validation feedback: Real-time response
- Preview mode switching: Under 200 milliseconds
- Live preview updates: Under 150 milliseconds

**UI Optimization Techniques**
- Event delegation for element interaction
- Minimal DOM manipulation during updates
- CSS transitions for smooth visual feedback
- Efficient event handler management
- Optimized live preview rendering pipeline

## 8. Testing and Validation Framework

### 8.1 Integrated Testing System

**Development Testing Mode**
A boolean flag at the top of the macro enables comprehensive testing during development:
- Automated test execution on macro load
- Console output for test results
- Coverage testing for all major functionality
- Performance benchmarking capabilities

**Test Categories**
- Basic text processing validation
- Dice expression conversion accuracy
- Skill check and save processing
- Compendium linking functionality
- Keyword formatting consistency
- Interactive element creation
- Modification system validation
- Live preview rendering accuracy
- Output generation accuracy
- Error handling robustness

### 8.2 Test Case Specifications

**Unit Testing Scope**
- Individual pattern matching functions
- Element creation and modification logic
- Validation rule enforcement
- Live preview rendering components
- Output generation accuracy

**Integration Testing Scope**
- End-to-end processing workflows
- Complex modification scenarios
- Live preview mode functionality
- Preview/edit mode switching
- Error recovery mechanisms
- Performance under load
- Cross-browser compatibility

**User Acceptance Testing**
- Real-world content processing
- Usability of modification interface
- Live preview accuracy and functionality
- Accuracy of final output
- Performance with typical usage patterns
- Accessibility compliance

### 8.3 Quality Assurance Metrics

**Accuracy Measurements**
- Percentage of correctly converted dice expressions
- Accuracy of compendium link resolution
- Consistency of keyword formatting
- Reliability of modification applications
- Live preview rendering fidelity

**Performance Benchmarks**
- Processing time for various input sizes
- Memory usage during typical operations
- Response time for user interactions
- Live preview rendering performance
- Resource cleanup efficiency

## 9. Deployment and Distribution

### 9.1 Single File Architecture

**File Organization**
The complete macro exists as a single JavaScript file containing:
- Embedded CSS styles for all interface elements
- Complete processing logic and class definitions
- Interactive modification system
- Live preview rendering integration
- Testing framework (removable for production)
- Version identification and compatibility checking

**Production Preparation**
For final distribution:
- Testing flag set to false
- Console logging minimized
- Code comments preserved for maintainability
- Version number updated appropriately

### 9.2 Installation and Setup

**Installation Requirements**
- Foundry VTT version 12.0 or higher
- PF2e system version 5.0 or higher
- Modern web browser with ES6 support
- Clipboard API support (for copy functionality)

**Installation Process**
1. Create new macro in Foundry VTT macro directory
2. Set macro type to "Script"
3. Copy and paste complete macro code
4. Save macro with descriptive name
5. Add to macro hotbar for easy access

**Initial Configuration**
- No additional configuration required
- Macro self-configures on first run
- Compatibility checks performed automatically
- Error reporting for missing dependencies

### 9.3 Version Management

**Version Control Strategy**
- Semantic versioning (MAJOR.MINOR.PATCH)
- Clear feature identification in version history
- Compatibility matrix with Foundry and PF2e versions
- Migration notes for breaking changes

**Update Procedures**
- Manual replacement of macro code
- Preservation of user preferences where possible
- Clear documentation of new features
- Testing recommendations for major updates

### 9.4 User Documentation

**Usage Documentation**
- Step-by-step workflow guide
- Examples of common use cases
- Troubleshooting common issues
- Best practices for modification workflows

**Feature Documentation**
- Complete modification option reference
- Supported input format examples
- Output format specifications
- Live preview functionality guide
- Integration tips for Foundry content

This comprehensive specification provides a complete blueprint for implementing a sophisticated PF2e rules text formatting macro that transforms plain text into properly formatted, automation-ready content while allowing interactive post-processing modifications. The live preview system ensures users can see exactly how their content will appear and function in Foundry before finalizing their work.