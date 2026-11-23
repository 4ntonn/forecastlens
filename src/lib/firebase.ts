import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  CustomProvider,
  initializeAppCheck,
  ReCaptchaV3Provider,
} from 'firebase/app-check'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
}

export const app: FirebaseApp = initializeApp(firebaseConfig)

/**
 * Firebase AI Logic requires App Check. For local development the debug
 * provider is used: set VITE_APPCHECK_DEBUG=true, run the app, copy the
 * debug token printed in the console and safelist it in
 * Firebase console > App Check > Apps > Manage debug tokens.
 * For the hosted demo, set VITE_RECAPTCHA_V3_SITE_KEY (free reCAPTCHA v3).
 *
 * IMPORTANT: initializeAppCheck() MUST be called in every mode. The SDK
 * only reads the FIREBASE_APPCHECK_DEBUG_TOKEN global inside
 * initializeAppCheck(); without this call no App Check instance exists,
 * the AI SDK sends no X-Firebase-AppCheck header, and AI Logic calls are
 * rejected with 401 "Firebase App Check token is invalid" when
 * enforcement is on. In debug mode the SDK exchanges the debug token and
 * never invokes the provider below; in production the reCAPTCHA provider
 * is used.
 */
export function initAppCheck(): void {
  const debug = import.meta.env.VITE_APPCHECK_DEBUG === 'true'
  const siteKey = import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY as
    | string
    | undefined

  if (debug) {
    // Use the safelisted debug token when provided (VITE_APPCHECK_DEBUG_TOKEN),
    // otherwise `true` makes the SDK generate a fresh token to safelist.
    const token = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN as string | undefined
    ;(window as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN = token || true
  }
  initializeAppCheck(app, {
    isTokenAutoRefreshEnabled: true,
    provider: siteKey
      ? new ReCaptchaV3Provider(siteKey)
      : // Never invoked while debug mode is on; only a placeholder so the
        // debug-token exchange can run. See the doc comment above.
        new CustomProvider({
          getToken: () =>
            Promise.resolve({
              expireTimeMillis: Date.now() + 60_000,
              token: 'unused-debug-provider-token',
            }),
        }),
  })
}
