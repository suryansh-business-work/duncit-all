import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
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
import { DuncitButton } from '@duncit/buttons';
import ImpactSummary from './ImpactSummary';
import {
  POD_DELETE_REASON_SUBJECTS,
  blankPodCancelValues,
  buildPodCancelSchema,
  type PodCancelValues,
} from './pod-cancel.form';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import { HOST_DELETE_POD, HOST_POD_DELETE_IMPACT } from '../queries';
import type { PodDeleteImpact } from '../types';

export { POD_DELETE_REASON_SUBJECTS, blankPodCancelValues, buildPodCancelSchema } from './pod-cancel.form';
export type { PodCancelValues } from './pod-cancel.form';

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
  } = useForm<PodCancelValues, any, PodCancelValues>({
    resolver: zodResolver(buildPodCancelSchema(labels)) as unknown as Resolver<PodCancelValues, any, PodCancelValues>,
    defaultValues: blankPodCancelValues,
  });
  const impactQ = useQuery<any>(HOST_POD_DELETE_IMPACT, {
    variables: { pod_doc_id: podId },
    skip: !podId,
    fetchPolicy: 'network-only',
  });
  const [remove, removeState] = useMutation<any>(HOST_DELETE_POD);
  const subject = watch('reason_subject');

  useEffect(() => {
    if (podId) reset(blankPodCancelValues);
  }, [podId, reset]);

  const impact: PodDeleteImpact | null = impactQ.data?.hostPodDeleteImpact ?? null;
  const hasRefunds = (impact?.refundable_payment_count ?? 0) > 0;
  const confirmLabel = hasRefunds ? labels.initiateRefunds : labels.cancelPod;

  const submit = handleSubmit(async (values) => {
    try {
      await remove({
        variables: {
          pod_doc_id: podId,
          reason_subject: values.reason_subject,
          reason_note: values.reason_note.trim() || null,
        },
      });
      onCancelled();
    } catch {
      // removeState.error, read below, is what renders the failure.
    }
  });

  return (
    <Dialog
      open={!!podId}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      data-testid="pod-delete-dialog"
    >
      <DialogTitle sx={{ fontWeight: 700 }}>{labels.cancelPod}</DialogTitle>
      <DialogContent dividers>
        <Stack component="form" id="pod-cancel-form" onSubmit={submit} spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2">{labels.cancelIntro(podTitle)}</Typography>
          {impactQ.loading && (
            <Stack
              data-testid="pod-cancel-impact-loading"
              sx={{
                alignItems: "center",
                py: 1
              }}>
              <CircularProgress size={20} />
            </Stack>
          )}
          {impactQ.error && (
            <Alert severity="error" data-testid="pod-cancel-impact-error">
              {impactQ.error.message}
            </Alert>
          )}
          {impact && <ImpactSummary impact={impact} />}
          <TextField
            select
            label={labels.reason}
            required
            fullWidth
            defaultValue=""
            data-testid="pod-cancel-reason"
            {...register('reason_subject')}
            error={!!errors.reason_subject}
            helperText={errors.reason_subject?.message}
          >
            {POD_DELETE_REASON_SUBJECTS.map((item) => (
              <MenuItem key={item} value={item} data-testid={`pod-delete-reason-${item}`}>
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
            data-testid="pod-delete-note"
            {...register('reason_note')}
            error={!!errors.reason_note}
            helperText={
              errors.reason_note?.message ?? labels.noteHint
            }
          />
          {removeState.error && (
            <Alert severity="error" data-testid="pod-delete-error">
              {removeState.error.message}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton
          onClick={onClose}
          disabled={removeState.loading}
          data-testid="pod-delete-cancel"
        >
          {labels.keepPod}
        </DuncitButton>
        <DuncitButton
          type="submit"
          form="pod-cancel-form"
          color="error"
          variant="contained"
          loading={removeState.loading || impactQ.loading}
          data-testid="pod-delete-confirm"
          sx={{ borderRadius: 999, fontWeight: 700 }}
        >
          {removeState.loading ? labels.cancelling : confirmLabel}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
