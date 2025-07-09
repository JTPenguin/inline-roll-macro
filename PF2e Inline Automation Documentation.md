# PF2e Inline Automation Guide

The PF2e system makes extensive use of inline automation, from inline checks, damage rolls, and template buttons. Here we detail each of those types of inline automation and how to use them. For any of these inline options for system entry always put parameters in the order they are listed in this guide.

## Inline Roll Links

Roll links are very useful for any rolled value (e.g. 'breath weapon recharges in 1d4 rounds') or value that's handy to output to chat (e.g. 'the monster heals 10 hit points after using this ability'). 

Inline rolls are done with a pair of brackets:
```
[[/r 1d20+17 #Counteract]]
```

This would make a button showing `1d20+17` and have a roll flavor of "Counteract". Inline rolls like this are useful for non-damage rolls.

### @Damage Syntax

As of PF2e v5.3 we have implemented `@Damage`. This is a more versatile way of handling inline rolls.

**Basic damage roll:**
```
@Damage[1d6[fire]]{ouch!}
```

**Old style equivalent:**
```
[[/r 1d6[fire]]]{ouch!}
```

The string in curly braces at the end gives the link a custom label: without one a simple label will be automatically generated. For other damage types, substitute in the desired type, or simply omit it if the damage has no particular type.

**Important:** The bracketed damage type has a very high "operator" precedence in the roll-formula syntax, making parentheses necessary when used with more complicated expressions:
```
@Damage[(1d6 + 3)[fire]]
```

**Multiple damage types:**
```
@Damage[5d6[acid],5d6[cold],5d6[fire]]
```

### Benefits of @Damage

The benefit of using `@Damage` is that it is processed before rendering down to HTML, which means that you can target it with rule elements to override the damage dice or apply modifiers. An `@Damage` roll on an NPC will automatically gain a +2 modifier if you make the NPC elite, and a +4 modifier if that ability has a set frequency.

### Special Damage Categories

**Precision damage:**
```
@Damage[(2d6 + 4 + (2d6[precision]))[slashing]]
```

This would deal 2d6+4 slashing plus 2d6 precision slashing damage. Note the inner parentheses for precision damage.

**Splash damage:**
```
@Damage[(5[splash])[fire]]
```

Also requires inner parentheses.

**Persistent damage:**
```
@Damage[1d6[persistent,fire]]
```

Note the lack of inner parentheses for persistent damage, as well as its inclusion directly alongside the damage type.

### Roll Options with @Damage

`@Damage` picks up the traits of the item it is embedded in, but it also supports manually adding additional roll options just like `@Check` does:
```
@Damage[2d6[fire]|options:area-damage]
```

This would enable automation for a swarm's weakness to area damage, for example.

### Non-Damage Values

If the number isn't a damage value, use something like:
```
[[/gmr 1d4 #Recharge Breath Weapon]]{1d4 rounds}
```

In this example of a monster cooldown, we use GM rolls (`/gmr`) to hide the roll message from players.

## Inline Check Links

You can make inline roll links for different checks, including setting a DC to output the degree of success. Traits and other roll options can be pushed to the roll to make the links activate automation stored in rule elements and elsewhere.

**Basic save example:**
```
@Check[fortitude|dc:20|basic]
```

The link will inherit the traits from the item and actor it is on. For example, placing the above link on a breath weapon for a large dragon and giving the action the poison trait will automatically pass the `origin:trait:dragon`, `action:breath-weapon`, `origin:size:large`, and `poison` roll options. It would also have `damaging-effect` added automatically by being marked as a basic save.

**Skill checks:**
```
@Check[athletics|dc:20|traits:action:long-jump]
```

**Perception checks:**
```
@Check[perception|dc:20|traits:auditory]
@Check[perception|dc:24|traits:secret]
```

The second example will be a blind rolled search check.

**Flat checks:**
```
@Check[flat|dc:4]
```

### Multiple Check Types

Multiple types can be included in a single inline declaration. This creates multiple buttons with a line break between them:
```
@Check[arcane,occultism|dc:20]
```

You can also pass an adjustment to each button separately:
```
@Check[crafting,thievery|dc:20|adjustment:0,-2]
```

This would create a button for a DC 20 crafting check and a button for a DC 18 thievery check.

### Check Parameters

The full list of applicable fields is as follows. For the purposes of data entry into the system, the attributes should be in the order presented below:

#### type (Required)
Supported type values are:
- `flat`
- `perception`
- `fortitude`, `reflex`, `will`
- A skill slug in short or long form (e.g. `med` or `medicine`)
- A lore slug such as `engineering-lore`
- A statistic slug such as `kineticist` for the kineticist class statistic

Everything from the system except lores will have a default localized inline link label that can be overwritten by adding `{Some Label}` to the check. This is the only mandatory parameter, however `type:` can be excluded. `@Check[athletics]` will work because the first parameter is always assumed to be `type:`. The system has standardized to omit `type:`.

#### DC Setting (Choose One)

