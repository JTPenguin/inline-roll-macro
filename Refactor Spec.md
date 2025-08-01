PF2e Converter Macro: Organized Simplicity Refactor Specification
Overview
This specification outlines a lightweight refactor of the PF2e Converter Macro that eliminates global state management issues and organizes the UI logic without introducing heavy abstractions or complex frameworks. The approach focuses on making the codebase easier to maintain, debug, and enhance while preserving the existing patterns that work well.
Current State Analysis
Problems to Solve

Global State Pollution: Variables stored on window object create unpredictable state
Scattered UI Logic: ModifierPanelManager handles too many concerns in one place
Hard to Debug: State ownership unclear, making issue tracking difficult
Difficult to Extend: Adding new modifier types or fields requires hunting through mixed logic

What Works Well (To Preserve)

Pattern-based text processing: The existing pattern detection system is robust
Replacement class hierarchy: Well-designed inheritance structure
Event handling patterns: Current event delegation works effectively
Dialog structure: Three-panel layout serves users well

Target Architecture
Design Principles

Organized Simplicity: Structure without over-abstraction
Clear Ownership: Every piece of state has a clear owner
Logical Separation: Related functionality grouped together
Tweaking-Friendly: Easy to modify and enhance existing features
Familiar Patterns: Preserve existing approaches where they work

High-Level Structure
ConverterDialog (State Owner)
├── data (Simple state object)
├── processor (TextProcessor - unchanged)
├── modifierManager (Organized ModifierPanelManager)
│   └── renderers (Type-specific rendering logic)
│       ├── DamageRenderer
│       ├── CheckRenderer
│       ├── ConditionRenderer
│       ├── TemplateRenderer
│       ├── HealingRenderer
│       ├── DurationRenderer
│       └── ActionRenderer
└── ui (DOM references)
Detailed Design
Phase 1: State Consolidation
ConverterDialog Class
Purpose: Central owner of all dialog state and coordination
State Management:
javascriptclass ConverterDialog {
    constructor() {
        this.data = {
            inputText: '',
            replacements: [],
            selectedElementId: null,
            lastRawOutput: '',
            conditionMap: new Map(),
            isInitialized: false
        };
        
        this.processor = new TextProcessor();
        this.modifierManager = new ModifierPanelManager(this);
        this.ui = {}; // DOM element references
    }
}
Key Methods:

updateReplacements(newReplacements): Update replacements and trigger UI updates
selectElement(elementId): Handle element selection and modifier panel updates
processInput(): Process input text and generate replacements
renderOutput(): Render interactive output panel
renderLivePreview(): Render live preview panel
renderModifierPanel(): Delegate modifier panel rendering

State Access Patterns

No global variables: All state accessed through this.data
Controlled updates: State changes go through specific methods
Clear ownership: Dialog owns all state, delegates specific responsibilities

Phase 2: Organized Modifier Management
ModifierPanelManager Refactor
Purpose: Coordinate modifier panel rendering without handling specific type logic
javascriptclass ModifierPanelManager {
    constructor(dialog) {
        this.dialog = dialog;
        this.renderers = {
            damage: new DamageRenderer(),
            check: new CheckRenderer(),
            condition: new ConditionRenderer(),
            template: new TemplateRenderer(),
            healing: new HealingRenderer(),
            duration: new DurationRenderer(),
            action: new ActionRenderer()
        };
    }
}
Responsibilities:

Route rendering to appropriate type-specific renderer
Handle common UI elements (header, traits section)
Manage form event binding
Coordinate renderer lifecycle

Type-Specific Renderers
Purpose: Handle rendering logic for each replacement type
Base Interface:
javascriptclass BaseRenderer {
    getTitle(replacement) { /* Return display title */ }
    renderFields(replacement) { /* Return field HTML */ }
    getConditionalFields(replacement) { /* Return conditional field configs */ }
    validate(replacement) { /* Validate replacement state */ }
}
Renderer Responsibilities:

Generate HTML for their specific replacement type
Define field configurations and layouts
Handle type-specific conditional logic
Provide validation rules

Shared Field Rendering
Purpose: Consistent field rendering across all modifier types
javascriptclass FieldRenderer {
    static render(type, id, label, value, options = []) {
        // Consistent field HTML generation
    }
    
    static renderConditional(condition, field) {
        // Conditional field rendering
    }
}
Field Types Supported:

text: Single-line text input
textarea: Multi-line text input
select: Dropdown selection
checkbox: Boolean checkbox
number: Numeric input with validation
traits: Enhanced traits input component

Phase 3: Streamlined Event Handling
Event Organization
Centralized Setup:
javascriptclass ConverterDialog {
    setupEventHandlers() {
        this.setupInputHandlers();
        this.setupButtonHandlers();
        this.setupModifierHandlers();
    }
}
Event Flow:

User Input → processInput() → Update replacements → Render updates
Element Selection → selectElement() → Update modifier panel
Modifier Changes → Update replacement → Render updates
Button Actions → Direct action methods

Handler Patterns

Input events: Direct state updates with immediate re-rendering
Selection events: Update selected element and modifier panel
Modification events: Update replacement objects and trigger renders
Action events: Execute utility functions (copy, clear, etc.)

Component Specifications
DamageRenderer
Purpose: Handle damage roll modifier UI
Key Features:

