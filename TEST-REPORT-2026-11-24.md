# ForecastLens — Local E2E Test Report (24 Nov 2026, ~01:30–02:00 WIB)

Tested in this VM: Vite dev server at http://127.0.0.1:5173, Chrome for
Testing 159 (headed under Xvfb), Firebase project forecastlens-e7ed9
(Spark, Gemini Developer API backend, App Check enforcement ON).

## Results

| Check | Result |
|---|---|
| `npm run build` (tsc + vite) | ✅ PASS |
| App renders in Chrome, 12 live Polymarket markets load | ✅ PASS |
| Quick Take (ONLY_ON_DEVICE / Gemini Nano) | ⚠️ NOT VERIFIABLE in this VM — `LanguageModel.availability()` returns `'unavailable'` in headless AND headed Chrome; the app falls back gracefully with a clear message. Needs a real desktop Chrome to verify. |
| Deep Dive (ONLY_IN_CLOUD) | ✅ PASS — real forecast in 2.3 s: calibrated 58% YES for "Will Bitcoin close above $70,000 in December 2026?", reasoning + bull/bear cases + "what would change my mind" |
| Smart Answer (PREFER_ON_DEVICE) | ✅ PASS — real one-paragraph answer in 6.4 s (cloud fallback, on-device unavailable here) |
| Console errors during E2E | ✅ NONE (only the expected on-device-unavailable warning) |
| All AI calls through Firebase AI Logic only | ✅ (no other model API is called) |

## Bugs found & fixed (all in this session)

1. **`src/lib/firebase.ts` — App Check never initialized in debug mode.**
   `initAppCheck()` set the `FIREBASE_APPCHECK_DEBUG_TOKEN` global and
   returned early without calling `initializeAppCheck()`. The SDK only
   reads that global inside `initializeAppCheck()`, so no App Check
   instance existed and cloud calls went out with no token → 401
   "Firebase App Check token is invalid". Fixed: always call
   `initializeAppCheck()` (CustomProvider placeholder in debug mode,
   reCAPTCHA v3 when a site key is set).
2. **`src/lib/ai.ts` — AI service created at module import time.**
   `getAI()` captures the App Check instance that exists at call time;
   imports run before `main.tsx` calls `initAppCheck()`, so the service
   permanently had no App Check even after fix 1. Fixed: lazy creation
   on first use (`getAiService()` / `get*Model()` getters).
3. **`src/lib/ai.ts` — hybrid-mode config silently ignored.**
   Top-level `model` / `generationConfig` are IGNORED when a hybrid
   `mode` is set (SDK logs warnings). The cloud model name was ignored
   (SDK default used) and the Quick Take JSON schema was ignored. Fixed:
   `inCloudParams: { model }` for cloud/hybrid, `onDeviceParams:
   { promptOptions: { responseConstraint } }` (plain JSON Schema) for
   on-device structured output.
4. **Cloud model `gemini-3.8-flash` has no capacity right now.**
   Returns HTTP 500 "high demand" on 6+ attempts over ~90 min (verified
   via curl and in-app). `gemini-2.5-flash` / `gemini-2.5-flash-lite`
   are retired (404, Google's own error says use Gemini 3). Switched
   `CLOUD_MODEL` to `gemini-3.5-flash-lite` — verified HTTP 200 with
   real generation. One-constant change to go back to 3.8-flash when
   its capacity returns (see comment above `CLOUD_MODEL`).
5. **Added `withCloudRetry`** — one retry after 8 s for transient
   cloud errors (500/503/429/"high demand") in Deep Dive / Smart Answer.

## Still open / needs a real desktop Chrome

- **Quick Take end-to-end is UNVERIFIED.** `LanguageModel.availability()`
  is `'unavailable'` in this VM (Chrome 159, flag enabled, headed and
  headless). Possible contributors: only ~1.1 GB RAM free at test time,
  no GPU (SwiftShader only), and the egress proxy blocks
  `clients2.google.com` (component-update host). The app handles the
  absence correctly; verify on a real desktop Chrome (flag
  `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`, then
  `await LanguageModel.create()` once to download the model).
- **VM egress proxy is flaky.** Several requests hung for 30–90 s and
  then worked on retry (Gamma API once, App Check exchange twice,
  Firebase AI twice). Not an app bug — but demo recording should be
  done on a normal network, or retried if a call stalls.
- **Missing favicon** (`/favicon.ico` 404) — cosmetic only.
- **Not yet done (separate work):** public GitHub repo push, demo video
  (≤3 min), Firebase Hosting deploy, Devpost submission (deadline
  1 Dec 2026 05:00 WIB).

## Environment notes for future test runs

- `/usr/bin/google-chrome` does NOT exist here; the runtime's
  `/opt/meta-chromium/chrome` refuses to start standalone (needs a Hatch
  WebGL domain policy). Use Playwright's Chromium:
  `~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome` (v159).
- Chrome in this VM cannot use the egress proxy directly (proxy auth
  challenge). A local forwarding proxy is at `/tmp/fl-cdp/forwarder.mjs`
  (listens 127.0.0.1:3129, adds Proxy-Authorization from env) — start it
  before launching Chrome, and launch Chrome with
  `--proxy-server=http://127.0.0.1:3129 --proxy-bypass-list=localhost,127.0.0.1 --ignore-certificate-errors`.
  Dev server: `npm run dev` in `~/workspace/firebase-hybrid-ai`
  (running, port 5173). CDP driver: `/tmp/fl-cdp/driver.mjs`.
