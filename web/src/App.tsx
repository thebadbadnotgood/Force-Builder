import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CLASS_TIER_MAX,
  CLASS_TIER_MIN,
  GAME_CLASSES,
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
  getWeaponTraitById,
  isWeaponTraitCompatibleWithEquipment,
} from './weaponTraits'
import {
  SPELLS,
  classEquipmentHasSpells,
  getSpellById,
} from './spells'
import './App.css'

const STORAGE_KEY = 'cyber-savage-force-builder'
const STORAGE_VERSION = 6
/** Default force budget (each character costs points equal to their class tier / level). */
const DEFAULT_FORCE_POINT_BUDGET = 12
const FORCE_POINT_BUDGET_MIN = 1
const FORCE_POINT_BUDGET_MAX = 12
/** Roster / localStorage: allow legacy levels beyond sheet tiers. */
const STORED_LEVEL_MIN = 1
const STORED_LEVEL_MAX = 20

type Step =
  | 'name'
  | 'class'
  | 'characteristics'
  | 'weaponTraits'
  | 'spells'
  | 'sheet'

type Character = {
  id: string
  name: string
  classId: string
  level: number
  /** Exactly two player-chosen characteristics (ids). */
  characteristicIds: string[]
  /** Weapon traits compatible with class equipment (see `weaponTraits.ts`). */
  weaponTraitIds: string[]
  /** Spells — only for classes whose equipment includes “spell”. */
  spellIds: string[]
  /** Current hit points (0 … class max HP). */
  currentHp: number
  /** Tabletop round state — toggled on the roster card. */
  reacted: boolean
  activated: boolean
}

type WizardDraft = {
  name: string
  classId: string | null
  level: number
  characteristicIds: string[]
  weaponTraitIds: string[]
  spellIds: string[]
}

const emptyDraft = (): WizardDraft => ({
  name: '',
  classId: null,
  level: CLASS_TIER_MIN,
  characteristicIds: [],
  weaponTraitIds: [],
  spellIds: [],
})

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
  return {
    id: o.id,
    name: o.name,
    classId: o.classId,
    level: o.level,
    characteristicIds: normalizeCharacteristicIds(o.characteristicIds),
    weaponTraitIds: normalizeWeaponTraitIds(o.weaponTraitIds),
    spellIds: normalizeSpellIds(o.spellIds),
    currentHp,
    reacted: o.reacted === true,
    activated: o.activated === true,
  }
}

function loadPersisted(): PersistedPayload {
  const empty = (): PersistedPayload => ({
    characters: [],
    forcePointBudget: DEFAULT_FORCE_POINT_BUDGET,
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
        ver === 5 ||
        ver === 4 ||
        ver === 3 ||
        ver === 2
      ) {
        const characters = (parsed as { characters: unknown[] }).characters
          .map(normalizeCharacter)
          .filter((c): c is Character => c !== null)
        return { characters, forcePointBudget }
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
              spellIds: [],
              currentHp: getClassById(classId)?.health ?? 10,
            },
          ],
          forcePointBudget,
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
}

function savePersisted(payload: PersistedPayload) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: STORAGE_VERSION,
      characters: payload.characters,
      forcePointBudget: payload.forcePointBudget,
    }),
  )
}

/** Sum of class-tier points for the roster (each character’s `level` is their cost). */
function totalForcePointsUsed(characters: Character[]): number {
  return characters.reduce((sum, c) => sum + c.level, 0)
}

/**
 * Projected points if the current draft is saved: roster minus the character being
 * edited, plus the draft’s tier cost when a class is selected.
 */
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