**defense** - The defense statistic to roll against. This is the only way to refer to target actor data:
```
@Check[deception|defense:perception]
```

**against** - The statistic to use for the DC. This should be used in place of dc when resolving in most cases:
```
@Check[reflex|against:class-spell|basic]
```

**dc** - A numeric value that sets the DC. You can also use `@self.level` for a level based DC of the roller from the DC by level chart. You can resolve data from the item the check is embedded in or the actor the item is on using `resolve(...)`:
```
@Check[type:reflex|dc:resolve(@actor.attributes.classDC.value)]
@Check[type:will|dc:resolve(@actor.attributes.classOrSpellDC.value)]
```

#### Optional Parameters

**rollerRole** - For use with `against`. This sets the role of the roller and can be either `target` or `origin`. By default `against` uses `target` for any save, and `origin` for any other check:
```
@Check[perception|against:deception|rollerRole:target]
```

**basic** - Only works with save checks. The inline roll label will be "Basic {checkName}" e.g. "Basic Reflex". This automatically includes the `damaging-effect` roll option when used.

**showDC** - Defaults to owner visible only. Can be changed to:
- `gm` - only show the GM
- `all` - show DCs to all players
- `none` - show the DC to no one

**adjustment** - Increases or decreases the dc field based on the value:
```
@Check[performance|dc:@self.level|adjustment:2|options:action:perform]
@Check[reflex|against:kineticist|adjustment:-2]
```

**immutable** - The DC is static and will not be changed by modifiers like frightened, elite, or weak.

**name** - The name of the check in the rolled chat card. This will default to `{itemName} DC` if no name parameter is given.

**traits** - Any additional traits that the roll should have. If no traits parameter is given the roll traits will default to the item traits. Any check with the `secret` trait will be rolled as a blind roll by the system.

**options** - The options parameter is for roll options that are not proper PF2e traits:
```
@Check[reflex|dc:25|options:damaging-effect]
```

**overrideTraits** - The roll traits will omit the item traits.

## Inline Actions

The system action macros can also be called inline. Unlike the other inline functions these do not use an @ notation for technical reasons. Instead, they use a notation similar to the base Foundry inline rolls:
```
[[/act grapple]]
```

You can find the full list of action macros that can be used this way by typing `game.pf2e.actions` into console (F12 for most browsers).

### Action Variants

Some actions have variants, and some actions require a variant to be specified:
```
[[/act administer-first-aid variant=stop-bleeding]]
```

To find all of the variants for an action expand it in console, then expand the variants. The property you want out of this is the slug.

### Action DCs

Like other inlines you can also specify a DC:
```
[[/act sneak dc=20]]
```

These DCs can also pull from actor data for the target:
```
[[/act seek dc=thievery]]
```

This would roll a perception check to Seek against the thievery DC of the targeted creature.

### Custom Statistics

You can also swap the statistic used in the inline to another statistic:
```
[[/act make-an-impression statistic=performance]]
```

## Inline Template Links

Links can be made to create pre-set templates. These use the PF2e names for the templates, not the Foundry names. You only need to specify the shape and distance, by default it uses the user's assigned color.

**Basic templates:**
```
@Template[type:emanation|distance:x]
@Template[type:burst|distance:x]
@Template[type:cone|distance:x]
@Template[type:line|distance:x]
```

The labels for these links will automatically be generated as "X-foot Type", but a label can be specified:
```
@Template[type:emanation|distance:90]{90 Feet}
```

### Optional Template Fields

**traits** - Optional field that should be omitted if left blank. By default the command will provide the traits from item data. Traits are picked up by certain modules and should not be included in any system data entry.

**width** - Optional field that should be omitted if left blank. It can be used to create a line template with a width larger than 5 feet (default if omitted):
```
@Template[type:line|distance:120|width:10]{120- by 10-Foot Line}
```

Width should be used to make square or rectangular templates:
```
@Template[type:line|distance:20|width:20]{20-Foot Square}
```

### Advanced Template Usage

If you need to make a very specific template the shape can be passed and the template data can be passed as a JSON object directly in the HTML form using any of Foundry's or a module's template data such as specifying the fill color, line color, angle, etc. These should not be used in the system but are provided here only for user reference:

```html
<span data-pf2-effect-area="cone" data-pf2-template-data='{"fillColor": "#15B39D", "distance": 15, "angle": 90}'>15 foot cone</span>
```

## Conditions

A condition should be linked the first time it's referenced. If there's a number associated, make sure to link it once for each numerical value. See Fear as an example:

Here's the correct format for linking conditions, which should happen automatically if you drag and drop within Foundry or use the data entry script:
```
@UUID[Compendium.pf2e.conditionitems.Item.<ID>]{<Conditiontext number>}
```
e.g. @UUID[Compendium.pf2e.conditionitems.Item.e1XGnhKNSQIm5IXg]{Stupefied 1}. Once the changes are extracted the ID will change to the item name for easier review outside of Foundry.