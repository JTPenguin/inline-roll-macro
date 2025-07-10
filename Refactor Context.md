# Architecture Refactor Context

## Core Architecture

### Pipeline Phases
1. **Detection Phase**: Scan text and identify convertible patterns
2. **Object Creation Phase**: Convert matches into structured replacement objects
3. **Modification Phase**: (Future) Allow user adjustments to detected rolls
4. **Rendering Phase**: Convert objects to PF2e inline syntax
5. **Assembly Phase**: Insert rendered rolls back into original text

### Key Design Principles
- **Object-Oriented**: Use inheritance hierarchy for different replacement types
- **Unified Interface**: All replacements share common base properties and methods
- **Separation of Concerns**: Each phase has focused responsibilities
- **Future-Proof**: Architecture supports planned enhancements like user modification UI

## Class Hierarchy

### Base Classes

#### Replacement (Abstract Base)
```javascript
class Replacement {
  constructor(match) {
    this.id = generateId();
    this.startPos = match.index;
    this.endPos = match.index + match[0].length;
    this.originalText = match[0];
    this.enabled = true;
    this.priority = 0;
  }
  
  // Abstract methods - must be implemented by subclasses
  render() { throw new Error('Must implement render()'); }
  validate() { return true; }
  
  // Utility methods
  getText() { return this.originalText; }
  getLength() { return this.endPos - this.startPos; }
}
```

#### RollReplacement (Base for all roll types)
```javascript
class RollReplacement extends Replacement {
  constructor(match) {
    super(match);
    this.rollType = '';
    this.traits = [];
    this.options = [];
  }
  
  addTrait(trait) { if (!this.traits.includes(trait)) this.traits.push(trait); }
  addOption(option) { if (!this.options.includes(option)) this.options.push(option); }
  hasTag(tag) { return this.traits.includes(tag) || this.options.includes(tag); }
  
  // Helper for building inline syntax
  buildParameters(baseParams) {
    const params = [...baseParams];
    if (this.traits.length > 0) params.push(`traits:${this.traits.join(',')}`);
    if (this.options.length > 0) params.push(`options:${this.options.join(',')}`);
    return params;
  }
}
```

### Specific Replacement Types

#### DamageReplacement
```javascript
class DamageReplacement extends RollReplacement {
  constructor(match) {
    super(match);
    this.rollType = 'damage';
    this.priority = 100;
    
    // Array of damage components
    this.damageComponents = [];  // Array of DamageComponent objects
    
    this.parseMatch(match);
  }
  
  parseMatch(match) {
    // Extract multiple damage components from match
    // Create DamageComponent objects for each distinct damage roll
    // Implementation will use regex groups from detection patterns
  }
  
  addDamageComponent(dice, damageType = '', persistent = false, precision = false, splash = false) {
    this.damageComponents.push(new DamageComponent(dice, damageType, persistent, precision, splash));
  }
  
  render() {
    // Convert to @Damage[...] syntax
    // Handle multiple damage components
    // Support persistent, precision, splash cases for each component
    if (this.damageComponents.length === 1) {
      return `@Damage[${this.damageComponents[0].render()}]`;
    } else {
      const componentStrings = this.damageComponents.map(comp => comp.render());
      return `@Damage[${componentStrings.join(',')}]`;
    }
  }
  
  validate() {
    return this.damageComponents.length > 0 && 
           this.damageComponents.every(comp => comp.validate());
  }
}

// Helper class for individual damage components
class DamageComponent {
  constructor(dice, damageType = '', persistent = false, precision = false, splash = false) {
    this.dice = dice;           // "2d6+4", "1d6", etc.
    this.damageType = damageType; // "fire", "slashing", etc.
    this.persistent = persistent;
    this.precision = precision;
    this.splash = splash;
  }
  
  render() {
    let formula = this.dice;
    
    // Handle special damage categories that need inner parentheses
    if (this.precision) {
      formula = `(${formula}[precision])`;
    }
    
    if (this.splash) {
      formula = `(${formula}[splash])`;
    }
    
    // Handle persistent damage (special format)
    if (this.persistent && this.damageType) {
      return `${formula}[persistent,${this.damageType}]`;
    }
    
    // Handle regular damage with type
    if (this.damageType) {
      formula = `(${formula})[${this.damageType}]`;
    }
    
    return formula;
  }
  
  validate() {
    return this.dice && this.dice.length > 0;
  }
}
```

