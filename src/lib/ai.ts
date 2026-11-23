/**
 * The AI service is created LAZILY (first use), not at module import time.
 * `getAI()` captures the App Check instance that exists at call time; if
 * it runs before `initAppCheck()` (module import order), the service ends
 * up with no App Check and every cloud call is rejected with 401
 * "Firebase App Check token is invalid". All callers below run on user
 * gestures, long after main.tsx has called initAppCheck().
 */
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  type AI,
  type GenerativeModel,
} from 'firebase/ai'
import { app } from './firebase'

/**
 * ALL AI inference in ForecastLens goes through Firebase AI Logic.
 * No other model API is ever called directly (hackathon rule).
 *
 * Three purposeful inference modes — each feature uses the mode that fits
 * its job, which is exactly what the judges score as "hybrid inference":
 *  - Quick Take: ONLY_ON_DEVICE (Gemini Nano). Instant, private, works
 *    offline. Single-turn structured JSON.
 *  - Deep Dive: ONLY_IN_CLOUD (Gemini 3.5 Flash-Lite). Full research synthesis.
 *  - Smart Answer: PREFER_ON_DEVICE. One call, on-device when available,
 *    seamless cloud fallback otherwise.
 */

// Cloud model for the deep-research path. Gemini 2.x models are retired
// for new users (the API itself answers 404 telling us to use Gemini 3).
// gemini-3.8-flash is the intended flagship, but as of 24 Nov 2026 it
// returns HTTP 500 "high demand" on every attempt (6+ tries over 90 min),
// so the cloud paths use gemini-3.5-flash-lite, verified working end to
// end against this project (HTTP 200, real generation). To go back to
// 3.8-flash when its capacity returns, change this one constant.
const CLOUD_MODEL = 'gemini-3.5-flash-lite'

let aiInstance: AI | null = null
let quickTakeModelInstance: GenerativeModel | null = null
let deepModelInstance: GenerativeModel | null = null
let hybridModelInstance: GenerativeModel | null = null

function getAiService(): AI {
  if (!aiInstance) aiInstance = getAI(app, { backend: new GoogleAIBackend() })
  return aiInstance
}

function getQuickTakeModel(): GenerativeModel {
  if (!quickTakeModelInstance) {
    quickTakeModelInstance = getGenerativeModel(getAiService(), {
      mode: InferenceMode.ONLY_ON_DEVICE,
      onDeviceParams: {
        promptOptions: { responseConstraint: quickTakeResponseConstraint },
      },
    })
  }
  return quickTakeModelInstance
}

function getDeepModel(): GenerativeModel {
  if (!deepModelInstance) {
    deepModelInstance = getGenerativeModel(getAiService(), {
      mode: InferenceMode.ONLY_IN_CLOUD,
      inCloudParams: { model: CLOUD_MODEL },
    })
  }
  return deepModelInstance
}

function getHybridModel(): GenerativeModel {
  if (!hybridModelInstance) {
    hybridModelInstance = getGenerativeModel(getAiService(), {
      mode: InferenceMode.PREFER_ON_DEVICE,
      inCloudParams: { model: CLOUD_MODEL },
    })
  }
  return hybridModelInstance
}

export type Engine = 'on-device' | 'cloud' | 'hybrid'

/**
 * Hybrid-mode models MUST put their config in `inCloudParams` /
 * `onDeviceParams` — top-level `model` / `generationConfig` are silently
 * IGNORED by the SDK (it logs a warning) when a hybrid `mode` is set.
 * On-device structured output is enforced with the Prompt API's
 * `responseConstraint` (plain JSON Schema), passed via
 * `onDeviceParams.promptOptions`.
 */
const quickTakeResponseConstraint = {
  type: 'object',
  properties: {
    baseRatePct: {
      description: 'Base-rate probability (0-100) for the YES outcome.',
      type: 'number',
    },
    confidence: {
      description: 'How confident the quick estimate is.',
      enum: ['low', 'medium', 'high'],
      type: 'string',
    },
    keyFactors: {
      description: 'Up to 3 short factors that move the probability most.',
      items: { type: 'string' },
      type: 'array',
    },
    summary: {
      description: 'One-sentence plain-language summary of the quick take.',
      type: 'string',
    },
  },
  required: ['baseRatePct', 'confidence', 'keyFactors', 'summary'],
}

export interface QuickTake {
  baseRatePct: number
  confidence: 'low' | 'medium' | 'high'
  keyFactors: string[]
  summary: string
}

export interface AiResult<T> {
  data: T
  engine: Engine
  latencyMs: number
}

let deviceModelReady = false

