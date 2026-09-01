import { useCallback, useState } from 'react';
import {
  recoveryAfterComplete,
  recoveryAfterVerify,
  recoveryBack,
  recoveryLookup,
  type ContactDraft,
  type PasswordRecoveryChannel,
} from '@duncit/utils';

import { useCodeRequest, type CodeRequestOutcome } from '@/hooks/useCodeRequest';
import {
  completePasswordReset,
  requestPasswordResetCode,
  verifyPasswordResetCode,
} from '@/services/auth.service';

/**
 * The three-step recovery flow: the shared send-a-code half out of
 * `useCodeRequest`, plus the two steps only recovery has — proving the code
 * for a grant, and spending that grant on a new password. Twin of mWeb's
 * src/pages/forgot-password-page/usePasswordRecovery.ts (rule 27).
 */
export function usePasswordRecovery(fallbackMessage: string) {
  const [busy, setBusy] = useState({ verifying: false, saving: false });

  const send = useCallback(
    async (
      channel: PasswordRecoveryChannel,
      draft: Readonly<ContactDraft>,
    ): Promise<CodeRequestOutcome> => requestPasswordResetCode(recoveryLookup(channel, draft)),
    [],
  );

  const flow = useCodeRequest(send, fallbackMessage);
  const { state, advance, fail } = flow;

  const submitCode = useCallback(
    async (otp: string) => {
      setBusy((b) => ({ ...b, verifying: true }));
      try {
        const token = await verifyPasswordResetCode(
          recoveryLookup(state.channel, state.draft),
          otp,
        );
        advance((prev) => recoveryAfterVerify(prev, token));
      } catch (e) {
        fail(e);
      } finally {
        setBusy((b) => ({ ...b, verifying: false }));
      }
    },
    [advance, fail, state.channel, state.draft],
  );

  const submitPassword = useCallback(
    async (newPassword: string) => {
      setBusy((b) => ({ ...b, saving: true }));
      try {
        await completePasswordReset(state.resetToken, newPassword);
        advance(recoveryAfterComplete);
      } catch (e) {
        fail(e);
      } finally {
        setBusy((b) => ({ ...b, saving: false }));
      }
    },
    [advance, fail, state.resetToken],
  );

  const goBack = useCallback(() => {
    advance(recoveryBack);
  }, [advance]);

  return {
    state,
    error: flow.error,
    notFound: flow.notFound,
    notSent: flow.notSent,
    expiresInMinutes: flow.expiresInMinutes,
    testCode: flow.testCode,
    resendIn: flow.resendIn,
    busy: { requesting: flow.requesting, verifying: busy.verifying, saving: busy.saving },
    setChannel: flow.setChannel,
    sendCode: flow.sendCode,
    submitCode,
    submitPassword,
    goBack,
  };
}

export type PasswordRecovery = ReturnType<typeof usePasswordRecovery>;
