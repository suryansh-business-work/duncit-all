import { Box, Card, Stack, Typography } from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import EventIcon from '@mui/icons-material/Event';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PaymentsIcon from '@mui/icons-material/Payments';
import PlaceIcon from '@mui/icons-material/Place';
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { useDateFormat } from '../../utils/dateFormat';
import InfoRow, { type InfoRowProps } from './InfoRow';
import { pendingPodImage, podPendingStatus } from './podPending';
import type { PodPendingView } from './queries';

const ICON = { fontSize: 18 } as const;

/** Pod details card on the waiting page — featured image, title, date & time
 * slot, expected earnings, location, category and current status.
 * Native twin (rule 27). */
export default function PodPendingSummaryCard({ view }: Readonly<{ view: PodPendingView }>) {
  const { t } = useTranslation();
  const { formatDateTime, formatTime } = useDateFormat();
  const { pod } = view;
  const image = pendingPodImage(pod.pod_images_and_videos);
  const location = [pod.place_label, pod.place_detail].filter(Boolean).join(' · ');

  let when = t('mweb.podDetails.datePending');
  if (pod.pod_date_time) {
    when = formatDateTime(pod.pod_date_time);
    if (pod.pod_end_date_time) when += ` → ${formatTime(pod.pod_end_date_time)}`;
  }

  const rows: InfoRowProps[] = [
    {
      icon: <EventIcon sx={ICON} />,
      label: t('mweb.podPending.dateTime'),
      value: when,
      testId: 'pod-pending-when',
    },
    {
      icon: <PaymentsIcon sx={ICON} />,
      label: t('mweb.podPending.expectedEarnings'),
      value: formatMoney(view.expected_earnings, {
        symbol: view.currency_symbol,
        decimals: 2,
        grouping: false,
      }),
      testId: 'pod-pending-earnings',
    },
  ];
  if (location) {
    rows.push({
      icon: <PlaceIcon sx={ICON} />,
      label: t('mweb.podPending.location'),
      value: location,
      testId: 'pod-pending-location',
    });
  }
  if (view.category_name) {
    rows.push({
      icon: <CategoryIcon sx={ICON} />,
      label: t('mweb.podPending.category'),
      value: view.category_name,
      testId: 'pod-pending-category',
    });
  }
  rows.push({
    icon: <InfoOutlinedIcon sx={ICON} />,
    label: t('mweb.podPending.currentStatus'),
    value: podPendingStatus(pod.venue_approval_status, t),
    testId: 'pod-pending-status',
  });

  return (
    <Card variant="outlined" sx={{ p: 1.5, borderRadius: '16px' }} data-testid="pod-pending-summary">
      <Stack spacing={1.25}>
        {image && (
          <Box
            component="img"
            src={image}
            alt={pod.pod_title}
            data-testid="pod-pending-image"
            sx={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: '16px' }}
          />
        )}
        <Typography variant="subtitle1" sx={{
          fontWeight: 700
        }}>
          {pod.pod_title}
        </Typography>
        {rows.map((row) => (
          <InfoRow key={row.label} {...row} />
        ))}
      </Stack>
    </Card>
  );
}
