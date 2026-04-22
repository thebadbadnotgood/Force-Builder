export const COMBAT_DISCIPLINE_IDS = [
  'tactical',
  'barbaric',
  'reinforced',
  'honor_bound',
  'standard_bearers',
  'predatory',
  'judicial',
  'air_support',
  'cultist',
  'gamblers',
  'beast_tamers',
  'technicians',
] as const

export type CombatDisciplineId = (typeof COMBAT_DISCIPLINE_IDS)[number]

export type DisciplineTableRow = {
  name: string
  effect: string
  cost?: string
}

export type DisciplineBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | {
      type: 'table'
      showCost: boolean
      rows: DisciplineTableRow[]
      columnHeaders?: readonly [string, string]
    }

export type CombatDisciplineDoc = {
  id: CombatDisciplineId
  title: string
  flavorText: string
  blocks: DisciplineBlock[]
}

export function isCombatDisciplineId(s: string): s is CombatDisciplineId {
  return (COMBAT_DISCIPLINE_IDS as readonly string[]).includes(s)
}

export const COMBAT_DISCIPLINES: Record<CombatDisciplineId, CombatDisciplineDoc> = {
  tactical: {
    id: 'tactical',
    title: 'Tactical',
    flavorText:
      'Well organized in the approach to violence. Each maneuver done to curate the desired conditions for the battle.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Begin the battle with 8 INTEL.\nSpend INTEL on the following abilities at the beginning of any of your characters’ activations.',
      },
      {
        type: 'table',
        showCost: true,
        rows: [
          {
            name: 'RECON',
            effect:
              'Gain favorable on the next rounds initiative roll.',
            cost: '1',
          },
          {
            name: 'GUIDE',
            effect:
              'Active character may sprint vertical until the end of this activation.',
            cost: '1',
          },
          {
            name: 'SURVEY',
            effect:
              'Target any piece of terrain, it doesn’t grant cover for enemies or hinder charges of friendly characters.',
            cost: '1',
          },
          {
            name: 'PRIORITIZE TARGET',
            effect:
              'Select an enemy character. Friendly characters only make combat actions against this target until the end of their next activation. Gain strengthen and favorable.',
            cost: '2',
          },
          {
            name: 'FIRE AND MANEUVER',
            effect:
              'After a character makes a ranged attack select a friendly character within 6”, it may make a free move 6”.',
            cost: '2',
          },
          {
            name: 'EARLY EXTRACTION',
            effect: 'End game on at the end of turn 4.',
            cost: '3',
          },
        ],
      },
    ],
  },
  barbaric: {
    id: 'barbaric',
    title: 'Barbaric',
    flavorText:
      'Merciless and determined, revel in the demise of your enemies.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Begin the game with 0 BRUTALITY.\nEarn BRUTALITY each time a character from this team slays an enemy character. Gain BRUTALITY equal to the level of the slain model.\nSpend BRUTALITY on the following abilities at the beginning of any your characters’ activations.',
      },
      {
        type: 'table',
        showCost: true,
        rows: [
          {
            name: 'HASTE',
            effect:
              'Active character gains +4” speed until the end of this activation.',
            cost: '1',
          },
          {
            name: 'FURY',
            effect:
              'Active character gains favorable until the end of this activation.',
            cost: '1',
          },
          {
            name: 'SECOND WIND',
            effect: 'Target friendly character no longer counts as reacted.',
            cost: '2',
          },
          {
            name: 'DESTROY',
            effect:
              'Give a weapon +1 attack until the end of this activation.',
            cost: '3',
          },
          {
            name: 'UNSTOPPABLE',
            effect:
              'Activate a character that has already activated, that character counts as having “stupid” until the beginning of the next round.',
            cost: '5',
          },
        ],
      },
    ],
  },
  reinforced: {
    id: 'reinforced',
    title: 'Reinforced',
    flavorText:
      'Unwavering in the face of threats, use your resources to withstand any attack then strike back on your terms.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Begin the game with 1 REQUISITION.\nSpend REQUISITION on the following abilities at the beginning of any your characters’ activations.\nGain 1 REQUISITION at the start of each round.',
      },
      {
        type: 'table',
        showCost: true,
        rows: [
          {
            name: 'STALWART',
            effect:
              'When a model takes 0 damage while defending from a primary attack gain 1 requisition.',
            cost: '0',
          },
          {
            name: 'SECURMENT',
            effect:
              'Active character counts as level 6 until end of round.',
            cost: '1',
          },
          {
            name: 'BASTION',
            effect:
              'Next time this character defends it compares 2 dice instead of 1 when making its first comparison.',
            cost: '1',
          },
          {
            name: 'RESTORE',
            effect: 'Active character heals 3 hp.',
            cost: '2',
          },
          {
            name: 'REVITALIZE',
            effect:
              'Active character ignores negative status effects until the end of its next activation.',
            cost: '2',
          },
          {
            name: 'UNBREAKABLE',
            effect:
              'All friendly characters reduce damage from incoming attacks by -1 until the end of this round.',
            cost: '3',
          },
        ],
      },
    ],
  },
  honor_bound: {
    id: 'honor_bound',
    title: 'Honor Bound',
    flavorText: 'Adhere to the code, claim a rightful victory.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Spend HONOR on the following abilities at the beginning of any your characters’ activations.\nGain HONOR equal to allies level when they die.',
      },
      {
        type: 'heading',
        text: 'CHALLENGE',
      },
      {
        type: 'paragraph',
        text: 'At the beginning of the game select a single friendly character and a single enemy character.\nThe friendly character is the CHALLENGER and the enemy character is the RIVAL.\nFor the remainder of the game only the CHALLENGER may target the RIVAL unless the CHALLENGER is slain.\nIf the rival is a lower level than the challenger gain 1 honor.\nIf the same level gain 2 honor.\nIf a higher level gain 3.',
      },
      {
        type: 'table',
        showCost: true,
        rows: [
          {
            name: 'NOBLE VICTORY',
            effect:
              'Spend this when challenger slays the rival, permanently strengthen all its stats.',
            cost: '1',
          },
          {
            name: 'PROWESS',
            effect:
              'Select an enemy character within 8” of the active character. The target now count as as reacted and the active character does not.',
            cost: '2',
          },
          {
            name: 'GUIDANCE',
            effect:
              'Target friendly character. Any attacks made targeting this character are unfavorable until the end of its next activation.',
            cost: '2',
          },
          {
            name: 'PERSISTENCE',
            effect:
              'You may spend this when a friendly character is slain. DO NOT remove the character until the end of the round after scoring.',
            cost: '3',
          },
          {
            name: 'HUMILITY',
            effect:
              'Humiliate a character you control. Weaken every enemy character until the end of the round.',
            cost: '4',
          },
        ],
      },
    ],
  },
  standard_bearers: {
    id: 'standard_bearers',
    title: 'Standard Bearers',
    flavorText:
      'Inspired by the standard your warriors fight with commanded ferocity.',
    blocks: [
      {
        type: 'paragraph',
        text: 'At the start of the game appoint a character as the FLAG BEARER.\nThe FLAG BEARER at the start of its activation before any actions are performed, it may spend inspiration on ONE the following abilities.\n(A model with the flag never counts as being in cover)\nAll abilities affect all friendly characters that are within LoS of the flag when the ability is activated.\nThe FLAG BEARER may perform the following action;\nVALIANT WAVE: Utility Action; gain d4 inspiration. Combat Action; gain d6 inspiration.\nWhen the Flag Bearer is slain, lose all inspiration and place a banner marker where the character was.\nIt may be picked up with a utility action, that character becomes the FLAG BEARER.',
      },
      {
        type: 'table',
        showCost: true,
        rows: [
          {
            name: 'GLORY',
            effect:
              'If a FLAG BEARER is alive at the end of the game score an additional VP.',
            cost: '0',
          },
          {
            name: 'BATTLECRY',
            effect: 'Strengthen willpower until the end of the round.',
            cost: '1',
          },
          {
            name: 'STANDFIRM',
            effect:
              'Gain priority when defending against attacks or spells until end of the round.',
            cost: '2',
          },
          {
            name: 'BEAR WITNESS',
            effect:
              'Apply humiliating to all enemies within LOS. Lasts until the end of the round.',
            cost: '3',
          },
          {
            name: 'VIGILANCE',
            effect: 'Heal 2hp and remove negative status effects.',
            cost: '4',
          },
          {
            name: 'FOR VICTORY',
            effect: 'Strengthen ranged and melee until end of the round.',
            cost: '5',
          },
        ],
      },
    ],
  },
  predatory: {
    id: 'predatory',
    title: 'Predatory',
    flavorText:
      'Focus on picking off your prey by observing, learning, and striking when the time is right. Many creatures, mutants, and ghouls from across the galaxy must rely on their natural instincts to hunt and survive.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Spend INSTINCT at the beginning of any of your characters’ activations.\nAll characters gain the ability:\nCHOOSE PREY: utility action; mark a single visible enemy model as Prey. This status lasts until the target is slain.\n+2 instinct each time a prey is slain by a predatory character.\n+1 instinct each time a prey activates.',
      },
      {
        type: 'table',
        showCost: true,
        rows: [
          {
            name: 'ADAPT TO SURVIVE',
            effect:
              'Spend this when a friendly character takes dmg from an atk, it no longer counts as reacted.',
            cost: '1',
          },
          {
            name: 'STALK',
            effect:
              'Active character always has priority against prey until the end of the round.',
            cost: '1',
          },
          {
            name: 'HUNT DOWN',
            effect:
              'Active character makes a free 6” move directly towards a visible prey.',
            cost: '2',
          },
          {
            name: 'GO IN FOR THE KILL',
            effect:
              'Active character gains +1 attack to all weapons when targeting a prey until the end of the round.',
            cost: '3',
          },
          {
            name: 'AMBUSH',
            effect:
              'Target prey. The next time target activates, any friendly character may choose to use a reaction to perform either a 8” charge or a shoot action against it. Only a single character may choose to react this way.',
            cost: '3',
          },
          {
            name: 'PRIMAL TERROR',
            effect:
              'All remaining prey must immediately willpower vs d8 test, if they fail weaken all stats until the end of the round.',
            cost: '4',
          },
        ],
      },
    ],
  },
  judicial: {
    id: 'judicial',
    title: 'Judicial',
    flavorText: 'Remind them who is the law…',
    blocks: [
      {
        type: 'paragraph',
        text: 'Spend JUSTICE at the beginning of any of you characters’ activations.\nLAWS: at the start of each round declare 1 law. Each law may only be declared once per game.\nAll LAWS only last until the end of the turn it was declared.\nFREEZE: gain 1 JUSTICE each time an enemy model performs a sprint action\nCEASEFIRE: gain 1 JUSTICE each time an enemy model performs a ranged or melee combat action\nHAND IT OVER: gain 1 JUSTICE for each VP an enemy team score more than you\nSTOP RESISTING: gain 1 JUSTICE each time an enemy performs a reaction\nNO TRESPASSING: gain 1 JUSTICE for each enemy model that ends its activation touching a piece of terrain',
      },
      {
        type: 'table',
        showCost: true,
        rows: [
          {
            name: 'ZONE OFF',
            effect:
              'place 3 obstacles that are 3” long 1” wide and 1” tall anywhere on the map',
            cost: '1',
          },
          {
            name: 'GOT YOUR SIX',
            effect:
              'Active character, until the end of the round. friendly characters within 6” gain favorable when reacting.',
            cost: '2',
          },
          {
            name: 'BRUTALITY',
            effect:
              'The next combat action performed by the active character the target must defend with willpower. Target may NOT react.',
            cost: '3',
          },
          {
            name: 'DETAIN',
            effect:
              'Target enemy character within 1” of active character. Target gains a detain token. While a character has a detain token it may not perform combat actions. Each time the target activates test willpower vs d8 if successful remove detain token. Enemy characters within 1” may spend a utility action to remove the detain token.',
            cost: '3',
          },
          {
            name: 'BACK UP',
            effect:
              'Place a level 1 cadet character with simple med Rng and Mel with 0 characteristics or traits in your deployment zone',
            cost: '4',
          },
        ],
      },
    ],
  },
  air_support: {
    id: 'air_support',
    title: 'Air Support',
    flavorText:
      'Never fight without air superiority. Call in support from the skies but be prepared it’s DANGER CLOSE!',
    blocks: [
      {
        type: 'paragraph',
        text: 'Any friendly character may perform the following action; this may only be performed ONCE per turn\nDESIGNATE TARGET: combat action; Select one PAYLOAD then place a TARGETED POSITION (25mm token) within 10” in LOS.\nWhen the character that selected a payload ends its following activation scatter the TARGET POSITION token d8”\nWhen scattering the TARGET POSITION if it hits the edge of the map move it the remaining distance in reverse direction. Ignore vertical height when scattering.\nPAYLOADS: each may be used ONCE per game',
      },
      {
        type: 'table',
        showCost: false,
        rows: [
          {
            name: 'THERMO BOMB',
            effect:
              'All models within 3” of the TARGET POSITION token must defend vs d10 2atk 6dmg',
          },
          {
            name: 'GATLING BARRAGE',
            effect:
              'All characters within 3” of the token must defend vs d8 6atk 2dmg suppress',
          },
          {
            name: 'CAUSTIC SMOKE',
            effect:
              'Place a 6” circle of smoke on the token that lasts until the end of this characters next activation. Any model that touches the smoke during any part of its activation takes 1 dmg. Smoke blocks LOS',
          },
          {
            name: 'SUPPLY DROP',
            effect:
              'When a character selects this payload resolve IMMEDIATELY scatter d8” and place a supply drop. Supply drop 40mm base; when a friendly character is within 1” once during its activation you may remove a charge and heal that model 3hp. Supply drop as 2 charges.',
          },
          {
            name: 'CARPET MINES',
            effect:
              'Separately scatter 3 mines (25mm base) d8” away from the token. If any character is within 2” of a mine at any point during its activation IMMEDIATELY remove that mine and all characters within 2” suffer 4dmg.',
          },
        ],
      },
    ],
  },
  cultist: {
    id: 'cultist',
    title: 'Cultist',
    flavorText:
      'Your assembly of cultists draw power from elsewhere. Will they complete their dark designs?',
    blocks: [
      {
        type: 'paragraph',
        text: 'RITUALS; all friendly characters may perform the following actions\nRAISE EFFIGY: combat action; Within 3” of the center of the map you may raise 1 Effigy (40mm) up to 3” tall.\nAt the end of each round that the effigy stands gain 2 FAVOR.\nHP: 6 DEF: d8 (may only have one in play at a time, if destroyed lose all favor)\nGAZE INTO THE ABYSS: utility action; move this character d8” scatter; gain 1 FAVOR. May be performed once per round.\nSACRIFICE: utility action; combat range, slay target friendly model; gain FAVOR equal to its level.\nSpend FAVOR at the beginning of any of you characters’ activations',
      },
      {
        type: 'table',
        showCost: true,
        rows: [
          {
            name: 'SACRED STRENGTH',
            effect:
              'All characters within 6” of the Effigy gain strengthened stats until the end of the round.',
            cost: '1',
          },
          {
            name: 'MADNESS',
            effect:
              'Pick a point on the map within LOS to the Effigy, all characters within 3” test Psychoactive',
            cost: '2',
          },
          {
            name: 'BLESSINGS FROM BEYOND',
            effect:
              'Active character rolls a flaw, strengthen all stats for the rest of the game',
            cost: '2',
          },
          {
            name: 'PRIMORDIAL VISIONS',
            effect: 'Your entire team has favorable until the end of the round',
            cost: '3',
          },
          {
            name: 'SUMMON ENTITY',
            effect:
              'Replace the Effigy with the ENTITY (30-60mm). (Effigy must Must be erected) It has the following stats.',
            cost: '8',
          },
        ],
      },
      {
        type: 'heading',
        text: 'ENTITY',
      },
      {
        type: 'paragraph',
        text: 'HP:12 SP:8 MEL:d12 RNG:d12 DEF:d12 WP:d12\nFlying, Invincible, Stupid\nBRUTAL STRIKE: mel 3atks 4dmg\nELDRITCH BEAM: rng 2atk 4dmg life drain',
      },
    ],
  },
  gamblers: {
    id: 'gamblers',
    title: 'Gamblers',
    flavorText: 'High risk high reward, gamblers play to win.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Begin the battle with 3 CHIPS\nSpend CHIPS at the beginning of any of you characters’ activations unless stated otherwise.',
      },
      {
        type: 'table',
        showCost: true,
        rows: [
          {
            name: 'ANTE UP',
            effect:
              'After a combat action has been declared but before dice pools are generated you may declare evens or odds. If what you declared is the TOTAL majority then gain 3 CHIPS',
            cost: '1',
          },
          {
            name: 'PAY OFF',
            effect:
              'Target enemy character cannot attack target friendly character.',
            cost: '2',
          },
          {
            name: 'EVEN THE ODDS',
            effect:
              'Instead of combat each player rolls a poker hand* and may grab any of the dice for a single reroll. Loser takes 10 dmg. Roll hands in secret then once finished reveal simultaneously.',
            cost: '3',
          },
          {
            name: 'SWEETEN THE POT',
            effect: 'Immediately earn 1 VP',
            cost: '4',
          },
          {
            name: 'CYBER ROULETTE',
            effect:
              'x=Active characters level. Combat action; make a single attack mel or rng with 3 damage, this attack may not be reacted to. If it hits or glances make another attack, repeat this process until an attack misses or the target is slain.',
            cost: 'x',
          },
        ],
      },
      {
        type: 'paragraph',
        text: '*Poker Hand. Each player rolls 5 d6s. May set aside any of the dice and re-roll the rest once. Scoring hands from highest to lowest. Five of a Kind, Full House (3 of a kind and a pair), Straight (5 sequential), Three of a Kind, Two Pair, One Pair.',
      },
    ],
  },
  beast_tamers: {
    id: 'beast_tamers',
    title: 'Beast Tamers',
    flavorText:
      'Bring a ferocious beast to battle. Keeping it under control might be a battle of its own.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Bring a WARBEAST with your team. This is a character on a 30mm-60mm base and has a level of 0. It cannot activate except by PROD, COAX or on instinct. May react as normal. Cannot activate more than once per round.\nAll characters in you team may perform the actions PROD and COAX\nPROD: combat action: 3” range: test 3 dice will power vs the beasts will power.\nCOAX: utility action: 3” range: test 2 dice will power vs the beasts will power.\nActivate the WARBEAST immediately after the active characters activation.\nThe amount of successes determine the WARBEASTS X value on its stats.\n0 Success: X = d4 counts as activated\n1 Success: X = d6\n2 Success: X = d8\n3 Success: X = d10\n“Y” is the WARBEASTS willpower. Depending on its health at the start of the round.\nActivating on instinct.\nIf the beast has NOT been activated by the end of the round it must charge the nearest character, enemy or friendly.\nIf no characters are in range it must move and perform a ranged combat action targeting nearest character. Otherwise sprint towards the closest character.\nWhen not activated X = d6.',
      },
      {
        type: 'heading',
        text: 'WARBEAST',
      },
      {
        type: 'paragraph',
        text: 'Health: 18 speed:7 Melee dX Ranged dX Defense dX Willpower: dY\nStupid, Agile, Rampage\nMAUL: Mel 4atk 2dmg life drain\nSPIT: Rng 2atk 4dmg blind',
      },
      {
        type: 'table',
        showCost: false,
        columnHeaders: ['HP', 'WILLPOWER (Y)'],
        rows: [
          { name: '18-12', effect: 'd4' },
          { name: '11-7', effect: 'd6' },
          { name: '6-1', effect: 'd8' },
        ],
      },
    ],
  },
  technicians: {
    id: 'technicians',
    title: 'Technicians',
    flavorText:
      'A walking war machine of ancient origin, and devastating power, but will you keep it online?',
    blocks: [
      {
        type: 'paragraph',
        text: 'Bring an ANCIENT MACHINE with your team. This is a character on a 30mm-60mm base and has a level of 0.\nActivate the ANCIENT MACHINE separately as its own character.\nWEAR & TEAR (w&t)\nAmount of w&t determines the Melee and Ranged Stats of the Ancient Machine\n0: X =d10\n1-4: X =d8\n5-8: X =d6\n9-12: X =d4\n13+: X =d4 + unfavorable\nEvery 2 points of damage taken adds 1 wear & tear\nAny friendly character may perform the following actions;\nMINOR REPAIR: utility action; 3 dice will power test ANCIENT MACHINE, each success removes 1 w&t\nMAJOR REPAIR: combat action; 3 dice will power test vs the ANCIENT MACHINE, each success removes 2 w&t\nEach action adds the w&t indicated',
      },
      {
        type: 'heading',
        text: 'COMBAT ACTIONS',
      },
      {
        type: 'paragraph',
        text: 'MACHINE GUN: rng 4atk 2dmg W&T1\nSIEGE CANNON: rng 2atk 4dmg advanced optics, explosive W&T2\nCRUSH: mel 2atk 4dmg concussive W&T1\nMECHBLADE: mel 3atk 3dmg shattering, penetrating W&T2',
      },
      {
        type: 'heading',
        text: 'MOVEMENT ACTIONS',
      },
      {
        type: 'paragraph',
        text: 'ADVANCE: move up to SPEED W&T1',
      },
      {
        type: 'heading',
        text: 'UTILITY ACTIONS',
      },
      {
        type: 'paragraph',
        text: 'RAISE SHIELDS: gain overshield. Lasts until broken. W&T1',
      },
      {
        type: 'heading',
        text: 'COMPLEX ACTIONS',
      },
      {
        type: 'paragraph',
        text: 'FULLSPEED: move double speed W&T2\nCHARGE: move 8” W&T1 + W&T of combat action',
      },
      {
        type: 'heading',
        text: 'ANCIENT MACHINE',
      },
      {
        type: 'paragraph',
        text: 'HP: Infinite SPD:5 MEL:X RNG:X DEF:d8 WILL:d6\nStupid, Sturdy, Cannot Climb, Hesitant',
      },
    ],
  },
}

export function getCombatDiscipline(
  id: string | null,
): CombatDisciplineDoc | null {
  if (!id || !isCombatDisciplineId(id)) return null
  return COMBAT_DISCIPLINES[id]
}

export function getCombatDisciplineIconUrl(id: CombatDisciplineId): string {
  return `${import.meta.env.BASE_URL}combat-disciplines/${id}.png`
}
