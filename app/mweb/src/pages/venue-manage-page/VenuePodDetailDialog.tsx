import { useQuery } from '@apollo/client/react';
import {
  Avatar,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { InfoRow } from '@duncit/ui';
import {
  BUCKET_LABEL_KEY,
  BUCKET_TONE,
  podPriceLabel,
  type StudioPod,
} from '../../components/studio-pods';
import { useDateFormat } from '../../utils/dateFormat';
import { VENUE_POD_ATTENDEES, type AttendeeProfile } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

interface AttendeesProps {
  ids: readonly string[];
  profiles: readonly AttendeeProfile[];
  loading: boolean;
}

/** Who is booked in — spinner while the names load, a sentence when nobody is. */
function AttendeeList({ ids, profiles, loading }: Readonly<AttendeesProps>) {
  const { t } = useTranslation();
  if (ids.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('mweb.venuePods.noAttendees')}
      </Typography>
    );
  }
  if (loading && profiles.length === 0) return <CircularProgress size={20} />;
  return (
    <Stack spacing={1}>
      {profiles.map((person) => (
        <Stack key={person.user_id} direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          <Avatar src={person.profile_photo ?? undefined} sx={{ width: 30, height: 30 }}>
            {(person.full_name?.[0] ?? '?').toUpperCase()}
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {person.full_name ?? t('mweb.podDetails.attendee')}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

interface BodyProps {
  pod: StudioPod;
  currencySymbol: string;
}

function PodDetailBody({ pod, currencySymbol }: Readonly<BodyProps>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const ids = pod.pod_attendees;
  const { data, loading } = useQuery<any>(VENUE_POD_ATTENDEES, {
    variables: { ids },
    skip: ids.length === 0,
  });
  const profiles: AttendeeProfile[] = data?.publicUsersByIds ?? [];
  const hosts = pod.host_names.filter(Boolean).join(', ') || t('mweb.studioPods.hostsNone');

  return (
    <>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 700 }}>
          {pod.pod_title}
        </Typography>
        <Chip
          size="small"
          label={t(BUCKET_LABEL_KEY[pod.bucket])}
          color={BUCKET_TONE[pod.bucket]}
          sx={{ fontWeight: 700 }}
        />
      </Stack>
      <InfoRow variant="split" label={t('mweb.venuePods.venue')} value={pod.owner_name} sx={{ py: 0.5 }} />
      <InfoRow variant="split" label={t('mweb.venuePods.hosts')} value={hosts} sx={{ py: 0.5 }} />
      <InfoRow
        variant="split"
        label={t('mweb.venuePods.when')}
        value={formatDateTime(pod.pod_date_time)}
        sx={{ py: 0.5 }}
      />
      <InfoRow
        variant="split"
        label={t('mweb.venuePods.spots')}
        value={`${pod.attendee_count}/${pod.no_of_spots}`}
        sx={{ py: 0.5 }}
      />
      <InfoRow
        variant="split"
        label={t('mweb.venuePods.price')}
        value={podPriceLabel(pod, currencySymbol, t('mweb.podDetails.free'))}
        sx={{ py: 0.5 }}
      />
      <Divider sx={{ my: 1.5 }} />
      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>
        {t('mweb.venuePods.attendees')}
      </Typography>
      <AttendeeList ids={ids} profiles={profiles} loading={loading} />
    </>
  );
}

interface Props {
  pod: StudioPod | null;
  /** Symbol the studio's own money figures use, so the price never guesses. */
  currencySymbol: string;
  onClose: () => void;
}

/** The pod a Venue Studio row opens on tap: its facts and who is coming.
 * Native twin (rule 27). */
export default function VenuePodDetailDialog({ pod, currencySymbol, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={!!pod} onClose={onClose} fullWidth maxWidth="xs" data-testid="venue-pod-detail">
      <DialogTitle sx={{ fontWeight: 700 }}>{t('mweb.venuePods.podDetails')}</DialogTitle>
      <DialogContent dividers>
        {pod && <PodDetailBody pod={pod} currencySymbol={currencySymbol} />}
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('mweb.common.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
