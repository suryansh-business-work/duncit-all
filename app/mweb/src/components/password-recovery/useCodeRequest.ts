import { useCallback, useEffect, useState } from 'react';
import {
  emptyContactDraft,
  initialRecoveryState,
  recoveryAfterSend,
  recoveryResendSeconds,
  recoveryWithChannel,
  type ContactDraft,
  type PasswordRecoveryChannel,
  type PasswordRecoveryState,
} from '@duncit/utils';
import { parseApiError } from '../../utils/parseApiError';

/** What a send came back with — the shape both request mutations answer in. */
export interface CodeRequestOutcome {
  registered: boolean;
  resendAfterSeconds: number;
  expiresInMinutes: number;
  /** Echoed back only while no medium could really carry the code. */
  testCode: string | null;
}

/**
 * The "send me a code" half every code flow shares: the channel choice, the
 * send, the not-found refusal, and the resend cooldown ticking down.
 *
 * Password recovery and Continue with OTP differ only in WHICH mutation sends
 * and what a correct code does afterwards — so each passes its `send` in and
 * keeps its own verify, reaching state through `advance` and `fail`. The
 * mechanics living once is what keeps the two flows' cooldowns, refusals and
 * error handling from drifting (rule 40). Native twin:
 * app/mobile-app/src/hooks/useCodeRequest.ts.
 */
export function useCodeRequest(
  send: (channel: PasswordRecoveryChannel, draft: Readonly<ContactDraft>) => Promise<CodeRequestOutcome>,
) {
  const [state, setState] = useState<PasswordRecoveryState>(() =>
    initialRecoveryState(emptyContactDraft()),
  );
  const [error, setError] = useState<string | null>(null);
  /** True once a destination came back with no account behind it. */
  const [notFound, setNotFound] = useState(false);
  const [expiresInMinutes, setExpiresInMinutes] = useState(10);
  const [testCode, setTestCode] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [requesting, setRequesting] = useState(false);

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
    const timer = globalThis.setInterval(tick, 1000);
    return () => globalThis.clearInterval(timer);
  }, [lastSentAt, resendAfterSeconds]);

  const setChannel = useCallback((channel: PasswordRecoveryChannel) => {
    // The refusal belonged to the value that earned it — keeping it across a
    // channel switch would flag a box nobody has typed in yet.
    setNotFound(false);
    setError(null);
    setState((prev) => recoveryWithChannel(prev, channel));
  }, []);

  /**
   * Send a code. Step one AND Resend, because they are the same request — the
   * server replaces the live challenge rather than stacking a second one, so
   * re-asking is the only thing "resend" can mean.
   */
  const sendCode = useCallback(
    async (draft: Readonly<ContactDraft>) => {
      setError(null);
      setNotFound(false);
      setRequesting(true);
      try {
        const result = await send(state.channel, draft);
        if (!result.registered) {
          setNotFound(true);
          return;
        }
        setExpiresInMinutes(result.expiresInMinutes);
        setTestCode(result.testCode);
        setState((prev) => recoveryAfterSend(prev, draft, result.resendAfterSeconds));
      } catch (e) {
        setError(parseApiError(e));
      } finally {
        setRequesting(false);
      }
    },
    [send, state.channel],
  );

  /** A verify step's way to move the flow on (clears any standing error). */
  const advance = useCallback((move: (prev: PasswordRecoveryState) => PasswordRecoveryState) => {
    setError(null);
    setState(move);
  }, []);

  /** A verify step's way to report what the server refused. */
  const fail = useCallback((e: unknown) => setError(parseApiError(e)), []);

  return {
    state,
    error,
    notFound,
    expiresInMinutes,
    testCode,
    resendIn,
    requesting,
    setChannel,
    sendCode,
    advance,
    fail,
  };
}

export type CodeRequest = ReturnType<typeof useCodeRequest>;
