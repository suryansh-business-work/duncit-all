import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  LITE_REQUEST_PHONE_SIGN_IN_CODE,
  LITE_REQUEST_SIGN_IN_CODE,
  LITE_VERIFY_PHONE_SIGN_IN_CODE,
  LITE_VERIFY_SIGN_IN_CODE,
  type LiteMe,
} from '../../../../shared/graphql/documents';
import type { SignInChannel, SignInRequestResult } from './sign-in.types';

type Payload = { token: string; user: LiteMe };

/** The two API calls of a sign-in, for either channel, so the steps never branch on which mutation to run. */
export function useSignInCalls() {
  const [requestEmail, emailState] = useMutation<{ liteRequestSignInCode: SignInRequestResult }, { email: string }>(LITE_REQUEST_SIGN_IN_CODE);
  const [requestPhone, phoneState] = useMutation<{ liteRequestPhoneSignInCode: SignInRequestResult }, { phone: string }>(LITE_REQUEST_PHONE_SIGN_IN_CODE);
  const [verifyEmail] = useMutation<{ liteVerifySignInCode: Payload }, { email: string; code: string; name?: string }>(LITE_VERIFY_SIGN_IN_CODE);
  const [verifyPhone] = useMutation<{ liteVerifyPhoneSignInCode: Payload }, { phone: string; code: string; name?: string }>(LITE_VERIFY_PHONE_SIGN_IN_CODE);

  /** Send (or re-send) a code; null when the API answered without a result. */
  const request = useCallback(
    async (channel: SignInChannel, contact: string): Promise<SignInRequestResult | null> => {
      if (channel === 'PHONE') return (await requestPhone({ variables: { phone: contact } })).data?.liteRequestPhoneSignInCode ?? null;
      return (await requestEmail({ variables: { email: contact } })).data?.liteRequestSignInCode ?? null;
    },
    [requestEmail, requestPhone],
  );

  /** Prove the code; the session token on success. */
  const verify = useCallback(
    async (channel: SignInChannel, contact: string, code: string, name?: string): Promise<string | null> => {
      if (channel === 'PHONE') return (await verifyPhone({ variables: { phone: contact, code, name } })).data?.liteVerifyPhoneSignInCode.token ?? null;
      return (await verifyEmail({ variables: { email: contact, code, name } })).data?.liteVerifySignInCode.token ?? null;
    },
    [verifyEmail, verifyPhone],
  );

  return { request, verify, requesting: emailState.loading || phoneState.loading };
}
