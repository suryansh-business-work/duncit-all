import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import { useTranslation } from '@duncit/app-settings';
import { POD_LIFECYCLE_OPTIONS, type PodLifecycleFilter } from './podLifecycle';

interface Props {
  clubs: any[];
  clubFilter: string;
  setClubFilter: (id: string) => void;
  lifecycle: PodLifecycleFilter;
  setLifecycle: (lifecycle: PodLifecycleFilter) => void;
}

export default function PodsToolbar({
  clubs,
  clubFilter,
  setClubFilter,
  lifecycle,
  setLifecycle,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
    >
      <Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <EventIcon color="primary" />
          <Typography variant="h5">Pods</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Events organised inside a club. Hosts are attendees by default.
        </Typography>
      </Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          size="small"
          select
          label={t('admin.filters.podLifecycle')}
          value={lifecycle}
          onChange={(e) => setLifecycle(e.target.value as PodLifecycleFilter)}
          sx={{ minWidth: 180 }}
        >
          {POD_LIFECYCLE_OPTIONS.map((option) => (
            <MenuItem key={option.labelKey} value={option.value}>
              {t(option.labelKey)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          select
          label={t('admin.pods.colClub')}
          value={clubFilter}
          onChange={(e) => setClubFilter(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">{t('admin.pods.allClubs')}</MenuItem>
          {clubs.map((c: any) => (
            <MenuItem key={c.id} value={c.id}>
              {c.club_name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    </Stack>
  );
}
