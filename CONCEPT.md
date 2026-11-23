# ForecastLens — concept, judging fit & build plan

**Hackathon:** Firebase #BuildHybridAI 2026 (Devpost)
**Track:** Best Web/Chrome App ($3,000)
**Deadline:** 1 Dec 2026 05:00 WIB (30 Nov 14:00 PT)
**Entrant:** Aralie (solo, operator Farhan)

## Concept (one line)

A forecasting copilot for prediction markets: an instant private estimate
computed **on your device**, and a deep research synthesis computed **in
the cloud** — each engine doing the job it is actually good at.

## Why this idea wins (or at least deserves to)

Judging is 1–5 on four equally weighted criteria. Mapping:

1. **Technological Implementation** — the app uses three Firebase AI Logic
   inference modes *purposefully*, not as a demo toggle: `ONLY_ON_DEVICE`
   for the Quick Take (structured JSON, single-turn), `ONLY_IN_CLOUD` for
   the Deep Dive, `PREFER_ON_DEVICE` for Smart Answer. App Check enforced
   (debug tokens for local dev). Live market data via the public
   Polymarket Gamma API. No other model API is called — a hard hackathon
   rule, respected by design.
2. **Design** — a focused three-step tool (pick a question → forecast it →
   track your record), not a tech demo. Clean, fast, works offline for
   the Quick Take.
3. **Potential Impact** — prediction markets are a real, growing way people
   make decisions under uncertainty; most participants forecast by gut feel.
   A copilot that forces a base rate, explicit reasoning, and a scored
   track record (Brier score) makes people measurably better calibrated.
   Privacy angle is real: sensitive questions can be estimated on-device
   without sending anything to a server.
4. **Quality of the Idea** — hybrid inference is usually shown as
   "same prompt, two engines". Here the two engines have *different jobs*
   (fast private estimate vs. slow deep research that audits the fast
   one). That is a non-obvious, defensible use of hybrid inference.

## Honest odds

~5% for any prize (Best Web ~3%). A Google hackathon with hundreds of
entries and 6 prize slots. The goal is a submission good enough to be
judged on merit, not a lottery ticket.

## What is built (this repo)

- `src/lib/ai.ts` — the three AI Logic model instances + prompts.
- `src/lib/polymarket.ts` — Gamma API client (trending + search).
- `src/lib/forecast.ts` — local track record + Brier score.
- `src/components/` — MarketPicker, ForecastCard, TrackRecord.
- `src/App.tsx` — three-step flow + engine badges + latency display.

## What is NOT done yet (needs parent / Farhan)

1. **Devpost registration** — needs a browser session (Devpost login via
   GitHub OAuth account `4ntonn`, or email antonmarbino732@gmail.com).
   I cannot do this as a background agent.
2. **Firebase project + web app + AI Logic setup** — Firebase console
   (browser): create project, add web app, run the AI Logic guided setup
   with the **Gemini Developer API** backend, copy config into `.env`,
   safelist the App Check debug token. No billing, no quota form needed
   (text-only free tier).
3. **GitHub repo** — create public repo `4ntonn/forecastlens`, push this
   code, add the MIT license (already in repo root), make sure the license
   shows in the repo About section.
4. **Demo video ≤ 3 min** — screen-record the app working (Quick Take
   on-device badge + Deep Dive cloud badge visible), upload to YouTube
   channel "ini gondalL", link it in the Devpost submission. First 30
   seconds must show the idea, the audience, and the hybrid feature
   working.
5. **Hosted URL** — `firebase deploy --only hosting` after `firebase
   login` (browser/CLI). Strongly encouraged by the judges.
6. **Devpost submission** — text description + repo + video + platform
   (Web/Chrome), before 1 Dec 05:00 WIB. Upload the video early
   (YouTube processing can take hours).

## What was deliberately NOT done

- **Google Account Quota form NOT requested.** It is only needed for
  billing-required models (image generation, TTS). ForecastLens is
  text-only on the free tier, so requesting a quota account would add
  fee liability ("you're responsible for any fees beyond the provisioned
  quota") for zero benefit. Form link, if ever needed:
  https://forms.gle/uPcDhaYW3iVo2AYw5 (Sprint 3 deadline was 26 Nov
  01:00 WIB).
- **No KYC, no payment, no fake accounts.** Registration and submission
  use Farhan's real identity (Devpost/GitHub 4ntonn, email
  antonmarbino732@gmail.com). If we win, the prize form is W-8BEN
  (non-US tax form, standard for Devpost) — to be filled by Farhan.

## Build plan (24–30 Nov)

- 24 Nov: scaffold + core AI paths (done — this repo). Firebase project
  setup + `.env` + first local run with App Check debug token.
- 25 Nov: polish UI, error states, offline behavior; push to GitHub.
- 26–27 Nov: deploy to Firebase Hosting; record demo video.
- 28 Nov: submission draft on Devpost (description + repo + video).
- 29–30 Nov: buffer — fix issues, submit before 1 Dec 05:00 WIB.
  Upload the video early; do not leave submission to the last hours.