function App() {
  const [view, setView] = useState<'roster' | 'wizard'>('roster')
  const [initialPersisted] = useState(loadPersisted)
  const [characters, setCharacters] = useState(initialPersisted.characters)
  const [forcePointBudget, setForcePointBudget] = useState(
    initialPersisted.forcePointBudget,
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<WizardDraft>(emptyDraft)
  const [step, setStep] = useState<Step>('name')
  const [traitFilter, setTraitFilter] = useState('')
  const [weaponTraitFilter, setWeaponTraitFilter] = useState('')
  const [spellFilter, setSpellFilter] = useState('')

  useEffect(() => {
    savePersisted({ characters, forcePointBudget })
  }, [characters, forcePointBudget])

  const rosterPointsUsed = useMemo(
    () => totalForcePointsUsed(characters),
    [characters],
  )
  const rosterPointsRemaining = forcePointBudget - rosterPointsUsed

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
      if (weaponSame && spellSame) return d
      return { ...d, weaponTraitIds: nextWeapon, spellIds: nextSpell }
    })
  }, [draft.classId])

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
    withinForceBudget

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
  }, [classHasWeaponsAccess, selectedClass?.equipment, weaponTraitFilter])

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

  const goNext = useCallback(() => {
    if (step === 'name' && canAdvanceName) setStep('class')
    else if (step === 'class' && canAdvanceClassStep) {
      setTraitFilter('')
      setWeaponTraitFilter('')
      setSpellFilter('')
      setStep('characteristics')
    } else if (step === 'characteristics' && canAdvanceCharacteristicsStep) {
      setWeaponTraitFilter('')
      setSpellFilter('')
      if (classHasWeaponsAccess) setStep('weaponTraits')
      else if (classHasSpellsAccess) setStep('spells')
      else setStep('sheet')
    } else if (step === 'weaponTraits') {
      setSpellFilter('')
      if (
        selectedClass &&
        classEquipmentHasSpells(selectedClass.equipment)
      ) {
        setStep('spells')
      } else {
        setStep('sheet')
      }
    } else if (step === 'spells') setStep('sheet')
  }, [
    step,
    canAdvanceName,
    canAdvanceClassStep,
    canAdvanceCharacteristicsStep,
    selectedClass,
    classHasWeaponsAccess,
    classHasSpellsAccess,
  ])

  const goBack = useCallback(() => {
    if (step === 'class') setStep('name')
    else if (step === 'characteristics') setStep('class')
    else if (step === 'weaponTraits') setStep('characteristics')
    else if (step === 'spells')
      setStep(classHasWeaponsAccess ? 'weaponTraits' : 'characteristics')
    else if (step === 'sheet') {
      if (
        selectedClass &&
        classEquipmentHasSpells(selectedClass.equipment)
      ) {
        setStep('spells')
      } else if (classHasWeaponsAccess) {
        setStep('weaponTraits')
      } else {
        setStep('characteristics')
      }
    }
  }, [step, selectedClass, classHasWeaponsAccess, classHasSpellsAccess])

  const startNewCharacter = useCallback(() => {
    setEditingId(null)
    setDraft(emptyDraft())
    setStep('name')
    setTraitFilter('')
    setWeaponTraitFilter('')
    setSpellFilter('')
    setView('wizard')
  }, [])

  const startEditCharacter = useCallback((c: Character) => {
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
      spellIds: [...c.spellIds],
    })
    setTraitFilter('')
    setWeaponTraitFilter('')
    setSpellFilter('')
    setStep('name')
    setView('wizard')
  }, [])

  const goToRoster = useCallback(() => {
    setView('roster')
    setEditingId(null)
    setDraft(emptyDraft())
    setStep('name')
    setTraitFilter('')
    setWeaponTraitFilter('')
    setSpellFilter('')
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
    setStep('name')
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

  return (
    <div className="app">
      <div className="app__bg" aria-hidden="true">
        <div className="app__grid" />
        <div className="app__glow" />
      </div>

      <header className="topbar">
        <div className="topbar__brand">
          <img
            className="topbar__logo"
            src="/cs-logo.png"
            alt="Cyber Savage"
          />
          <div>
            <h1 className="topbar__title">Force Builder</h1>
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
            <button
              type="button"
              className="btn btn--ghost topbar__roster-btn"
              onClick={goToRoster}
            >
              All characters
            </button>
          </>
        ) : (
          <div className="topbar__count" aria-live="polite">
            {characters.length}{' '}
            {characters.length === 1 ? 'character' : 'characters'}
          </div>
        )}
      </header>

      <main className="main">
        {view === 'roster' && (
          <div className="roster">
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
                      onEdit={() => startEditCharacter(c)}
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
          <section className="panel" aria-labelledby="step-name">
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
                placeholder="e.g. Crabaton, Abaddon"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
              />
            </label>
          </section>
        )}

        {view === 'wizard' && step === 'class' && (
          <section className="panel" aria-labelledby="step-class">
            <p className="panel__kicker">
              Step {wizardStepNum} of {wizardStepTotal}
            </p>
            <h2 id="step-class" className="panel__title">
              Choose a class
            </h2>
            <p className="panel__lead">
              Each level has its own menu. Pick one archetype — choosing a class
              sets tier from that row on the sheet. A level costs that many force
              points (e.g. level 3 = 3 points toward your force budget).
            </p>
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
            <div className="class-pick-grid" role="group" aria-label="Class by level">
              {Array.from(
                { length: CLASS_TIER_MAX - CLASS_TIER_MIN + 1 },
                (_, i) => {
                  const lv = CLASS_TIER_MIN + i
                  const atTier = GAME_CLASSES.filter((c) => c.level === lv)
                  const value =
                    draft.level === lv && draft.classId ? draft.classId : ''
                  const iconSrc = value ? getClassIconUrl(value) : undefined
                  const picked = value ? getClassById(value) : undefined
                  return (
                    <div key={lv} className="class-pick-row">
                      <label
                        className="class-pick-row__label"
                        htmlFor={`class-tier-${lv}`}
                      >
                        <span className="class-pick-row__tier">Level {lv}</span>
                        <span className="class-pick-row__cost">{lv} pt{lv === 1 ? '' : 's'}</span>
                      </label>
                      <div className="class-pick-row__control">
                        {iconSrc ? (
                          <img
                            className="class-pick-row__icon"
                            src={iconSrc}
                            alt=""
                            width={48}
                            height={48}
                          />
                        ) : value ? (
                          <span
                            className="class-pick-row__icon class-pick-row__icon--initial"
                            aria-hidden="true"
                          >
                            {(picked?.name ?? '?').slice(0, 1)}
                          </span>
                        ) : (
                          <span
                            className="class-pick-row__icon class-pick-row__icon--placeholder"
                            aria-hidden="true"
                          />
                        )}
                        <select
                          id={`class-tier-${lv}`}
                          className="field__input field__select class-pick-row__select"
                          value={value}
                          onChange={(e) => {
                            const id = e.target.value
                            if (!id) {
                              setDraft((d) => {
                                if (d.level !== lv) return d
                                return {
                                  ...d,
                                  classId: null,
                                  level: CLASS_TIER_MIN,
                                }
                              })
                              return
                            }
                            const cls = getClassById(id)
                            if (cls?.level === lv) {
                              setDraft((d) => ({
                                ...d,
                                classId: id,
                                level: lv,
                              }))
                            }
                          }}
                        >
                          <option value="">— Select —</option>
                          {atTier.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
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
              Step {wizardStepNum} of {wizardStepTotal}
            </p>
            <h2 id="step-traits" className="panel__title">
              Choose characteristics
            </h2>
            <p className="panel__lead">
              Pick exactly {MAX_PLAYER_CHARACTERISTICS} from the list. Search to
              narrow options.
            </p>
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

        {view === 'wizard' && step === 'weaponTraits' && classHasWeaponsAccess && (
          <section
            className="panel panel--traits"
            aria-labelledby="step-weapon-traits"
          >
            <p className="panel__kicker">
              Step {wizardStepNum} of {wizardStepTotal}
            </p>
            <h2 id="step-weapon-traits" className="panel__title">
              Choose weapon traits
            </h2>
            <p className="panel__lead">
              Pick any traits for this character’s weapons. Options are filtered
              from your class equipment: traits that require a melee weapon
              need <code className="panel__code">mel</code> in equipment; ranged-only
              traits need <code className="panel__code">rng</code>.
            </p>
            <p className="trait-counter" aria-live="polite">
              Selected {draft.weaponTraitIds.length}
              {draft.weaponTraitIds.length === 1 ? ' trait' : ' traits'}
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
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={`trait-option${selected ? ' trait-option--selected' : ''}`}
                      onClick={() => toggleWeaponTrait(c.id)}
                      disabled={!selected && blockedByMutual}
                      aria-pressed={selected}
                      title={
                        blockedByMutual && !selected
                          ? 'Incompatible with a trait you already selected.'
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
              Step {wizardStepNum} of {wizardStepTotal}
            </p>
            <h2 id="step-spells" className="panel__title">
              Choose spells
            </h2>
            <p className="panel__lead">
              Your class equipment includes spells — pick any you want on this
              character. Search to narrow the list.
            </p>
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

        {view === 'wizard' && step === 'sheet' && (
          <section className="sheet" aria-labelledby="sheet-title">
            <div className="sheet__header">
              <div>
                <p className="sheet__label">Character sheet</p>
                <h2 id="sheet-title" className="sheet__title">
                  {draft.name.trim() || 'Unnamed'}
                </h2>
              </div>
              <div className="sheet__stamp">Draft</div>
            </div>

            <div className="sheet__columns">
              <div className="sheet__col">
                <h3 className="sheet__section-title">Identity</h3>
                <dl className="sheet__dl">
                  <div>
                    <dt>Name</dt>
                    <dd>{draft.name.trim() || '—'}</dd>
                  </div>
                  <div>
                    <dt>Class</dt>
                    <dd>{selectedClass?.name ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Level</dt>
                    <dd>{draft.level}</dd>
                  </div>
                  {selectedClass && (
                    <div>
                      <dt>Class slots</dt>
                      <dd>{selectedClass.characteristics}</dd>
                    </div>
                  )}
                </dl>
              </div>
              <div className="sheet__col sheet__col--wide">
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
                  <p className="sheet__muted">Select a class to see stats.</p>
                )}
              </div>
            </div>

            {draft.characteristicIds.length > 0 && (
              <div className="sheet__traits">
                <h3 className="sheet__section-title">Your characteristics</h3>
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
              </div>
            )}

            {selectedClass &&
              classEquipmentHasWeapons(selectedClass.equipment) &&
              draft.weaponTraitIds.length > 0 && (
              <div className="sheet__traits">
                <h3 className="sheet__section-title">Weapon traits</h3>
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
              </div>
            )}

            {selectedClass &&
              classEquipmentHasSpells(selectedClass.equipment) &&
              draft.spellIds.length > 0 && (
                <div className="sheet__traits">
                  <h3 className="sheet__section-title">Spells</h3>
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
                </div>
              )}

            {selectedClass && (
              <div className="sheet__discipline">
                <h3 className="sheet__section-title">Equipment</h3>
                <p className="sheet__discipline-name">{selectedClass.name}</p>
                <p className="sheet__muted">{selectedClass.equipment}</p>
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
            {step !== 'name' && (
              <button type="button" className="btn btn--ghost" onClick={goBack}>
                Back
              </button>
            )}
            <div className="actions__spacer" />
            <button
              type="button"
              className="btn btn--primary"
              onClick={goNext}
              disabled={
                (step === 'name' && !canAdvanceName) ||
                (step === 'class' && !canAdvanceClassStep) ||
                (step === 'characteristics' && !canAdvanceCharacteristicsStep)
              }
            >
              {(step === 'characteristics' &&
                !classHasWeaponsAccess &&
                !classHasSpellsAccess) ||
              (step === 'weaponTraits' && !classHasSpellsAccess) ||
              step === 'spells'
                ? 'Review'
                : 'Continue'}
            </button>
          </>
        )}

        {view === 'wizard' && step === 'sheet' && (
          <>
            <button type="button" className="btn btn--ghost" onClick={goBack}>
              Back
            </button>
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
  onEdit,
  onRemove,
  onToggleReacted,
  onToggleActivated,
  onHpChange,
}: {
  character: Character
  onEdit: () => void
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
  const lowHp = hpPct > 0 && hpPct <= 35
  const critHp = character.currentHp <= 0
  const sheetMinimized = critHp && !expandedWhileDown

  return (
    <article
      className={`char-card${sheetMinimized ? ' char-card--minimized' : ''}`}
    >
      <header className="char-card__head">
        <h3 className="char-card__name">{character.name}</h3>
        <div className="char-card__head-meta">
          {sheetMinimized ? (
            <span className="char-card__down-badge">Annihilated</span>
          ) : null}
          <span className="char-card__level">Lv {character.level}</span>
        </div>
      </header>
      <p className="char-card__class">{cls?.name ?? character.classId}</p>

      <div className="char-card__health">
        <div className="char-card__health-row">
          <span className="char-card__health-label">Health</span>
          <span className="char-card__health-numbers">
            {character.currentHp} / {maxHp}
          </span>
        </div>
        <div className="char-card__health-track" aria-hidden="true">
          <div
            className={`char-card__health-fill${critHp ? ' char-card__health-fill--empty' : lowHp ? ' char-card__health-fill--low' : ''}`}
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
        <section
          className="char-card__characteristics"
          aria-label="Characteristics"
        >
          <h4 className="char-card__section-title">Characteristics</h4>
          {character.characteristicIds.length === 0 ? (
            <p className="char-card__traits char-card__traits--empty">
              None on file — use <strong>Edit</strong> to choose two.
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
            className="char-card__characteristics"
            aria-label="Weapon traits"
          >
            <h4 className="char-card__section-title">Weapon traits</h4>
            {character.weaponTraitIds.length === 0 ? (
              <p className="char-card__traits char-card__traits--empty">
                None selected — use <strong>Edit</strong> to add.
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
            className="char-card__characteristics"
            aria-label="Spells"
          >
            <h4 className="char-card__section-title">Spells</h4>
            {character.spellIds.length === 0 ? (
              <p className="char-card__traits char-card__traits--empty">
                None selected — use <strong>Edit</strong> to add.
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
      {!sheetMinimized && (
        <div className="char-card__stats" aria-hidden="true">
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
        </div>
      )}
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
        <button type="button" className="btn btn--ghost btn--small" onClick={onEdit}>
          Edit
        </button>
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
