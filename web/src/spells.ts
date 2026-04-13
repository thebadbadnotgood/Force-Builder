/**
 * Spell reference from Cyber Savage spell tables.
 * Shown only when class `equipment` includes “spell” (see `classEquipmentHasSpells`).
 */
export type SpellDef = {
  id: string
  name: string
  /** Full rule summary (spellocity, range, outcomes). */
  description: string
}

function spell(name: string, body: string, idOverride?: string): SpellDef {
  const id =
    idOverride ??
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  return { id, name, description: body.trim() }
}

export function classEquipmentHasSpells(equipment: string): boolean {
  return equipment.toLowerCase().includes('spell')
}

export const SPELLS: SpellDef[] = [
  spell(
    'Heal',
    `Spellocity: combat · d6
Range: 6″ direct
Fizzle: take 2 dmg
Weak: Restore 2 hp
Adequate: Restore 4 hp
Exemplary: Restore 6 hp`,
  ),
  spell(
    'Bless',
    `Spellocity: utility · d8
Range: 8″ direct
Fizzle: weaken stats
Weak: Favorable all stats
Adequate: Strengthen all stats
Exemplary: Strengthen and favorable all stats`,
  ),
  spell(
    'Ethereal Weapon',
    `Spellocity: utility · d8
Range: 4″ area, persistent
Fizzle: Caster becomes dazed
Weak: Weapon Construct* — X = D6
Adequate: Weapon Construct* — X = D8
Exemplary: Weapon Construct* — X = D10`,
  ),
  spell(
    'Zeta Beams',
    `Spellocity: combat · up to 4 target(s)
Range: 6″ direct
Fizzle: Caster takes 2 dmg
Weak: 2 dmg
Adequate: 3 dmg
Exemplary: 4 dmg`,
  ),
  spell(
    'Meteor',
    `Spellocity: combat · targets willpower
Range: 7″–15″ indirect
Fizzle: Caster takes 2 dmg
Weak: 4 dmg indirect
Adequate: 5 dmg indirect
Exemplary: 6 dmg indirect`,
  ),
  spell(
    'Fling',
    `Spellocity: combat · targets willpower
Range: 6″ direct
Fizzle: Caster move scatter d8″
Weak: 1 dmg, target knockback 4″
Adequate: 2 dmg, target knockback 6″
Exemplary: 3 dmg, target knockback 8″`,
  ),
  spell(
    'Force Field',
    `Spellocity: utility · d6
Range: direct, radius X, self, persistent: EONA
Fizzle: Stun self and allies within 2″
Weak: X = 1″ — characters within radius strengthen defense vs rng
Adequate: X = 2″ — characters within radius strengthen defense vs rng
Exemplary: X = 3″ — characters within radius strengthen defense vs rng`,
    'force-field',
  ),
  spell(
    'Brain Control',
    `Spellocity: combat · targets willpower
Range: 8″ direct
Fizzle: Caster weaken willpower
Weak: Make 1 action with target, suppress
Adequate: Make 2 actions with target, suppress
Exemplary: Extended control per spell table (see rulebook)`,
  ),
  spell(
    'Shockwave',
    `Spellocity: combat · targets willpower
Range: direct, radius self 3″
Fizzle: Caster take 1 dmg
Weak: 2 dmg, concussive
Adequate: 3 dmg, concussive
Exemplary: 4 dmg, concussive`,
  ),
  spell(
    'Forked Lightning',
    `Spellocity: combat · targets willpower
Range: 8″ direct
Fizzle: Caster take 2 dmg
Weak: 3 dmg, select secondary target within 4″, stun
Adequate: 4 dmg, select secondary target within 6″, stun
Exemplary: 5 dmg, select secondary target within 8″, stun`,
  ),
  spell(
    'Eradicate',
    `Spellocity: combat · target willpower
Range: 4″ direct
Fizzle: Caster takes dmg equal to their level
Weak: Dmg equal to target’s level
Adequate: Dmg equal to 2× target’s level
Exemplary: Dmg equal to 3× target’s level`,
  ),
  spell(
    'Tempest',
    `Spellocity: combat · target willpower
Range: 12″ direct, radius X
Fizzle: Weaken will
Weak: 2 dmg, radius 2″, cryo
Adequate: 3 dmg, radius 3″, cryo
Exemplary: 4 dmg, radius 4″, cryo`,
  ),
  spell(
    'Mystic Haze',
    `Spellocity: utility · d4
Range: 12″ area, wall X, persistent: EONA
Fizzle: Blind self 3″
Weak: Blocks LOS 6″
Adequate: Blocks LOS 9″
Exemplary: Blocks LOS 12″ (wall length per table)`,
  ),
  spell(
    'Miasma',
    `Spellocity: utility · d8
Range: 10″ area, radius, persistent: EONA
Fizzle: Place a radius 1″ around self
Weak: Radius 1″ — when any character is within radius: toxic, 1 dmg
Adequate: Radius 2″ — toxic, 2 dmg
Exemplary: Radius 3″ — toxic, 3 dmg`,
  ),
  spell(
    'Telekinesis',
    `Spellocity: utility · targets willpower
Range: 8″ direct
Fizzle: Psychotronic self
Weak: Place target within 6″ of their current location
Adequate: Place target within 9″ of their current location
Exemplary: Place target within 12″ of their current location`,
  ),
  spell(
    'Gravity Well',
    `Spellocity: utility · target(s) willpower
Range: 8″ area, radius 4″
Fizzle: No effect
Weak: Move 2″ towards center of radius
Adequate: Move 4″ towards center of radius
Exemplary: Move 6″ towards center of radius`,
    'gravity-well',
  ),
  spell(
    'Siphon',
    `Spellocity: combat · targets willpower
Range: 8″ direct
Fizzle: Heal target 2, take 2 dmg
Weak: Target 2 dmg, heal self 2 hp
Adequate: Target 3 dmg, heal self 3 hp
Exemplary: Target 4 dmg, heal self 4 hp`,
  ),
  spell(
    'Summon',
    `Spellocity: utility · d10
Range: 4″ area, persistent
Fizzle: Enemy has control of Summon*
Weak: Summon* X = d4
Adequate: Summon* X = d6
Exemplary: Summon* X = d8`,
  ),
  spell(
    'Discombobulate',
    `Spellocity: utility · targets willpower
Range: 8″ area, radius 3″
Fizzle: Become stunned
Weak: Stun
Adequate: Stun, daze
Exemplary: Stun, daze, disorient`,
  ),
  spell(
    'Plasma Blast',
    `Spellocity: combat · targets willpower
Range: 8″ direct, radius 2″
Fizzle: Caster takes 2 dmg
Weak: 4 dmg
Adequate: 5 dmg
Exemplary: 6 dmg`,
  ),
  spell(
    'Curse',
    `Spellocity: utility · targets willpower
Range: 8″ direct
Fizzle: Strengthen target stats
Weak: Unfavorable
Adequate: Weaken all stats
Exemplary: Weaken and unfavorable all stats`,
  ),
]

const byId = new Map(SPELLS.map((s) => [s.id, s]))

export function getSpellById(id: string): SpellDef | undefined {
  return byId.get(id)
}
