import { useCallback, useState } from 'react';
import { logs } from '@duncit/logs';

import { RequestPodClubAdminHelpDocument } from '@/graphql/pod-help';
import { PodHelpSide, PodHelpStatus } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';

export { PodHelpSide };

export interface PodHelpOutcome {
  key: string;
  /** The theme colour the line is drawn in — mWeb's Alert severity, as a token. */
  color: '$success' | '$color' | '$warning' | '$danger';
  /** Whether the button stays so the request can be sent again. */
  retry: boolean;
}

/** The line each outcome reads as. mWeb twin: usePodClubAdminHelp (rule 27). */
const OUTCOME: Readonly<Record<PodHelpStatus, PodHelpOutcome>> = {
  [PodHelpStatus.Sent]: { key: 'mweb.podClubAdmin.askHelpSent', color: '$success', retry: false },
  [PodHelpStatus.AlreadyRequested]: {
    key: 'mweb.podClubAdmin.askHelpAlready',
    color: '$color',
    retry: false,
  },
  [PodHelpStatus.NoClubAdmin]: {
    key: 'mweb.podClubAdmin.askHelpNoAdmin',
    color: '$warning',
    retry: false,
  },
};

const FAILED: PodHelpOutcome = {
  key: 'mweb.podClubAdmin.askHelpFailed',
  color: '$danger',
  retry: true,
};

/**
 * Ask the pod's club admins for help, over email and WhatsApp.
 *
 * The outcome is kept against the pod it was asked for: the same sheet is
 * reopened on other pods, and one pod's "sent" must never show under another.
 */
export function usePodClubAdminHelp(podId: string | null, side: PodHelpSide) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ podId: string; outcome: PodHelpOutcome } | null>(null);

  const ask = useCallback(async () => {
    if (!podId) return;
    setLoading(true);
    try {
      const data = await graphqlRequest(
        RequestPodClubAdminHelpDocument,
        { pod_doc_id: podId, side },
        { auth: true },
      );
      setResult({ podId, outcome: OUTCOME[data.requestPodClubAdminHelp.status] });
    } catch (error) {
      setResult({ podId, outcome: FAILED });
      logs.mobileApp.error('usePodClubAdminHelp', 'ask', { error, pod_id: podId, side });
    } finally {
      setLoading(false);
    }
  }, [podId, side]);

  const outcome = result?.podId === podId ? result.outcome : null;
  return { ask, loading, outcome };
}
