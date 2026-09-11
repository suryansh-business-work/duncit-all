import { Box, Chip, Stack, Typography } from '@mui/material';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import { POD_ROW_STATUS_COLORS, podRowStatus, podRowStatusLabel } from '@duncit/utils';
import FactLine from '../../components/club-admin/FactLine';
import { useDateFormat } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';
import ClubPodActions from './ClubPodActions';
import type { ClubAdminPodRow } from './types';

interface Props {
  pod: ClubAdminPodRow;
  podsPath: string;
  onActivity: (pod: ClubAdminPodRow) => void;
  onDelete: (pod: ClubAdminPodRow) => void;
}

/**
 * One pod of the club, as a row of the list card: its name, where it sits in
 * the booking cycle (the same status vocabulary the Partners console chips),
 * when it runs and who is in, with the row's actions underneath.
 */
export default function ClubPodRow({ pod, podsPath, onActivity, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const status = podRowStatus(pod);

  return (
    <Box sx={{ px: 2, pt: 1.75, pb: 0.75 }}>
      <Stack spacing={0.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography noWrap sx={{ flex: 1, fontSize: '1rem', fontWeight: 600 }}>
            {pod.pod_title}
          </Typography>
          <Chip size="small" label={podRowStatusLabel(status, t)} color={POD_ROW_STATUS_COLORS[status]} />
        </Stack>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
          <EventRoundedIcon sx={{ fontSize: 14 }} />
          <Typography variant="caption" noWrap>
            {formatDateTime(pod.pod_date_time)}
          </Typography>
        </Stack>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.25 }}>
          <FactLine value={String(pod.pod_attendees.length)} label={t('mweb.studioPods.attendees')} />
          <FactLine value={String(pod.no_of_spots)} label={t('mweb.studioPods.spots')} />
        </Stack>
        <ClubPodActions
          pod={pod}
          podsPath={podsPath}
          onActivity={() => onActivity(pod)}
          onDelete={() => onDelete(pod)}
        />
      </Stack>
    </Box>
  );
}
