# PF2e Inline Roll Converter Test Inputs

## Basic Damage Tests

### Single Damage Type
```
The dragon breathes fire, dealing 6d6 fire damage.
```

### Multiple Damage Types
```
The explosion deals 3d6 fire damage and 2d4 force damage to all creatures in the area.
```

### Damage with Modifiers
```
The weapon deals 1d8+4 slashing damage on a hit.
```

## Saving Throw Tests

### Basic Save
```
Each creature in the area must attempt a DC 25 Reflex save.
```

### Save with Damage
```
Make a DC 20 Fortitude save or take 4d6 poison damage.
```

### Multiple Save Types
```
The target must make a DC 18 Will save or become frightened 2. On a critical failure, make a DC 18 Fortitude save or be paralyzed for 1 round.
```

### Standard Parenthetical (Most Common)

```
Creatures take 8d6 fire damage (basic Reflex save, DC 28).
```

### Reversed DC Format

```
Creatures take 8d6 fire damage (DC 28 basic Reflex save).
```

### Semicolon Format

```
The spell deals 6d6 lightning damage; basic Reflex save, DC 24.
```

### Make/Attempt Format

```
Each creature must make a basic Reflex save (DC 28) or take 8d6 fire damage.
```

### Abbreviated Format

```
4d6 fire (basic Ref DC 22)
```

### Comma Separated

```
The target takes 6d6 cold damage, basic Fortitude save DC 25.
```

## Expected Conversion Results

All save portions should convert to:

```
@Check[reflex|dc:28|basic]
@Check[fortitude|dc:25|basic]
@Check[will|dc:22|basic]
```

## Skill Check Tests

### Simple Skill Check
```
Make a DC 15 Athletics check to climb the wall.
```

### Multiple Skill Options
```
You can attempt a DC 20 Deception or Intimidation check to distract the guard.
```

### Skill with Specific Trait
```
Make a DC 22 Stealth check with the manipulate trait to pick the lock.
```

## Template/Area Tests

### Basic Area Templates
```
The spell creates a 20-foot burst centered on a point you choose.
```

### Multiple Template Types
```
You can cast this as either a 30-foot cone or a 60-foot line.
```

### Area with Damage
```
The fireball explodes in a 20-foot burst, dealing 6d6 fire damage to all creatures in the area.
```

## Condition Tests

### Single Condition
```
The target becomes frightened 1 for 1 minute.
```

### Multiple Conditions
```
On a critical failure, the creature is blinded and deafened for 1 round.
```

### Conditions with Degrees
```
The poison causes the target to become sickened 2, or sickened 1 on a successful save.
```

### Conditions in Complex Text
```
While stunned, the creature is also off-guard and takes a -2 penalty to AC.
```

## Persistent Damage Tests

### Basic Persistent Damage
```
The target takes 1d6 persistent fire damage.
```

### Persistent with Save
```
On a failure, the target takes 2d4 persistent poison damage and must make a DC 20 Fortitude save each turn.
```

## Utility Roll Tests

### Duration Rolls
```
The effect lasts for 1d4 rounds.
```

### Recharge Rolls
```
The ability recharges on a roll of 5-6 on a d6.
```

### Healing Rolls
```
The potion restores 2d4+2 hit points when consumed.
```

## Complex Mixed Tests

### Spell Description 1
```
Chromatic Orb: Range 120 feet. Make a ranged spell attack against the target. On a hit, the target takes 3d8 acid, cold, fire, lightning, or poison damage (your choice). On a critical hit, the target must make a DC 18 Fortitude save or be blinded for 1 round.
```

### Spell Description 2
```
Fireball: You launch a ball of fire. The ball explodes in a 20-foot burst, dealing 6d6 fire damage to all creatures in the area (basic Reflex save, DC 25). Creatures that critically fail are also stunned 1.
```

### Monster Ability 1
```
Breath Weapon (recharge 1d4 rounds): The dragon breathes poison in a 40-foot cone. Each creature in the area takes 12d6 poison damage and must make a DC 28 Fortitude save. On a failure, they take 2d6 persistent poison damage and become sickened 2. On a critical failure, they are also paralyzed for 1 round.
```

