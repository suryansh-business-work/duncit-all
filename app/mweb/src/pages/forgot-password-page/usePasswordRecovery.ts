import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  emptyContactDraft,
  initialRecoveryState,
  previousRecoveryStep,
  type ContactDraft,
  type PasswordRecoveryChannel,
  type PasswordRecoveryState,
} from '@duncit/utils';
import { parseApiError } from '../../utils/parseApiError';
import {
  COMPLETE_PASSWORD_RESET,
  REQUEST_PASSWORD_RESET_CODE,
  VERIFY_PASSWORD_RESET_CODE,
} from './queries';

/**
 * The three-step recovery flow, as one piece of state and four actions.
 *
 * The steps live in one hook rather than one route each because they are one
 * transaction: the grant step two earns is spent by step three and by nothing
 * else, so a reload between them has to start over anyway. Putting it in the
 * URL would only offer a step whose credential no longer exists.
 *
 * The native twin holds the same shape in its own screen (rule 27); the step
 * machine and every label they share come from `@duncit/utils` (rule 40).
 */
export function usePasswordRecovery() {
  const [state, setState] = useState<PasswordRecoveryState>(() =>
    initialRecoveryState(emptyContactDraft()),
  );
  const [error, setError] = useState<string | null>(null);
  /** True once a destination came back with no account behind it. */
  const [notFound, setNotFound] = useState(false);
  /** How long the code lasts, as the server reported it. */
  const [expiresInMinutes, setExpiresInMinutes] = useState(10);
  /** The code echoed back while no medium can really carry it. */
  const [testCode, setTestCode] = useState<string | null>(null);

  const [requestCode, { loading: requesting }] = useMutation<any>(REQUEST_PASSWORD_RESET_CODE);
  const [verifyCode, { loading: verifying }] = useMutation<any>(VERIFY_PASSWORD_RESET_CODE);
  const [completeReset, { loading: saving }] = useMutation<any>(COMPLETE_PASSWORD_RESET);

  /** What identifies the account, in the shape all three mutations take. */
  const lookupOf = (channel: PasswordRecoveryChannel, draft: Readonly<ContactDraft>) =>
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
      try {
        const res = await requestCode({
          variables: { input: lookupOf(state.channel, draft) },
        });
        const result = res.data?.requestPasswordResetCode;
        if (!result?.registered) {
          setNotFound(true);
          return;
        }
        setExpiresInMinutes(result.expires_in_minutes ?? 10);
        setTestCode(result.test_code ?? null);
        setState((prev) => ({
          ...prev,
          step: 'CODE',
          draft: { ...draft },
          lastSentAt: Date.now(),
          resendAfterSeconds: result.resend_after_seconds ?? prev.resendAfterSeconds,
        }));
      } catch (e) {
        setError(parseApiError(e));
      }
    },
    [requestCode, state.channel],
  );

  const submitCode = useCallback(
    async (otp: string) => {
      setError(null);
      try {
        const res = await verifyCode({
          variables: { input: { ...lookupOf(state.channel, state.draft), otp: otp.trim() } },
        });
        const token = res.data?.verifyPasswordResetCode?.reset_token;
        if (!token) return;
        setState((prev) => ({ ...prev, step: 'PASSWORD', resetToken: token }));
      } catch (e) {
        setError(parseApiError(e));
      }
    },
    [verifyCode, state.channel, state.draft],
  );

  const submitPassword = useCallback(
    async (newPassword: string) => {
      setError(null);
      try {
        await completeReset({
          variables: { input: { reset_token: state.resetToken, new_password: newPassword } },
        });
        setState((prev) => ({ ...prev, step: 'DONE', resetToken: '' }));
      } catch (e) {
        setError(parseApiError(e));
      }
    },
    [completeReset, state.resetToken],
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
    busy: { requesting, verifying, saving },
    setChannel,
    sendCode,
    submitCode,
    submitPassword,
    goBack,
  };
}

export type PasswordRecovery = ReturnType<typeof usePasswordRecovery>;
