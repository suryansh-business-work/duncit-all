import { log } from '../utils/log';
import { settingsService } from './settings.service';

/**
 * "Sign in with Duncit": the person's Duncit account proves the email.
 *
 * Lite never opens the main database. It calls the main API's PUBLIC sign-in
 * mutations exactly as mWeb does — ask for a code, check the code — and reads
 * back only what the account says about itself. A main-API failure of any
 * kind answers `null`, and the caller falls through to Lite's own code.
 */
interface GraphQLReply<T> {
  data?: T | null;
  errors?: { message: string }[];
}

const REQUEST_OTP = `mutation LiteBridgeRequestOtp($input: RequestLoginOtpInput!) {
  requestLoginOtp(input: $input) { ok registered expires_in_minutes resend_after_seconds }
}`;

const LOGIN_OTP = `mutation LiteBridgeLoginOtp($input: LoginWithOtpInput!) {
  loginWithOtp(input: $input) { token user { user_id first_name last_name email username } }
}`;

async function call<T>(query: string, variables: Record<string, unknown>, timeoutMs = 8000): Promise<GraphQLReply<T> | null> {
  const url = await settingsService.duncitGraphqlUrl();
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-duncit-surface': 'WEBSITE', 'x-duncit-app': 'lite' },
      body: JSON.stringify({ query, variables }),
      signal: abort.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as GraphQLReply<T>;
  } catch (error) {
    log.warn('auth', 'duncitBridge', { error, msg: 'main API unreachable' });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface DuncitCodeRequest {
  registered: boolean;
  expires_in_minutes: number;
  resend_after_seconds: number;
}

export interface DuncitAccount {
  user_id: string;
  name: string;
  email: string;
  username: string;
}

export const duncitBridge = {
  /** Asks the main API to email its own code. `null` when the account does not exist there, or the API is down. */
  async requestCode(email: string): Promise<DuncitCodeRequest | null> {
    const reply = await call<{ requestLoginOtp: { ok: boolean; registered: boolean; expires_in_minutes: number; resend_after_seconds: number } }>(
      REQUEST_OTP,
      { input: { channel: 'EMAIL', email } },
    );
    const result = reply?.data?.requestLoginOtp;
    if (!result || !result.registered) return null;
    return { registered: true, expires_in_minutes: result.expires_in_minutes, resend_after_seconds: result.resend_after_seconds };
  },

  /** Checks a code with the main API. `null` means the code was wrong, or the API is down. */
  async verifyCode(email: string, code: string): Promise<DuncitAccount | null> {
    const reply = await call<{ loginWithOtp: { token: string; user: { user_id: string; first_name: string; last_name?: string | null; email?: string | null; username?: string | null } } }>(
      LOGIN_OTP,
      { input: { channel: 'EMAIL', email, otp: code } },
    );
    const user = reply?.data?.loginWithOtp?.user;
    if (!user) return null;
    return {
      user_id: user.user_id,
      name: [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || 'Duncit member',
      email: (user.email ?? email).toLowerCase(),
      username: user.username ?? '',
    };
  },
};