#### CheckReplacement
```javascript
class CheckReplacement extends RollReplacement {
  constructor(match) {
    super(match);
    this.rollType = 'check';
    this.priority = 90;
    
    // Core properties
    this.checkType = '';     // 'fortitude', 'athletics', etc.
    this.dc = null;          // number or string expression
    this.basic = false;
    this.secret = false;
    this.defense = '';       // alternative to dc
    this.against = '';       // alternative to dc
    
    this.parseMatch(match);
  }
  
  parseMatch(match) {
    // Extract check type, DC, and modifiers
  }
  
  render() {
    // Convert to @Check[...] syntax
    // Handle basic saves, secret checks, defense/against alternatives
  }
  
  validate() {
    return this.checkType && (this.dc || this.defense || this.against);
  }
}
```

#### TemplateReplacement
```javascript
class TemplateReplacement extends RollReplacement {
  constructor(match) {
    super(match);
    this.rollType = 'template';
    this.priority = 80;
    
    this.shape = '';         // 'burst', 'cone', 'line', 'emanation'
    this.distance = 0;
    this.width = 5;          // default width for lines
    
    this.parseMatch(match);
  }
  
  render() {
    // Convert to @Template[...] syntax
  }
}
```

#### UtilityReplacement
```javascript
class UtilityReplacement extends RollReplacement {
  constructor(match) {
    super(match);
    this.rollType = 'utility';
    this.priority = 70;
    
    this.expression = '';    // dice expression
    this.flavor = '';        // roll flavor text
    this.gmOnly = false;     // use /gmr vs /r
    
    this.parseMatch(match);
  }
  
  render() {
    // Convert to [[/r ...]] or [[/gmr ...]] syntax
  }
}
```

#### ActionReplacement
```javascript
class ActionReplacement extends RollReplacement {
  constructor(match) {
    super(match);
    this.rollType = 'action';
    this.priority = 60;
    
    this.actionName = '';    // action slug
    this.variant = '';       // action variant
    this.statistic = '';     // override statistic
    
    this.parseMatch(match);
  }
  
  render() {
    // Convert to [[/act ...]] syntax
  }
}
```

#### ConditionReplacement
```javascript
class ConditionReplacement extends Replacement {
  constructor(match) {
    super(match);
    this.priority = 50;      // Lower priority than rolls
    
    this.conditionName = ''; // canonical condition name
    this.degree = null;      // numeric degree if applicable
    this.uuid = '';          // PF2e condition UUID
    
    this.parseMatch(match);
  }
  
  parseMatch(match) {
    // Extract condition name and degree
    // Validate against game.pf2e.conditions
  }
  
  render() {
    return `@UUID[${this.uuid}]{${this.originalText}}`;
  }
  
  validate() {
    return this.conditionName && this.uuid;
  }
}
```

## Factory and Detection Classes

#### ReplacementFactory
```javascript
class ReplacementFactory {
  static createFromMatch(match, patternType, patternConfig) {
    switch (patternType) {
      case 'damage': return new DamageReplacement(match, patternConfig);
      case 'save':
      case 'skill': return new CheckReplacement(match, patternConfig);
      case 'template': return new TemplateReplacement(match, patternConfig);
      case 'utility': return new UtilityReplacement(match, patternConfig);
      case 'action': return new ActionReplacement(match, patternConfig);
      case 'condition': return new ConditionReplacement(match, patternConfig);
      default: throw new Error(`Unknown pattern type: ${patternType}`);
    }
  }
  
  static getSupportedTypes() {
    return ['damage', 'save', 'skill', 'template', 'utility', 'action', 'condition'];
  }
}
```

#### PatternDetector
```javascript
class PatternDetector {
  constructor() {
    this.patterns = new Map();
    this.initializePatterns();
  }
  
  initializePatterns() {
    // Register all detection patterns with priority and type
    this.registerPattern('damage', /\d+d\d+(?:\+\d+)?\s+(\w+\s+)?damage/gi, 100);
    this.registerPattern('save', /DC\s+(\d+)\s+(\w+)\s+sav/gi, 90);
    // ... more patterns
  }
  
  registerPattern(type, regex, priority, config = {}) {
    this.patterns.set(type, { regex, priority, config, type });
  }
  
  detectAll(text) {
    const allMatches = [];
    
    for (const [type, pattern] of this.patterns) {
      const matches = this.findMatches(text, pattern);
      allMatches.push(...matches);
    }
    
    return this.resolveConflicts(allMatches);
  }
  
  findMatches(text, pattern) {
    // Find all matches for a specific pattern
  }
  
  resolveConflicts(matches) {
    // Handle overlapping matches using priority
  }
}
```

