import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useCallback, useState } from 'react';
import { logs } from '@duncit/logs';

const REQUEST_POD_CLUB_ADMIN_HELP = gql`
  mutation RequestPodClubAdminHelp($pod_doc_id: ID!, $side: PodHelpSide!) {
    requestPodClubAdminHelp(pod_doc_id: $pod_doc_id, side: $side) {
      status
      notified
    }
  }
`;

/** Which side of the pod is asking — the host's club-admin dialog or the venue's pod sheet. */
export type PodHelpSide = 'HOST' | 'VENUE';

type PodHelpStatus = 'SENT' | 'ALREADY_REQUESTED' | 'NO_CLUB_ADMIN';

export interface PodHelpOutcome {
  key: string;
  severity: 'success' | 'info' | 'warning' | 'error';
}

/** The line each outcome reads as. Native twin: usePodClubAdminHelp (rule 27). */
const OUTCOME: Readonly<Record<PodHelpStatus, PodHelpOutcome>> = {
  SENT: { key: 'mweb.podClubAdmin.askHelpSent', severity: 'success' },
  ALREADY_REQUESTED: { key: 'mweb.podClubAdmin.askHelpAlready', severity: 'info' },
  NO_CLUB_ADMIN: { key: 'mweb.podClubAdmin.askHelpNoAdmin', severity: 'warning' },
};

const FAILED: PodHelpOutcome = { key: 'mweb.podClubAdmin.askHelpFailed', severity: 'error' };

/**
 * Ask the pod's club admins for help, over email and WhatsApp.
 *
 * The outcome is kept against the pod it was asked for: the same dialog is
 * reopened on other pods, and one pod's "sent" must never show under another.
 */
export function usePodClubAdminHelp(podId: string | null, side: PodHelpSide) {
  const [request, { loading }] = useMutation<any>(REQUEST_POD_CLUB_ADMIN_HELP);
  const [result, setResult] = useState<{ podId: string; outcome: PodHelpOutcome } | null>(null);

  const ask = useCallback(async () => {
    if (!podId) return;
    try {
      const { data } = await request({ variables: { pod_doc_id: podId, side } });
      const status: PodHelpStatus | undefined = data?.requestPodClubAdminHelp?.status;
      setResult({ podId, outcome: status ? OUTCOME[status] : FAILED });
    } catch (error) {
      setResult({ podId, outcome: FAILED });
      logs.mWeb.error('usePodClubAdminHelp', 'ask', { error, pod_id: podId, side });
    }
  }, [podId, side, request]);

  const outcome = result?.podId === podId ? result.outcome : null;
  return { ask, loading, outcome };
}
