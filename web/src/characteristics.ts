export const MAX_PLAYER_CHARACTERISTICS = 2

export type CharacteristicDef = {
  id: string
  name: string
  description: string
}

function def(
  name: string,
  description: string,
  idOverride?: string,
): CharacteristicDef {
  const id =
    idOverride ??
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  return { id, name, description }
}

export const CHARACTERISTICS: CharacteristicDef[] = [
  def(
    'Active Camo',
    'Always count as in cover unless within 3" of an enemy character.',
  ),
  def(
    'Agile',
    'May sprint through area terrain, over obstacles and vertical. May not be HINDERED while charging a target within LOS.',
  ),
  def(
    'Avenger',
    "When an ally is slain, strengthen all stats until the end of this character's next activation.",
  ),
  def(
    'Berserk',
    'When below half starting health ignore negative status effects and flaws.',
  ),
  def(
    'Bloodlust',
    'When targeting a character with a combat action below half of its starting health, gain favorable.',
  ),
  def(
    'Bodyguard',
    "Reaction: when an allied character within 3\" becomes the target of a ranged or melee combat action, swap places with the allied character; this model becomes the target of the attack and may only defend.",
  ),
  def(
    'Command',
    'Utility action: activate a lower level unactivated ally within 6".',
  ),
  def(
    'Companion',
    'Once per round, before generating a dice pool, gain favorable but only add a d4.',
  ),
  def(
    'Cruel',
    'When targeting a character of a lower level with a combat action, gain favorable.',
  ),
  def(
    'Demented',
    'When targeting a character that is holding a token or base-to-base with an objective with a combat action, gain favorable.',
  ),
  def(
    'Determined',
    'Strengthen defense stats while within 1" of a controlled objective or holding a token.',
  ),
  def(
    'Devious',
    'Reaction: when an enemy character that is within melee range with this model performs a move, sprint or charge action; make a melee combat action against that character.',
  ),
  def(
    'Dodge',
    'Reaction: when targeted with a ranged combat action (not a spell or reaction), test willpower vs active character. If active character fails all the attacks miss. Targeted character must be placed 4" from where it began.',
  ),
  def(
    'Duelist',
    'The first time this character reacts with “duel” in a round, it does not count as reacted.',
  ),
  def(
    'Enhanced Vision',
    "Ignore cover during ranged combat actions, and count all targets as within LOS during a charge action.",
  ),
  def(
    'Evade',
    'Reaction: when target of a melee combat action (not a spell or reaction), test willpower vs active character. If active character fails all the attacks miss. Targeted character must be placed 4" from where it began.',
  ),
  def(
    'Extra weapon',
    'Take an additional standard weapon (melee or ranged).',
  ),
  def('Fast', '+3 speed.'),
  def(
    'Flying',
    'This character ignores vertical distance, area terrain, obstacles, and cannot take fall damage. May never benefit from cover. Charges that end in area terrain count as hindered.',
  ),
  def(
    'Formidable',
    "When this model compares its level add 1.",
  ),
  def(
    'Good luck',
    'Anytime this character generates a dice pool if 2 or more of the same number are rolled count them all as 1 value higher.',
  ),
  def(
    'Grenadier',
    '1 use, ranged combat action; with range 8", 1 atk damage 6 explosive (choose a weapon trait).',
  ),
  def(
    'Gunfighter',
    'The first time this model reacts with “shootout” in a round, it does not count as reacted.',
  ),
  def(
    'Heavy armor',
    'Strengthen defense, -1 speed.',
  ),
  def(
    'Heroic',
    'When targeting a character of a higher level with a combat action gain favorable.',
  ),
  def(
    'Honorable',
    'When targeting or being targeted by a character of the same level strengthen all stats.',
  ),
  def(
    'Horrifying',
    'When the PRIMARY target of a melee or ranged combat action (not a spell or reaction) test willpower vs active character. If active character fails, it has unfavorable for that action.',
  ),
  def('Hulking body', '+4 HP, -1 speed.'),
  def(
    'Impervious',
    'Glancing hits do 0 damage (even if penetrating).',
  ),
  def(
    'Invincible',
    'The first time this character reaches 0 HP it is not slain; do not remove it from play. Instead it remains with a single HP.',
  ),
  def(
    'Indomitable',
    'Favorable willpower when target of a spell, weapon trait, or characteristic.',
  ),
  def(
    'Last Stand',
    'When this character is slain, it may activate, but must perform ONLY a melee/ranged combat action or perform an 8" charge.',
  ),
  def(
    'Malicious',
    'When targeting a character with a negative status effect with a combat action, gain favorable.',
  ),
  def(
    'Medic',
    'Utility action; range 1" heal ally d6 HP. Combat action; heal self d6 HP.',
  ),
  def('Mounted', '+2 speed, +2 HP.'),
  def('Mystical', 'May take an (extra) spell.'),
  def(
    'Opportunist',
    'After taking damage, this character may move up to 4" for free.',
  ),
  def(
    'Overshield',
    'This character has an overshield token. The first time this character would take damage from a single attack remove the overshield token and treat the attack as a glancing hit. Recharge token at the beginning of the round.',
  ),
  def(
    'Psychic Ward',
    "When this character and other characters within 2\" are targeted by spells, the caster and target(s) only roll 2 willpower dice when generating the dice pool.",
  ),
  def(
    'Rage',
    'While this character is below half its starting health strengthen all stats. Rampage: Immediately after slaying a character perform a free move action. Relentless: If this character inflicts 0 damage during combat action, duel or shootout immediately make 1 additional single attack that must be defended.',
  ),
  def(
    'Regeneration',
    "At the start of this character's activation restore 2 HP (cannot exceed max HP).",
  ),
  def('Savage', 'Gain favorable when performing a charge action.'),
  def(
    'Scout',
    'After deployment but before the 1st round this character may make a move or sprint action. If multiple players have scout then resolve them in order of initiative.',
  ),
  def(
    'Self Destruct',
    'As a complex action or when this character is slain make 1 d10 ranged combat action with 6 damage to all characters within 3".',
  ),
  def(
    'Stealthy',
    'When this character has the benefit of cover it may only be declared as a target after testing willpower vs the active model. If the active model fails it cannot select this character as a target for that activation.',
  ),
  def(
    'Sturdy',
    'This character cannot be moved by spells, weapon traits or other game effects.',
  ),
  def(
    'Support',
    "Reaction: When an allied character within 3\" reacts they do not count as reacted even if they have already reacted this round.",
  ),
  def(
    'Unyielding',
    'If this character has more enemies than friendly models (including self) within 4" gain favorable.',
  ),
  def(
    'Volatile',
    'When this character takes damage from a melee combat action the inflicting model suffers 1 damage per successful hit.',
  ),
  def(
    'Wicked',
    'When an enemy character is slain, strengthen all stats until the end of next activation.',
  ),
  def(
    'Zealous',
    'When performing a melee/ranged combat action (not a spell or reaction) before generating dice pool, test willpower vs target; if target loses this character compares 2 dice instead of 1 when making its first comparison.',
  ),
]

const byId = new Map(CHARACTERISTICS.map((c) => [c.id, c]))

export function getCharacteristicById(id: string): CharacteristicDef | undefined {
  return byId.get(id)
}