### Monster Ability 2
```
Frenzy: The creature makes three claw attacks. Each attack deals 2d6+8 slashing damage. Any creature hit by at least two attacks must make a DC 22 Fortitude save or be grabbed and take 1d6 persistent bleed damage.
```

### Feat Description
```
Power Attack: You make a melee Strike with a -5 penalty. If you hit, you deal an additional 2d6 damage, or 3d6 damage if you're using a two-handed weapon. On a critical hit, the target must make a DC 20 Fortitude save or be stunned 1.
```

## Edge Case Tests

### Mixed Damage and Conditions
```
The attack deals 1d8+2 slashing damage and 1d4 persistent bleed damage. The target becomes frightened 1 and off-guard until the end of their next turn.
```

### Area with Multiple Effects
```
The spell creates a 30-foot cone of freezing wind. Creatures in the area take 4d6 cold damage and must make a DC 24 Reflex save or be slowed 1 for 1 minute.
```

### Splash and Precision Damage
```
The alchemist's bomb deals 2d6+4 fire damage plus 2 fire splash damage. Against flat-footed targets, add 1d6 precision damage.
```

### Multiple Save DCs
```
The creature must first make a DC 18 Will save to resist the enchantment. If they fail, they must then make a DC 20 Fortitude save or take 3d6 psychic damage and become confused for 1 round.
```

### Conditional Damage
```
The spell deals 4d6 force damage, plus an additional 2d6 force damage if the target is undead or a construct.
```

## Frequency and Recharge Tests

### Frequency with Damage
```
Flame Breath (recharge 5-6): The dragon breathes fire in a 15-foot cone, dealing 6d6 fire damage (basic Reflex save, DC 23).
```

### Daily Ability
```
Once per day, the cleric can channel positive energy in a 30-foot burst, healing living creatures for 3d6 hit points.
```

## Advanced Pattern Tests

### Damage Reduction/Resistance
```
The creature has resistance 10 to fire damage and takes double damage from cold attacks.
```

### Variable Damage
```
The spell deals damage based on your level: 1d6 per two caster levels, to a maximum of 10d6.
```

### Multiple Area Types
```
You can shape the spell as either a 20-foot burst, a 30-foot cone, or a 60-foot line.
```

### Heightened Effects
```
When cast at 5th level, the spell deals an additional 2d6 damage and the save DC increases by 2.
```

## Condition Linking Edge Cases

### Hyphenated Conditions
```
The target becomes off-guard and flat-footed until the start of their next turn.
```

### Plural Conditions
```
All frightened creatures in the area must make an additional Will save.
```

### Conditions with Numbers
```
The poison causes enfeebled 2, or enfeebled 1 on a successful save.
```

### Capitalized Conditions
```
On a critical failure, the creature is Stunned for 1 round and Blinded for 1 minute.
```

## Real PF2e Ability Examples

### Adult Red Dragon Breath
```
Fire Breath (recharge 1d4 rounds): The dragon breathes fire in a 50-foot cone. Each creature in the area takes 18d6 fire damage (basic Reflex save, DC 32).
```

### Fireball Spell
```
A burst of fire explodes in a 20-foot burst within 500 feet. Each creature in the area takes 8d6 fire damage (basic Reflex save).
```

### Rogue Sneak Attack
```
The rogue deals an additional 3d6 precision damage to flat-footed creatures.
```

### Cleric Heal Spell
```
You channel positive energy to heal the living or damage the undead. If the target is living, you restore 1d8+4 hit points. If the target is undead, they take 1d8+4 positive damage with a basic Fortitude save.
```

### Wizard Magic Missile
```
You launch three glowing darts. Each dart deals 1d4+1 force damage to its target.
```

### Barbarian Rage
```
While raging, you gain a +2 bonus to damage rolls and take a -1 penalty to AC. The rage lasts for 1 minute or until you fall unconscious.
```

## Test Validation Expectations

Each test should validate:
- **Accuracy**: Correct conversion of patterns
- **Preservation**: Original text structure maintained
- **Condition Linking**: First occurrence of each condition linked
- **Multiple Conversions**: All applicable patterns converted in single text
- **Edge Cases**: Proper handling of complex scenarios