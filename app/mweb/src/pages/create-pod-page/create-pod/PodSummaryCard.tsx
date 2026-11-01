import { Box, Stack, Typography } from '@mui/material';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import { DuncitButton } from '@duncit/buttons';
import { formatStatementMoney } from '@duncit/utils';
import { usePricing } from '../../../hooks/usePricing';
import { useTranslation } from '../../../i18n/useTranslation';
import { useDateFormat } from '../../../utils/dateFormat';
import { SURFACE_SX } from '../../../theme';
import type { CreatePodForm, CreatePodVenue } from './create-pod.types';

interface Props {
  form: CreatePodForm;
  venues: readonly CreatePodVenue[];
  /** Back to Where & when, where the time and place are set. */
  onEdit: () => void;
}

/** Details' header: what the host already settled — when, where, how many and
 * the ticket — so the last step reads as a review. Native twin: PodSummaryCard. */
export default function PodSummaryCard({ form, venues, onEdit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { currency } = usePricing();
  const { formatDateTime, formatTime } = useDateFormat();
  const start = form.watch('pod_date_time');
  const end = form.watch('pod_end_date_time');
  if (!start) return null;
  const venue = venues.find((entry) => entry.id === form.watch('venue_id'));
  const amount = Number(form.watch('pod_amount')) || 0;
  const price = form.watch('pod_type') === 'FREE' ? t('mweb.createPod.summaryFree') : formatStatementMoney(amount, currency);
  const when = [formatDateTime(start), end ? formatTime(end) : ''].filter(Boolean).join(' – ');
  const what = [
    venue?.venue_name ?? form.watch('meeting_platform'),
    t('mweb.createPod.summaryGuests', { vars: { count: Number(form.watch('no_of_spots')) || 0 } }),
    price,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Stack data-testid="create-pod-summary" direction="row" spacing={1.5} sx={{ ...SURFACE_SX, p: 1.5, alignItems: 'center' }}>
      <Box
        aria-hidden
        sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', bgcolor: 'action.hover', color: 'primary.main', display: 'grid', placeItems: 'center' }}
      >
        <EventOutlinedIcon fontSize="small" />
      </Box>
      <Stack sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{when}</Typography>
        <Typography noWrap variant="caption" sx={{ color: 'text.secondary' }}>{what}</Typography>
      </Stack>
      <DuncitButton data-testid="create-pod-summary-edit" variant="text" size="small" onClick={onEdit}>
        {t('mweb.createPod.summaryEdit')}
      </DuncitButton>
    </Stack>
  );
}
