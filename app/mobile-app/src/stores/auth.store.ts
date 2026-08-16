import { create } from 'zustand';
import { logs } from '@duncit/logs';

import { clearAuthToken, getAuthToken } from '@/services/auth-token';
import { removeExpoPushToken, syncExpoPushToken } from '@/services/push-registration';

const AUTH_BOOTSTRAP_TIMEOUT_MS = 4_000;

/**
 * SecureStore is native code and can reject after an OS restore or keystore
 * change. It must also never hold the first React view forever: Expo keeps the
 * native splash visible while App returns null.
 */
async function readPersistedToken(): Promise<string | null> {
  let timeout: ReturnType<typeof globalThis.setTimeout> | undefined;
  try {
    return await Promise.race([
      getAuthToken(),
      new Promise<never>((_resolve, reject) => {
        timeout = globalThis.setTimeout(
          () => reject(new Error('SecureStore auth read timed out during startup')),
          AUTH_BOOTSTRAP_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeout !== undefined) globalThis.clearTimeout(timeout);
  }
}

interface AuthState {
  /** False until the persisted token has been read on launch. */
  ready: boolean;
  token: string | null;
  /** Drives the post-auth gate: false routes the user to the survey. */
  surveyCompleted: boolean;
  /**
   * Google signup only: true routes the user to the referral step first.
   *
   * An email signup asks for a code on its own form, where the server can check
   * it before the account exists. Google hands back a finished account instead,
   * so the question needs a screen of its own — and the gate is the only thing
   * that can put one in front of a user who is already signed in.
   */
  referralPromptPending: boolean;
  bootstrap: () => Promise<void>;
  authenticate: (token: string, surveyCompleted: boolean, referralPrompt?: boolean) => void;
  dismissReferralPrompt: () => void;
  completeSurvey: () => void;
  signOut: () => Promise<void>;
}

/**
 * Auth/session state — the Zustand replacement for the old React Query token
 * gate (useProtectedRoute). The token presence + survey flag decide which
 * navigation group renders (auth → survey → app), mirroring mWeb's AuthGuards.
 */
export const useAuthStore = create<AuthState>((set) => ({
  ready: false,
  token: null,
  surveyCompleted: true,
  referralPromptPending: false,
  bootstrap: async () => {
    try {
      const token = await readPersistedToken();
      // A cold start with a stored token means the user already onboarded.
      set({ token, surveyCompleted: true, referralPromptPending: false, ready: true });
      // Push registration stays best-effort and never blocks the startup gate.
      if (token) syncExpoPushToken();
    } catch (error) {
      // A damaged/unavailable secure-store entry is equivalent to signed out.
      // Most importantly, release startup always leaves the native splash.
      set({ token: null, surveyCompleted: true, referralPromptPending: false, ready: true });
      logs.mobileApp.error('startup', 'auth-bootstrap', { error });
    }
  },
  authenticate: (token, surveyCompleted, referralPrompt = false) => {
    set({ token, surveyCompleted, referralPromptPending: referralPrompt });
    syncExpoPushToken();
  },
  dismissReferralPrompt: () => set({ referralPromptPending: false }),
  completeSurvey: () => set({ surveyCompleted: true }),
  signOut: async () => {
    // Unbind the device push token before dropping the bearer token (BUG-C).
    await removeExpoPushToken();
    await clearAuthToken();
    set({ token: null, surveyCompleted: true, referralPromptPending: false });
  },
}));
