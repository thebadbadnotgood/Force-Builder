import type { ForceClass } from './classes'

const DEFENSE_DICE_STEPS = ['d4', 'd6', 'd8', 'd10', 'd12'] as const

function strengthenDefenseDie(current: string): string {
  const i = DEFENSE_DICE_STEPS.indexOf(
    current as (typeof DEFENSE_DICE_STEPS)[number],
  )
  if (i === -1) return current
  if (i >= DEFENSE_DICE_STEPS.length - 1) return current
  return DEFENSE_DICE_STEPS[i + 1]
}

export type EffectiveCombatStats = Pick<
  ForceClass,
  'health' | 'speed' | 'melee' | 'ranged' | 'defense' | 'willpower'
>

/**
 * Permanent combat stat modifiers from characteristics (text in characteristics.ts).
 * Situational bonuses (e.g. "strengthen while…") are not applied here.
 */
export function getEffectiveCombatStats(
  cls: ForceClass | undefined,
  characteristicIds: readonly string[],
): EffectiveCombatStats | null {
  if (!cls) return null

  let health = cls.health
  let speed = cls.speed
  const melee = cls.melee
  const ranged = cls.ranged
  let defense = cls.defense
  const willpower = cls.willpower

  const ids = new Set(characteristicIds)

  if (ids.has('fast')) speed += 3
  if (ids.has('heavy-armor')) {
    speed -= 1
    defense = strengthenDefenseDie(defense)
  }
  if (ids.has('hulking-body')) {
    health += 4
    speed -= 1
  }
  if (ids.has('mounted')) {
    speed += 2
    health += 2
  }

  speed = Math.max(1, speed)
  health = Math.max(1, health)

  return { health, speed, melee, ranged, defense, willpower }
}

export function getEffectiveMaxHp(
  cls: ForceClass | undefined,
  characteristicIds: readonly string[],
): number {
  return (
    getEffectiveCombatStats(cls, characteristicIds)?.health ??
    cls?.health ??
    10
  )
}
