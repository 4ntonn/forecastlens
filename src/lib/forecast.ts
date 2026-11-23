/**
 * Forecast track record, stored locally (localStorage). No account needed.
 * Brier score = (probability - outcome)^2; lower is better. A perfect
 * forecaster scores 0, always saying 50% scores 0.25.
 */

export interface SavedForecast {
  id: string
  question: string
  probabilityPct: number // 0..100, for YES
  engine: 'on-device' | 'cloud' | 'hybrid'
  createdAt: number
  resolvedAt: number | null
  outcome: boolean | null // true = YES happened, false = NO happened
}

const KEY = 'forecastlens.track-record.v1'

export function loadRecord(): SavedForecast[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedForecast[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveForecast(f: Omit<SavedForecast, 'id' | 'resolvedAt' | 'outcome'>): SavedForecast {
  const entry: SavedForecast = {
    ...f,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    outcome: null,
    resolvedAt: null,
  }
  const all = [entry, ...loadRecord()]
  localStorage.setItem(KEY, JSON.stringify(all))
  return entry
}

export function resolveForecast(id: string, outcome: boolean): void {
  const all = loadRecord().map((f) =>
    f.id === id ? { ...f, outcome, resolvedAt: Date.now() } : f,
  )
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function deleteForecast(id: string): void {
  localStorage.setItem(
    KEY,
    JSON.stringify(loadRecord().filter((f) => f.id !== id)),
  )
}

export function brierScore(f: SavedForecast): number | null {
  if (f.outcome === null) return null
  const p = f.probabilityPct / 100
  return (p - (f.outcome ? 1 : 0)) ** 2
}

/** Mean Brier over resolved forecasts; null when nothing is resolved yet. */
export function meanBrier(all: SavedForecast[]): number | null {
  const scored = all
    .map(brierScore)
    .filter((s): s is number => s !== null)
  if (scored.length === 0) return null
  return scored.reduce((a, b) => a + b, 0) / scored.length
}
