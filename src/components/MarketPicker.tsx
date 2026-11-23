import { useEffect, useState } from 'react'
import {
  fetchTrendingMarkets,
  searchMarkets,
  type Market,
} from '../lib/polymarket'

interface Props {
  onSelect: (m: Market) => void
  onCustom: (question: string) => void
}

export default function MarketPicker({ onSelect, onCustom }: Props) {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [custom, setCustom] = useState('')

  useEffect(() => {
    fetchTrendingMarkets()
      .then(setMarkets)
      .catch(() => setError('Could not load live markets. Paste any question below instead.'))
      .finally(() => setLoading(false))
  }, [])

  const doSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    try {
      setMarkets(await searchMarkets(query.trim()))
    } catch {
      setError('Search failed. Paste any question below instead.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="card">
      <h2>1 · Pick a question</h2>
      <p className="muted">
        Choose a live prediction market, or paste any yes/no question of your
        own.
      </p>

      <div className="row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doSearch()}
          placeholder="Search markets, e.g. bitcoin, election, fed rate…"
          aria-label="Search markets"
        />
        <button onClick={doSearch} disabled={loading}>
          Search
        </button>
      </div>

      {loading && <p className="muted">Loading live markets…</p>}
      {error && <p className="error">{error}</p>}

      <ul className="market-list">
        {markets.map((m) => (
          <li key={m.id}>
            <button className="market-item" onClick={() => onSelect(m)}>
              <span className="q">{m.question}</span>
              <span className="meta">
                YES {(m.yesPrice * 100).toFixed(0)}% · 24h $
                {Math.round(m.volume24h).toLocaleString()}
                {m.endDate ? ` · ends ${m.endDate.slice(0, 10)}` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="row">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Or paste your own question, e.g. Will BTC close above $70k in December?"
          aria-label="Custom question"
        />
        <button onClick={() => custom.trim() && onCustom(custom.trim())}>
          Use this question
        </button>
      </div>
    </section>
  )
}
