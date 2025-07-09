# PF2e Inline Roll Converter Test Inputs

## Basic Damage Tests

```
The dragon breathes fire, dealing 6d6 fire damage.<br>
The explosion deals 3d6 fire damage and 2d4 force damage to all creatures in the area.<br>
The weapon deals 1d8+4 slashing damage on a hit.<br>
The spell deals 5 chaotic damage and 5 fire damage.<br>
The attack inflicts 2d6 positive damage.<br>
The effect causes 3 negative damage each round.<br>
The weapon deals 1d8 good damage.<br>
The trap deals 2d6 evil damage and 2d6 acid damage.
```

## Persistent, Splash, and Precision Damage

```
The target takes 1d6 persistent fire damage.<br>
On a failure, the target takes 2d4 persistent poison damage and must make a DC 20 Fortitude save each turn.<br>
The spell deals 1d6 persistent chaotic damage.<br>
The bomb deals 2 splash positive damage.<br>
The arrow deals 1d8 precision negative damage.
```

## Multiple Damage Types

```
The spell deals 2d6 fire damage and 2d6 lawful damage.<br>
The attack deals 1d4 acid, 1d4 good, and 1d4 slashing damage.<br>
Chromatic Orb: Range 120 feet. Make a ranged spell attack against the target. On a hit, the target takes 3d8 acid, cold, fire, electricity, or poison damage (your choice). On a critical hit, the target must make a DC 18 Fortitude save or be blinded for 1 round.
```

## Legacy Types Outside Damage Context

```
A chaotic aura surrounds the caster.<br>
The positive energy heals the target.<br>
Negative effects linger in the area.
```

## Mixed Context (Legacy Types in and out of Damage)

```
The spell deals 1d6 chaotic damage. The chaotic energy lingers.<br>
Gain 2d6 positive damage and a positive feeling.
```

## Saving Throw Tests

```
Each creature in the area must attempt a DC 25 Reflex save.<br>
Make a DC 20 Fortitude save or take 4d6 poison damage.<br>
The target must make a DC 18 Will save or become frightened 2. On a critical failure, make a DC 18 Fortitude save or be paralyzed for 1 round.<br>
Creatures take 8d6 fire damage (basic Reflex save, DC 28).<br>
Creatures take 8d6 fire damage (DC 28 basic Reflex save).<br>
The spell deals 6d6 electricity damage; basic Reflex save, DC 24.<br>
Each creature must make a basic Reflex save (DC 28) or take 8d6 fire damage.<br>
4d6 fire (basic Ref DC 22)<br>
The target takes 6d6 cold damage, basic Fortitude save DC 25.
```

## Skill Check Tests

```
Make a DC 15 Athletics check to climb the wall.<br>
You can attempt a DC 20 Deception or Intimidation check to distract the guard.<br>
Make a DC 22 Stealth check with the manipulate trait to pick the lock.
```

## Template/Area Tests

```
The spell creates a 20-foot burst centered on a point you choose.<br>
You can cast this as either a 30-foot cone or a 60-foot line.<br>
The fireball explodes in a 20-foot burst, dealing 6d6 fire damage to all creatures in the area.
```

## Condition Tests

```
The target becomes frightened 1 for 1 minute.<br>
On a critical failure, the creature is blinded and deafened for 1 round.<br>
The poison causes the target to become sickened 2, or sickened 1 on a successful save.<br>
While stunned, the creature is also off-guard and takes a -2 penalty to AC.
```

## Utility Roll Tests

```
The effect lasts for 1d4 rounds.<br>
The ability recharges on a roll of 5-6 on a d6.<br>
The potion restores 2d4+2 hit points when consumed.
```

## Complex Mixed Tests

```
Fireball: You launch a ball of fire. The ball explodes in a 20-foot burst, dealing 6d6 fire damage to all creatures in the area (basic Reflex save, DC 25). Creatures that critically fail are also stunned 1.<br>
Breath Weapon (recharge 1d4 rounds): The dragon breathes poison in a 40-foot cone. Each creature in the area takes 12d6 poison damage and must make a DC 28 Fortitude save. On a failure, they take 2d6 persistent poison damage and become sickened 2. On a critical failure, they are also paralyzed for 1 round.<br>
Frenzy: The creature makes three claw attacks. Each attack deals 2d6+8 slashing damage. Any creature hit by at least two attacks must make a DC 22 Fortitude save or be grabbed and take 1d6 persistent bleed damage.<br>
Power Attack: You make a melee Strike with a -5 penalty. If you hit, you deal an additional 2d6 damage, or 3d6 damage if you're using a two-handed weapon. On a critical hit, the target must make a DC 20 Fortitude save or be stunned 1.
```

## Edge Case Tests

```
The attack deals 1d8+2 slashing damage and 1d4 persistent bleed damage. The target becomes frightened 1 and off-guard until the end of their next turn.
```