Multi-component damage support
Damage type selection with legacy conversion
Category selection (persistent, precision, splash)
Area damage toggle
Dynamic component addition/removal

Field Configuration:

Enabled checkbox
Damage component sections (dice, type, category)
Area damage checkbox
Display text field

CheckRenderer
Purpose: Handle check/save modifier UI
Key Features:

Check type selection (skill, save, perception, lore, flat)
Conditional field display based on type
DC method selection (static, target, origin)
Basic save and secret flags
Trait management

Conditional Logic:

Show skill dropdown only for skill checks
Show save dropdown only for save checks
Show lore name field only for lore checks
Show DC field only for static DC method
Show statistic field only for target/origin DC methods

ConditionRenderer
Purpose: Handle condition link modifier UI
Key Features:

Condition selection from PF2e compendium
Conditional value input for applicable conditions
UUID validation and display
Legacy condition conversion support

TemplateRenderer
Purpose: Handle template modifier UI
Key Features:

Template type selection (burst, cone, line, emanation)
Distance configuration
Width configuration for line templates
Display text customization

Shared Components
TraitsInput
Purpose: Enhanced trait selection with PF2e system integration
Features:

Autocomplete with PF2e trait database
Multiple selection support
Custom trait creation
Visual trait tags with removal
Integration with common trait checkboxes

FieldRenderer
Purpose: Consistent field rendering utilities
Methods:

render(type, id, label, value, options): Generate field HTML
renderRow(fields): Generate field row layout
renderConditional(condition, field): Conditional field rendering
applyValidation(field, rules): Apply validation styling

Data Flow
Input Processing Flow

User types in input textarea
Input event handler calls updateInputText()
updateInputText() calls processInput()
processInput() uses TextProcessor to generate replacements
updateReplacements() stores new replacements and triggers renders
renderOutput() and renderLivePreview() update UI

Element Selection Flow

User clicks interactive element in output panel
Click handler calls selectElement(elementId)
selectElement() updates selectedElementId in state
renderModifierPanel() generates appropriate modifier UI
Modifier panel displays with current replacement values

Modification Flow

User changes field in modifier panel
Field event handler updates replacement object
Change handler calls render methods to update output
UI updates reflect changes immediately

State Update Flow
User Action → State Update Method → State Change → UI Re-render
Migration Strategy
Phase 1: State Consolidation (Week 1)
Goal: Eliminate global variables and centralize state
Changes:

Create ConverterDialog class with centralized state
Move all global variables into dialog.data
Update all variable references to use dialog.data
Maintain existing functionality exactly

Validation: All existing features work identically
Phase 2: Modifier Organization (Week 2)
Goal: Break ModifierPanelManager into organized renderers
Changes:

Create BaseRenderer class and type-specific renderers
Create FieldRenderer utility class
Migrate existing modifier panel logic to appropriate renderers
Maintain existing UI and behavior

Validation: All modifier panels work identically with cleaner code
Phase 3: Event Streamlining (Week 3)
Goal: Organize event handling and improve maintainability
Changes:

Centralize event handler setup
Standardize event handling patterns
Improve error handling and validation
Add helper methods for common operations

Validation: All interactions work smoothly with better error handling
Benefits
Immediate Benefits

No Global State: Eliminates window object pollution and state conflicts
Clear Organization: Logic is grouped logically and easy to find
Easier Debugging: State ownership is clear and traceable
Reduced Coupling: Components have clear interfaces and responsibilities

Maintenance Benefits

Easy Field Addition: Adding fields follows clear, documented patterns
Type Extension: Adding new replacement types has a clear template
Consistent UI: Shared field rendering ensures consistent behavior
Predictable Structure: Developers know where to find and modify code

Future Benefits

Upgrade Path: Can enhance to full component system if needed
Performance Options: Can add selective re-rendering where beneficial
Testing Support: Clear separation makes unit testing feasible
Documentation: Self-documenting structure through clear organization

Implementation Guidelines
Code Style Standards

ES6 Classes: Use class syntax for clear structure
Method Naming: Descriptive names following verb-noun pattern
State Updates: Always go through designated methods
Error Handling: Graceful degradation with user feedback

Testing Strategy

Phase Testing: Each phase thoroughly tested before proceeding
Regression Testing: Existing functionality verified after each change
User Testing: Dialog behavior tested with real use cases
Performance Testing: Ensure no significant performance regression

Documentation Requirements

Method Documentation: All public methods documented with JSDoc
Usage Examples: Examples for adding fields and extending renderers
Migration Notes: Clear notes for any breaking changes
Architecture Decision Records: Document key design decisions

Success Criteria
Functional Requirements

All existing features work identically after refactor
No performance regression in typical usage
All UI interactions remain smooth and responsive
Error handling is improved or maintained

Code Quality Requirements

Zero global variables (except required Foundry globals)
Clear ownership for all state and functionality
Consistent patterns for common operations
Reduced complexity in modifier panel management

Maintainability Requirements

Adding new fields takes under 30 minutes
Adding new replacement types follows clear template
Debugging issues requires checking fewer files
Code review feedback focuses on logic, not structure

This specification provides a comprehensive blueprint for refactoring the macro while maintaining its proven functionality and improving its maintainability for future tweaking and refinement.