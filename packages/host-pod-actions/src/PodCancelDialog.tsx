import { useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useHostPodActionsConfig } from './HostPodActionsProvider';
import type { HostPodActionLabels } from './labels';
import { HOST_DELETE_POD, HOST_POD_DELETE_IMPACT } from './queries';
import type { PodDeleteImpact } from './types';

/** Mirrors the server's POD_DELETE_REASON_SUBJECTS list. */
export const POD_DELETE_REASON_SUBJECTS = [
  'Event cancelled',
  'Venue unavailable',
  'Low attendance',
  'Rescheduling',
  'Other',
] as const;

export interface PodCancelValues {
  reason_subject: string;
  reason_note: string;
}

export const blankPodCancelValues: PodCancelValues = { reason_subject: '', reason_note: '' };

/** Built from the surface's labels: a validation message is copy the host
 *  reads, so it follows their language like the rest of the dialog (rule 38). */
export const buildPodCancelSchema = (labels: HostPodActionLabels) =>
  z
    .object({
      reason_subject: z.string().min(1, labels.reasonRequired),
      reason_note: z.string().trim().max(500, labels.noteTooLong),
    })
    .superRefine((values, ctx) => {
      if (values.reason_subject === 'Other' && !values.reason_note.trim()) {
        ctx.addIssue({ code: 'custom', path: ['reason_note'], message: labels.noteRequired });
      }
    });

/** Summarises who is affected — direct cancel vs. refund-initiating cancel. */
function ImpactSummary({ impact }: Readonly<{ impact: PodDeleteImpact }>) {
  const { labels } = useHostPodActionsConfig();
  if (impact.other_attendee_count === 0) {
    return <Alert severity="info">{labels.cancelNoOthers}</Alert>;
  }
  // One sentence per row rather than fragments joined in JSX: a language that
  // orders the clause differently cannot be built by concatenation.
  const refundLine =
    impact.refundable_payment_count > 0
      ? labels.cancelRefund(
          `${impact.currency_symbol}${impact.refund_total}`,
          impact.refundable_payment_count,
        )
      : labels.cancelEmailOnly;
  return (
    <Alert severity="warning">
      {labels.cancelOthers(impact.other_attendee_count)} {refundLine}
    </Alert>
  );
}

interface Props {
  podId: string | null;
  podTitle: string;
  onClose: () => void;
  onCancelled: () => void;
}

/** Host's cancel-pod dialog — a mandatory reason + refund impact preview. */
export default function PodCancelDialog({
  podId,
  podTitle,
  onClose,
  onCancelled,
}: Readonly<Props>) {
  const { labels } = useHostPodActionsConfig();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PodCancelValues>({
    resolver: zodResolver(buildPodCancelSchema(labels)),
    defaultValues: blankPodCancelValues,
  });
  const impactQ = useQuery(HOST_POD_DELETE_IMPACT, {
    variables: { pod_doc_id: podId },
    skip: !podId,
    fetchPolicy: 'network-only',
  });
  const [remove, removeState] = useMutation(HOST_DELETE_POD);
  const subject = watch('reason_subject');

  useEffect(() => {
    if (podId) reset(blankPodCancelValues);
  }, [podId, reset]);

  const impact: PodDeleteImpact | null = impactQ.data?.hostPodDeleteImpact ?? null;
  const hasRefunds = (impact?.refundable_payment_count ?? 0) > 0;
  const confirmLabel = hasRefunds ? labels.initiateRefunds : labels.cancelPod;

  const submit = handleSubmit(async (values) => {
    await remove({
      variables: {
        pod_doc_id: podId,
        reason_subject: values.reason_subject,
        reason_note: values.reason_note.trim() || null,
      },
    });
    onCancelled();
  });

  return (
    <Dialog open={!!podId} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>{labels.cancelPod}</DialogTitle>
      <DialogContent dividers>
        <Stack component="form" id="pod-cancel-form" onSubmit={submit} spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2">{labels.cancelIntro(podTitle)}</Typography>
          {impactQ.loading && (
            <Stack alignItems="center" sx={{ py: 1 }}>
              <CircularProgress size={20} />
            </Stack>
          )}
          {impactQ.error && <Alert severity="error">{impactQ.error.message}</Alert>}
          {impact && <ImpactSummary impact={impact} />}
          <TextField
            select
            label={labels.reason}
            required
            fullWidth
            defaultValue=""
            {...register('reason_subject')}
            error={!!errors.reason_subject}
            helperText={errors.reason_subject?.message}
          >
            {POD_DELETE_REASON_SUBJECTS.map((item) => (
              <MenuItem key={item} value={item}>
                {labels.cancelReason(item)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={labels.note}
            required={subject === 'Other'}
            fullWidth
            multiline
            minRows={2}
            {...register('reason_note')}
            error={!!errors.reason_note}
            helperText={
              errors.reason_note?.message ?? labels.noteHint
            }
          />
          {removeState.error && <Alert severity="error">{removeState.error.message}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={removeState.loading}>
          {labels.keepPod}
        </Button>
        <Button
          type="submit"
          form="pod-cancel-form"
          color="error"
          variant="contained"
          disabled={removeState.loading || impactQ.loading}
          sx={{ borderRadius: 999, fontWeight: 700 }}
        >
          {removeState.loading ? labels.cancelling : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
