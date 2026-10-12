import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import SettlementPreview from './SettlementPreview';
import PodMediaSummary from './PodMediaSummary';
import VenueBillFields from './VenueBillFields';
import TicketScanDialog from '../ticket-scan/TicketScanDialog';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import { COMPLETE_POD } from '../queries';
import type { HostPodForComplete } from '../types';
import {
  blankPodCompleteValues,
  buildCompleteInput,
  buildPodCompleteSchema,
  type PodCompleteValues,
} from './pod-complete.form';

export { blankPodCompleteValues, buildCompleteInput, buildPodCompleteSchema };
export type { PodCompleteValues };

interface Props {
  pod: HostPodForComplete | null;
  onClose: () => void;
  onCompleted: () => void;
}

/** Host completes a pod: optionally enter the venue's final bill. The split is
 * previewed live; on submit the payout releases are created for Finance to
 * approve — nothing is credited until then. */
export default function PodCompleteDialog({ pod, onClose, onCompleted }: Readonly<Props>) {
  const { labels, notifySuccess } = useHostPodActionsConfig();
  const hasVenue = !!pod?.venue_id;
  const { control, handleSubmit, reset, watch } = useForm<PodCompleteValues, any, PodCompleteValues>({
    resolver: zodResolver(buildPodCompleteSchema(hasVenue, labels)) as unknown as Resolver<PodCompleteValues, any, PodCompleteValues>,
    defaultValues: blankPodCompleteValues,
  });
  const [complete, completeState] = useMutation<any>(COMPLETE_POD);
  const [scanOpen, setScanOpen] = useState(false);
  // Bumped when the scanner closes so the preview re-reads: a scan changes who
  // attended, and the payout is computed from exactly that.
  const [scansDone, setScansDone] = useState(0);

  useEffect(() => {
    reset(blankPodCompleteValues);
  }, [pod, reset]);

  const billAmount = Math.max(0, Number(watch('venue_bill_amount')) || 0);
  const includeSlotPrice = watch('include_slot_price');
  // Read once: the dialog only submits while a pod is open, so the id the
  // write carries is settled here rather than re-checked inside the handler.
  const podId = pod?.id ?? '';

  const submit = handleSubmit(async (values) => {
    try {
      await complete({ variables: { input: buildCompleteInput(values, podId) } });
      notifySuccess(labels.venueBill.sentToFinance);
      onCompleted();
    } catch {
      // completeState.error, read below, is what renders the failure.
    }
  });

  return (
    <Dialog
      open={!!pod}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      data-testid="pod-complete-dialog"
    >
      <DialogTitle sx={{ fontWeight: 700 }}>{labels.completePod}</DialogTitle>
      <DialogContent dividers>
        <Stack
          component="form"
          id="pod-complete-form"
          onSubmit={submit}
          spacing={2}
          sx={{ pt: 0.5 }}
        >
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {labels.completeHint}
          </Typography>
          {hasVenue && <VenueBillFields control={control} billAmount={billAmount} />}
          {pod && <PodMediaSummary podId={pod.id} />}
          {pod && (
            <SettlementPreview
              podId={pod.id}
              venueBillAmount={billAmount}
              includeSlotPrice={billAmount > 0 && includeSlotPrice}
              refreshToken={scansDone}
              onScan={() => setScanOpen(true)}
            />
          )}
          {completeState.error && (
            <Alert severity="error" data-testid="pod-complete-error">
              {completeState.error.message}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton
          onClick={onClose}
          disabled={completeState.loading}
          data-testid="pod-complete-cancel"
        >
          {labels.cancel}
        </DuncitButton>
        <DuncitButton
          type="submit"
          form="pod-complete-form"
          variant="contained"
          loading={completeState.loading}
          data-testid="pod-complete-submit"
          sx={{ borderRadius: 999, fontWeight: 700 }}
        >
          {completeState.loading ? labels.completing : labels.completePod}
        </DuncitButton>
      </DialogActions>
      {/* Attendance is only ever created by scanning a ticket — the same
          check-in dialog the host uses at the door. Closing it re-reads the
          preview, so a newly scanned guest moves into the attended list and the
          payout recomputes. */}
      <TicketScanDialog
        pod={scanOpen && pod ? { id: pod.id, pod_title: pod.pod_title } : null}
        onClose={() => {
          setScanOpen(false);
          setScansDone((n) => n + 1);
        }}
      />
    </Dialog>
  );
}
