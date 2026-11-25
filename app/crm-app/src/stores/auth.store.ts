import { create } from 'zustand';
import { hasAppAccess } from '@duncit/user-core';
import { CrmTelephony } from 'crm-telephony';

import { config } from '@/constants/config';
import {
  CrmAppLoginDocument,
  CrmAppMeDocument,
  CrmAppOtpLoginDocument,
  CrmAppRequestLoginOtpDocument,
  CrmAppTwoFactorDocument,
} from '@/graphql/auth';
import { gqlRequest } from '@/services/graphql.client';
import { clearAllValues } from '@/services/secure-storage';
import { clearToken, getToken, needsSecurityVerification, setToken } from '@/services/session';
import { unregisterBackgroundSync } from '@/services/background-sync';
import { ApiError, errorCode } from '@/utils/errors';

/**
 * Where the person is in signing in. The CRM portal's flow, step for step:
 * email + password → (two-step code) → Security Verification → the app.
 */
export type AuthStatus = 'loading' | 'signedOut' | 'twoFactor' | 'security' | 'signedIn';

export interface CrmUser {
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  roles: string[];
  locale?: string | null;
}

interface AuthState {
  status: AuthStatus;
  user: CrmUser | null;
  challengeToken: string | null;
  bootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  /** Email a one-time code. Resolves the same whether or not the address can sign in. */
  requestLoginCode: (email: string) => Promise<void>;
  signInWithCode: (email: string, code: string) => Promise<void>;
  completeTwoFactor: (code: string) => Promise<void>;
  completeSecurity: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

/** Thrown when the account signs in but holds no CRM role — the portal's "no access". */
export class NoCrmAccessError extends Error {
  constructor() {
    super('NO_CRM_ACCESS');
    this.name = 'NoCrmAccessError';
  }
}

const allowed = (roles: readonly string[]) => hasAppAccess([...roles], config.allowedRoles);

export const useAuthStore = create<AuthState>((set, get) => {
  /** A fresh token: owe the security screen, or check the role and let them in. */
  const accept = async (token: string) => {
    await setToken(token);
    if (needsSecurityVerification(token)) {
      set({ status: 'security', challengeToken: null });
      return;
    }
    const { me } = await gqlRequest(CrmAppMeDocument);
    if (!me || !allowed(me.roles)) {
      await get().signOut();
      throw new NoCrmAccessError();
    }
    set({ status: 'signedIn', user: me, challengeToken: null });
  };

  /** Either sign-in door: a token, or the authenticator step, or "no CRM access". */
  const viaDoor = async (door: () => Promise<string>) => {
    try {
      await accept(await door());
    } catch (error) {
      const challenge = error instanceof ApiError ? error.extensions?.challenge_token : undefined;
      if (errorCode(error) === 'TWO_FACTOR_REQUIRED' && typeof challenge === 'string') {
        set({ status: 'twoFactor', challengeToken: challenge });
        return;
      }
      if (errorCode(error) === 'FORBIDDEN') throw new NoCrmAccessError();
      throw error;
    }
  };

  return {
    status: 'loading',
    user: null,
    challengeToken: null,

    bootstrap: async () => {
      const token = await getToken();
      if (!token) return set({ status: 'signedOut' });
      if (needsSecurityVerification(token)) return set({ status: 'security' });
      try {
        const { me } = await gqlRequest(CrmAppMeDocument);
        if (!me || !allowed(me.roles)) return get().signOut();
        set({ status: 'signedIn', user: me });
      } catch (error) {
        if (errorCode(error) === 'UNAUTHENTICATED') return get().signOut();
        // Offline at launch: the session is still good, so the app opens on what it has.
        set({ status: 'signedIn' });
      }
    },

    signIn: (email, password) =>
      viaDoor(async () => {
        const { login } = await gqlRequest(
          CrmAppLoginDocument,
          { input: { channel: 'EMAIL', email, password, portal_key: config.portalKey } },
          { auth: false },
        );
        return login.token;
      }),

    requestLoginCode: async (email) => {
      await gqlRequest(
        CrmAppRequestLoginOtpDocument,
        { input: { email, portal_key: config.portalKey } },
        { auth: false },
      );
    },

    // A code is not a lesser credential: the same role gate, 2FA and Security Verification.
    signInWithCode: (email, code) =>
      viaDoor(async () => {
        const { loginWithPortalOtp } = await gqlRequest(
          CrmAppOtpLoginDocument,
          { input: { email, otp: code, portal_key: config.portalKey } },
          { auth: false },
        );
        return loginWithPortalOtp.token;
      }),

    completeTwoFactor: async (code) => {
      const challenge = get().challengeToken;
      if (!challenge) return set({ status: 'signedOut' });
      const { completeTwoFactorLogin } = await gqlRequest(
        CrmAppTwoFactorDocument,
        { input: { challenge_token: challenge, code } },
        { auth: false },
      );
      await accept(completeTwoFactorLogin.token);
    },

    completeSecurity: (token) => accept(token),

    signOut: async () => {
      await clearToken();
      await clearAllValues();
      await CrmTelephony?.clearAll();
      await unregisterBackgroundSync();
      set({ status: 'signedOut', user: null, challengeToken: null });
    },
  };
});
