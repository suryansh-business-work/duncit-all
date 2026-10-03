import { useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { isChallengeExpired, twoFactorChallengeOf, type TwoFactorChallenge } from '../two-factor/challenge';
import { buildCompleteTwoFactorMutation, type SessionPayload } from './login-documents';

interface Options {
  extraUserFields: readonly string[];
  /** The page's own `acceptSession` — role gate, token write, redirect. Throws to refuse. */
  onSession: (payload?: SessionPayload | null) => void;
  /** The challenge ran out: back to the sign-in form with this message. */
  onExpired: (message: string) => void;
  resolveError: (error: unknown) => string;
}

/**
 * The authenticator step of a console sign-in.
 *
 * Either door — password or emailed code — may be refused with
 * TWO_FACTOR_REQUIRED; `intercept` recognises that refusal and opens the step
 * instead of showing it as an error. A correct code produces the same payload
 * the door would have, and goes through the page's same `acceptSession`.
 */
export function useTwoFactorLogin({ extraUserFields, onSession, onExpired, resolveError }: Readonly<Options>) {
  const document = useMemo(() => buildCompleteTwoFactorMutation(extraUserFields), [extraUserFields]);
  const [complete, { loading }] = useMutation(document);
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);

  /** True when `error` asked for the second step — the caller then shows nothing itself. */
  const intercept = (error: unknown): boolean => {
    const next = twoFactorChallengeOf(error);
    if (next) setChallenge(next);
    return next !== null;
  };

  const submit = async (code: string) => {
    if (!challenge) return;
    try {
      const res = await complete({ variables: { input: { challenge_token: challenge.token, code } } });
      onSession(res.data?.completeTwoFactorLogin);
    } catch (error) {
      if (isChallengeExpired(error)) {
        setChallenge(null);
        onExpired(resolveError(error));
        return;
      }
      throw new Error(resolveError(error));
    }
  };

  return {
    open: challenge !== null,
    busy: loading,
    intercept,
    submit,
    cancel: () => setChallenge(null),
  };
}
