/**
 * Live prediction-market data from the Polymarket Gamma API.
 * Public, no API key required. This is DATA (market prices), not AI
 * inference — all inference still runs through Firebase AI Logic.
 */

export interface Market {
  id: string
  question: string
  slug: string
  url: string
  yesPrice: number // 0..1, implied probability of YES
  volume24h: number
  endDate: string | null
  description: string
}

const GAMMA = 'https://gamma-api.polymarket.com'

interface GammaMarket {
  id: string
  question: string
  slug: string
  description?: string
  outcomePrices?: string
  volume24hr?: number
  endDate?: string
}

function toMarket(g: GammaMarket): Market | null {
  let yesPrice = 0.5
  try {
    const prices = JSON.parse(g.outcomePrices ?? '["0.5","0.5"]') as string[]
    yesPrice = Number.parseFloat(prices[0] ?? '0.5')
    if (!Number.isFinite(yesPrice)) yesPrice = 0.5
  } catch {
    yesPrice = 0.5
  }
  return {
    description: (g.description ?? '').slice(0, 600),
    endDate: g.endDate ?? null,
    id: g.id,
    question: g.question,
    slug: g.slug,
    url: `https://polymarket.com/event/${g.slug}`,
    volume24h: g.volume24hr ?? 0,
    yesPrice,
  }
}

/** Top active markets by 24h volume. */
export async function fetchTrendingMarkets(limit = 12): Promise<Market[]> {
  const res = await fetch(
    `${GAMMA}/markets?limit=${limit}&active=true&closed=false&order=volume24hr&ascending=false`,
  )
  if (!res.ok) throw new Error(`Gamma API ${res.status}`)
  const data = (await res.json()) as GammaMarket[]
  return data
    .map(toMarket)
    .filter((m): m is Market => m !== null && m.question.length > 0)
}

export async function searchMarkets(query: string): Promise<Market[]> {
  const res = await fetch(
    `${GAMMA}/markets?limit=10&active=true&closed=false&search=${encodeURIComponent(query)}`,
  )
  if (!res.ok) throw new Error(`Gamma API ${res.status}`)
  const data = (await res.json()) as GammaMarket[]
  return data
    .map(toMarket)
    .filter((m): m is Market => m !== null && m.question.length > 0)
}
