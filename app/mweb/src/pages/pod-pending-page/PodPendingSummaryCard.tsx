import { Box, Card, Stack, Typography } from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import EventIcon from '@mui/icons-material/Event';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PaymentsIcon from '@mui/icons-material/Payments';
import PlaceIcon from '@mui/icons-material/Place';
import { formatMoney } from '@duncit/utils';
import { useDateFormat } from '../../utils/dateFormat';
import InfoRow, { type InfoRowProps } from './InfoRow';
import { pendingPodImage, podPendingStatus } from './podPending';
import type { PodPendingView } from './queries';

const ICON = { fontSize: 18 } as const;

/** Pod details card on the waiting page — featured image, title, date & time
 * slot, expected earnings, location, category and current status.
 * Native twin (rule 27). */
export default function PodPendingSummaryCard({ view }: Readonly<{ view: PodPendingView }>) {
  const { formatDateTime, formatTime } = useDateFormat();
  const { pod } = view;
  const image = pendingPodImage(pod.pod_images_and_videos);
  const location = [pod.place_label, pod.place_detail].filter(Boolean).join(' · ');

  // TODO(i18n) — row labels ship as literals until this feature is localized.
  let when = 'Date pending';
  if (pod.pod_date_time) {
    when = formatDateTime(pod.pod_date_time);
    if (pod.pod_end_date_time) when += ` → ${formatTime(pod.pod_end_date_time)}`;
  }

  const rows: InfoRowProps[] = [
    { icon: <EventIcon sx={ICON} />, label: 'Date & time', value: when, testId: 'pod-pending-when' },
    {
      icon: <PaymentsIcon sx={ICON} />,
      label: 'Expected earnings',
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
      label: 'Location',
      value: location,
      testId: 'pod-pending-location',
    });
  }
  if (view.category_name) {
    rows.push({
      icon: <CategoryIcon sx={ICON} />,
      label: 'Category',
      value: view.category_name,
      testId: 'pod-pending-category',
    });
  }
  rows.push({
    icon: <InfoOutlinedIcon sx={ICON} />,
    label: 'Current status',
    value: podPendingStatus(pod.venue_approval_status),
    testId: 'pod-pending-status',
  });

  return (
    <Card variant="outlined" sx={{ p: 1.5, borderRadius: 3 }} data-testid="pod-pending-summary">
      <Stack spacing={1.25}>
        {image && (
          <Box
            component="img"
            src={image}
            alt={pod.pod_title}
            data-testid="pod-pending-image"
            sx={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 2.5 }}
          />
        )}
        <Typography variant="subtitle1" fontWeight={900}>
          {pod.pod_title}
        </Typography>
        {rows.map((row) => (
          <InfoRow key={row.label} {...row} />
        ))}
      </Stack>
    </Card>
  );
}
