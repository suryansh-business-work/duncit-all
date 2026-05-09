import { Box, Chip, MenuItem, Stack, TextField } from '@mui/material';
import { STATUS_COLORS, STATUS_KEYS } from './helpers';

interface Props {
  counts: Record<string, number>;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
}

export default function InterviewsToolbar({
  counts,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
}: Props) {
  return (
    <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
      {STATUS_KEYS.map((s) => (
        <Chip
          key={s}
          label={`${s} · ${counts[s] || 0}`}
          color={statusFilter === s ? STATUS_COLORS[s] : 'default'}
          variant={statusFilter === s ? 'filled' : 'outlined'}
          onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
        />
      ))}
      <Box sx={{ flex: 1 }} />
      <TextField
        select
        size="small"
        label="Type"
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        sx={{ minWidth: 140 }}
      >
        <MenuItem value="">All</MenuItem>
        <MenuItem value="HOST">Host</MenuItem>
        <MenuItem value="VENUE">Venue</MenuItem>
      </TextField>
    </Stack>
  );
}
