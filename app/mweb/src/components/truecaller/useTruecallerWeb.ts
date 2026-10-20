import { useEffect, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import {
  TRUECALLER_WEB_POLL_MS,
  TRUECALLER_WEB_TIMEOUT_MS,
  type TruecallerIntent,
  type TruecallerSignupProof,
} from '@duncit/utils';
import {
  LOGIN_WITH_TRUECALLER,
  START_TRUECALLER_WEB,
  TRUECALLER_CONFIG,
  TRUECALLER_WEB_STATE,
} from './queries';

export interface TruecallerOutcome {
  status: 'SIGNED_IN' | 'SIGNUP_REQUIRED';
  auth: { token: string; user: { onboarding_survey_completed?: boolean | null } } | null;
  signup: TruecallerSignupProof | null;
}

interface ConfigData {
  publicClientConfig: { truecaller_app_key: string; truecaller_partner_name: string } | null;
}
interface StartData {
  startTruecallerWebLogin: { request_nonce: string; deep_link: string };
}
interface StateData {
  truecallerWebState: string;
}
interface LoginData {
  loginWithTruecaller: TruecallerOutcome;
}

/** Why a run ended without an outcome — each has its own sentence. */
export type TruecallerWebFailure = 'NOT_INSTALLED' | 'DECLINED' | 'FAILED';

export class TruecallerWebError extends Error {
  constructor(readonly reason: TruecallerWebFailure) {
    super(reason);
  }
}

/** Truecaller's web flow only exists on Android, inside the Truecaller app. */
const isAndroidBrowser = () => /Android/i.test(globalThis.navigator?.userAgent ?? '');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Open Truecaller and tell whether it actually opened. Its sheet is another
 * app's activity, so the page loses focus or visibility within a moment; a
 * page that keeps both had nothing to hand the link to.
 */
function openTruecaller(deepLink: string): Promise<boolean> {
  return new Promise((resolve) => {
    let left = false;
    const away = () => {
      left = true;
    };
    globalThis.addEventListener('blur', away, { once: true });
    document.addEventListener('visibilitychange', away, { once: true });
    globalThis.location.href = deepLink;
    setTimeout(() => {
      globalThis.removeEventListener('blur', away);
      document.removeEventListener('visibilitychange', away);
      resolve(left);
    }, 1500);
  });
}

/**
 * Continue with Truecaller on mobile web: mint a nonce, open the Truecaller
 * app, wait for its callback to reach the server, then spend the nonce.
 * Native twin: app/mobile-app/src/components/TruecallerButton.
 */
export function useTruecallerWeb(intent: TruecallerIntent) {
  const client = useApolloClient();
  const config = useQuery<ConfigData>(TRUECALLER_CONFIG, { fetchPolicy: 'cache-first' });
  const [start] = useMutation<StartData>(START_TRUECALLER_WEB);
  const [login] = useMutation<LoginData>(LOGIN_WITH_TRUECALLER);
  const [busy, setBusy] = useState(false);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  const tc = config.data?.publicClientConfig;
  const available = isAndroidBrowser() && Boolean(tc?.truecaller_app_key && tc?.truecaller_partner_name);

  const waitForAnswer = async (nonce: string) => {
    const until = Date.now() + TRUECALLER_WEB_TIMEOUT_MS;
    while (live.current && Date.now() < until) {
      await sleep(TRUECALLER_WEB_POLL_MS);
      const { data } = await client.query<StateData>({
        query: TRUECALLER_WEB_STATE,
        variables: { nonce },
        fetchPolicy: 'network-only',
      });
      const state = data?.truecallerWebState ?? 'EXPIRED';
      if (state !== 'PENDING') return state;
    }
    return 'EXPIRED';
  };

  const run = async (): Promise<TruecallerOutcome> => {
    setBusy(true);
    try {
      const lang = document.documentElement.lang.slice(0, 2);
      const started = (await start({ variables: { intent, lang } })).data?.startTruecallerWebLogin;
      if (!started) throw new TruecallerWebError('FAILED');
      if (!(await openTruecaller(started.deep_link))) throw new TruecallerWebError('NOT_INSTALLED');
      if ((await waitForAnswer(started.request_nonce)) !== 'READY') throw new TruecallerWebError('DECLINED');
      const res = await login({
        variables: { input: { platform: 'WEB', request_nonce: started.request_nonce } },
      });
      const outcome = res.data?.loginWithTruecaller;
      if (!outcome) throw new TruecallerWebError('FAILED');
      return outcome;
    } finally {
      if (live.current) setBusy(false);
    }
  };

  return { available, busy, run };
}
