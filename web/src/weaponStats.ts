/**
 * Weapon category combat stats (Cyber Savage — tied to Light / Medium / Heavy).
 */
export type WeaponTier = 'light' | 'medium' | 'heavy'

export const WEAPON_CATEGORY_STATS: Record<
  WeaponTier,
  { attacks: number; damage: number }
> = {
  light: { attacks: 4, damage: 2 },
  medium: { attacks: 3, damage: 3 },
  heavy: { attacks: 2, damage: 4 },
}

/** Unarmed — melee only; update if your table specifies different values. */
export const UNARMED_MELEE_STATS = { attacks: 4, damage: 1 } as const

export function getWeaponCategoryStats(tier: WeaponTier): {
  attacks: number
  damage: number
} {
  return WEAPON_CATEGORY_STATS[tier]
}
