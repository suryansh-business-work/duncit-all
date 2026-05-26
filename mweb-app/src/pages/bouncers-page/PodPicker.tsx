import { FormControl, InputLabel, MenuItem, Paper, Select, Stack, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import { format } from 'date-fns';
import type { BouncerPodOption } from './queries';

interface Props {
  options: BouncerPodOption[];
  selectedId: string;
  onChange: (id: string) => void;
  loading: boolean;
}

export default function PodPicker({ options, selectedId, onChange, loading }: Props) {
  if (loading && !options.length) {
    return (
      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Loading your pods…
        </Typography>
      </Paper>
    );
  }
  if (!options.length) {
    return (
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,79,115,0.08)' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <EventIcon color="action" />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            No upcoming pods. Join a pod first to use Bouncers.
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <FormControl fullWidth size="small">
      <InputLabel id="bouncer-pod-picker-label">Pod</InputLabel>
      <Select
        labelId="bouncer-pod-picker-label"
        label="Pod"
        value={selectedId}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((opt) => (
          <MenuItem key={opt.podDocId} value={opt.podDocId}>
            <Stack>
              <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
                {opt.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {format(new Date(opt.startsAt), 'EEE, dd MMM • hh:mm a')}
              </Typography>
            </Stack>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
