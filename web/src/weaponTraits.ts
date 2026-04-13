export type WeaponTraitDef = {
  id: string
  name: string
  description: string
  /** If set, overrides inference from `description` for equipment filtering. */
  requireWeapon?: 'melee' | 'ranged'
  /** Remove these trait ids from the selection when this trait is selected. */
  mutuallyExclusiveWith?: string[]
}

function def(
  name: string,
  description: string,
  opts?: Partial<
    Pick<WeaponTraitDef, 'id' | 'requireWeapon' | 'mutuallyExclusiveWith'>
  >,
): WeaponTraitDef {
  const id =
    opts?.id ??
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  return {
    id,
    name,
    description,
    ...(opts?.requireWeapon !== undefined
      ? { requireWeapon: opts.requireWeapon }
      : {}),
    ...(opts?.mutuallyExclusiveWith !== undefined
      ? { mutuallyExclusiveWith: opts.mutuallyExclusiveWith }
      : {}),
  }
}

/** Class `equipment` text uses `rng` / `mel` tokens (see `classes.ts`). */
export function classEquipmentWeaponProfile(equipment: string): {
  hasRanged: boolean
  hasMelee: boolean
} {
  const e = equipment.toLowerCase()
  return {
    hasRanged: e.includes('rng'),
    hasMelee: e.includes('mel'),
  }
}

/** True when the class can take weapon traits (equipment lists a weapon line). */
export function classEquipmentHasWeapons(equipment: string): boolean {
  const { hasRanged, hasMelee } = classEquipmentWeaponProfile(equipment)
  return hasRanged || hasMelee
}

function descriptionImpliesMeleeOnly(description: string): boolean {
  if (
    /\(melee only\)|melee weapon only|heavy melee weapon only/i.test(
      description,
    )
  ) {
    return true
  }
  // Indiscriminate: melee combat action only (no ranged-only tag in PDF line).
  return /^After performing a melee combat action/i.test(description.trim())
}

function descriptionImpliesRangedOnly(description: string): boolean {
  return /\(ranged only\)|ranged weapon only|ranged weapons only|ranged heavy weapon only/i.test(
    description,
  )
}

/** Hide trait in the picker when class equipment cannot satisfy melee/ranged-only rules. */
export function isWeaponTraitCompatibleWithEquipment(
  trait: WeaponTraitDef,
  equipment: string,
): boolean {
  const { hasRanged, hasMelee } = classEquipmentWeaponProfile(equipment)
  const meleeOnly =
    trait.requireWeapon === 'melee' || descriptionImpliesMeleeOnly(trait.description)
  const rangedOnly =
    trait.requireWeapon === 'ranged' ||
    descriptionImpliesRangedOnly(trait.description)
  if (meleeOnly && !hasMelee) return false
  if (rangedOnly && !hasRanged) return false
  return true
}

