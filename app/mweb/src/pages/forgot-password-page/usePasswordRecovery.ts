import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  recoveryAfterComplete,
  recoveryAfterVerify,
  recoveryBack,
  recoveryLookup,
  type PasswordRecoveryChannel,
  type ContactDraft,
} from '@duncit/utils';
import {
  useCodeRequest,
  type CodeRequestOutcome,
} from '../../components/password-recovery/useCodeRequest';
import {
  COMPLETE_PASSWORD_RESET,
  REQUEST_PASSWORD_RESET_CODE,
  VERIFY_PASSWORD_RESET_CODE,
} from './queries';

/**
 * The three-step recovery flow: the shared send-a-code half out of
 * `useCodeRequest`, plus the two steps only recovery has — proving the code
 * for a grant, and spending that grant on a new password.
 *
 * The steps live in one hook rather than one route each because they are one
 * transaction: the grant step two earns is spent by step three and by nothing
 * else, so a reload between them has to start over anyway. The native twin
 * holds the same shape in its own screen (rule 27).
 */
export function usePasswordRecovery() {
  const [requestCode] = useMutation<any>(REQUEST_PASSWORD_RESET_CODE);
  const [verifyCode, { loading: verifying }] = useMutation<any>(VERIFY_PASSWORD_RESET_CODE);
  const [completeReset, { loading: saving }] = useMutation<any>(COMPLETE_PASSWORD_RESET);

  const send = useCallback(
    async (
      channel: PasswordRecoveryChannel,
      draft: Readonly<ContactDraft>,
    ): Promise<CodeRequestOutcome> => {
      const res = await requestCode({ variables: { input: recoveryLookup(channel, draft) } });
      const result = res.data?.requestPasswordResetCode;
      return {
        registered: Boolean(result?.registered),
        resendAfterSeconds: result?.resend_after_seconds ?? 30,
        expiresInMinutes: result?.expires_in_minutes ?? 10,
        testCode: result?.test_code ?? null,
      };
    },
    [requestCode],
  );

  const flow = useCodeRequest(send);
  const { state, advance, fail } = flow;

  const submitCode = useCallback(
    async (otp: string) => {
      try {
        const res = await verifyCode({
          variables: {
            input: { ...recoveryLookup(state.channel, state.draft), otp: otp.trim() },
          },
        });
        const token = res.data?.verifyPasswordResetCode?.reset_token;
        if (!token) return;
        advance((prev) => recoveryAfterVerify(prev, token));
      } catch (e) {
        fail(e);
      }
    },
    [advance, fail, verifyCode, state.channel, state.draft],
  );

  const submitPassword = useCallback(
    async (newPassword: string) => {
      try {
        await completeReset({
          variables: { input: { reset_token: state.resetToken, new_password: newPassword } },
        });
        advance(recoveryAfterComplete);
      } catch (e) {
        fail(e);
      }
    },
    [advance, fail, completeReset, state.resetToken],
  );

  const goBack = useCallback(() => {
    advance(recoveryBack);
  }, [advance]);

  return {
    state,
    error: flow.error,
    notFound: flow.notFound,
    expiresInMinutes: flow.expiresInMinutes,
    testCode: flow.testCode,
    resendIn: flow.resendIn,
    busy: { requesting: flow.requesting, verifying, saving },
    setChannel: flow.setChannel,
    sendCode: flow.sendCode,
    submitCode,
    submitPassword,
    goBack,
  };
}

export type PasswordRecovery = ReturnType<typeof usePasswordRecovery>;
