import { create } from 'zustand';

import { clearAuthToken, getAuthToken } from '@/services/auth-token';
import { removeExpoPushToken, syncExpoPushToken } from '@/services/push-registration';

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
    const token = await getAuthToken();
    // A cold start with a stored token means the user already onboarded.
    set({ token, surveyCompleted: true, referralPromptPending: false, ready: true });
    // Re-register this device for native push on every authenticated launch
    // (best-effort, fire-and-forget — never blocks the gate) (BUG-C).
    if (token) syncExpoPushToken();
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
