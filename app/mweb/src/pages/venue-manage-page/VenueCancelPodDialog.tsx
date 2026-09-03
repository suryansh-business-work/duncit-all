import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  AlertTitle,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { cancelPenaltyHeadline, type VenueCancelPodResult } from '@duncit/utils';
import type { StudioPod } from '../../components/studio-pods';
import { useDateFormat } from '../../utils/dateFormat';
import { VenueCancelPodForm, type CancelPodValues } from './venue-cancel-pod-form';
import { VENUE_CANCEL_PENALTY, VENUE_CANCEL_POD } from './queries';
import type { Translate } from '../../i18n/fallback';
import { useTranslation } from '../../i18n/useTranslation';

const FORM_ID = 'venue-cancel-pod-form';

/**
 * The warning headline. Which of the three it is (no number yet, no penalty at
 * all, or the points) is the shared rule in @duncit/utils; the words are the
 * bundle's, written out as literals for the shipped-key gate (rule 38).
 */
function penaltyHeadline(t: Translate, penalty: number | null): string {
  const headline = cancelPenaltyHeadline(penalty);
  if (headline === 'UNKNOWN') return t('mweb.venuePods.penaltyUnknown');
  if (headline === 'NONE') return t('mweb.venuePods.penaltyNone');
  const unit = penalty === 1 ? t('mweb.venuePods.point') : t('mweb.venuePods.points');
  return t('mweb.venuePods.penaltyPoints', { vars: { penalty: penalty ?? 0, unit } });
}

interface BodyProps {
  pod: StudioPod;
  onClose: () => void;
  onCancelled: (result: VenueCancelPodResult) => Promise<void>;
}

/** Mounted only while a pod is selected, so reopening for another pod starts
 * from a clean form and no stale error. */
function CancelPodBody({ pod, onClose, onCancelled }: Readonly<BodyProps>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  // cache-and-network: a cached penalty an admin has since changed would warn
  // about a number the server will not actually deduct.
  const penaltyQuery = useQuery<any>(VENUE_CANCEL_PENALTY, { fetchPolicy: 'cache-and-network' });
  const penalty: number | null =
    penaltyQuery.data?.publicAppSettings?.venue_cancel_health_penalty ?? null;
  const [cancelPod, state] = useMutation<any>(VENUE_CANCEL_POD);

  const submit = async (values: CancelPodValues) => {
    const response = await cancelPod({ variables: { pod_id: pod.id, reason: values.reason } });
    await onCancelled(response.data.venueCancelPod as VenueCancelPodResult);
  };

  return (
    <>
      <DialogTitle sx={{ fontWeight: 700 }}>{t('mweb.venuePods.cancelTitle')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Stack spacing={0.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {pod.pod_title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {formatDateTime(pod.pod_date_time)} · {pod.owner_name}
            </Typography>
          </Stack>
          <Alert severity="warning">
            <AlertTitle sx={{ fontWeight: 700 }}>{penaltyHeadline(t, penalty)}</AlertTitle>
            {t('mweb.venuePods.refundsNote')}
          </Alert>
          <VenueCancelPodForm formId={FORM_ID} onSubmit={submit} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={state.loading}>
          {t('mweb.venuePods.keepPod')}
        </DuncitButton>
        <DuncitButton
          type="submit"
          form={FORM_ID}
          variant="contained"
          color="error"
          disabled={state.loading}
          sx={{ borderRadius: 999, fontWeight: 700 }}
          data-testid="venue-cancel-pod-confirm"
        >
          {state.loading ? t('mweb.venuePods.cancelling') : t('mweb.venuePods.cancelPod')}
        </DuncitButton>
      </DialogActions>
    </>
  );
}

interface Props {
  pod: StudioPod | null;
  onClose: () => void;
  onCancelled: (result: VenueCancelPodResult) => Promise<void>;
}

/** The venue owner's confirm-and-explain step before a pod is cancelled and
 * its attendees refunded. Native twin (rule 27). */
export default function VenueCancelPodDialog({ pod, onClose, onCancelled }: Readonly<Props>) {
  return (
    <Dialog open={!!pod} onClose={onClose} fullWidth maxWidth="xs" data-testid="venue-cancel-pod">
      {pod && <CancelPodBody pod={pod} onClose={onClose} onCancelled={onCancelled} />}
    </Dialog>
  );
}
