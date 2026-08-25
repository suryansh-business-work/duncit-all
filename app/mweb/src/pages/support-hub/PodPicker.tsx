import { FormControl, InputLabel, MenuItem, Paper, Select, Stack, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import { useDateFormat } from '../../utils/dateFormat';
import type { SupportPodOption } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  options: SupportPodOption[];
  selectedId: string;
  onChange: (id: string) => void;
  loading: boolean;
}

export default function PodPicker({ options, selectedId, onChange, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();

  if (loading && !options.length) {
    return (
      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '16px' }}>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Loading your pods…
        </Typography>
      </Paper>
    );
  }
  if (!options.length) {
    return (
      <Paper variant="outlined" sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(255,79,115,0.08)' }}>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <EventIcon color="action" />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            You haven’t joined any pods yet. Join a pod to use live support.
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <FormControl fullWidth size="small">
      <InputLabel id="support-pod-picker-label">Pod</InputLabel>
      <Select
        labelId="support-pod-picker-label"
        label={t('mweb.common.pod')}
        value={selectedId}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((opt) => (
          <MenuItem key={opt.podDocId} value={opt.podDocId}>
            <Stack>
              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                {opt.title}
              </Typography>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {formatDateTime(opt.startsAt)}
              </Typography>
            </Stack>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
