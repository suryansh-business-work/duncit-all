import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SettlementPreview from './SettlementPreview';
import TicketScanDialog from '../ticket-scan/TicketScanDialog';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import { COMPLETE_POD } from '../queries';
import { hasMediaLine, mediaTextToInput } from '../media-text';
import type { HostPodActionLabels } from '../labels';
import type { HostPodForComplete } from '../types';

export interface PodCompleteValues {
  venue_bill_amount: string;
  media_text: string;
}

export const blankPodCompleteValues: PodCompleteValues = {
  venue_bill_amount: '',
  media_text: '',
};

/** Schema depends on whether the pod has a venue: only then is a bill amount required. */
export const buildPodCompleteSchema = (hasVenue: boolean, labels: HostPodActionLabels) =>
  z
    .object({
      venue_bill_amount: z.string().trim(),
      media_text: z.string().refine(hasMediaLine, labels.partyMediaRequired),
    })
    .superRefine((values, ctx) => {
      if (!hasVenue) return;
      const amount = Number(values.venue_bill_amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['venue_bill_amount'],
          message: labels.venueBillRequired,
        });
      }
    });

/** Maps the validated values onto the server's CompletePodInput. */
export function buildCompleteInput(values: PodCompleteValues, podId: string) {
  return {
    pod_id: podId,
    venue_bill_amount: Number(values.venue_bill_amount) || 0,
    evidence_media: mediaTextToInput(values.media_text),
  };
}

interface Props {
  pod: HostPodForComplete | null;
  onClose: () => void;
  onCompleted: () => void;
}

/** Host completes a pod: enter the venue bill amount + upload party media. The
 * split is previewed live; on submit the payout releases are created for Finance. */
export default function PodCompleteDialog({ pod, onClose, onCompleted }: Readonly<Props>) {
  const { labels, renderMediaField } = useHostPodActionsConfig();
  const hasVenue = !!pod?.venue_id;
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PodCompleteValues>({
    resolver: zodResolver(buildPodCompleteSchema(hasVenue, labels)),
    defaultValues: blankPodCompleteValues,
  });
  const [complete, completeState] = useMutation(COMPLETE_POD);
  const [scanOpen, setScanOpen] = useState(false);
  // Bumped when the scanner closes so the preview re-reads: a scan changes who
  // attended, and the payout is computed from exactly that.
  const [scansDone, setScansDone] = useState(0);

  useEffect(() => {
    reset(blankPodCompleteValues);
  }, [pod, reset]);

  const billAmount = Number(watch('venue_bill_amount')) || 0;

  const submit = handleSubmit(async (values) => {
    if (!pod) return;
    await complete({ variables: { input: buildCompleteInput(values, pod.id) } });
    onCompleted();
  });

  return (
    <Dialog open={!!pod} onClose={onClose} fullWidth maxWidth="sm">
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
          {hasVenue && (
            <TextField
              label={labels.venueBillAmount}
              required
              type="number"
              fullWidth
              {...register('venue_bill_amount')}
              error={!!errors.venue_bill_amount}
              helperText={errors.venue_bill_amount?.message}
              slotProps={{
                input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }
              }}
            />
          )}
          <Controller
            control={control}
            name="media_text"
            render={({ field, fieldState }) =>
              renderMediaField({
                value: field.value,
                onChange: field.onChange,
                error: fieldState.error?.message,
                label: labels.podMedia,
                folder: '/pod-completion',
              })
            }
          />
          {pod && (
            <SettlementPreview
              podId={pod.id}
              venueBillAmount={billAmount}
              refreshToken={scansDone}
              onScan={() => setScanOpen(true)}
            />
          )}
          {completeState.error && <Alert severity="error">{completeState.error.message}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={completeState.loading}>
          {labels.cancel}
        </Button>
        <Button
          type="submit"
          form="pod-complete-form"
          variant="contained"
          disabled={completeState.loading}
          sx={{ borderRadius: 999, fontWeight: 700 }}
        >
          {completeState.loading ? labels.completing : labels.completePod}
        </Button>
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
