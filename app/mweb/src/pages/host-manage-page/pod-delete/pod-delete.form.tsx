import { useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { gql, useMutation, useQuery } from '@apollo/client';
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
import {
  POD_DELETE_REASON_SUBJECTS,
  blankPodDeleteValues,
  type PodDeleteImpact,
  type PodDeleteValues,
} from './pod-delete.types';

export const HOST_POD_DELETE_IMPACT = gql`
  query HostPodDeleteImpact($pod_doc_id: ID!) {
    hostPodDeleteImpact(pod_doc_id: $pod_doc_id) {
      other_attendee_count
      refundable_payment_count
      refund_total
      currency_symbol
    }
  }
`;

export const HOST_DELETE_POD = gql`
  mutation HostDeletePod($pod_doc_id: ID!, $reason_subject: String!, $reason_note: String) {
    hostDeletePod(
      pod_doc_id: $pod_doc_id
      reason_subject: $reason_subject
      reason_note: $reason_note
    )
  }
`;

export const podDeleteSchema = z
  .object({
    reason_subject: z.string().min(1, 'Select a reason'),
    reason_note: z.string().trim().max(500, 'Keep the note under 500 characters'),
  })
  .superRefine((values, ctx) => {
    if (values.reason_subject === 'Other' && !values.reason_note.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['reason_note'],
        message: 'Please describe the reason',
      });
    }
  });

interface PodDeleteFormProps {
  podId: string | null;
  podTitle: string;
  onClose: () => void;
  onDeleted: () => void;
}

/** Summarises who is affected — direct delete vs. refund-initiating delete. */
function ImpactSummary({ impact }: Readonly<{ impact: PodDeleteImpact }>) {
  if (impact.other_attendee_count === 0) {
    return (
      <Alert severity="info">
        No one else has joined this pod — it will be deleted immediately.
      </Alert>
    );
  }
  return (
    <Alert severity="warning">
      {impact.other_attendee_count} other attendee{impact.other_attendee_count === 1 ? '' : 's'}{' '}
      joined this pod.
      {impact.refundable_payment_count > 0 ? (
        <>
          {' '}
          Deleting initiates a refund of{' '}
          <b>
            {impact.currency_symbol}
            {impact.refund_total}
          </b>{' '}
          across {impact.refundable_payment_count} payment
          {impact.refundable_payment_count === 1 ? '' : 's'} (logged in the Finance portal). All
          attendees will be emailed.
        </>
      ) : (
        <> All attendees will be emailed about the cancellation.</>
      )}
    </Alert>
  );
}

/** Host's delete-pod dialog — a mandatory reason + refund impact preview (2B). */
export default function PodDeleteForm({
  podId,
  podTitle,
  onClose,
  onDeleted,
}: Readonly<PodDeleteFormProps>) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PodDeleteValues>({
    resolver: zodResolver(podDeleteSchema),
    defaultValues: blankPodDeleteValues,
  });
  const impactQ = useQuery(HOST_POD_DELETE_IMPACT, {
    variables: { pod_doc_id: podId },
    skip: !podId,
    fetchPolicy: 'network-only',
  });
  const [remove, removeState] = useMutation(HOST_DELETE_POD);
  const subject = watch('reason_subject');

  useEffect(() => {
    if (podId) reset(blankPodDeleteValues);
  }, [podId, reset]);

  const impact: PodDeleteImpact | null = impactQ.data?.hostPodDeleteImpact ?? null;
  const hasRefunds = (impact?.refundable_payment_count ?? 0) > 0;
  const confirmLabel = hasRefunds ? 'Initiate refunds & delete' : 'Delete pod';

  const submit = handleSubmit(async (values) => {
    await remove({
      variables: {
        pod_doc_id: podId,
        reason_subject: values.reason_subject,
        reason_note: values.reason_note.trim() || null,
      },
    });
    onDeleted();
  });

  return (
    <Dialog open={!!podId} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 900 }}>Delete pod</DialogTitle>
      <DialogContent dividers>
        <Stack component="form" id="pod-delete-form" onSubmit={submit} spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2">
            You're deleting <b>{podTitle}</b>. This can't be undone.
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
            helperText={errors.reason_note?.message ?? 'Shared with attendees in the cancellation email.'}
          />
          {removeState.error && <Alert severity="error">{removeState.error.message}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={removeState.loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="pod-delete-form"
          color="error"
          variant="contained"
          disabled={removeState.loading || impactQ.loading}
          sx={{ borderRadius: 999, fontWeight: 900 }}
        >
          {removeState.loading ? 'Deleting…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
