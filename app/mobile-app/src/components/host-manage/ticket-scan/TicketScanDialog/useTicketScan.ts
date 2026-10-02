import { useEffect, useRef, useState } from 'react';
import { useCameraPermissions } from 'expo-camera';
import type { CompanionRecordInput } from '@duncit/utils';

import { HostScanPodTicketDocument } from '@/graphql/host-manage';
import { graphqlRequest } from '@/services/graphql.client';
import { useTranslation } from '@/hooks/useTranslation';
import type { HostTicketScanResult } from '../scan.types';
import type { ScanTarget } from './types';

/** Scan state for one pod: camera permission, the in-flight call, the result
 * on screen and the confirmation overlay. */
export function useTicketScan(pod: ScanTarget | null, onClose: () => void) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState<HostTicketScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The scan that just FLIPPED the ticket — drives the confirmation overlay.
  // Kept separately from `result` so dismissing it leaves the pane's state.
  const [confirmed, setConfirmed] = useState<HostTicketScanResult | null>(null);
  // The token of the ticket on screen, so the second call — the one carrying
  // the group's details — scans the same ticket without another QR read.
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  // Closing does not cancel an in-flight scan, and the dialog stays mounted —
  // without this, a late response repopulates the cleared state and the next
  // open greets the host with the previous pod's ghost confirmation.
  const epochRef = useRef(0);

  useEffect(() => {
    epochRef.current += 1;
    setResult(null);
    setError(null);
    setConfirmed(null);
    setPendingToken(null);
    if (pod && permission && !permission.granted) {
      requestPermission().catch(() => undefined);
    }
  }, [pod]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (token: string, companions?: CompanionRecordInput[]) => {
    const epoch = epochRef.current;
    setBusy(true);
    setError(null);
    try {
      const res = await graphqlRequest(
        HostScanPodTicketDocument,
        { pod_doc_id: pod?.id ?? '', token, companions: companions ?? null },
        { auth: true },
      );
      if (epoch !== epochRef.current) return;
      const outcome = res.hostScanPodTicket as HostTicketScanResult;
      setPendingToken(token);
      setResult(outcome);
      // Freshly marked (not a re-scan of someone already in) → confirm it
      // unmissably. A one-line text swap read as "nothing happened".
      if (outcome.ok && !outcome.already_checked_in) setConfirmed(outcome);
    } catch (err) {
      if (epoch !== epochRef.current) return;
      setError(err instanceof Error ? err.message : t('mweb.hostManage.couldNotReadThatTicket'));
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    epochRef.current += 1;
    setResult(null);
    setError(null);
    setConfirmed(null);
    setPendingToken(null);
    onClose();
  };

  const scanNext = () => {
    setResult(null);
    setError(null);
  };

  return {
    t,
    permission,
    result,
    error,
    busy,
    confirmed,
    setConfirmed,
    pendingToken,
    submit,
    close,
    scanNext,
  };
}
