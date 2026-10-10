import { useEffect, useRef, useState } from 'react';
import { parseCheckpointParam } from '@duncit/utils';

import { ReachPodChallengeCheckpointDocument } from '@/graphql/challenge-tools';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';

export interface CheckpointScanState {
  tone: 'success' | 'warning' | 'danger';
  message: string;
}

/**
 * A checkpoint's QR code opens the arena with `?checkpoint=<tool>.<code>` —
 * the RN twin of mWeb's useCheckpointScan (rule 27). Once the challenge has
 * loaded and the viewer is one of its competitors, the code is sent to the
 * server, which alone decides whether it is the right one; each scanned value
 * is sent once. Returns what to tell the viewer, or null.
 */
export function useCheckpointScan(
  challenge: PodChallengeView | null,
  scanned: string | undefined,
  adopt: (next: PodChallengeView) => void,
): CheckpointScanState | null {
  const { t } = useTranslation();
  const [state, setState] = useState<CheckpointScanState | null>(null);
  const sent = useRef('');
  const challengeId = challenge?.id ?? '';
  const competitorId = challenge?.viewer.my_competitor_id ?? '';

  useEffect(() => {
    if (!scanned || !challengeId || sent.current === scanned) return;
    const scan = parseCheckpointParam(scanned);
    if (!scan) {
      sent.current = scanned;
      setState({ tone: 'danger', message: t('mweb.challenge.tools.checkpointInvalid') });
      return;
    }
    if (!competitorId) {
      setState({ tone: 'warning', message: t('mweb.challenge.tools.checkpointNeedCompetitor') });
      return;
    }
    sent.current = scanned;
    graphqlRequest(
      ReachPodChallengeCheckpointDocument,
      { id: challengeId, toolInstanceId: scan.toolInstanceId, code: scan.code },
      { auth: true },
    )
      .then((res) => {
        adopt(res.reachPodChallengeCheckpoint);
        setState({ tone: 'success', message: t('mweb.challenge.tools.checkpointReached') });
      })
      .catch((e: unknown) => setState({ tone: 'danger', message: (e as Error).message }));
    // `sent` makes this a one-shot per scanned value, whatever else changes.
  }, [scanned, challengeId, competitorId, adopt, t]);

  return state;
}