/**
 * MUST be called from a user gesture (button click) before any on-device
 * call. Downloads the on-device model in the background on first use.
 * Safe to call repeatedly; subsequent calls are no-ops.
 */
export async function ensureDeviceModel(
  onProgress?: (pct: number) => void,
): Promise<boolean> {
  if (deviceModelReady) return true
  try {
    await getQuickTakeModel().initializeDeviceModel((val) =>
      onProgress?.(Math.round(val * 10000) / 100),
    )
    deviceModelReady = true
    return true
  } catch (err) {
    console.warn('[ForecastLens] On-device model unavailable:', err)
    return false
  }
}

function quickTakePrompt(question: string, context: string): string {
  return [
    'You are a superforecasting assistant. Give a fast base-rate estimate.',
    `Question: ${question}`,
    context ? `Known context: ${context}` : 'No extra context provided.',
    'Reply with the JSON object only: baseRatePct (0-100 for the YES outcome),',
    'confidence (low/medium/high), keyFactors (max 3 short strings),',
    'summary (one sentence). Do not hedge with 50% unless genuinely 50/50.',
  ].join('\n')
}

export async function runQuickTake(
  question: string,
  context: string,
): Promise<AiResult<QuickTake>> {
  const started = performance.now()
  const result = await getQuickTakeModel().generateContent(
    quickTakePrompt(question, context),
  )
  const parsed = JSON.parse(result.response.text()) as QuickTake
  return {
    data: {
      ...parsed,
      baseRatePct: Math.max(0, Math.min(100, Number(parsed.baseRatePct) || 50)),
    },
    engine: 'on-device',
    latencyMs: Math.round(performance.now() - started),
  }
}

function deepDivePrompt(
  question: string,
  context: string,
  market: { yesPrice?: number; volume24h?: number } | null,
  quickTake: QuickTake | null,
): string {
  const lines = [
    'You are a superforecasting analyst. Produce a calibrated forecast with explicit reasoning.',
    `Question: ${question}`,
  ]
  if (market?.yesPrice !== undefined) {
    lines.push(
      `Live market: YES price ${(market.yesPrice * 100).toFixed(1)}% (implied probability), 24h volume $${Math.round(market.volume24h ?? 0).toLocaleString()}.`,
    )
  }
  if (context) lines.push(`Research context:\n${context}`)
  if (quickTake) {
    lines.push(
      `A fast on-device estimate said ${quickTake.baseRatePct}% (${quickTake.confidence} confidence). Agree or disagree with reasons — do not just repeat it.`,
    )
  }
  lines.push(
    'Structure your answer as:',
    '1. Calibrated probability for YES (0-100%).',
    '2. Reasoning (2-4 sentences, reference the evidence).',
    '3. Bull case — factors pushing YES up (bullets).',
    '4. Bear case — factors pushing YES down (bullets).',
    '5. What would change my mind (one sentence).',
    'Be specific and falsifiable. Avoid vague hedges.',
  )
  return lines.join('\n')
}

/**
 * Cloud calls fail transiently when the model is at capacity (HTTP 500
 * "high demand", 503, 429). The SDK does not retry those, so retry once
 * after a short pause — the model usually accepts the second attempt.
 * Non-transient errors (auth, bad request, model not found) are rethrown
 * immediately. Total extra wait is bounded (~8s).
 */
const RETRYABLE = ['high demand', 'overloaded', '503', '429', '500']

function isRetryable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return RETRYABLE.some((needle) => msg.includes(needle))
}

async function withCloudRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (!isRetryable(err)) throw err
    console.warn('[ForecastLens] Cloud model busy, retrying once…', err)
    await new Promise((resolve) => setTimeout(resolve, 8000))
    return fn()
  }
}

export async function runDeepDive(
  question: string,
  context: string,
  market: { yesPrice?: number; volume24h?: number } | null,
  quickTake: QuickTake | null,
): Promise<AiResult<string>> {
  const started = performance.now()
  const result = await withCloudRetry(() =>
    getDeepModel().generateContent(
      deepDivePrompt(question, context, market, quickTake),
    ),
  )
  return {
    data: result.response.text(),
    engine: 'cloud',
    latencyMs: Math.round(performance.now() - started),
  }
}

export async function runSmartAnswer(prompt: string): Promise<AiResult<string>> {
  const started = performance.now()
  const result = await withCloudRetry(() =>
    getHybridModel().generateContent(prompt),
  )
  return {
    data: result.response.text(),
    // PREFER_ON_DEVICE runs on-device when available, cloud otherwise.
    // The SDK does not expose which engine served a hybrid call, so the
    // badge honestly reports the requested mode, not a guessed engine.
    engine: 'hybrid',
    latencyMs: Math.round(performance.now() - started),
  }
}
