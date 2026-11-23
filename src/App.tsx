import { useCallback, useState } from 'react'
import MarketPicker from './components/MarketPicker'
import ForecastCard from './components/ForecastCard'
import TrackRecord from './components/TrackRecord'
import {
  ensureDeviceModel,
  runDeepDive,
  runQuickTake,
  runSmartAnswer,
  type AiResult,
  type QuickTake,
} from './lib/ai'
import type { Market } from './lib/polymarket'
import {
  deleteForecast,
  loadRecord,
  resolveForecast,
  saveForecast,
  type SavedForecast,
} from './lib/forecast'

export default function App() {
  const [question, setQuestion] = useState('')
  const [market, setMarket] = useState<Market | null>(null)
  const [context, setContext] = useState('')
  const [quickTake, setQuickTake] = useState<AiResult<QuickTake> | null>(null)
  const [deepDive, setDeepDive] = useState<AiResult<string> | null>(null)
  const [smartAnswer, setSmartAnswer] = useState<AiResult<string> | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [deviceNote, setDeviceNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [record, setRecord] = useState<SavedForecast[]>(() => loadRecord())

  const pickMarket = useCallback((m: Market) => {
    setMarket(m)
    setQuestion(m.question)
    setContext(m.description)
    setQuickTake(null)
    setDeepDive(null)
    setSmartAnswer(null)
    setError(null)
  }, [])

  const pickCustom = useCallback((q: string) => {
    setMarket(null)
    setQuestion(q)
    setContext('')
    setQuickTake(null)
    setDeepDive(null)
    setSmartAnswer(null)
    setError(null)
  }, [])

  const onQuickTake = async () => {
    if (!question.trim() || busy) return
    setBusy('quick')
    setError(null)
    setDeviceNote('Preparing on-device model…')
    const ok = await ensureDeviceModel((pct) =>
      setDeviceNote(`Downloading on-device model… ${pct}%`),
    )
    if (!ok) {
      setDeviceNote(
        'On-device model is not available in this browser (needs Chrome 139+ desktop with Gemini Nano). Use Deep Dive or Smart Answer instead — they fall back to the cloud.',
      )
      setBusy(null)
      return
    }
    setDeviceNote('On-device model ready.')
    try {
      setQuickTake(await runQuickTake(question.trim(), context.trim()))
    } catch (e) {
      setError(`Quick Take failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(null)
    }
  }

  const onDeepDive = async () => {
    if (!question.trim() || busy) return
    setBusy('deep')
    setError(null)
    try {
      setDeepDive(
        await runDeepDive(
          question.trim(),
          context.trim(),
          market
            ? { volume24h: market.volume24h, yesPrice: market.yesPrice }
            : null,
          quickTake?.data ?? null,
        ),
      )
    } catch (e) {
      setError(`Deep Dive failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(null)
    }
  }

  const onSmartAnswer = async () => {
    if (!question.trim() || busy) return
    setBusy('smart')
    setError(null)
    try {
      setSmartAnswer(
        await runSmartAnswer(
          `Answer in one short paragraph: what is the most likely outcome for this yes/no question, and why? Question: ${question.trim()}${context ? `\nContext: ${context.trim()}` : ''}`,
        ),
      )
    } catch (e) {
      setError(`Smart Answer failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(null)
    }
  }

  const onSave = (probabilityPct: number, engine: 'on-device' | 'cloud') => {
    const entry = saveForecast({
      createdAt: Date.now(),
      engine,
      probabilityPct,
      question,
    })
    setRecord([entry, ...record])
  }

  return (
    <div className="app">
      <header>
        <h1>ForecastLens</h1>
        <p>
          A hybrid-AI forecasting copilot for prediction markets. Fast private
          estimates run <strong>on your device</strong> (Gemini Nano); deep
          research runs in the <strong>cloud</strong> (Gemini) — all through
          Firebase AI Logic. Nothing you type is sent anywhere until you ask
          for the cloud Deep Dive.
        </p>
      </header>

      <MarketPicker onSelect={pickMarket} onCustom={pickCustom} />

      {question && (
        <section className="card">
          <h2>2 · Forecast it</h2>
          <p className="question">{question}</p>
          {market && (
            <p className="muted small">
              Live market: YES {(market.yesPrice * 100).toFixed(1)}% · 24h $
              {Math.round(market.volume24h).toLocaleString()} ·{' '}
              <a href={market.url} target="_blank" rel="noreferrer">
                Polymarket
              </a>
            </p>
          )}
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Optional context for the forecast: key facts, news, base rates… (stays on-device for the Quick Take)"
            aria-label="Research context"
          />
          <div className="row">
            <button onClick={onQuickTake} disabled={busy !== null}>
              {busy === 'quick' ? 'Running on-device…' : 'Quick Take (on-device)'}
            </button>
            <button onClick={onDeepDive} disabled={busy !== null}>
              {busy === 'deep' ? 'Researching in the cloud…' : 'Deep Dive (cloud)'}
            </button>
            <button
              className="ghost"
              onClick={onSmartAnswer}
              disabled={busy !== null}
            >
              {busy === 'smart' ? 'Answering…' : 'Smart Answer (auto)'}
            </button>
          </div>
          {deviceNote && <p className="muted small">{deviceNote}</p>}
          {error && <p className="error">{error}</p>}
        </section>
      )}

      <ForecastCard
        question={question}
        quickTake={quickTake}
        deepDive={deepDive}
        onSave={onSave}
      />

      {smartAnswer && (
        <section className="card">
          <div className="result-head">
            <h3>Smart Answer</h3>
            <span className="badge badge-hybrid">
              Hybrid · on-device preferred
            </span>
            <span className="muted small">
              {(smartAnswer.latencyMs / 1000).toFixed(1)} s
            </span>
          </div>
          <p>{smartAnswer.data}</p>
        </section>
      )}

      <TrackRecord
        record={record}
        onResolve={(id, outcome) => {
          resolveForecast(id, outcome)
          setRecord(loadRecord())
        }}
        onDelete={(id) => {
          deleteForecast(id)
          setRecord(loadRecord())
        }}
      />

      <footer>
        Built for #BuildHybridAI 2026 (Best Web). All AI inference runs
        through Firebase AI Logic — on-device Gemini Nano and cloud Gemini.
        Market data: Polymarket Gamma API (public). Forecasts are stored only
        in your browser.
      </footer>
    </div>
  )
}
