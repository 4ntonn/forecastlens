import type { AiResult, QuickTake } from '../lib/ai'

export function EngineBadge({ engine }: { engine: string }) {
  const label =
    engine === 'on-device'
      ? 'On-device · Gemini Nano · private'
      : engine === 'cloud'
        ? 'Cloud · Gemini · deep'
        : 'Hybrid · on-device preferred'
  return <span className={`badge badge-${engine}`}>{label}</span>
}

interface Props {
  question: string
  quickTake: AiResult<QuickTake> | null
  deepDive: AiResult<string> | null
  onSave: (probabilityPct: number, engine: 'on-device' | 'cloud') => void
}

export default function ForecastCard({
  question,
  quickTake,
  deepDive,
  onSave,
}: Props) {
  if (!quickTake && !deepDive) return null
  const pct = deepDive
    ? null
    : quickTake
      ? quickTake.data.baseRatePct
      : null

  return (
    <section className="card">
      <h2>Forecast</h2>
      <p className="question">{question}</p>

      {quickTake && (
        <div className="result-block">
          <div className="result-head">
            <h3>Quick Take</h3>
            <EngineBadge engine={quickTake.engine} />
            <span className="muted small">{quickTake.latencyMs} ms</span>
          </div>
          <div className="prob">
            <div
              className="prob-fill"
              style={{ width: `${quickTake.data.baseRatePct}%` }}
            />
            <span className="prob-num">{quickTake.data.baseRatePct}% YES</span>
          </div>
          <p>{quickTake.data.summary}</p>
          <p className="muted small">
            Confidence: {quickTake.data.confidence} · Works offline, nothing
            leaves your device.
          </p>
          <ul>
            {quickTake.data.keyFactors.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <button
            onClick={() =>
              onSave(quickTake.data.baseRatePct, 'on-device')
            }
          >
            Save this forecast to my track record
          </button>
        </div>
      )}

      {deepDive && (
        <div className="result-block">
          <div className="result-head">
            <h3>Deep Dive</h3>
            <EngineBadge engine={deepDive.engine} />
            <span className="muted small">
              {(deepDive.latencyMs / 1000).toFixed(1)} s
            </span>
          </div>
          <div className="deep-text">
            {deepDive.data.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
          {pct === null && quickTake && (
            <button
              onClick={() =>
                onSave(quickTake.data.baseRatePct, 'cloud')
              }
            >
              Save the quick-take probability to my track record
            </button>
          )}
        </div>
      )}
    </section>
  )
}
