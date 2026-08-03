import {
  MobileRequestEmailVerificationOtpDocument,
  MobileVerifyEmailVerificationOtpDocument,
} from '@/graphql/account';
import { useMeStore } from '@/stores/me.store';
import { graphqlRequest } from './graphql.client';

/**
 * Email verification — the RN twin of mWeb's EmailVerificationForm calls. The
 * OTP is mailed to the address already on the account, so neither call takes an
 * email; both require auth.
 */

/** Mails a fresh OTP. `devOtp` is only populated by non-production servers. */
export async function requestEmailVerificationOtp(): Promise<{ devOtp: string | null }> {
  const data = await graphqlRequest(MobileRequestEmailVerificationOtpDocument, undefined, {
    auth: true,
  });
  return { devOtp: data.requestEmailVerificationOtp?.dev_otp ?? null };
}

/**
 * Confirms the mailed OTP; resolves with the account's new verified state.
 *
 * The `me` store is refetched here rather than by the caller: it backs the Home
 * banner, which lives in a different tree from the verification section. Without
 * this the banner kept inviting the user to verify an already-verified email
 * until the app restarted (the store is fetch-once).
 */
export async function verifyEmailVerificationOtp(otp: string): Promise<boolean> {
  const data = await graphqlRequest(
    MobileVerifyEmailVerificationOtpDocument,
    { otp },
    { auth: true },
  );
  await useMeStore.getState().refetch();
  return data.verifyEmailVerificationOtp.is_email_verified === true;
}
