import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from 'react'
import {
  CLASS_TIER_MAX,
  CLASS_TIER_MIN,
  GAME_CLASSES,
  type ForceClass,
  getClassById,
  getClassIconUrl,
} from './classes'
import {
  CHARACTERISTICS,
  MAX_PLAYER_CHARACTERISTICS,
  getCharacteristicById,
} from './characteristics'
import {
  WEAPON_TRAITS,
  classEquipmentHasWeapons,
  classEquipmentWeaponProfile,
  getWeaponTraitById,
  isWeaponTraitCompatibleWithEquipment,
} from './weaponTraits'
import { UNARMED_MELEE_STATS, getWeaponCategoryStats } from './weaponStats'
import {
  SPELLS,
  classEquipmentHasSpells,
  getSpellById,
} from './spells'
import {
  COMBAT_DISCIPLINE_IDS,
  COMBAT_DISCIPLINES,
  getCombatDiscipline,
  getCombatDisciplineIconUrl,
  isCombatDisciplineId,
} from './combatDisciplines'
import { CombatDisciplinePanel } from './CombatDisciplinePanel'
import './App.css'

const STORAGE_KEY = 'cyber-savage-force-builder'
const STORAGE_VERSION = 13
const FORCE_NAME_EMPTY_LABEL = 'Name your force'
const DOCUMENT_TITLE_BASE = 'Cyber Savage — Force Builder'
const DEFAULT_FORCE_POINT_BUDGET = 12
const FORCE_POINT_BUDGET_MIN = 1
const FORCE_POINT_BUDGET_MAX = 12
const STORED_LEVEL_MIN = 1
const STORED_LEVEL_MAX = 20

type Step =
  | 'name'
  | 'class'
  | 'characteristics'
  | 'weaponTraits'
  | 'spells'
  | 'sheet'

type WeaponType = 'light' | 'medium' | 'heavy'

function formatWeaponType(w: WeaponType): string {
  return w.charAt(0).toUpperCase() + w.slice(1)
}

type Character = {
  id: string
  name: string
  classId: string
  level: number
  characteristicIds: string[]
  weaponTraitIds: string[]
  weaponTypeMelee: WeaponType | null
  weaponTypeRanged: WeaponType | null
  spellIds: string[]
  currentHp: number
  reacted: boolean
  activated: boolean
}

type WizardDraft = {
  name: string
  classId: string | null
  level: number
  characteristicIds: string[]
  weaponTraitIds: string[]
  weaponTypeMelee: WeaponType | null
  weaponTypeRanged: WeaponType | null
  spellIds: string[]
}

const emptyDraft = (): WizardDraft => ({
  name: '',
  classId: null,
  level: CLASS_TIER_MIN,
  characteristicIds: [],
  weaponTraitIds: [],
  weaponTypeMelee: null,
  weaponTypeRanged: null,
  spellIds: [],
})

const MAX_PLAYER_WEAPON_TRAITS = 2

function normalizeCharacteristicIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const ids = raw.filter((x): x is string => typeof x === 'string')
  const seen = new Set<string>()
  const unique: string[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    unique.push(id)
    if (unique.length >= MAX_PLAYER_CHARACTERISTICS) break
  }
  return unique
}

const validWeaponTraitId = new Set(WEAPON_TRAITS.map((t) => t.id))

function normalizeWeaponType(raw: unknown): WeaponType | null {
  if (raw === 'light' || raw === 'medium' || raw === 'heavy') return raw
  return null
}

function normalizeWeaponTypePair(
  classId: string,
  o: Record<string, unknown>,
): { weaponTypeMelee: WeaponType | null; weaponTypeRanged: WeaponType | null } {
  const cls = getClassById(classId)
  const eq = cls?.equipment ?? ''
  const p = classEquipmentWeaponProfile(eq)

  // v13+: explicit fields
  const rawMelee = (o as { weaponTypeMelee?: unknown }).weaponTypeMelee
  const rawRanged = (o as { weaponTypeRanged?: unknown }).weaponTypeRanged
  const melee = normalizeWeaponType(rawMelee)
  const ranged = normalizeWeaponType(rawRanged)
  if (rawMelee !== undefined || rawRanged !== undefined) {
    return {
      weaponTypeMelee: p.hasMelee ? melee : null,
      weaponTypeRanged: p.hasRanged ? ranged : null,
    }
  }

  // v2–v12 legacy: one weaponType + weaponStyle
  const legacyType = normalizeWeaponType(
    (o as { weaponType?: unknown; weaponWeight?: unknown }).weaponType ??
      (o as { weaponWeight?: unknown }).weaponWeight,
  )
  const legacyStyle = (o as { weaponStyle?: unknown }).weaponStyle
  const legacyStyleNorm =
    legacyStyle === 'melee' || legacyStyle === 'ranged' ? legacyStyle : null

  if (!p.hasMelee && !p.hasRanged) {
    return { weaponTypeMelee: null, weaponTypeRanged: null }
  }
  if (p.hasMelee && !p.hasRanged) {
    return { weaponTypeMelee: legacyType, weaponTypeRanged: null }
  }
  if (p.hasRanged && !p.hasMelee) {
    return { weaponTypeMelee: null, weaponTypeRanged: legacyType }
  }
  // both: map based on legacy style when present
  return {
    weaponTypeMelee: legacyStyleNorm === 'melee' ? legacyType : null,
    weaponTypeRanged: legacyStyleNorm === 'ranged' ? legacyType : null,
  }
}

function WeaponCombatStatsBlock({
  weaponTypeMelee,
  weaponTypeRanged,
  equipment,
  className = '',
}: {
  weaponTypeMelee: WeaponType | null
  weaponTypeRanged: WeaponType | null
  equipment: string
  className?: string
}) {
  const p = classEquipmentWeaponProfile(equipment)
  const melee = weaponTypeMelee ? getWeaponCategoryStats(weaponTypeMelee) : null
  const ranged = weaponTypeRanged ? getWeaponCategoryStats(weaponTypeRanged) : null
  const showUnarmed = p.hasMelee && !melee
  if (!melee && !ranged && !showUnarmed) return null
  return (
    <div
      className={`weapon-combat-stats${className ? ` ${className}` : ''}`}
    >
      {p.hasMelee && melee ? (
        <p className="weapon-combat-stats__row">
          <span className="weapon-combat-stats__mono">
            Melee weapon — Attacks {melee.attacks} · Damage {melee.damage}
          </span>
        </p>
      ) : null}
      {showUnarmed ? (
        <p className="weapon-combat-stats__row weapon-combat-stats__row--unarmed">
          <span className="weapon-combat-stats__mono">
            Unarmed (fallback) — Attacks {UNARMED_MELEE_STATS.attacks} · Damage{' '}
            {UNARMED_MELEE_STATS.damage}
          </span>
        </p>
      ) : null}
      {p.hasRanged && ranged ? (
        <p className="weapon-combat-stats__row">
          <span className="weapon-combat-stats__mono">
            Ranged weapon — Attacks {ranged.attacks} · Damage {ranged.damage}
          </span>
        </p>
      ) : null}
    </div>
  )
}

function normalizeWeaponTraitIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const ids = raw.filter((x): x is string => typeof x === 'string')
  const seen = new Set<string>()
  const unique: string[] = []
  for (const id of ids) {
    if (!validWeaponTraitId.has(id) || seen.has(id)) continue
    seen.add(id)
    unique.push(id)
  }
  return unique
}

const validSpellId = new Set(SPELLS.map((s) => s.id))

function normalizeSpellIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const ids = raw.filter((x): x is string => typeof x === 'string')
  const seen = new Set<string>()
  const unique: string[] = []
  for (const id of ids) {
    if (!validSpellId.has(id) || seen.has(id)) continue
    seen.add(id)
    unique.push(id)
  }
  return unique
}

function newId(): string {
  return crypto.randomUUID()
}

function normalizeForceName(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.trim()
}

function normalizeCharacter(x: unknown): Character | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  if (
    typeof o.id !== 'string' ||
    typeof o.name !== 'string' ||
    typeof o.classId !== 'string' ||
    typeof o.level !== 'number' ||
    o.level < STORED_LEVEL_MIN ||
    o.level > STORED_LEVEL_MAX
  ) {
    return null
  }
  const maxHp = getClassById(o.classId)?.health ?? 10
  let currentHp: number
  if (typeof o.currentHp === 'number' && Number.isFinite(o.currentHp)) {
    currentHp = Math.round(o.currentHp)
  } else {
    currentHp = maxHp
  }
  currentHp = Math.max(0, Math.min(maxHp, currentHp))
  const { weaponTypeMelee, weaponTypeRanged } = normalizeWeaponTypePair(
    o.classId,
    o,
  )
  return {
    id: o.id,
    name: o.name,
    classId: o.classId,
    level: o.level,
    characteristicIds: normalizeCharacteristicIds(o.characteristicIds),
    weaponTraitIds: normalizeWeaponTraitIds(o.weaponTraitIds),
    weaponTypeMelee,
    weaponTypeRanged,
    spellIds: normalizeSpellIds(o.spellIds),
    currentHp,
    reacted: o.reacted === true,
    activated: o.activated === true,
  }
}

function parseForceHubActive(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== 'object') return false
  return (parsed as { forceHubActive?: unknown }).forceHubActive === true
}

function parsePersistedCombatDisciplineId(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== 'object') return null
  if (!('combatDisciplineId' in parsed)) return null
  const raw = (parsed as { combatDisciplineId: unknown }).combatDisciplineId
  if (raw === null || raw === '') return null
  if (typeof raw === 'string' && isCombatDisciplineId(raw)) return raw
  return null
}

