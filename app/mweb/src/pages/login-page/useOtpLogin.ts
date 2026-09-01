import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  recoveryLookup,
  type ContactDraft,
  type PasswordRecoveryChannel,
} from '@duncit/utils';
import {
  useCodeRequest,
  type CodeRequestOutcome,
} from '../../components/password-recovery/useCodeRequest';
import { LOGIN_WITH_OTP, REQUEST_LOGIN_OTP } from './queries';

/**
 * Continue with OTP: the shared send-a-code half out of `useCodeRequest`, plus
 * the one step only sign-in has — a correct code hands back the token the
 * caller spends through `onAuthed` (the same finishLogin every other method
 * uses), so the flow ends at the code step. The native twin is
 * app/mobile-app/src/screens/LoginScreen/useOtpLogin.ts.
 */
export function useOtpLogin(onAuthed: (token: string, user: any) => void) {
  const [requestOtp] = useMutation<any>(REQUEST_LOGIN_OTP);
  const [loginWithOtp, { loading: verifying }] = useMutation<any>(LOGIN_WITH_OTP);

  const send = useCallback(
    async (
      channel: PasswordRecoveryChannel,
      draft: Readonly<ContactDraft>,
    ): Promise<CodeRequestOutcome> => {
      const res = await requestOtp({ variables: { input: recoveryLookup(channel, draft) } });
      const result = res.data?.requestLoginOtp;
      return {
        registered: Boolean(result?.registered),
        resendAfterSeconds: result?.resend_after_seconds ?? 30,
        expiresInMinutes: result?.expires_in_minutes ?? 10,
        testCode: result?.test_code ?? null,
      };
    },
    [requestOtp],
  );

  const flow = useCodeRequest(send);
  const { state, advance, fail } = flow;

  const submitCode = useCallback(
    async (otp: string) => {
      try {
        const res = await loginWithOtp({
          variables: {
            input: { ...recoveryLookup(state.channel, state.draft), otp: otp.trim() },
          },
        });
        const payload = res.data?.loginWithOtp;
        if (payload?.token) onAuthed(payload.token, payload.user);
      } catch (e) {
        fail(e);
      }
    },
    [fail, loginWithOtp, onAuthed, state.channel, state.draft],
  );

  const goBack = useCallback(() => {
    advance((prev) => ({ ...prev, step: 'CHANNEL' }));
  }, [advance]);

  return {
    state,
    error: flow.error,
    notFound: flow.notFound,
    expiresInMinutes: flow.expiresInMinutes,
    testCode: flow.testCode,
    resendIn: flow.resendIn,
    busy: { requesting: flow.requesting, verifying },
    setChannel: flow.setChannel,
    sendCode: flow.sendCode,
    submitCode,
    goBack,
  };
}

export type OtpLogin = ReturnType<typeof useOtpLogin>;
