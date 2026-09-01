import { useCallback, useState } from 'react';
import { recoveryLookup, type ContactDraft, type PasswordRecoveryChannel } from '@duncit/utils';

import { useCodeRequest, type CodeRequestOutcome } from '@/hooks/useCodeRequest';
import { loginWithOtp, requestLoginOtp } from '@/services/auth.service';

/**
 * Continue with OTP: the shared send-a-code half out of `useCodeRequest`, plus
 * the one step only sign-in has — a correct code flips the auth gate through
 * `onAuthed`, so the flow ends at the code step. Twin of mWeb's
 * src/pages/login-page/useOtpLogin.ts (rule 27).
 */
export function useOtpLogin(
  onAuthed: (token: string, surveyCompleted: boolean) => void,
  fallbackMessage: string,
) {
  const [verifying, setVerifying] = useState(false);

  const send = useCallback(
    async (
      channel: PasswordRecoveryChannel,
      draft: Readonly<ContactDraft>,
    ): Promise<CodeRequestOutcome> => requestLoginOtp(recoveryLookup(channel, draft)),
    [],
  );

  const flow = useCodeRequest(send, fallbackMessage);
  const { state, advance, fail } = flow;

  const submitCode = useCallback(
    async (otp: string) => {
      setVerifying(true);
      try {
        const result = await loginWithOtp(recoveryLookup(state.channel, state.draft), otp);
        onAuthed(result.token, result.surveyCompleted);
      } catch (e) {
        fail(e);
      } finally {
        setVerifying(false);
      }
    },
    [fail, onAuthed, state.channel, state.draft],
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