function loadPersisted(): PersistedPayload {
  const empty = (): PersistedPayload => ({
    characters: [],
    forcePointBudget: DEFAULT_FORCE_POINT_BUDGET,
    forceName: '',
    forceHubActive: false,
    combatDisciplineId: null,
  })
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty()

    const parsed = JSON.parse(raw) as unknown

    let forcePointBudget = DEFAULT_FORCE_POINT_BUDGET
    if (parsed && typeof parsed === 'object' && 'forcePointBudget' in parsed) {
      forcePointBudget = parseForcePointBudget(
        (parsed as { forcePointBudget: unknown }).forcePointBudget,
      )
    }

    let forceName = ''
    if (parsed && typeof parsed === 'object' && 'forceName' in parsed) {
      forceName = normalizeForceName(
        (parsed as { forceName: unknown }).forceName,
      )
    }

    if (
      parsed &&
      typeof parsed === 'object' &&
      'version' in parsed &&
      'characters' in parsed &&
      Array.isArray((parsed as { characters: unknown }).characters)
    ) {
      const ver = (parsed as { version: unknown }).version
      if (
        ver === STORAGE_VERSION ||
        ver === 12 ||
        ver === 11 ||
        ver === 10 ||
        ver === 9 ||
        ver === 8 ||
        ver === 7 ||
        ver === 6 ||
        ver === 5 ||
        ver === 4 ||
        ver === 3 ||
        ver === 2
      ) {
        const characters = (parsed as { characters: unknown[] }).characters
          .map(normalizeCharacter)
          .filter((c): c is Character => c !== null)
        const forceHubActive = parseForceHubActive(parsed)
        const combatDisciplineId = parsePersistedCombatDisciplineId(parsed)
        return {
          characters,
          forcePointBudget,
          forceName,
          forceHubActive,
          combatDisciplineId,
        }
      }
    }

    // v1: single draft { forceName, classId, level }
    if (parsed && typeof parsed === 'object' && 'forceName' in parsed) {
      const o = parsed as {
        forceName?: unknown
        classId?: unknown
        level?: unknown
      }
      const name = typeof o.forceName === 'string' ? o.forceName.trim() : ''
      const classId = typeof o.classId === 'string' ? o.classId : ''
      const level =
        typeof o.level === 'number' &&
        o.level >= STORED_LEVEL_MIN &&
        o.level <= STORED_LEVEL_MAX
          ? o.level
          : 1
      if (name && classId) {
        return {
          characters: [
            {
              id: newId(),
              name,
              classId,
              level,
              reacted: false,
              activated: false,
              characteristicIds: [],
              weaponTraitIds: [],
              weaponTypeMelee: null,
              weaponTypeRanged: null,
              spellIds: [],
              currentHp: getClassById(classId)?.health ?? 10,
            },
          ],
          forcePointBudget,
          forceName: '',
          forceHubActive: false,
          combatDisciplineId: null,
        }
      }
    }

    return empty()
  } catch {
    return empty()
  }
}

function clampForcePointBudget(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_FORCE_POINT_BUDGET
  const r = Math.round(n)
  return Math.max(
    FORCE_POINT_BUDGET_MIN,
    Math.min(FORCE_POINT_BUDGET_MAX, r),
  )
}

function stepInt(n: number, min: number, max: number, delta: number): number {
  if (!Number.isFinite(n)) return min
  const r = Math.round(n) + delta
  return Math.max(min, Math.min(max, r))
}

function parseForcePointBudget(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return DEFAULT_FORCE_POINT_BUDGET
  }
  return clampForcePointBudget(raw)
}

type PersistedPayload = {
  characters: Character[]
  forcePointBudget: number
  forceName: string
  forceHubActive: boolean
  combatDisciplineId: string | null
}

type AppView = 'roster' | 'wizard'

function savePersisted(payload: PersistedPayload) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: STORAGE_VERSION,
      characters: payload.characters,
      forcePointBudget: payload.forcePointBudget,
      forceName: normalizeForceName(payload.forceName),
      forceHubActive: payload.forceHubActive,
      combatDisciplineId: payload.combatDisciplineId,
    }),
  )
}

function totalForcePointsUsed(characters: Character[]): number {
  return characters.reduce((sum, c) => sum + c.level, 0)
}

function projectedForcePoints(
  characters: Character[],
  editingId: string | null,
  draft: WizardDraft,
): number {
  const others = characters.reduce((sum, c) => {
    if (editingId && c.id === editingId) return sum
    return sum + c.level
  }, 0)
  const draftCost = draft.classId ? draft.level : 0
  return others + draftCost
}

function wizardProgressIndex(s: Step, hasWeapons: boolean): number {
  switch (s) {
    case 'name':
      return 0
    case 'class':
      return 1
    case 'characteristics':
      return 2
    case 'weaponTraits':
      return 3
    case 'spells':
      return hasWeapons ? 4 : 3
    case 'sheet':
      return 5
    default:
      return 0
  }
}

function ClassIconBadge({
  classId,
  name,
  size,
}: {
  classId: string
  name: string
  size: 'card' | 'trigger' | 'roster'
}) {
  const src = getClassIconUrl(classId)
  const px =
    size === 'card' ? 48 : size === 'roster' ? 44 : 36
  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={px}
        height={px}
        className={
          size === 'card'
            ? 'class-pick-card__icon'
            : size === 'roster'
              ? 'char-card__class-icon'
              : 'class-chart-dd__trigger-icon'
        }
      />
    )
  }
  return (
    <span
      className={
        size === 'card'
          ? 'class-pick-card__icon-fallback'
          : size === 'roster'
            ? 'char-card__class-icon-fallback'
            : 'class-chart-dd__trigger-icon-fallback'
      }
      aria-hidden
    >
      {name.slice(0, 1)}
    </span>
  )
}

