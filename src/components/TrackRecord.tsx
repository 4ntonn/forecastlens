import {
  brierScore,
  meanBrier,
  type SavedForecast,
} from '../lib/forecast'

interface Props {
  record: SavedForecast[]
  onResolve: (id: string, outcome: boolean) => void
  onDelete: (id: string) => void
}

export default function TrackRecord({ record, onResolve, onDelete }: Props) {
  const mean = meanBrier(record)
  const resolved = record.filter((f) => f.outcome !== null).length

  return (
    <section className="card">
      <h2>3 · My track record</h2>
      <p className="muted">
        Good forecasters are scored, not just praised. Brier score =
        (probability − outcome)². Lower is better; always saying 50% scores
        0.25.
      </p>
      <p>
        {resolved === 0 ? (
          <span className="muted">
            Nothing resolved yet — save a forecast, then mark it YES or NO
            when the event resolves.
          </span>
        ) : (
          <strong>
            Mean Brier: {mean?.toFixed(3)} over {resolved} resolved
            forecast{resolved === 1 ? '' : 's'}
          </strong>
        )}
      </p>
      {record.length === 0 ? (
        <p className="muted">No saved forecasts yet.</p>
      ) : (
        <ul className="record-list">
          {record.map((f) => {
            const b = brierScore(f)
            return (
              <li key={f.id} className="record-item">
                <span className="q">{f.question}</span>
                <span className="meta">
                  {f.probabilityPct}% YES · {f.engine} ·{' '}
                  {new Date(f.createdAt).toLocaleDateString()}
                  {b !== null ? ` · Brier ${b.toFixed(3)}` : ' · unresolved'}
                </span>
                <span className="row">
                  {f.outcome === null ? (
                    <>
                      <button onClick={() => onResolve(f.id, true)}>
                        Resolved YES
                      </button>
                      <button onClick={() => onResolve(f.id, false)}>
                        Resolved NO
                      </button>
                    </>
                  ) : (
                    <span className="muted small">
                      Resolved {f.outcome ? 'YES' : 'NO'}
                    </span>
                  )}
                  <button
                    className="ghost"
                    onClick={() => onDelete(f.id)}
                  >
                    Delete
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
