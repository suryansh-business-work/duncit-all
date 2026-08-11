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

export const podCancelSchema = z
  .object({
    reason_subject: z.string().min(1, 'Select a reason'),
    reason_note: z.string().trim().max(500, 'Keep the note under 500 characters'),
  })
  .superRefine((values, ctx) => {
    if (values.reason_subject === 'Other' && !values.reason_note.trim()) {
      ctx.addIssue({ code: 'custom', path: ['reason_note'], message: 'Please describe the reason' });
    }
  });

/** Summarises who is affected — direct cancel vs. refund-initiating cancel. */
function ImpactSummary({ impact }: Readonly<{ impact: PodDeleteImpact }>) {
  if (impact.other_attendee_count === 0) {
    return (
      <Alert severity="info">
        No one else has joined this pod — it will be cancelled immediately.
      </Alert>
    );
  }
  const attendeePlural = impact.other_attendee_count === 1 ? '' : 's';
  const paymentPlural = impact.refundable_payment_count === 1 ? '' : 's';
  return (
    <Alert severity="warning">
      {impact.other_attendee_count} other attendee{attendeePlural} joined this pod.
      {impact.refundable_payment_count > 0 ? (
        <>
          {' '}
          Cancelling initiates a refund of{' '}
          <b>
            {impact.currency_symbol}
            {impact.refund_total}
          </b>{' '}
          across {impact.refundable_payment_count} payment{paymentPlural} (logged in the Finance
          portal). All attendees will be emailed.
        </>
      ) : (
        <> All attendees will be emailed about the cancellation.</>
      )}
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
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PodCancelValues>({
    resolver: zodResolver(podCancelSchema),
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
  const confirmLabel = hasRefunds ? 'Initiate refunds & cancel' : 'Cancel pod';

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
      <DialogTitle sx={{ fontWeight: 700 }}>Cancel pod</DialogTitle>
      <DialogContent dividers>
        <Stack component="form" id="pod-cancel-form" onSubmit={submit} spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2">
            You&apos;re cancelling <b>{podTitle}</b>. This can&apos;t be undone.
          </Typography>
          {impactQ.loading && (
            <Stack alignItems="center" sx={{ py: 1 }}>
              <CircularProgress size={20} />
            </Stack>
          )}
          {impactQ.error && <Alert severity="error">{impactQ.error.message}</Alert>}
          {impact && <ImpactSummary impact={impact} />}
          <TextField
            select
            label="Reason"
            required
            fullWidth
            defaultValue=""
            {...register('reason_subject')}
            error={!!errors.reason_subject}
            helperText={errors.reason_subject?.message}
          >
            {POD_DELETE_REASON_SUBJECTS.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Note"
            required={subject === 'Other'}
            fullWidth
            multiline
            minRows={2}
            {...register('reason_note')}
            error={!!errors.reason_note}
            helperText={
              errors.reason_note?.message ?? 'Shared with attendees in the cancellation email.'
            }
          />
          {removeState.error && <Alert severity="error">{removeState.error.message}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={removeState.loading}>
          Keep pod
        </Button>
        <Button
          type="submit"
          form="pod-cancel-form"
          color="error"
          variant="contained"
          disabled={removeState.loading || impactQ.loading}
          sx={{ borderRadius: 999, fontWeight: 700 }}
        >
          {removeState.loading ? 'Cancelling…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