function ClassLevelChartDropdown({
  level,
  classes,
  selectedId,
  isOpen,
  onToggle,
  onSelect,
  onClearThisTier,
  hasSelectionForThisTier,
  panelRef,
}: {
  level: number
  classes: ForceClass[]
  selectedId: string | null
  isOpen: boolean
  onToggle: () => void
  onSelect: (c: ForceClass) => void
  onClearThisTier: () => void
  hasSelectionForThisTier: boolean
  panelRef?: Ref<HTMLDivElement | null>
}) {
  const picked = selectedId
    ? classes.find((c) => c.id === selectedId)
    : undefined
  const triggerLabel = picked ? picked.name : `Level ${level}`

  return (
    <div className="class-chart-dd">
      <button
        type="button"
        className="class-chart-dd__trigger"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        id={`class-chart-trigger-${level}`}
        onClick={onToggle}
      >
        <span className="class-chart-dd__trigger-main">
          {picked ? (
            <ClassIconBadge
              classId={picked.id}
              name={picked.name}
              size="trigger"
            />
          ) : null}
          <span className="class-chart-dd__trigger-text">{triggerLabel}</span>
        </span>
        <span className="class-chart-dd__chev" aria-hidden>
          ▼
        </span>
      </button>
      {isOpen ? (
        <div ref={panelRef} className="class-chart-dd__panel">
          <div
            className="class-chart-dd__scroll class-pick-grid-cards"
            role="listbox"
            aria-labelledby={`class-chart-trigger-${level}`}
          >
            {classes.map((c) => {
              const isSelected = selectedId === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`class-pick-card${isSelected ? ' class-pick-card--selected' : ''}`}
                  onClick={() => onSelect(c)}
                >
                  <div className="class-pick-card__head">
                    <ClassIconBadge
                      classId={c.id}
                      name={c.name}
                      size="card"
                    />
                    <span className="class-pick-card__name">{c.name}</span>
                  </div>
                  <dl className="class-pick-card__dl">
                    <dt>SPD</dt>
                    <dd>{c.speed}</dd>
                    <dt>HP</dt>
                    <dd>{c.health}</dd>
                    <dt>Mel</dt>
                    <dd>{c.melee}</dd>
                    <dt>Rng</dt>
                    <dd>{c.ranged}</dd>
                    <dt>Def</dt>
                    <dd>{c.defense}</dd>
                    <dt>Will</dt>
                    <dd>{c.willpower}</dd>
                    <dt>Picks</dt>
                    <dd>{c.characteristics}</dd>
                  </dl>
                  <p className="class-pick-card__eq">{c.equipment}</p>
                </button>
              )
            })}
          </div>
          {hasSelectionForThisTier ? (
            <div className="class-chart-dd__footer">
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={(e) => {
                  e.stopPropagation()
                  onClearThisTier()
                }}
              >
                Clear selection
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function App() {
  const [bootstrap] = useState(() => ({ p: loadPersisted() }))
  const [view, setView] = useState<AppView>('roster')
  const [characters, setCharacters] = useState(bootstrap.p.characters)
  const [forcePointBudget, setForcePointBudget] = useState(
    bootstrap.p.forcePointBudget,
  )
  const [forceName, setForceName] = useState(bootstrap.p.forceName)
  const [forceHubActive, setForceHubActive] = useState(
    () =>
      bootstrap.p.forceHubActive ||
      bootstrap.p.characters.length > 0 ||
      !!normalizeForceName(bootstrap.p.forceName),
  )
  const [combatDisciplineId, setCombatDisciplineId] = useState<string | null>(
    () => bootstrap.p.combatDisciplineId ?? null,
  )
  const [combatDisciplineRulesOpen, setCombatDisciplineRulesOpen] =
    useState(false)
  const [editingForceName, setEditingForceName] = useState(false)
  const [forceNameDraft, setForceNameDraft] = useState('')
  const [sheetForceEditOpen, setSheetForceEditOpen] = useState(false)
  const [sheetForceDraft, setSheetForceDraft] = useState('')
  const topbarForceNameInputRef = useRef<HTMLInputElement>(null)
  const topbarForceBlurSkipRef = useRef(false)
  const sheetForceInputRef = useRef<HTMLInputElement>(null)
  const sheetForceBlurSkipRef = useRef(false)
  const [sheetCharNameEditOpen, setSheetCharNameEditOpen] = useState(false)
  const [sheetCharNameDraft, setSheetCharNameDraft] = useState('')
  const sheetCharNameInputRef = useRef<HTMLInputElement>(null)
  const sheetCharNameBlurSkipRef = useRef(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<WizardDraft>(emptyDraft)
  const [step, setStep] = useState<Step>('sheet')
  const [traitFilter, setTraitFilter] = useState('')
  const [weaponTraitFilter, setWeaponTraitFilter] = useState('')
  const [spellFilter, setSpellFilter] = useState('')
  const [classChartOpenLevel, setClassChartOpenLevel] = useState<number | null>(
    null,
  )
  const classChartPickRef = useRef<HTMLDivElement>(null)
  const classPickerOpenPanelRef = useRef<HTMLDivElement | null>(null)
  const [classPickerReservePx, setClassPickerReservePx] = useState(0)

  useEffect(() => {
    savePersisted({
      characters,
      forcePointBudget,
      forceName,
      forceHubActive,
      combatDisciplineId,
    })
  }, [characters, forcePointBudget, forceName, forceHubActive, combatDisciplineId])

  useEffect(() => {
    if (!editingForceName) return
    const el = topbarForceNameInputRef.current
    el?.focus()
    el?.select()
  }, [editingForceName])

  useEffect(() => {
    if (!sheetForceEditOpen) setSheetForceDraft(forceName)
  }, [forceName, sheetForceEditOpen])

  useEffect(() => {
    if (view !== 'wizard' || step !== 'sheet') {
      setSheetForceEditOpen(false)
      setSheetCharNameEditOpen(false)
    }
  }, [view, step])

  useEffect(() => {
    if (!sheetCharNameEditOpen) setSheetCharNameDraft(draft.name)
  }, [draft.name, sheetCharNameEditOpen])

  useEffect(() => {
    if (sheetCharNameEditOpen) {
      const el = sheetCharNameInputRef.current
      el?.focus()
      el?.select()
      return
    }
    if (sheetForceEditOpen) {
      const el = sheetForceInputRef.current
      el?.focus()
      el?.select()
    }
  }, [sheetCharNameEditOpen, sheetForceEditOpen])

  useEffect(() => {
    const trimmed = forceName.trim()
    document.title = trimmed
      ? `${trimmed} — Force Builder`
      : DOCUMENT_TITLE_BASE
  }, [forceName])

  useEffect(() => {
    if (step !== 'class') setClassChartOpenLevel(null)
  }, [step])

  useEffect(() => {
    if (classChartOpenLevel === null) return
    const onDoc = (e: MouseEvent) => {
      if (
        classChartPickRef.current &&
        !classChartPickRef.current.contains(e.target as Node)
      ) {
        setClassChartOpenLevel(null)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setClassChartOpenLevel(null)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [classChartOpenLevel])

  useLayoutEffect(() => {
    if (classChartOpenLevel === null || view !== 'wizard' || step !== 'class') {
      setClassPickerReservePx(0)
      return
    }

    const footer = document.querySelector('.actions') as HTMLElement | null
    if (!footer) {
      setClassPickerReservePx(0)
      return
    }

    const CLEARANCE = 12
    let ro: ResizeObserver | null = null
    let cancelled = false

    const update = () => {
      if (cancelled) return
      const panel = classPickerOpenPanelRef.current
      if (!panel) {
        setClassPickerReservePx(0)
        return
      }
      const panelRect = panel.getBoundingClientRect()
      const footerRect = footer.getBoundingClientRect()
      const overlap = panelRect.bottom - footerRect.top + CLEARANCE
      setClassPickerReservePx(Math.max(0, Math.ceil(overlap)))
    }

    const arm = () => {
      if (cancelled) return
      const panel = classPickerOpenPanelRef.current
      if (!panel) return
      update()
      if (!ro) {
        ro = new ResizeObserver(update)
        ro.observe(panel)
        /* No scroll listener: viewport overlap fluctuates while padding moves the footer. */
        window.addEventListener('resize', update)
      }
    }

    arm()
    const raf1 = requestAnimationFrame(arm)
    const raf2 = requestAnimationFrame(() => {
      requestAnimationFrame(arm)
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      ro?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [classChartOpenLevel, view, step])

  useEffect(() => {
    if (!editingId) return
    if (!characters.some((c) => c.id === editingId)) {
      setEditingId(null)
      setDraft(emptyDraft())
      setStep('sheet')
      setTraitFilter('')
      setWeaponTraitFilter('')
      setSpellFilter('')
      setClassChartOpenLevel(null)
    }
  }, [editingId, characters])

  const rosterPointsUsed = useMemo(
    () => totalForcePointsUsed(characters),
    [characters],
  )
  const rosterPointsRemaining = forcePointBudget - rosterPointsUsed

  const selectedCombatDisciplineId =
    combatDisciplineId && isCombatDisciplineId(combatDisciplineId)
      ? combatDisciplineId
      : null

  const projectedWizardPoints = useMemo(
    () => projectedForcePoints(characters, editingId, draft),
    [characters, editingId, draft],
  )
  const wizardPointsRemaining = forcePointBudget - projectedWizardPoints
  const withinForceBudget = projectedWizardPoints <= forcePointBudget

  const selectedClass = useMemo(
    () => getClassById(draft.classId ?? '') ?? null,
    [draft.classId],
  )

  const classHasSpellsAccess = useMemo(
    () =>
      selectedClass !== null &&
      classEquipmentHasSpells(selectedClass.equipment),
    [selectedClass],
  )

  const classHasWeaponsAccess = useMemo(
    () =>
      selectedClass !== null &&
      classEquipmentHasWeapons(selectedClass.equipment),
    [selectedClass],
  )

  const classWeaponProfile = useMemo(() => {
    if (!selectedClass) {
      return { hasMelee: false, hasRanged: false, both: false }
    }
    const p = classEquipmentWeaponProfile(selectedClass.equipment)
    return {
      hasMelee: p.hasMelee,
      hasRanged: p.hasRanged,
      both: p.hasMelee && p.hasRanged,
    }
  }, [selectedClass])

  useEffect(() => {
    if (step === 'weaponTraits' && !classHasWeaponsAccess) {
      setStep(editingId ? 'class' : 'sheet')
      return
    }
    if (step === 'spells' && !classHasSpellsAccess) {
      setStep(editingId ? 'class' : 'sheet')
    }
  }, [step, classHasWeaponsAccess, classHasSpellsAccess, editingId])

  useEffect(() => {
    const cls = draft.classId ? getClassById(draft.classId) : null
    if (!cls) return
    const eq = cls.equipment
    const hasWeapons = classEquipmentHasWeapons(eq)
    setDraft((d) => {
      const nextWeapon = hasWeapons
        ? d.weaponTraitIds.filter((id) => {
            const t = getWeaponTraitById(id)
            return t && isWeaponTraitCompatibleWithEquipment(t, eq)
          })
        : []
      const nextSpell = classEquipmentHasSpells(eq)
        ? d.spellIds.filter((id) => validSpellId.has(id))
        : []
      const weaponSame =
        nextWeapon.length === d.weaponTraitIds.length &&
        nextWeapon.every((id, i) => id === d.weaponTraitIds[i])
      const spellSame =
        nextSpell.length === d.spellIds.length &&
        nextSpell.every((id, i) => id === d.spellIds[i])
      const p = classEquipmentWeaponProfile(eq)
      const nextWeaponTypeMelee = p.hasMelee ? d.weaponTypeMelee : null
      const nextWeaponTypeRanged = p.hasRanged ? d.weaponTypeRanged : null
      const meleeSame = nextWeaponTypeMelee === d.weaponTypeMelee
      const rangedSame = nextWeaponTypeRanged === d.weaponTypeRanged
      if (weaponSame && spellSame && meleeSame && rangedSame) return d
      return {
        ...d,
        weaponTraitIds: nextWeapon,
        spellIds: nextSpell,
        weaponTypeMelee: nextWeaponTypeMelee,
        weaponTypeRanged: nextWeaponTypeRanged,
      }
    })
  }, [draft.classId])

  useEffect(() => {
    setDraft((d) => {
      if (d.weaponTraitIds.length <= MAX_PLAYER_WEAPON_TRAITS) return d
      return { ...d, weaponTraitIds: d.weaponTraitIds.slice(0, MAX_PLAYER_WEAPON_TRAITS) }
    })
  }, [draft.weaponTraitIds.length])

  const canAdvanceName = draft.name.trim().length > 0
  const canAdvanceClassStep =
    draft.classId !== null &&
    selectedClass !== null &&
    selectedClass.level === draft.level &&
    withinForceBudget

  const canAdvanceCharacteristicsStep =
    draft.characteristicIds.length === MAX_PLAYER_CHARACTERISTICS

  const canSaveCharacter =
    canAdvanceName &&
    draft.classId !== null &&
    canAdvanceClassStep &&
    selectedClass !== null &&
    canAdvanceCharacteristicsStep &&
    withinForceBudget &&
    (!classHasWeaponsAccess ||
      (!classWeaponProfile.hasMelee || draft.weaponTypeMelee !== null) &&
        (!classWeaponProfile.hasRanged || draft.weaponTypeRanged !== null))

  const toggleCharacteristic = useCallback((id: string) => {
    setDraft((d) => {
      const cur = d.characteristicIds
      if (cur.includes(id)) {
        return {
          ...d,
          characteristicIds: cur.filter((x) => x !== id),
        }
      }
      if (cur.length >= MAX_PLAYER_CHARACTERISTICS) return d
      return { ...d, characteristicIds: [...cur, id] }
    })
  }, [])

  const toggleWeaponTrait = useCallback((id: string) => {
    setDraft((d) => {
      const cur = d.weaponTraitIds
      const trait = getWeaponTraitById(id)
      if (!trait) return d
      if (cur.includes(id)) {
        return { ...d, weaponTraitIds: cur.filter((x) => x !== id) }
      }
      if (cur.length >= MAX_PLAYER_WEAPON_TRAITS) return d
      const blocked = trait.mutuallyExclusiveWith ?? []
      const filtered = cur.filter((x) => !blocked.includes(x))
      return { ...d, weaponTraitIds: [...filtered, id] }
    })
  }, [])

  const toggleSpell = useCallback((id: string) => {
    setDraft((d) => {
      const cur = d.spellIds
      if (!validSpellId.has(id)) return d
      if (cur.includes(id)) {
        return { ...d, spellIds: cur.filter((x) => x !== id) }
      }
      return { ...d, spellIds: [...cur, id] }
    })
  }, [])

  const filteredCharacteristics = useMemo(() => {
    const q = traitFilter.trim().toLowerCase()
    if (!q) return CHARACTERISTICS
    return CHARACTERISTICS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    )
  }, [traitFilter])

  const filteredWeaponTraits = useMemo(() => {
    if (!classHasWeaponsAccess) return []
    const eq = selectedClass?.equipment ?? ''
    const base = WEAPON_TRAITS.filter((t) =>
      isWeaponTraitCompatibleWithEquipment(t, eq),
    )
    const q = weaponTraitFilter.trim().toLowerCase()
    if (!q) return base
    return base.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    )
  }, [
    classHasWeaponsAccess,
    selectedClass?.equipment,
    weaponTraitFilter,
  ])

  const filteredSpells = useMemo(() => {
    if (!classHasSpellsAccess) return []
    const q = spellFilter.trim().toLowerCase()
    if (!q) return SPELLS
    return SPELLS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q),
    )
  }, [classHasSpellsAccess, spellFilter])

  const navigateToEditorStep = useCallback(
    (target: Exclude<Step, 'sheet'>) => {
      if (target === 'weaponTraits') {
        if (!selectedClass) {
          setStep('class')
          return
        }
        if (!classEquipmentHasWeapons(selectedClass.equipment)) {
          setStep('class')
          return
        }
      }
      if (target === 'spells') {
        if (!selectedClass) {
          setStep('class')
          return
        }
        if (!classEquipmentHasSpells(selectedClass.equipment)) {
          setStep('class')
          return
        }
      }
      setStep(target)
    },
    [selectedClass],
  )

  const openSheetCharacterNameEdit = useCallback(() => {
    setSheetForceEditOpen(false)
    setEditingForceName(false)
    setSheetCharNameDraft(draft.name)
    setSheetCharNameEditOpen(true)
  }, [draft.name])

  const startNewCharacter = useCallback(() => {
    setEditingId(null)
    setDraft(emptyDraft())
    setStep('sheet')
    setTraitFilter('')
    setWeaponTraitFilter('')
    setSpellFilter('')
    setView('wizard')
  }, [])

  const openCharacterEditor = useCallback((c: Character, target: Step = 'name') => {
    setEditingId(c.id)
    const cls = getClassById(c.classId)
    const tier = cls?.level ?? c.level
    const level = Math.min(
      Math.max(tier, CLASS_TIER_MIN),
      CLASS_TIER_MAX,
    )
    setDraft({
      name: c.name,
      classId: c.classId,
      level,
      characteristicIds: [...c.characteristicIds].slice(
        0,
        MAX_PLAYER_CHARACTERISTICS,
      ),
      weaponTraitIds: [...c.weaponTraitIds],
      weaponTypeMelee: c.weaponTypeMelee,
      weaponTypeRanged: c.weaponTypeRanged,
      spellIds: [...c.spellIds],
    })
    setTraitFilter('')
    setWeaponTraitFilter('')
    setSpellFilter('')
    setView('wizard')

    let resolved: Step =
      target === 'sheet' || target === 'name' ? 'name' : target
    if (resolved === 'weaponTraits') {
      if (!cls || !classEquipmentHasWeapons(cls.equipment)) resolved = 'class'
    } else if (resolved === 'spells') {
      if (!cls || !classEquipmentHasSpells(cls.equipment)) resolved = 'class'
    }
    setStep(resolved)
  }, [])

  const goToRoster = useCallback(() => {
    setForceHubActive(true)
    setView('roster')
    setEditingId(null)
    setDraft(emptyDraft())
    setStep('sheet')
    setTraitFilter('')
    setWeaponTraitFilter('')
    setSpellFilter('')
    setClassChartOpenLevel(null)
  }, [])

  const persistCharacter = useCallback(() => {
    if (!canSaveCharacter || draft.classId === null) return
    const classId = draft.classId
    setCharacters((prev) => {
      const existing = editingId
        ? prev.find((p) => p.id === editingId)
        : undefined
      const maxHp = getClassById(classId)?.health ?? 10
      let currentHp: number
      if (existing && typeof existing.currentHp === 'number') {
        currentHp = Math.max(0, Math.min(maxHp, existing.currentHp))
      } else {
        currentHp = maxHp
      }
      const row: Character = {
        id: editingId ?? newId(),
        name: draft.name.trim(),
        classId,
        level: draft.level,
        characteristicIds: draft.characteristicIds.slice(
          0,
          MAX_PLAYER_CHARACTERISTICS,
        ),
        weaponTraitIds: classEquipmentHasWeapons(
          getClassById(classId)?.equipment ?? '',
        )
          ? draft.weaponTraitIds.filter((id) => {
              const t = getWeaponTraitById(id)
              return (
                t &&
                isWeaponTraitCompatibleWithEquipment(
                  t,
                  getClassById(classId)?.equipment ?? '',
                )
              )
            })
          : [],
        weaponTypeMelee: classEquipmentWeaponProfile(
          getClassById(classId)?.equipment ?? '',
        ).hasMelee
          ? draft.weaponTypeMelee
          : null,
        weaponTypeRanged: classEquipmentWeaponProfile(
          getClassById(classId)?.equipment ?? '',
        ).hasRanged
          ? draft.weaponTypeRanged
          : null,
        spellIds:
          classEquipmentHasSpells(getClassById(classId)?.equipment ?? '')
            ? draft.spellIds.filter((id) => validSpellId.has(id))
            : [],
        currentHp,
        reacted: existing?.reacted ?? false,
        activated: existing?.activated ?? false,
      }
      if (editingId) {
        return prev.map((p) => (p.id === editingId ? row : p))
      }
      return [...prev, row]
    })
  }, [canSaveCharacter, draft, editingId])

  const toggleRoundState = useCallback(
    (id: string, key: 'reacted' | 'activated') => {
      setCharacters((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [key]: !c[key] } : c)),
      )
    },
    [],
  )

  const setCharacterHp = useCallback((id: string, hp: number) => {
    setCharacters((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        const maxHp = getClassById(c.classId)?.health ?? Math.max(1, c.currentHp)
        const next = Math.max(0, Math.min(maxHp, Math.round(hp)))
        return { ...c, currentHp: next }
      }),
    )
  }, [])

  const saveAndReturn = useCallback(() => {
    persistCharacter()
    goToRoster()
  }, [persistCharacter, goToRoster])

  const saveAndAddAnother = useCallback(() => {
    persistCharacter()
    setEditingId(null)
    setDraft(emptyDraft())
    setStep('sheet')
    setTraitFilter('')
    setWeaponTraitFilter('')
    setSpellFilter('')
  }, [persistCharacter])

  const removeCharacter = useCallback((id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const clearRoster = useCallback(() => {
    setCharacters([])
  }, [])

  const wizardStepTotal = useMemo(
    () =>
      3 +
      (classHasWeaponsAccess ? 1 : 0) +
      (classHasSpellsAccess ? 1 : 0),
    [classHasWeaponsAccess, classHasSpellsAccess],
  )

  const wizardStepNum =
    step === 'name'
      ? 1
      : step === 'class'
        ? 2
        : step === 'characteristics'
          ? 3
          : step === 'weaponTraits'
            ? 4
            : step === 'spells'
              ? classHasWeaponsAccess
                ? 5
                : 4
              : 1

  const progress =
    step === 'sheet'
      ? 100
      : (wizardProgressIndex(step, classHasWeaponsAccess) /
          wizardStepTotal) *
        100

  const topbarForceNameControls =
    editingForceName ? (
      <div
        className="topbar__force-edit"
        role="group"
        aria-label="Edit team name"
      >
        <input
          ref={topbarForceNameInputRef}
          id="topbar-force-name"
          className="topbar__force-input"
          type="text"
          autoComplete="off"
          maxLength={120}
          placeholder="Team name…"
          title="Click outside or Enter to save · Esc to undo"
          value={forceNameDraft}
          onChange={(e) => setForceNameDraft(e.target.value)}
          onBlur={(e) => {
            if (topbarForceBlurSkipRef.current) {
              topbarForceBlurSkipRef.current = false
              return
            }
            const raw = e.currentTarget.value
            queueMicrotask(() => {
              setForceName(normalizeForceName(raw))
              setEditingForceName(false)
            })
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              ;(e.currentTarget as HTMLInputElement).blur()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              topbarForceBlurSkipRef.current = true
              setForceNameDraft(forceName)
              setEditingForceName(false)
            }
          }}
        />
      </div>
    ) : (
      <button
        type="button"
        className={`topbar__force-trigger${forceName.trim() ? '' : ' topbar__force-trigger--empty'}`}
        onClick={() => {
          setSheetForceEditOpen(false)
          setSheetCharNameEditOpen(false)
          setForceNameDraft(forceName)
          setEditingForceName(true)
        }}
        title="Edit team name"
      >
        {forceName.trim() || FORCE_NAME_EMPTY_LABEL}
      </button>
    )

  return (
    <div className="app">
      <div className="app__bg" aria-hidden="true">
        <div className="app__grid" />
        <div className="app__glow" />
      </div>

      <header className="topbar">
        <div className="topbar__left">
          {view === 'wizard' && step !== 'sheet' && !editingId ? (
            <button
              type="button"
              className="btn btn--ghost btn--small topbar__back"
              onClick={() => setStep('sheet')}
              aria-label="Back to sheet"
              title="Back to sheet"
            >
              ←
            </button>
          ) : null}
          <div className="topbar__brand">
            <img
              className="topbar__logo"
              src={`${import.meta.env.BASE_URL}cs-logo.png`}
              alt="Cyber Savage"
            />
            <div>
              <h1 className="topbar__title">Force Builder</h1>
            </div>
          </div>
        </div>
        {view === 'wizard' ? (
          <>
            <div className="topbar__progress" role="presentation">
              <div
                className="topbar__progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="topbar__cluster" aria-live="polite">
              {topbarForceNameControls}
              <button
                type="button"
                className="btn btn--ghost topbar__roster-btn"
                onClick={goToRoster}
              >
                All characters
              </button>
            </div>
          </>
        ) : view === 'roster' ? (
          <div className="topbar__cluster" aria-live="polite">
            {topbarForceNameControls}
            <span className="topbar__roster-sep" aria-hidden="true">
              ·
            </span>
            <span className="topbar__character-count">
              {characters.length}{' '}
              {characters.length === 1 ? 'character' : 'characters'}
            </span>
          </div>
        ) : null}
      </header>

      <main
        className={
          view === 'wizard' && step === 'name' ? 'main main--intro' : 'main'
        }
        style={
          classPickerReservePx > 0
            ? { paddingBottom: `calc(1.5rem + ${classPickerReservePx}px)` }
            : undefined
        }
      >
        {view === 'roster' && (
          <div className="roster">
            <div className="roster__top-split">
              <section
                className={`force-budget${rosterPointsRemaining < 0 ? ' force-budget--over' : ''}`}
                aria-labelledby="force-budget-title"
              >
              <div className="force-budget__head">
                <h2 id="force-budget-title" className="force-budget__title">
                  Force points
                </h2>
                <span className="force-budget__value" aria-live="polite">
                  {rosterPointsUsed} / {forcePointBudget}
                </span>
              </div>
              <p className="force-budget__lead">
                Each character costs points equal to their class level. Set
                your force’s total budget, then build within it.
              </p>
              <label className="force-budget__slider-label" htmlFor="force-point-budget">
                Budget ({FORCE_POINT_BUDGET_MIN}–{FORCE_POINT_BUDGET_MAX})
              </label>
              <div className="force-budget__slider-row">
                <div className="stepper" role="group" aria-label="Force point budget">
                  <button
                    type="button"
                    className="stepper__btn"
                    onClick={() =>
                      setForcePointBudget((n) =>
                        stepInt(n, FORCE_POINT_BUDGET_MIN, FORCE_POINT_BUDGET_MAX, -1),
                      )
                    }
                    disabled={forcePointBudget <= FORCE_POINT_BUDGET_MIN}
                    aria-label="Decrease budget"
                  >
                    –
                  </button>
                  <output
                    id="force-point-budget"
                    className="stepper__value force-budget__slider-num"
                    aria-live="polite"
                  >
                    {forcePointBudget}
                  </output>
                  <button
                    type="button"
                    className="stepper__btn"
                    onClick={() =>
                      setForcePointBudget((n) =>
                        stepInt(n, FORCE_POINT_BUDGET_MIN, FORCE_POINT_BUDGET_MAX, 1),
                      )
                    }
                    disabled={forcePointBudget >= FORCE_POINT_BUDGET_MAX}
                    aria-label="Increase budget"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="force-budget__meter" aria-hidden="true">
                <div
                  className="force-budget__meter-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      (rosterPointsUsed / Math.max(1, forcePointBudget)) * 100,
                    )}%`,
                  }}
                />
              </div>
              {rosterPointsRemaining < 0 ? (
                <p className="force-budget__warn" role="status">
                  Roster is {Math.abs(rosterPointsRemaining)} point
                  {Math.abs(rosterPointsRemaining) === 1 ? '' : 's'} over this
                  budget. Raise the budget or edit/remove characters.
                </p>
              ) : (
                <p className="force-budget__remain">
                  {rosterPointsRemaining} point
                  {rosterPointsRemaining === 1 ? '' : 's'} remaining.
                </p>
              )}
            </section>

            <section
              className={`combat-discipline${selectedCombatDisciplineId ? ' combat-discipline--has-icon' : ''}`}
              aria-labelledby="combat-discipline-title"
            >
              {selectedCombatDisciplineId ? (
                <img
                  className="combat-discipline__corner-icon"
                  src={getCombatDisciplineIconUrl(selectedCombatDisciplineId)}
                  alt=""
                  decoding="async"
                />
              ) : null}
              <div className="combat-discipline__body">
                <div className="combat-discipline__head">
                  <h2
                    id="combat-discipline-title"
                    className="combat-discipline__title"
                  >
                    Combat discipline
                  </h2>
                  <button
                    type="button"
                    className="btn btn--ghost btn--small combat-discipline__rules-toggle"
                    aria-expanded={combatDisciplineRulesOpen}
                    aria-controls="combat-discipline-rules"
                    onClick={() =>
                      setCombatDisciplineRulesOpen((open) => !open)
                    }
                  >
                    <span
                      className={`combat-discipline__chevron${combatDisciplineRulesOpen ? ' combat-discipline__chevron--open' : ''}`}
                      aria-hidden="true"
                    />
                    {combatDisciplineRulesOpen ? 'Hide rules' : 'Show rules'}
                  </button>
                </div>
                <p className="combat-discipline__lead">
                  {selectedCombatDisciplineId
                    ? COMBAT_DISCIPLINES[selectedCombatDisciplineId].flavorText
                    : 'Pick one discipline for this entire force. It applies to every character on the roster.'}
                </p>
                <label className="field combat-discipline__field">
                  <span className="field__label">Discipline</span>
                  <select
                    id="combat-discipline-select"
                    className="field__input field__select combat-discipline__select"
                    value={combatDisciplineId ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      setCombatDisciplineId(v === '' ? null : v)
                    }}
                  >
                    <option value="">—</option>
                    {COMBAT_DISCIPLINE_IDS.map((id) => (
                      <option key={id} value={id}>
                        {COMBAT_DISCIPLINES[id].title}
                      </option>
                    ))}
                  </select>
                </label>
                <div
                  id="combat-discipline-rules"
                  role="region"
                  aria-labelledby="combat-discipline-title"
                  hidden={!combatDisciplineRulesOpen}
                  className="combat-discipline__detail"
                >
                  <CombatDisciplinePanel
                    doc={getCombatDiscipline(combatDisciplineId)}
                  />
                </div>
              </div>
            </section>
            </div>

            <div className="roster__head">
              <div>
                <p className="roster__lead">
                  Add or edit your force.
                </p>
              </div>
              {characters.length > 0 && (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={startNewCharacter}
                  disabled={rosterPointsRemaining <= 0}
                  title={
                    rosterPointsRemaining <= 0
                      ? 'Force point budget is full — edit or remove a character to add another.'
                      : undefined
                  }
                >
                  Add character
                </button>
              )}
            </div>

            {characters.length === 0 ? (
              <div className="roster__empty">
                <p>No characters yet.</p>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={startNewCharacter}
                  disabled={rosterPointsRemaining <= 0}
                  title={
                    rosterPointsRemaining <= 0
                      ? 'Force point budget is full — raise the budget in Force points above.'
                      : undefined
                  }
                >
                  Build your character
                </button>
              </div>
            ) : (
              <ul className="roster__grid" role="list">
                {characters.map((c) => (
                  <li key={c.id}>
                    <RosterCard
                      character={c}
                      onNavigateToEditor={(target) =>
                        openCharacterEditor(c, target)
                      }
                      onRemove={() => removeCharacter(c.id)}
                      onToggleReacted={() => toggleRoundState(c.id, 'reacted')}
                      onToggleActivated={() =>
                        toggleRoundState(c.id, 'activated')
                      }
                      onHpChange={(hp) => setCharacterHp(c.id, hp)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {view === 'wizard' && step === 'name' && (
          <section className="panel setup-force" aria-labelledby="step-name">
            <p className="panel__kicker">
              {editingId ? 'Edit — ' : ''}Step {wizardStepNum} of{' '}
              {wizardStepTotal}
            </p>
            <h2 id="step-name" className="panel__title">
              Name this character
            </h2>
            <p className="panel__lead">
              Naming your character is the most important part of laser-sorcery. Make it count.
            </p>
            <label className="field">
              <span className="field__label">Character name</span>
              <input
                className="field__input"
                type="text"
                autoComplete="off"
                placeholder="e.g. Crabaton, Quorthon"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
              />
            </label>
          </section>
        )}

        {view === 'wizard' && step === 'class' && (
          <section
            className="panel panel--class-step"
            aria-labelledby="step-class"
          >
            <p className="panel__kicker">
              {editingId ? 'Edit — ' : ''}Step {wizardStepNum} of{' '}
              {wizardStepTotal}
            </p>
            <h2 id="step-class" className="panel__title">
              Choose a class
            </h2>
            <p
              className={`force-points-hint${!withinForceBudget ? ' force-points-hint--over' : ''}`}
              aria-live="polite"
            >
              <span className="force-points-hint__label">This force: </span>
              {projectedWizardPoints} / {forcePointBudget} points used
              {draft.classId ? (
                <>
                  {' '}
                  ({wizardPointsRemaining >= 0 ? `${wizardPointsRemaining} left` : `${Math.abs(wizardPointsRemaining)} over budget`})
                </>
              ) : (
                <span className="force-points-hint__muted">
                  {' '}
                  — select a class to see this character’s cost
                </span>
              )}
            </p>
            <div
              ref={classChartPickRef}
              className="class-chart-stack"
              role="group"
              aria-label="Choose class by level"
            >
              {Array.from(
                { length: CLASS_TIER_MAX - CLASS_TIER_MIN + 1 },
                (_, i) => {
                  const lv = CLASS_TIER_MIN + i
                  const atTier = GAME_CLASSES.filter((c) => c.level === lv)
                  const selectedId =
                    draft.level === lv && draft.classId ? draft.classId : null
                  return (
                    <ClassLevelChartDropdown
                      key={lv}
                      level={lv}
                      classes={atTier}
                      selectedId={selectedId}
                      isOpen={classChartOpenLevel === lv}
                      panelRef={
                        classChartOpenLevel === lv
                          ? classPickerOpenPanelRef
                          : undefined
                      }
                      onToggle={() =>
                        setClassChartOpenLevel((o) => (o === lv ? null : lv))
                      }
                      onSelect={(c) => {
                        setDraft((d) => ({
                          ...d,
                          classId: c.id,
                          level: lv,
                        }))
                        setClassChartOpenLevel(null)
                      }}
                      onClearThisTier={() => {
                        setDraft((d) => {
                          if (d.level !== lv) return d
                          return {
                            ...d,
                            classId: null,
                            level: CLASS_TIER_MIN,
                          }
                        })
                        setClassChartOpenLevel(null)
                      }}
                      hasSelectionForThisTier={
                        draft.level === lv && draft.classId !== null
                      }
                    />
                  )
                },
              )}
            </div>
            {selectedClass ? (
              <p className="panel__hint">{selectedClass.tagline}</p>
            ) : null}
          </section>
        )}

        {view === 'wizard' && step === 'characteristics' && (
          <section className="panel panel--traits" aria-labelledby="step-traits">
            <p className="panel__kicker">
              {editingId ? 'Edit — ' : ''}Step {wizardStepNum} of{' '}
              {wizardStepTotal}
            </p>
            <h2 id="step-traits" className="panel__title">
              Choose characteristics
            </h2>
            <p className="trait-counter" aria-live="polite">
              Selected {draft.characteristicIds.length} /{' '}
              {MAX_PLAYER_CHARACTERISTICS}
            </p>
            <label className="field">
              <span className="field__label">Filter</span>
              <input
                className="field__input"
                type="search"
                autoComplete="off"
                placeholder="Search by name or rule text…"
                value={traitFilter}
                onChange={(e) => setTraitFilter(e.target.value)}
              />
            </label>
            <ul className="trait-list" role="list">
              {filteredCharacteristics.map((c) => {
                const selected = draft.characteristicIds.includes(c.id)
                const atCap =
                  !selected &&
                  draft.characteristicIds.length >=
                    MAX_PLAYER_CHARACTERISTICS
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={`trait-option${selected ? ' trait-option--selected' : ''}`}
                      onClick={() => toggleCharacteristic(c.id)}
                      disabled={atCap}
                      aria-pressed={selected}
                    >
                      <span className="trait-option__name">{c.name}</span>
                      <span className="trait-option__desc">{c.description}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {view === 'wizard' &&
          step === 'weaponTraits' &&
          classHasWeaponsAccess && (
          <section
            className="panel panel--traits"
            aria-labelledby="step-weapon-traits"
          >
            <p className="panel__kicker">
              {editingId ? 'Edit — ' : ''}Step {wizardStepNum} of{' '}
              {wizardStepTotal}
            </p>
            <h2 id="step-weapon-traits" className="panel__title">
              Choose weapon traits
            </h2>
            {classWeaponProfile.hasRanged ? (
              <div
                className="weapon-type-picker"
                role="radiogroup"
                aria-labelledby="weapon-type-ranged-label"
              >
                <p id="weapon-type-ranged-label" className="field__label">
                  Ranged weapon type
                </p>
                <div className="weapon-type-picker__buttons">
                  {(['light', 'medium', 'heavy'] as const).map((w) => (
                    <button
                      key={w}
                      type="button"
                      role="radio"
                      aria-checked={draft.weaponTypeRanged === w}
                      className={`weapon-type-picker__btn${
                        draft.weaponTypeRanged === w
                          ? ' weapon-type-picker__btn--selected'
                          : ''
                      }`}
                      onClick={() =>
                        setDraft((d) => ({ ...d, weaponTypeRanged: w }))
                      }
                    >
                      {formatWeaponType(w)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {classWeaponProfile.hasMelee ? (
              <div
                className="weapon-type-picker"
                role="radiogroup"
                aria-labelledby="weapon-type-melee-label"
              >
                <p id="weapon-type-melee-label" className="field__label">
                  Melee weapon type
                </p>
                <div className="weapon-type-picker__buttons">
                  {(['light', 'medium', 'heavy'] as const).map((w) => (
                    <button
                      key={w}
                      type="button"
                      role="radio"
                      aria-checked={draft.weaponTypeMelee === w}
                      className={`weapon-type-picker__btn${
                        draft.weaponTypeMelee === w
                          ? ' weapon-type-picker__btn--selected'
                          : ''
                      }`}
                      onClick={() =>
                        setDraft((d) => ({ ...d, weaponTypeMelee: w }))
                      }
                    >
                      {formatWeaponType(w)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {selectedClass ? (
              <WeaponCombatStatsBlock
                weaponTypeMelee={draft.weaponTypeMelee}
                weaponTypeRanged={draft.weaponTypeRanged}
                equipment={selectedClass.equipment}
              />
            ) : null}
            <p className="trait-counter" aria-live="polite">
              Selected {draft.weaponTraitIds.length} / {MAX_PLAYER_WEAPON_TRAITS}{' '}
              {draft.weaponTraitIds.length === 1 ? 'trait' : 'traits'}
            </p>
            <label className="field">
              <span className="field__label">Filter</span>
              <input
                className="field__input"
                type="search"
                autoComplete="off"
                placeholder="Search by name or rule text…"
                value={weaponTraitFilter}
                onChange={(e) => setWeaponTraitFilter(e.target.value)}
              />
            </label>
            <ul className="trait-list" role="list">
              {filteredWeaponTraits.map((c) => {
                const selected = draft.weaponTraitIds.includes(c.id)
                const blockedByMutual = (c.mutuallyExclusiveWith ?? []).some(
                  (bid) => draft.weaponTraitIds.includes(bid),
                )
                const atCap =
                  !selected &&
                  draft.weaponTraitIds.length >= MAX_PLAYER_WEAPON_TRAITS
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={`trait-option${selected ? ' trait-option--selected' : ''}`}
                      onClick={() => toggleWeaponTrait(c.id)}
                      disabled={!selected && (blockedByMutual || atCap)}
                      aria-pressed={selected}
                      title={
                        !selected && blockedByMutual
                          ? 'Incompatible with a trait you already selected.'
                          : !selected && atCap
                            ? `Limit reached — max ${MAX_PLAYER_WEAPON_TRAITS} weapon traits.`
                            : undefined
                      }
                    >
                      <span className="trait-option__name">{c.name}</span>
                      <span className="trait-option__desc">{c.description}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {view === 'wizard' && step === 'spells' && classHasSpellsAccess && (
          <section
            className="panel panel--traits"
            aria-labelledby="step-spells"
          >
            <p className="panel__kicker">
              {editingId ? 'Edit — ' : ''}Step {wizardStepNum} of{' '}
              {wizardStepTotal}
            </p>
            <h2 id="step-spells" className="panel__title">
              Choose spells
            </h2>
            <p className="trait-counter" aria-live="polite">
              Selected {draft.spellIds.length}
              {draft.spellIds.length === 1 ? ' spell' : ' spells'}
            </p>
            <label className="field">
              <span className="field__label">Filter</span>
              <input
                className="field__input"
                type="search"
                autoComplete="off"
                placeholder="Search by name or rule text…"
                value={spellFilter}
                onChange={(e) => setSpellFilter(e.target.value)}
              />
            </label>
            <ul className="trait-list" role="list">
              {filteredSpells.map((s) => {
                const selected = draft.spellIds.includes(s.id)
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={`trait-option${selected ? ' trait-option--selected' : ''}`}
                      onClick={() => toggleSpell(s.id)}
                      aria-pressed={selected}
                    >
                      <span className="trait-option__name">{s.name}</span>
                      <span className="trait-option__desc">{s.description}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {view === 'wizard' && step === 'sheet' && !editingId && (
          <section className="sheet" aria-labelledby="sheet-title">
            <div className="sheet__header">
              {sheetCharNameEditOpen ? (
                <div className="sheet__header-main">
                  <p className="sheet__label">Character sheet</p>
                  <h2 id="sheet-title" className="sheet__title">
                    {sheetCharNameDraft.trim() || 'Unnamed'}
                  </h2>
                </div>
              ) : (
                <button
                  type="button"
                  className="sheet__title-hit"
                  onClick={openSheetCharacterNameEdit}
                >
                  <p className="sheet__label">Character sheet</p>
                  <h2 id="sheet-title" className="sheet__title">
                    {draft.name.trim() || 'Unnamed — tap to name'}
                  </h2>
                </button>
              )}
              <div className="sheet__stamp">Draft</div>
            </div>
            <p className="sheet__tap-hint">
              Tap the title, a name, or another section to edit.
            </p>

            <div className="sheet__columns">
              <div className="sheet__col">
                <h3 className="sheet__section-title">Identity</h3>
                <dl className="sheet__dl">
                  <div>
                    <dt>Name</dt>
                    <dd className="sheet__dd-force">
                      {sheetCharNameEditOpen ? (
                        <div
                          className="sheet__force-inline"
                          role="group"
                          aria-label="Edit character name"
                        >
                          <input
                            ref={sheetCharNameInputRef}
                            className="sheet__force-input"
                            type="text"
                            autoComplete="off"
                            maxLength={120}
                            placeholder="Character name"
                            title="Click outside or Enter to save · Esc to undo"
                            value={sheetCharNameDraft}
                            onChange={(e) =>
                              setSheetCharNameDraft(e.target.value)
                            }
                            onBlur={(e) => {
                              if (sheetCharNameBlurSkipRef.current) {
                                sheetCharNameBlurSkipRef.current = false
                                return
                              }
                              const nextName = e.currentTarget.value.trim()
                              queueMicrotask(() => {
                                setDraft((d) => ({ ...d, name: nextName }))
                                setSheetCharNameEditOpen(false)
                              })
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                ;(e.currentTarget as HTMLInputElement).blur()
                              } else if (e.key === 'Escape') {
                                e.preventDefault()
                                sheetCharNameBlurSkipRef.current = true
                                setSheetCharNameDraft(draft.name)
                                setSheetCharNameEditOpen(false)
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={`sheet__tap-value${draft.name.trim() ? '' : ' sheet__tap-value--empty'}`}
                          onClick={openSheetCharacterNameEdit}
                        >
                          {draft.name.trim() || 'Tap to set'}
                        </button>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Force</dt>
                    <dd className="sheet__dd-force">
                      {sheetForceEditOpen ? (
                        <div
                          className="sheet__force-inline"
                          role="group"
                          aria-label="Edit force name"
                        >
                          <input
                            ref={sheetForceInputRef}
                            className="sheet__force-input"
                            type="text"
                            autoComplete="off"
                            maxLength={120}
                            placeholder="Team name…"
                            title="Click outside or Enter to save · Esc to undo"
                            value={sheetForceDraft}
                            onChange={(e) =>
                              setSheetForceDraft(e.target.value)
                            }
                            onBlur={(e) => {
                              if (sheetForceBlurSkipRef.current) {
                                sheetForceBlurSkipRef.current = false
                                return
                              }
                              const raw = e.currentTarget.value
                              queueMicrotask(() => {
                                setForceName(normalizeForceName(raw))
                                setSheetForceEditOpen(false)
                              })
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                ;(e.currentTarget as HTMLInputElement).blur()
                              } else if (e.key === 'Escape') {
                                e.preventDefault()
                                sheetForceBlurSkipRef.current = true
                                setSheetForceDraft(forceName)
                                setSheetForceEditOpen(false)
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={`sheet__tap-value${forceName.trim() ? '' : ' sheet__tap-value--empty'}`}
                          onClick={() => {
                            setEditingForceName(false)
                            setSheetCharNameEditOpen(false)
                            setSheetForceDraft(forceName)
                            setSheetForceEditOpen(true)
                          }}
                        >
                          {forceName.trim() || FORCE_NAME_EMPTY_LABEL}
                        </button>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Class</dt>
                    <dd>
                      <button
                        type="button"
                        className={`sheet__tap-value${selectedClass ? '' : ' sheet__tap-value--empty'}`}
                        onClick={() => navigateToEditorStep('class')}
                      >
                        {selectedClass?.name ?? 'Tap to choose'}
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt>Level</dt>
                    <dd>
                      <button
                        type="button"
                        className="sheet__tap-value"
                        onClick={() => navigateToEditorStep('class')}
                      >
                        {draft.level}
                      </button>
                    </dd>
                  </div>
                </dl>
              </div>
              <button
                type="button"
                className="sheet__col sheet__col--wide sheet__combat-hit"
                onClick={() => navigateToEditorStep('class')}
              >
                <h3 className="sheet__section-title">Combat stats</h3>
                {selectedClass ? (
                  <div className="sheet__stat-grid">
                    <div className="sheet__stat sheet__stat--filled">
                      <span className="sheet__stat-label">HP</span>
                      <span className="sheet__stat-value">
                        {selectedClass.health}
                      </span>
                    </div>
                    <div className="sheet__stat sheet__stat--filled">
                      <span className="sheet__stat-label">SPD</span>
                      <span className="sheet__stat-value">
                        {selectedClass.speed}
                      </span>
                    </div>
                    <div className="sheet__stat sheet__stat--filled">
                      <span className="sheet__stat-label">MEL</span>
                      <span className="sheet__stat-value">
                        {selectedClass.melee}
                      </span>
                    </div>
                    <div className="sheet__stat sheet__stat--filled">
                      <span className="sheet__stat-label">RNG</span>
                      <span className="sheet__stat-value">
                        {selectedClass.ranged}
                      </span>
                    </div>
                    <div className="sheet__stat sheet__stat--filled">
                      <span className="sheet__stat-label">DEF</span>
                      <span className="sheet__stat-value">
                        {selectedClass.defense}
                      </span>
                    </div>
                    <div className="sheet__stat sheet__stat--filled">
                      <span className="sheet__stat-label">WP</span>
                      <span className="sheet__stat-value">
                        {selectedClass.willpower}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="sheet__muted sheet__muted--in-hit">
                    Tap to choose a class and see combat stats.
                  </p>
                )}
              </button>
            </div>

            <div className="sheet__traits">
              <button
                type="button"
                className="sheet__section-hit"
                onClick={() => navigateToEditorStep('characteristics')}
              >
                <h3 className="sheet__section-title">Your characteristics</h3>
              </button>
              {draft.characteristicIds.length === 0 ? (
                <p className="sheet__muted">
                  Tap the heading to choose two.
                </p>
              ) : (
                <ol className="sheet__traits-list">
                  {draft.characteristicIds.map((tid) => {
                    const t = getCharacteristicById(tid)
                    return (
                      <li key={tid}>
                        <strong className="sheet__trait-name">
                          {t?.name ?? tid}
                        </strong>
                        <p className="sheet__muted sheet__trait-body">
                          {t?.description ?? '—'}
                        </p>
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>

            {selectedClass &&
              classEquipmentHasWeapons(selectedClass.equipment) && (
                <div className="sheet__traits">
                  <button
                    type="button"
                    className="sheet__section-hit"
                    onClick={() => navigateToEditorStep('weaponTraits')}
                  >
                    <h3 className="sheet__section-title">Weapon</h3>
                  </button>
                  <div className="sheet__weapon-type-row">
                    <span className="sheet__weapon-type-value">
                      {classEquipmentWeaponProfile(selectedClass.equipment).hasMelee
                        ? `Melee: ${
                            draft.weaponTypeMelee
                              ? formatWeaponType(draft.weaponTypeMelee)
                              : '—'
                          }`
                        : 'Melee: —'}
                    </span>
                    <span className="sheet__weapon-type-value sheet__weapon-type-value--end">
                      {classEquipmentWeaponProfile(selectedClass.equipment).hasRanged
                        ? `Ranged: ${
                            draft.weaponTypeRanged
                              ? formatWeaponType(draft.weaponTypeRanged)
                              : '—'
                          }`
                        : 'Ranged: —'}
                    </span>
                  </div>
                  <WeaponCombatStatsBlock
                    weaponTypeMelee={draft.weaponTypeMelee}
                    weaponTypeRanged={draft.weaponTypeRanged}
                    equipment={selectedClass.equipment}
                    className="weapon-combat-stats--sheet"
                  />
                  {draft.weaponTraitIds.length === 0 ? (
                    <p className="sheet__muted">
                      No traits yet — tap the heading to add weapon options.
                    </p>
                  ) : (
                    <ol className="sheet__traits-list">
                      {draft.weaponTraitIds.map((tid) => {
                        const t = getWeaponTraitById(tid)
                        return (
                          <li key={tid}>
                            <strong className="sheet__trait-name">
                              {t?.name ?? tid}
                            </strong>
                            <p className="sheet__muted sheet__trait-body">
                              {t?.description ?? '—'}
                            </p>
                          </li>
                        )
                      })}
                    </ol>
                  )}
                </div>
              )}

            {selectedClass &&
              classEquipmentHasSpells(selectedClass.equipment) && (
                <div className="sheet__traits">
                  <button
                    type="button"
                    className="sheet__section-hit"
                    onClick={() => navigateToEditorStep('spells')}
                  >
                    <h3 className="sheet__section-title">Spells</h3>
                  </button>
                  {draft.spellIds.length === 0 ? (
                    <p className="sheet__muted">
                      None yet — tap the heading to choose spells.
                    </p>
                  ) : (
                    <ol className="sheet__traits-list">
                      {draft.spellIds.map((sid) => {
                        const s = getSpellById(sid)
                        return (
                          <li key={sid}>
                            <strong className="sheet__trait-name">
                              {s?.name ?? sid}
                            </strong>
                            <p className="sheet__muted sheet__trait-body sheet__trait-body--pre">
                              {s?.description ?? '—'}
                            </p>
                          </li>
                        )
                      })}
                    </ol>
                  )}
                </div>
              )}
          </section>
        )}
      </main>

      <footer className="actions">
        {view === 'roster' && (
          <>
            {characters.length > 0 && (
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  if (
                    window.confirm(
                      'Remove every character from this roster? This cannot be undone.',
                    )
                  ) {
                    clearRoster()
                  }
                }}
              >
                Clear roster
              </button>
            )}
            <div className="actions__spacer" />
          </>
        )}

        {view === 'wizard' && step !== 'sheet' && (
          <>
            {editingId ? (
              <>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={goToRoster}
                >
                  Cancel
                </button>
                <div className="actions__spacer" />
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={saveAndReturn}
                  disabled={!canSaveCharacter}
                >
                  Save changes
                </button>
              </>
            ) : (
              <>
                <div className="actions__spacer" />
              </>
            )}
          </>
        )}

        {view === 'wizard' && step === 'sheet' && !editingId && (
          <>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={saveAndAddAnother}
              disabled={!canSaveCharacter}
            >
              Save &amp; add another
            </button>
            <div className="actions__spacer" />
            <button
              type="button"
              className="btn btn--primary"
              onClick={saveAndReturn}
              disabled={!canSaveCharacter}
            >
              Save &amp; let the violence begin
            </button>
          </>
        )}
      </footer>
    </div>
  )
}

function RosterCard({
  character,
  onNavigateToEditor,
  onRemove,
  onToggleReacted,
  onToggleActivated,
  onHpChange,
}: {
  character: Character
  onNavigateToEditor: (target: Step) => void
  onRemove: () => void
  onToggleReacted: () => void
  onToggleActivated: () => void
  onHpChange: (hp: number) => void
}) {
  const [expandedWhileDown, setExpandedWhileDown] = useState(false)

  useEffect(() => {
    if (character.currentHp > 0) setExpandedWhileDown(false)
  }, [character.currentHp])

  const cls = getClassById(character.classId)
  const maxHp = cls?.health ?? Math.max(1, character.currentHp)
  const hpPct = maxHp > 0 ? (character.currentHp / maxHp) * 100 : 0
  const dangerHp = hpPct > 0 && hpPct <= 25
  const lowHp = hpPct > 0 && hpPct <= 50
  const critHp = character.currentHp <= 0
  const sheetMinimized = critHp && !expandedWhileDown

  return (
    <article
      className={`char-card${sheetMinimized ? ' char-card--minimized' : ''}`}
    >
      <div className="char-card__top">
        <button
          type="button"
          className="char-card__name-hit"
          onClick={() => onNavigateToEditor('name')}
          aria-label={`Edit name for ${character.name}`}
        >
          <h3 className="char-card__name">{character.name}</h3>
        </button>
        <button
          type="button"
          className="char-card__class char-card__class--hit"
          onClick={() => onNavigateToEditor('class')}
          aria-label={`Edit class for ${character.name}`}
        >
          {cls?.name ?? character.classId}
        </button>
        <div className="char-card__head-meta">
          {sheetMinimized ? (
            <span className="char-card__down-badge">Slain</span>
          ) : null}
          <ClassIconBadge
            classId={character.classId}
            name={cls?.name ?? character.classId}
            size="roster"
          />
          <span className="char-card__level">Lv {character.level}</span>
        </div>
      </div>

      <div className="char-card__health">
        <div className="char-card__health-row">
          <span className="char-card__health-label">Health</span>
          <span className="char-card__health-numbers">
            {character.currentHp} / {maxHp}
          </span>
        </div>
        <div className="char-card__health-track" aria-hidden="true">
          <div
            className={`char-card__health-fill${
              critHp
                ? ' char-card__health-fill--empty'
                : dangerHp
                  ? ' char-card__health-fill--danger'
                  : lowHp
                    ? ' char-card__health-fill--low'
                    : ''
            }`}
            style={{ width: `${Math.min(100, Math.max(0, hpPct))}%` }}
          />
        </div>
        <div className="stepper stepper--wide" role="group" aria-label={`${character.name} health`}>
          <button
            type="button"
            className="stepper__btn"
            onClick={() => onHpChange(stepInt(character.currentHp, 0, maxHp, -1))}
            disabled={character.currentHp <= 0}
            aria-label="Decrease health"
          >
            –
          </button>
          <output className="stepper__value" aria-live="polite">
            {character.currentHp} / {maxHp}
          </output>
          <button
            type="button"
            className="stepper__btn"
            onClick={() => onHpChange(stepInt(character.currentHp, 0, maxHp, 1))}
            disabled={character.currentHp >= maxHp}
            aria-label="Increase health"
          >
            +
          </button>
        </div>
      </div>

      {!sheetMinimized && (
        <button
          type="button"
          className="char-card__stats char-card__stats--hit"
          aria-label={`Edit class and combat stats for ${character.name}`}
          onClick={() => onNavigateToEditor('class')}
        >
          {cls ? (
            <>
              <span>HP {cls.health}</span>
              <span>SPD {cls.speed}</span>
              <span>MEL {cls.melee}</span>
              <span>RNG {cls.ranged}</span>
              <span>DEF {cls.defense}</span>
              <span>WP {cls.willpower}</span>
            </>
          ) : (
            <>
              <span>HP</span>
              <span>SPD</span>
              <span>MEL</span>
              <span>RNG</span>
              <span>DEF</span>
              <span>WP</span>
            </>
          )}
        </button>
      )}

      {!sheetMinimized && (
        <section
          className="char-card__characteristics char-card__sheet-tap"
          aria-label="Characteristics"
          role="button"
          tabIndex={0}
          onClick={() => onNavigateToEditor('characteristics')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onNavigateToEditor('characteristics')
            }
          }}
        >
          <h4 className="char-card__section-title">Characteristics</h4>
          {character.characteristicIds.length === 0 ? (
            <p className="char-card__traits char-card__traits--empty">
              None on file — tap here to choose two.
            </p>
          ) : (
            <ul className="char-card__trait-list">
              {character.characteristicIds.map((id) => {
                const t = getCharacteristicById(id)
                return (
                  <li key={id} className="char-card__trait-item">
                    <span className="char-card__trait-name">
                      {t?.name ?? id}
                    </span>
                    <p className="char-card__trait-desc">
                      {t?.description ?? '—'}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      {!sheetMinimized &&
        cls &&
        classEquipmentHasWeapons(cls.equipment) && (
          <section
            className="char-card__characteristics char-card__sheet-tap"
            aria-label="Weapon"
            role="button"
            tabIndex={0}
            onClick={() => onNavigateToEditor('weaponTraits')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onNavigateToEditor('weaponTraits')
              }
            }}
          >
            <h4 className="char-card__section-title">Weapon</h4>
            <p className="char-card__weapon-type">
              <span className="char-card__weapon-type-value">
                {classEquipmentWeaponProfile(cls.equipment).hasMelee
                  ? `Melee: ${
                      character.weaponTypeMelee
                        ? formatWeaponType(character.weaponTypeMelee)
                        : '—'
                    }`
                  : 'Melee: —'}
              </span>
              <span className="char-card__weapon-type-value char-card__weapon-type-value--end">
                {classEquipmentWeaponProfile(cls.equipment).hasRanged
                  ? `Ranged: ${
                      character.weaponTypeRanged
                        ? formatWeaponType(character.weaponTypeRanged)
                        : '—'
                    }`
                  : 'Ranged: —'}
              </span>
            </p>
            <WeaponCombatStatsBlock
              weaponTypeMelee={character.weaponTypeMelee}
              weaponTypeRanged={character.weaponTypeRanged}
              equipment={cls.equipment}
              className="weapon-combat-stats--card"
            />
            {character.weaponTraitIds.length === 0 ? (
              <p className="char-card__traits char-card__traits--empty">
                No traits — tap here to add.
              </p>
            ) : (
              <ul className="char-card__trait-list">
                {character.weaponTraitIds.map((id) => {
                  const t = getWeaponTraitById(id)
                  return (
                    <li key={id} className="char-card__trait-item">
                      <span className="char-card__trait-name">
                        {t?.name ?? id}
                      </span>
                      <p className="char-card__trait-desc">
                        {t?.description ?? '—'}
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}

      {!sheetMinimized &&
        cls &&
        classEquipmentHasSpells(cls.equipment) && (
          <section
            className="char-card__characteristics char-card__sheet-tap"
            aria-label="Spells"
            role="button"
            tabIndex={0}
            onClick={() => onNavigateToEditor('spells')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onNavigateToEditor('spells')
              }
            }}
          >
            <h4 className="char-card__section-title">Spells</h4>
            {character.spellIds.length === 0 ? (
              <p className="char-card__traits char-card__traits--empty">
                None selected — tap here to add.
              </p>
            ) : (
              <ul className="char-card__trait-list">
                {character.spellIds.map((id) => {
                  const s = getSpellById(id)
                  return (
                    <li key={id} className="char-card__trait-item">
                      <span className="char-card__trait-name">
                        {s?.name ?? id}
                      </span>
                      <p className="char-card__trait-desc char-card__trait-desc--pre">
                        {s?.description ?? '—'}
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}

      <div className="char-card__round" role="group" aria-label="Round state">
        <button
          type="button"
          className={`state-pill${character.reacted ? ' state-pill--on' : ''}`}
          onClick={onToggleReacted}
          aria-pressed={character.reacted}
        >
          Reacted
        </button>
        <button
          type="button"
          className={`state-pill${character.activated ? ' state-pill--on state-pill--activated' : ''}`}
          onClick={onToggleActivated}
          aria-pressed={character.activated}
        >
          Activated
        </button>
      </div>
      <div className="char-card__actions">
        {sheetMinimized ? (
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => setExpandedWhileDown(true)}
          >
            Expand sheet
          </button>
        ) : null}
        {critHp && expandedWhileDown ? (
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => setExpandedWhileDown(false)}
          >
            Minimize
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn--danger btn--small"
          onClick={() => {
            if (
              window.confirm(
                `Remove ${character.name} from the roster?`,
              )
            ) {
              onRemove()
            }
          }}
        >
          Remove
        </button>
      </div>
    </article>
  )
}

export default App
