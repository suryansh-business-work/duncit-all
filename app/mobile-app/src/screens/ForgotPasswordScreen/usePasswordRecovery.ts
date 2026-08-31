import { useCallback, useEffect, useState } from 'react';
import {
  emptyContactDraft,
  initialRecoveryState,
  previousRecoveryStep,
  recoveryResendSeconds,
  type ContactDraft,
  type PasswordRecoveryChannel,
  type PasswordRecoveryState,
} from '@duncit/utils';

import {
  completePasswordReset,
  requestPasswordResetCode,
  verifyPasswordResetCode,
  type PasswordResetLookup,
} from '@/services/auth.service';
import { toErrorMessage } from '@/utils/errors';

/**
 * The three-step recovery flow, as one piece of state and four actions.
 * Twin of mWeb's src/pages/forgot-password-page/usePasswordRecovery.ts.
 *
 * The steps live in one screen rather than one route each because they are one
 * transaction: the grant step two earns is spent by step three and by nothing
 * else, so a navigation entry for either would offer a step whose credential no
 * longer exists.
 */
export function usePasswordRecovery(fallbackMessage: string) {
  const [state, setState] = useState<PasswordRecoveryState>(() =>
    initialRecoveryState(emptyContactDraft()),
  );
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [expiresInMinutes, setExpiresInMinutes] = useState(10);
  const [testCode, setTestCode] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [busy, setBusy] = useState({ requesting: false, verifying: false, saving: false });

  const { lastSentAt, resendAfterSeconds } = state;

  /*
    The cooldown ticks here rather than inside the step, so the step stays a
    form and re-rendering it once a second does not remount the box somebody is
    typing a code into. The interval only exists while there is something to
    count down.
  */
  useEffect(() => {
    if (lastSentAt === null) {
      setResendIn(0);
      return undefined;
    }
    const tick = () => setResendIn(recoveryResendSeconds({ lastSentAt, resendAfterSeconds }));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [lastSentAt, resendAfterSeconds]);

  /** What identifies the account, in the shape all three calls take. */
  const lookupOf = (
    channel: PasswordRecoveryChannel,
    draft: Readonly<ContactDraft>,
  ): PasswordResetLookup =>
    channel === 'EMAIL'
      ? { channel, email: draft.email.trim().toLowerCase() }
      : {
          channel,
          phone_extension: draft.extension.trim(),
          phone_number: draft.number.trim(),
        };

  const setChannel = useCallback((channel: PasswordRecoveryChannel) => {
    // The refusal belonged to the value that earned it — keeping it across a
    // channel switch would flag a box nobody has typed in yet.
    setNotFound(false);
    setError(null);
    setState((prev) => ({ ...prev, channel }));
  }, []);

  /**
   * Send a code. Used by step one AND by Resend, because they are the same
   * request — the server replaces the live challenge rather than stacking a
   * second one, so re-asking is the only thing "resend" can mean.
   */
  const sendCode = useCallback(
    async (draft: Readonly<ContactDraft>) => {
      setError(null);
      setNotFound(false);
      setBusy((b) => ({ ...b, requesting: true }));
      try {
        const result = await requestPasswordResetCode(lookupOf(state.channel, draft));
        if (!result.registered) {
          setNotFound(true);
          return;
        }
        setExpiresInMinutes(result.expiresInMinutes);
        setTestCode(result.testCode);
        setState((prev) => ({
          ...prev,
          step: 'CODE',
          draft: { ...draft },
          lastSentAt: Date.now(),
          resendAfterSeconds: result.resendAfterSeconds,
        }));
      } catch (e) {
        setError(toErrorMessage(e, fallbackMessage));
      } finally {
        setBusy((b) => ({ ...b, requesting: false }));
      }
    },
    [fallbackMessage, state.channel],
  );

  const submitCode = useCallback(
    async (otp: string) => {
      setError(null);
      setBusy((b) => ({ ...b, verifying: true }));
      try {
        const token = await verifyPasswordResetCode(lookupOf(state.channel, state.draft), otp);
        setState((prev) => ({ ...prev, step: 'PASSWORD', resetToken: token }));
      } catch (e) {
        setError(toErrorMessage(e, fallbackMessage));
      } finally {
        setBusy((b) => ({ ...b, verifying: false }));
      }
    },
    [fallbackMessage, state.channel, state.draft],
  );

  const submitPassword = useCallback(
    async (newPassword: string) => {
      setError(null);
      setBusy((b) => ({ ...b, saving: true }));
      try {
        await completePasswordReset(state.resetToken, newPassword);
        setState((prev) => ({ ...prev, step: 'DONE', resetToken: '' }));
      } catch (e) {
        setError(toErrorMessage(e, fallbackMessage));
      } finally {
        setBusy((b) => ({ ...b, saving: false }));
      }
    },
    [fallbackMessage, state.resetToken],
  );

  const goBack = useCallback(() => {
    setError(null);
    setState((prev) => {
      const step = previousRecoveryStep(prev.step);
      return step ? { ...prev, step } : prev;
    });
  }, []);

  return {
    state,
    error,
    notFound,
    expiresInMinutes,
    testCode,
    resendIn,
    busy,
    setChannel,
    sendCode,
    submitCode,
    submitPassword,
    goBack,
  };
}

export type PasswordRecovery = ReturnType<typeof usePasswordRecovery>;
