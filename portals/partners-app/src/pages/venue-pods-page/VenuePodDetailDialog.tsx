import { useQuery } from '@apollo/client';
import {
  Avatar,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { InfoRow, StatusChip } from '@duncit/ui';
import {
  BUCKET_COLORS,
  BUCKET_LABELS,
  fmtDate,
  VENUE_POD_ATTENDEE_PROFILES,
  type AttendeeProfile,
  type VenuePodRow,
} from './queries';
import { useTranslation } from '@duncit/shell';

function Row({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return <InfoRow variant="split" label={label} value={value} sx={{ py: 0.5 }} />;
}

interface Props {
  row: VenuePodRow | null;
  onClose: () => void;
}

/** Basic pod info + the attendee names, for the venue owner's click-through. */
export default function VenuePodDetailDialog({ row, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const ids = row?.pod_attendees ?? [];
  const { data, loading } = useQuery(VENUE_POD_ATTENDEE_PROFILES, {
    variables: { ids },
    skip: ids.length === 0,
  });
  const profiles: AttendeeProfile[] = data?.publicUsersByIds ?? [];

  return (
    <Dialog open={!!row} onClose={onClose} maxWidth="sm" fullWidth>
      {row && (
        <>
          <DialogTitle sx={{ fontWeight: 800 }}>
            {row.pod_title}
            <StatusChip
              status={row.bucket}
              label={BUCKET_LABELS[row.bucket]}
              colorMap={BUCKET_COLORS}
              sx={{ ml: 1.5 }}
            />
          </DialogTitle>
          <DialogContent dividers>
            <Row label={t('partners.common.venue')} value={row.venue_name} />
            <Row label={t('partners.venuePodsPage.hosts')} value={row.host_names.join(', ') || '—'} />
            <Row label={t('partners.common.when')} value={fmtDate(row.pod_date_time)} />
            <Row label={t('partners.venuePodsPage.ends')} value={fmtDate(row.pod_end_date_time)} />
            <Row label={t('partners.common.price')} value={row.pod_type === 'FREE' ? 'Free' : `₹${row.pod_amount}`} />
            <Row
              label={t('partners.common.attendees')}
              value={row.no_of_spots > 0 ? `${row.attendee_count} / ${row.no_of_spots}` : row.attendee_count}
            />
            {row.completed_at && <Row label={t('partners.common.completed')} value={fmtDate(row.completed_at)} />}
            {row.cancelled_at && <Row label={t('partners.common.cancelled')} value={fmtDate(row.cancelled_at)} />}

            <Divider sx={{ my: 1.5 }} />
            <Typography variant="subtitle2" fontWeight={800} gutterBottom>
              Who's coming
            </Typography>
            {loading && profiles.length === 0 && <CircularProgress size={20} />}
            {!loading && ids.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No attendees yet.
              </Typography>
            )}
            <Stack spacing={1}>
              {profiles.map((person) => (
                <Stack key={person.user_id} direction="row" spacing={1.25} alignItems="center">
                  <Avatar src={person.profile_photo ?? undefined} sx={{ width: 30, height: 30 }}>
                    {(person.full_name?.[0] ?? '?').toUpperCase()}
                  </Avatar>
                  <Typography variant="body2" fontWeight={600}>
                    {person.full_name ?? 'Attendee'}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>{t('shell.common.close')}</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
