import { useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { gql, useMutation } from '@apollo/client';
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
import { blankPodCompleteValues, type HostPodForComplete, type PodCompleteValues } from './pod-complete.types';

export const COMPLETE_POD = gql`
  mutation CompletePodSettlement($input: CompletePodInput!) {
    completePodSettlement(input: $input) {
      settlement {
        currency_symbol
        host {
          payout_amount
        }
      }
      releases {
        id
        kind
        status
      }
    }
  }
`;

const hasMediaLine = (text: string) =>
  text.split('\n').map((line) => line.trim()).some(Boolean);

const splitLines = (text: string) =>
  text.split('\n').map((item) => item.trim()).filter(Boolean);

/** Schema depends on whether the pod has a venue: only then is a bill required. */
export const buildPodCompleteSchema = (hasVenue: boolean) =>
  z
    .object({
      venue_bill_amount: z.string().trim(),
      bill_url: z.string().trim(),
      media_text: z.string().refine(hasMediaLine, 'Add at least one party photo or video URL'),
    })
    .superRefine((values, ctx) => {
      if (!hasVenue) return;
      const amount = Number(values.venue_bill_amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['venue_bill_amount'], message: 'Enter the venue bill amount' });
      }
      if (!values.bill_url.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bill_url'], message: 'Add the venue bill upload URL' });
      }
    });

/** Maps the validated values onto the server's CompletePodInput. */
export function buildCompleteInput(values: PodCompleteValues, podId: string) {
  return {
    pod_id: podId,
    venue_bill_amount: Number(values.venue_bill_amount) || 0,
    bill_url: values.bill_url.trim() || undefined,
    evidence_media: splitLines(values.media_text).map((url) => ({
      url,
      type: /\.(mp4|mov|webm)$/i.test(url) ? 'VIDEO' : 'IMAGE',
    })),
  };
}

interface PodCompleteFormProps {
  pod: HostPodForComplete | null;
  onClose: () => void;
  onCompleted: () => void;
}

/** Host completes a pod: enter the venue bill + upload party media. The split is
 * previewed live; on submit two payout releases are created for Finance. */
export default function PodCompleteForm({ pod, onClose, onCompleted }: Readonly<PodCompleteFormProps>) {
  const hasVenue = !!pod?.venue_id;
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PodCompleteValues>({
    resolver: zodResolver(buildPodCompleteSchema(hasVenue)),
    defaultValues: blankPodCompleteValues,
  });
  const [complete, completeState] = useMutation(COMPLETE_POD);

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
      <DialogTitle sx={{ fontWeight: 900 }}>Complete pod</DialogTitle>
      <DialogContent dividers>
        <Stack component="form" id="pod-complete-form" onSubmit={submit} spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Upload your party photos/videos (with the Duncit banner) and the venue bill. Your commission is paid after
            Finance approves.
          </Typography>
          {hasVenue && (
            <>
              <TextField
                label="Venue bill amount"
                required
                type="number"
                fullWidth
                {...register('venue_bill_amount')}
                error={!!errors.venue_bill_amount}
                helperText={errors.venue_bill_amount?.message}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              />
              <TextField
                label="Venue bill upload URL"
                required
                fullWidth
                {...register('bill_url')}
                error={!!errors.bill_url}
                helperText={errors.bill_url?.message ?? 'Link to the uploaded venue bill (image or PDF).'}
              />
            </>
          )}
          <TextField
            label="Party photos & videos"
            required
            fullWidth
            multiline
            minRows={2}
            {...register('media_text')}
            error={!!errors.media_text}
            helperText={errors.media_text?.message ?? 'One image or video URL per line.'}
          />
          {pod && <SettlementPreview podId={pod.id} venueBillAmount={billAmount} />}
          {completeState.error && <Alert severity="error">{completeState.error.message}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={completeState.loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="pod-complete-form"
          variant="contained"
          disabled={completeState.loading}
          sx={{ borderRadius: 999, fontWeight: 900 }}
        >
          {completeState.loading ? 'Submitting…' : 'Submit for approval'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
