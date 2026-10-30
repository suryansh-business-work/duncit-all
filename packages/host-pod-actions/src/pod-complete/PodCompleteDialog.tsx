import { useEffect, useMemo, useState } from 'react';
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
import { isFreePod, isFreeVenueOfferModel } from '@duncit/utils';
import { venueExtraAmountOf, venueUsageInput } from '@duncit/forms/schemas';
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

/** Host completes a pod. A paid pod at a venue uploads the venue's final bill
 * (its total + the file) as proof of the agreed amount, and enters anything the
 * venue charged beyond it as extra charges. The split is previewed live; on
 * submit the payout releases are created for Finance to approve — nothing is
 * credited until then. A venue that gave the booking free is owed no bill
 * unless it charged extras. */
export default function PodCompleteDialog({ pod, onClose, onCompleted }: Readonly<Props>) {
  const { labels, notifySuccess } = useHostPodActionsConfig();
  // A free pod's host settles the venue directly — no bill is asked for here.
  const free = isFreePod(pod?.pod_type);
  const hasVenue = !!pod?.venue_id && !free;
  // The agreed terms arrive with the settlement preview below.
  const [agreedModel, setAgreedModel] = useState<string | null>(null);
  const freeVenue = hasVenue && isFreeVenueOfferModel(agreedModel);
  const { control, handleSubmit, reset, watch } = useForm<PodCompleteValues, any, PodCompleteValues>({
    resolver: zodResolver(buildPodCompleteSchema(hasVenue, labels, freeVenue)) as unknown as Resolver<PodCompleteValues, any, PodCompleteValues>,
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
  // Paid on top of the agreed amount, so the preview re-prices as they are typed.
  const venueExtra = venueExtraAmountOf(watch('venue_extra_amount'));
  // The venue's usage prices the slot, so the preview re-prices as it is typed.
  const paxTyped = watch('venue_pax');
  const overtimeTyped = watch('overtime_hours');
  const venueUsage = useMemo(
    () => venueUsageInput({ venue_pax: paxTyped, overtime_hours: overtimeTyped }),
    [paxTyped, overtimeTyped],
  );
  // Read once: the dialog only submits while a pod is open, so the id the
  // write carries is settled here rather than re-checked inside the handler.
  const podId = pod?.id ?? '';

  const submit = handleSubmit(async (values) => {
    try {
      await complete({ variables: { input: buildCompleteInput(values, podId) } });
      notifySuccess(free ? labels.shareFreeCompleted : labels.venueBill.sentToFinance);
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
          noValidate
          onSubmit={submit}
          spacing={2}
          sx={{ pt: 0.5 }}
        >
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {free ? labels.completeHintFree : labels.completeHint}
          </Typography>
          {hasVenue && <VenueBillFields control={control} billOptional={freeVenue} />}
          {pod && <PodMediaSummary podId={pod.id} />}
          {pod && (
            <SettlementPreview
              podId={pod.id}
              venueBillAmount={billAmount}
              venueExtraAmount={venueExtra}
              venueUsage={venueUsage}
              refreshToken={scansDone}
              free={free}
              onScan={() => setScanOpen(true)}
              onAgreedModel={setAgreedModel}
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
