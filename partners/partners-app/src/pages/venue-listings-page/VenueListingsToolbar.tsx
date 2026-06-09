import { MenuItem, Stack, TextField } from '@mui/material';

interface Props {
  search: string;
  status: string;
  sort: string;
  statusOptions: string[];
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
  onSort: (value: string) => void;
}

export default function VenueListingsToolbar({ search, status, sort, statusOptions, onSearch, onStatus, onSort }: Readonly<Props>) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
      <TextField label="Search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Venue, city, type" sx={{ flex: 1 }} />
      <TextField select label="Status" value={status} onChange={(event) => onStatus(event.target.value)} sx={{ minWidth: { md: 150 } }}>
        <MenuItem value="ALL">All status</MenuItem>
        {statusOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
      </TextField>
      <TextField select label="Sort" value={sort} onChange={(event) => onSort(event.target.value)} sx={{ minWidth: { md: 170 } }}>
        <MenuItem value="updated_desc">Newest updated</MenuItem>
        <MenuItem value="name_asc">Name A-Z</MenuItem>
        <MenuItem value="capacity_desc">Capacity high-low</MenuItem>
      </TextField>
    </Stack>
  );
}