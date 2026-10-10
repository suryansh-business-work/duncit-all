import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { fireAndForget, logs } from '@duncit/logs';
import { CHECKPOINT_PARAM, parseCheckpointParam } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { notifyError } from '../../components/notify';
import type { PodChallengeView } from '../../components/pod-challenge/queries';
import { useChallengeToolActions } from '../../components/pod-challenge/useChallengeToolActions';

/**
 * A checkpoint's QR code opens the arena with `?checkpoint=<tool>.<code>`.
 * Once the challenge has loaded and the viewer is one of its competitors, the
 * code is sent to the server — which alone decides whether it is the right one
 * — and the parameter is dropped, so a refresh or a shared link never checks
 * in twice. Returns whether a scan is waiting on the viewer becoming a
 * competitor (signed out, or not on the roster), for the page to say so.
 */
export function useCheckpointScan(challenge: PodChallengeView | null): boolean {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const raw = params.get(CHECKPOINT_PARAM);
  const challengeId = challenge?.id ?? '';
  const competitorId = challenge?.viewer.my_competitor_id ?? '';
  const actions = useChallengeToolActions(challengeId);
  const sent = useRef('');

  useEffect(() => {
    if (!raw || !challengeId || sent.current === raw) return;
    const clear = () => {
      const next = new URLSearchParams(params);
      next.delete(CHECKPOINT_PARAM);
      setParams(next, { replace: true });
    };
    const scan = parseCheckpointParam(raw);
    if (!scan) {
      sent.current = raw;
      notifyError(t('mweb.challenge.tools.checkpointInvalid'));
      clear();
      return;
    }
    if (!competitorId) return;
    sent.current = raw;
    fireAndForget(actions.checkpoint(scan.toolInstanceId, scan.code).then(clear), logs.mWeb, 'pod-challenge-arena', 'checkpoint');
    // `actions` is a new object every render, so this effect re-runs often;
    // `sent` is what makes the scan itself a one-shot per scanned value.
  }, [raw, challengeId, competitorId, actions, params, setParams, t]);

  return !!raw && !!challengeId && !competitorId;
}