#### ConditionDetector
```javascript
class ConditionDetector {
  constructor() {
    this.conditions = new Map();
    this.initializeConditions();
  }
  
  initializeConditions() {
    // Build condition map from game.pf2e.conditions
    if (game?.pf2e?.conditions) {
      for (const condition of game.pf2e.conditions) {
        this.conditions.set(condition.name.toLowerCase(), {
          name: condition.name,
          uuid: condition.uuid,
          slug: condition.slug
        });
      }
    }
  }
  
  detectConditions(text) {
    const found = [];
    const processed = new Set(); // Track first occurrence only
    
    // Detect each condition type
    for (const [key, condition] of this.conditions) {
      if (!processed.has(key)) {
        const matches = this.findConditionMatches(text, condition);
        found.push(...matches);
        if (matches.length > 0) processed.add(key);
      }
    }
    
    return found;
  }
  
  findConditionMatches(text, condition) {
    // Find condition occurrences with degree support
  }
}
```

## Processing Pipeline Classes

#### TextProcessor
```javascript
class TextProcessor {
  constructor() {
    this.detector = new PatternDetector();
    this.conditionDetector = new ConditionDetector();
  }
  
  process(inputText) {
    // Main processing pipeline
    const rollMatches = this.detector.detectAll(inputText);
    const conditionMatches = this.conditionDetector.detectConditions(inputText);
    
    const replacements = this.createReplacements(rollMatches, conditionMatches);
    return this.applyReplacements(inputText, replacements);
  }
  
  createReplacements(rollMatches, conditionMatches) {
    const replacements = [];
    
    // Create roll replacements
    rollMatches.forEach(match => {
      replacements.push(ReplacementFactory.createFromMatch(match.match, match.type, match.config));
    });
    
    // Create condition replacements  
    conditionMatches.forEach(match => {
      replacements.push(new ConditionReplacement(match));
    });
    
    return this.sortByPriority(replacements);
  }
  
  applyReplacements(text, replacements) {
    // Apply all replacements in reverse position order
    const sorted = replacements.sort((a, b) => b.startPos - a.startPos);
    let result = text;
    
    for (const replacement of sorted) {
      if (replacement.enabled && replacement.validate()) {
        result = this.applyReplacement(result, replacement);
      }
    }
    
    return result;
  }
  
  applyReplacement(text, replacement) {
    const before = text.substring(0, replacement.startPos);
    const after = text.substring(replacement.endPos);
    return before + replacement.render() + after;
  }
}
```

## Foundry Integration

#### MacroInterface
```javascript
class MacroInterface {
  constructor() {
    this.processor = new TextProcessor();
  }
  
  showDialog() {
    // Create Foundry dialog with input/output areas
    // Handle user interactions
    // Provide real-time preview
  }
  
  processText(input) {
    try {
      return this.processor.process(input);
    } catch (error) {
      ui.notifications.error(`Conversion failed: ${error.message}`);
      return input; // Return original on error
    }
  }
}
```

## Implementation Notes

### Pattern Priorities
- **Damage**: 100 (highest - most specific)
- **Saves**: 90
- **Skills**: 85  
- **Templates**: 80
- **Utility**: 70
- **Actions**: 60
- **Conditions**: 50 (lowest - most general)

### Error Handling Strategy
- **Graceful Degradation**: Failed conversions preserve original text
- **Validation**: Each replacement validates before rendering
- **User Feedback**: Clear error messages for debugging
- **Rollback**: Easy return to original text

### Performance Considerations
- **Lazy Evaluation**: Only process enabled replacements
- **Efficient Sorting**: Single sort by position for replacement
- **Regex Compilation**: Compile patterns once during initialization
- **Position Tracking**: Careful offset management during text assembly

### Future Enhancement Hooks
- **Modification UI**: Object properties support easy editing
- **Batch Processing**: Architecture supports multiple texts
- **Custom Patterns**: Plugin system for user-defined patterns
- **Export/Import**: Object serialization for templates

## Testing Strategy

### Unit Tests
- Individual replacement object creation and rendering
- Pattern detection accuracy
- Conflict resolution logic
- Condition validation

### Integration Tests  
- Full pipeline processing
- Complex text with multiple replacement types
- Edge cases and error conditions
- Foundry API integration

### Validation Tests
- Accuracy against test input corpus
- Performance benchmarks
- Foundry compatibility across versions
- PF2e system integration

This context provides the complete blueprint for implementing the PF2e Inline Roll Converter with its object-oriented, pipeline architecture.