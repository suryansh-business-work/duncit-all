import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  emptyContactDraft,
  initialRecoveryState,
  recoveryAfterComplete,
  recoveryAfterSend,
  recoveryAfterVerify,
  recoveryBack,
  recoveryLookup,
  recoveryWithChannel,
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
 * The three-step recovery flow: the Apollo calls, and the shared state machine
 * they move.
 *
 * The steps live in one hook rather than one route each because they are one
 * transaction: the grant step two earns is spent by step three and by nothing
 * else, so a reload between them has to start over anyway. Putting it in the
 * URL would only offer a step whose credential no longer exists.
 *
 * The native twin holds the same shape in its own screen (rule 27), and every
 * transition below is `@duncit/utils`' — only the transport differs (rule 40).
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

  const setChannel = useCallback((channel: PasswordRecoveryChannel) => {
    // The refusal belonged to the value that earned it — keeping it across a
    // channel switch would flag a box nobody has typed in yet.
    setNotFound(false);
    setError(null);
    setState((prev) => recoveryWithChannel(prev, channel));
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
          variables: { input: recoveryLookup(state.channel, draft) },
        });
        const result = res.data?.requestPasswordResetCode;
        if (!result?.registered) {
          setNotFound(true);
          return;
        }
        setExpiresInMinutes(result.expires_in_minutes);
        setTestCode(result.test_code ?? null);
        setState((prev) => recoveryAfterSend(prev, draft, result.resend_after_seconds));
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
          variables: {
            input: { ...recoveryLookup(state.channel, state.draft), otp: otp.trim() },
          },
        });
        const token = res.data?.verifyPasswordResetCode?.reset_token;
        if (!token) return;
        setState((prev) => recoveryAfterVerify(prev, token));
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
        setState(recoveryAfterComplete);
      } catch (e) {
        setError(parseApiError(e));
      }
    },
    [completeReset, state.resetToken],
  );

  const goBack = useCallback(() => {
    setError(null);
    setState(recoveryBack);
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