export const WEAPON_TRAITS: WeaponTraitDef[] = [
  def(
    'Antagonizing',
    'When making a combat action with this weapon the target must test willpower vs d8, if failed target must duel if able (melee only)',
  ),
  def(
    'Assault Weapon',
    'May make a ranged combat action with this weapon after a sprint action is taken (ranged only)',
  ),
  def(
    'Advanced Optics',
    'Count all ranges as optimal (ranged only) may not be taken on the grenade from grenadier.',
  ),
  def(
    'Blind',
    'If a target takes dmg from this weapon, they cannot have priority until the end of their next activation',
  ),
  def(
    'Chamber',
    'Melee actions against this character have unfavorable (Melee weapon only)',
  ),
  def(
    'Concussive',
    'Per 2 points of damage move target 1" horizontally directly away from this character. If a blocking terrain feature or character is in the path place the character next to it and it suffers 1 dmg. This may also cause falling.',
  ),
  def(
    'Critical',
    'Roll a D20 when this weapon is used. If a 20 is rolled triple the total dmg this weapon would deal.',
  ),
  def(
    'Cryo',
    'When a target takes dmg from this weapon, -3 speed until the end of their next activation',
  ),
  def(
    'CQC',
    'Reaction: when the target of a charge, this character may shootout comparing ranged dice to melee dice',
  ),
  def(
    'Dampening',
    'When a target takes dmg from this weapon they must test willpower vs d8, if fail target loses all weapon traits until the end of their next activation',
  ),
  def(
    'Daze',
    'When a target takes dmg from this weapon, weaken willpower until the end of their next activation',
  ),
  def(
    'Deflect',
    'Favorable defense vs ranged attacks (Melee weapon only)',
  ),
  def(
    'Disorient',
    'When a target takes dmg from this weapon they must test willpower vs d8, if fail target loses characteristics have no effect other than ones the increase health stat until the end of this models next activation',
  ),
  def(
    'Dispel',
    'When a target takes dmg from this weapon, it rolls 1 less dice when casting spells until the end of their next activation. Also nullify any magic effects such as summons or mystic haze etc. (when targeting terrain or other effects auto hit)',
  ),
  def(
    'Drag',
    'When a target takes dmg from this weapon willpower test vs target, if the target fails move base-to-base to your character. (only applies in Optimal Range) (Ranged weapon only)',
  ),
  def(
    'Explosive',
    'All characters within 2" of the primary target are secondary targets. Roll 1 attack vs each secondary target (Ranged weapon only)',
  ),
  def(
    'Humiliating',
    'When a target takes damage from this weapon, they count as 2 levels lower until the end of their next activation.',
  ),
  def(
    'Incendiary',
    'When a target takes any amount of damage from this weapon they must test willpower vs d8, if fail target loses, they suffer 2 damage.',
  ),
  def(
    'Indirect',
    'May draw LoS from any allied character. When targeting a character this way all attacks deal -1 damage.',
  ),
  def(
    'Indiscriminate',
    'After performing a melee combat action, roll 1 attack on each other Character within 1" of this model.',
  ),
  def('Life Drain', 'Each successful hit from this weapon that deals damage heals this character for 1 health', {
    mutuallyExclusiveWith: ['unstable'],
  }),
  def(
    'Maim',
    'If a target takes damage from this weapon (Wd8), if they fail, weaken their ranged and melee stats until end of their next activation.',
  ),
  def(
    'Merciless',
    '+1 attack with this weapon when targeting a character that counts as reacted.',
  ),
  def(
    'Multi-targeting',
    'Split attacks between multiple targets, only the primary target may react to this attack (Ranged weapon only)',
  ),
  def(
    'Parry',
    'When defending or dueling vs melee, attacker counts as having no traits on their weapon (Melee weapon only)',
  ),
  def('Penetrating', 'Glancing hits from this weapon do full damage'),
  def(
    'Power up',
    'Combat action: This weapon gains +1 damage and strengthen this character’s melee or ranged stat until the next time this weapon is used',
  ),
  def(
    'Psychoactive',
    'If a target takes damage from this weapon willpower test vs d8, if the target loses move them d8 scatter. If the target hits any obstacle, feature, or other character, they stop and suffer 1dmg (Apply fall damage if necessary)',
  ),
  def(
    'Quick Draw',
    'This character has priority when reacting with this weapon',
  ),
  def(
    'Reckless',
    'At start of activation this character may gain strengthened melee, but weakened defense until the end of this characters next activation',
  ),
  def(
    'Ricochet',
    'After using this weapon for each failed attack against the primary target select a secondary target within 6" and make a single attack against it with -1 dmg (ranged weapons only)',
  ),
  def(
    'Shattering',
    'When a target takes damage from this weapon willpower test vs d8, if the target loses weaken Defense until the end of their next activation',
  ),
  def(
    'Short Range',
    'Halve all range intervals, gain +1 damage, may make ranged attack actions against characters within 1" (Ranged heavy weapon only)',
  ),
  def(
    'Stun',
    'When a target takes damage from this weapon, the target may not perform reaction until the end of their next activation.',
  ),
  def(
    'Suppress',
    'When a target takes dmg from this weapon willpower test vs d8, if the target loses they may only perform 1 basic action until the end of their next activation.',
  ),
  def(
    'Toxic',
    'When a target takes dmg from this weapon it cannot heal, become favorable or strengthened until the end of its next activation.',
  ),
  def(
    'Unstable',
    '+1 damage, for each successful hit, your character suffers 1 dmg (cannot be taken with life drain).',
    { mutuallyExclusiveWith: ['life-drain'] },
  ),
  def(
    'Unwieldy',
    'Unfavorable melee, +1 attack. (Heavy melee weapon only)',
  ),
  def(
    'Vengeful',
    'After reacting, attacks made with this weapon are strengthened until the end of this characters next activation.',
  ),
  def(
    'Violent',
    'When performing a ranged/melee combat action test willpower vs target, if target loses it cannot react',
  ),
]

const byId = new Map(WEAPON_TRAITS.map((t) => [t.id, t]))

export function getWeaponTraitById(id: string): WeaponTraitDef | undefined {
  return byId.get(id)
}
