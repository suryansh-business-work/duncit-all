import { create } from 'zustand';

import { clearAuthToken, getAuthToken } from '@/services/auth-token';

interface AuthState {
  /** False until the persisted token has been read on launch. */
  ready: boolean;
  token: string | null;
  /** Drives the post-auth gate: false routes the user to the survey. */
  surveyCompleted: boolean;
  bootstrap: () => Promise<void>;
  authenticate: (token: string, surveyCompleted: boolean) => void;
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
  bootstrap: async () => {
    const token = await getAuthToken();
    // A cold start with a stored token means the user already onboarded.
    set({ token, surveyCompleted: true, ready: true });
  },
  authenticate: (token, surveyCompleted) => set({ token, surveyCompleted }),
  completeSurvey: () => set({ surveyCompleted: true }),
  signOut: async () => {
    await clearAuthToken();
    set({ token: null, surveyCompleted: true });
  },
}));
