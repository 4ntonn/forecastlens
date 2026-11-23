# ForecastLens — Hybrid-AI Forecasting Copilot

Built for **Firebase #BuildHybridAI 2026** (Best Web/Chrome track).
A forecasting copilot for prediction markets that uses **Firebase AI Logic
hybrid inference** the way it was designed to be used: each feature runs on
the engine that fits its job.

| Feature | Engine | Why this engine |
| --- | --- | --- |
| **Quick Take** — instant base-rate estimate + key factors (structured JSON) | On-device only (Gemini Nano) | Private, instant, works offline. Your question never leaves the device. |
| **Deep Dive** — calibrated probability with bull/bear cases and "what would change my mind" | Cloud only (Gemini 3.5 Flash-Lite; 3.8 Flash is capacity-limited as of 24 Nov 2026) | Full research synthesis; checks the fast estimate instead of repeating it. |
| **Smart Answer** — one-paragraph answer | Hybrid (`PREFER_ON_DEVICE`) | On-device when available, seamless cloud fallback otherwise. |
| **Track record** — save forecasts, resolve them, see your Brier score | Local only | Good forecasters are scored, not just praised. |

Live market data comes from the public Polymarket Gamma API (no key).
**All AI inference runs through Firebase AI Logic** — no other model API
is ever called directly.

## Run locally

Prerequisites: Node 20+, Chrome 139+ desktop (for on-device inference).

```bash
npm install
cp .env.example .env
# Fill in .env from the Firebase console (project settings > your web app).
# Set VITE_APPCHECK_DEBUG=true for local development.
npm run dev
```

Then enable the on-device model in Chrome:

1. `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` → Enabled,
   restart Chrome.
2. Open DevTools console and run `await LanguageModel.create()` once to
   download the on-device model (or let the app download it on first use).

## Firebase setup (one-time, in the Firebase console)

1. Create a Firebase project, add a Web app, copy its config into `.env`.
2. AI Services → AI Logic → Get started; choose the **Gemini Developer
   API** backend (free tier, no billing). This auto-enforces App Check.
3. App Check → Apps → your app → **Manage debug tokens**: safelist the
   debug token printed in the browser console while running locally.
4. For the hosted demo, add a free reCAPTCHA v3 site key as
   `VITE_RECAPTCHA_V3_SITE_KEY` and deploy with `npm run build` +
   `firebase deploy --only hosting` (requires `firebase login`).

Never commit `.env`, App Check debug tokens, or service-account keys.
Text inference stays on the free tier — no billing account and no Google
Account Quota request are needed for this app (quota is only for
billing-required models such as image generation/TTS, which we don't use).

## Deploy

```bash
npm run build
npx firebase-tools@latest login   # one-time, interactive
npx firebase-tools@latest deploy --only hosting
```

## Submission checklist (Devpost, deadline 1 Dec 2026 05:00 WIB)

- [ ] Public GitHub repo with this code + MIT license (visible in About)
- [ ] Demo video ≤ 3 min on YouTube (English), showing the app working
- [ ] Text description: how Firebase AI Logic is used, features, value prop
- [ ] Platform selected: Web/Chrome
- [ ] Hosted URL (strongly encouraged)

## License

MIT. See [LICENSE](LICENSE).
