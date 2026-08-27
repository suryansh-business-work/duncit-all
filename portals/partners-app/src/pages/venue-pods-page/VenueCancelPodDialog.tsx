import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, AlertTitle, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField, zodRules } from '@duncit/forms';
import {
  fmtDate,
  VENUE_CANCEL_PENALTY,
  VENUE_CANCEL_POD,
  type VenueCancelPodResult,
  type VenuePodRow,
} from './queries';
import { useTranslation } from '@duncit/shell';

const FORM_ID = 'venue-cancel-pod-form';

const cancelPodSchema = z.object({
  reason: zodRules.requiredText('Reason', 5, 500),
});

type CancelPodValues = z.infer<typeof cancelPodSchema>;

/**
 * The warning headline. The penalty is admin-configured server data, so until it
 * lands the sentence is written without a number rather than with a guessed one
 * — and when an admin has set it to 0 the platform charges nothing, so promising
 * a penalty of "0 points" would be a lie.
 */
function penaltyHeadline(penalty: number | null): string {
  if (penalty == null) return "Cancelling this pod will reduce this venue's Account Health.";
  if (penalty === 0) return 'Cancelling this pod cannot be undone.';
  const unit = penalty === 1 ? 'point' : 'points';
  return `Cancelling this pod will reduce this venue's Account Health by ${penalty} ${unit}.`;
}

/** The Account Health warning shown above the reason field. */
function PenaltyWarning({ penalty }: Readonly<{ penalty: number | null }>) {
  const headline = penaltyHeadline(penalty);
  return (
    <Alert severity="warning">
      <AlertTitle sx={{ fontWeight: 800 }}>{headline}</AlertTitle>
      <Typography variant="body2">
        Every attendee who paid for this pod is refunded, and everyone booked in is emailed that the
        pod is cancelled. This cannot be undone.
      </Typography>
    </Alert>
  );
}

interface BodyProps {
  row: VenuePodRow;
  onClose: () => void;
  onCancelled: (result: VenueCancelPodResult) => void | Promise<void>;
}

/**
 * Mounted only while a pod is selected, so reopening the dialog for another pod
 * starts from a clean form and no stale error.
 */
function VenueCancelPodBody({ row, onClose, onCancelled }: Readonly<BodyProps>) {
  const { t } = useTranslation();
  // cache-and-network: a partner portal tab lives for hours, and a cached
  // penalty that an admin has since changed would warn about a number the
  // server will not actually deduct.
  const penaltyQuery = useQuery(VENUE_CANCEL_PENALTY, { fetchPolicy: 'cache-and-network' });
  const penalty: number | null =
    penaltyQuery.data?.publicAppSettings?.venue_cancel_health_penalty ?? null;
  const [cancelPod, state] = useMutation(VENUE_CANCEL_POD);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CancelPodValues>({
    resolver: zodResolver(cancelPodSchema),
    defaultValues: { reason: '' },
  });

  const submit = handleSubmit(async (values) => {
    try {
      const response = await cancelPod({
        variables: { pod_id: row.id, reason: values.reason },
      });
      await onCancelled(response.data.venueCancelPod as VenueCancelPodResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('partners.venuePodsPage.couldNotCancelThisPod');
      setError('root', { message });
    }
  });

  const rootError = errors.root?.message;

  return (
    <>
      <DialogTitle sx={{ fontWeight: 900 }}>{t('partners.venuePodsPage.cancelThisPod')}</DialogTitle>
      <DialogContent dividers>
        {/* noValidate so the Zod message is the only one the owner ever sees. */}
        <Stack component="form" id={FORM_ID} noValidate onSubmit={submit} spacing={2} sx={{ pt: 0.5 }}>
          <Stack spacing={0.25}>
            <Typography variant="subtitle1" sx={{
              fontWeight: 800
            }}>
              {row.pod_title}
            </Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {fmtDate(row.pod_date_time)} · {row.venue_name}
            </Typography>
          </Stack>

          <PenaltyWarning penalty={penalty} />

          <RhfTextField
            control={control}
            name="reason"
            label={t('partners.venuePodsPage.whyAreYouCancelling')}
            required
            multiline
            minRows={3}
            hint="At least 5 characters. This goes into the cancellation email sent to the host and everyone booked in."
          />

          {rootError && <Alert severity="error">{rootError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={state.loading}>
          Keep the pod
        </DuncitButton>
        <DuncitButton
          type="submit"
          form={FORM_ID}
          variant="contained"
          color="error"
          disabled={state.loading}
          sx={{ borderRadius: 999, fontWeight: 900 }}
        >
          {state.loading ? 'Cancelling…' : 'Cancel this pod'}
        </DuncitButton>
      </DialogActions>
    </>
  );
}

interface Props {
  row: VenuePodRow | null;
  onClose: () => void;
  onCancelled: (result: VenueCancelPodResult) => void | Promise<void>;
}

/** Venue owner's confirm-and-explain step before a pod is cancelled and refunded. */
export default function VenueCancelPodDialog({ row, onClose, onCancelled }: Readonly<Props>) {
  return (
    <Dialog open={!!row} onClose={onClose} maxWidth="sm" fullWidth>
      {row && <VenueCancelPodBody row={row} onClose={onClose} onCancelled={onCancelled} />}
    </Dialog>
  );
}
