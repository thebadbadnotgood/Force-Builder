/**
 * Class / stat data from `Cyber Savage - Sheet1.csv` (project root).
 * Update this file when the sheet changes.
 */
export type ForceClass = {
  id: string
  name: string
  /** Tier from sheet (1–5). */
  level: number
  speed: number
  health: number
  melee: string
  ranged: string
  defense: string
  willpower: string
  /** Number of characteristic picks (sheet column). */
  characteristics: number
  equipment: string
  /** Short summary for selection cards. */
  tagline: string
}

function tagline(c: Omit<ForceClass, 'id' | 'tagline'>): string {
  return `Lv ${c.level} · SPD ${c.speed} · HP ${c.health} · ${c.equipment}`
}

const rows: Omit<ForceClass, 'id' | 'tagline'>[] = [
  {
    name: 'Grunt',
    level: 1,
    speed: 6,
    health: 10,
    melee: 'd4',
    ranged: 'd4',
    defense: 'd4',
    willpower: 'd4',
    characteristics: 1,
    equipment: 'std rng or std mel',
  },
  {
    name: 'Trooper',
    level: 2,
    speed: 6,
    health: 14,
    melee: 'd4',
    ranged: 'd6',
    defense: 'd6',
    willpower: 'd6',
    characteristics: 2,
    equipment: 'std rng',
  },
  {
    name: 'Warrior',
    level: 2,
    speed: 7,
    health: 14,
    melee: 'd6',
    ranged: 'd4',
    defense: 'd6',
    willpower: 'd6',
    characteristics: 2,
    equipment: 'std mel',
  },
  {
    name: 'Mercenary',
    level: 2,
    speed: 7,
    health: 14,
    melee: 'd6',
    ranged: 'd6',
    defense: 'd6',
    willpower: 'd6',
    characteristics: 2,
    equipment: 'sim rng and sim mel',
  },
  {
    name: 'Mage',
    level: 2,
    speed: 6,
    health: 12,
    melee: 'd4',
    ranged: 'd4',
    defense: 'd4',
    willpower: 'd6',
    characteristics: 2,
    equipment: 'sim mel, 2 spells',
  },
  {
    name: 'Veteran',
    level: 3,
    speed: 6,
    health: 16,
    melee: 'd6',
    ranged: 'd8',
    defense: 'd8',
    willpower: 'd6',
    characteristics: 2,
    equipment: 'adv rng',
  },
  {
    name: 'Vanguard',
    level: 3,
    speed: 7,
    health: 16,
    melee: 'd8',
    ranged: 'd6',
    defense: 'd8',
    willpower: 'd6',
    characteristics: 2,
    equipment: 'adv mel',
  },
  {
    name: 'Raider',
    level: 3,
    speed: 7,
    health: 16,
    melee: 'd8',
    ranged: 'd8',
    defense: 'd8',
    willpower: 'd6',
    characteristics: 2,
    equipment: 'std rng, std mel',
  },
  {
    name: 'Magus',
    level: 3,
    speed: 6,
    health: 14,
    melee: 'd6',
    ranged: 'd6',
    defense: 'd6',
    willpower: 'd8',
    characteristics: 2,
    equipment: 'std mel, 3 spells',
  },
  {
    name: 'Commando',
    level: 4,
    speed: 6,
    health: 18,
    melee: 'd8',
    ranged: 'd10',
    defense: 'd10',
    willpower: 'd8',
    characteristics: 3,
    equipment: 'adv rng',
  },
  {
    name: 'Champion',
    level: 4,
    speed: 7,
    health: 18,
    melee: 'd10',
    ranged: 'd8',
    defense: 'd10',
    willpower: 'd8',
    characteristics: 3,
    equipment: 'adv mel',
  },
  {
    name: 'Reaver',
    level: 4,
    speed: 7,
    health: 18,
    melee: 'd10',
    ranged: 'd10',
    defense: 'd10',
    willpower: 'd8',
    characteristics: 3,
    equipment: 'std rng, std mel',
  },
  {
    name: 'Archmage',
    level: 4,
    speed: 6,
    health: 16,
    melee: 'd6',
    ranged: 'd6',
    defense: 'd8',
    willpower: 'd10',
    characteristics: 3,
    equipment: 'adv mel, 4 spells',
  },
  {
    name: 'Eliminator',
    level: 5,
    speed: 7,
    health: 20,
    melee: 'd10',
    ranged: 'd12',
    defense: 'd12',
    willpower: 'd12',
    characteristics: 3,
    equipment: 'prime rng',
  },
  {
    name: 'Destroyer',
    level: 5,
    speed: 8,
    health: 20,
    melee: 'd10',
    ranged: 'd12',
    defense: 'd12',
    willpower: 'd10',
    characteristics: 3,
    equipment: 'prime mel',
  },
  {
    name: 'Marauder',
    level: 5,
    speed: 8,
    health: 20,
    melee: 'd12',
    ranged: 'd12',
    defense: 'd12',
    willpower: 'd10',
    characteristics: 3,
    equipment: 'adv mel, adv rng',
  },
  {
    name: 'Hypermage',
    level: 5,
    speed: 7,
    health: 18,
    melee: 'd8',
    ranged: 'd8',
    defense: 'd10',
    willpower: 'd12',
    characteristics: 3,
    equipment: 'adv mel, 4 spells, Spell Mastery*',
  },
]

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

const rowLevels = rows.map((r) => r.level)
/** Min / max class tier on the sheet (level slider range in the builder). */
export const CLASS_TIER_MIN = Math.min(...rowLevels)
export const CLASS_TIER_MAX = Math.max(...rowLevels)

export const GAME_CLASSES: ForceClass[] = rows.map((r) => {
  const id = slug(r.name)
  return { ...r, id, tagline: tagline(r) }
})

export function getClassById(id: string): ForceClass | undefined {
  return GAME_CLASSES.find((c) => c.id === id)
}

/** Filenames in `/public/class-icons/` (mirrors repo `class-icons/`). */
const CLASS_ICON_FILES: Partial<Record<string, string>> = {
  grunt: 'GRUNT.png',
  trooper: 'RANGED 2 TROOPER.png',
  warrior: 'MELEE 2 WARRIOR.png',
  veteran: 'RANGED 3 VETERAN.png',
  vanguard: 'MELEE 3 VANGUARD.png',
  commando: 'RANGED 4 COMMANDO.png',
  champion: 'MELEE 4 CHAMPION.png',
  eliminator: 'RANGED 5 ELIMINATOR.png',
  destroyer: 'MELEE 5 DESTROYER.png',
}

export function getClassIconUrl(classId: string): string | undefined {
  const file = CLASS_ICON_FILES[classId]
  if (!file) return undefined
  return `/class-icons/${encodeURIComponent(file)}`
}
