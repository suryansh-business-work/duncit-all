import { MenuItem, Stack, TextField } from '@mui/material';

interface Props {
  search: string;
  status: string;
  target: string;
  sort: string;
  statusOptions: string[];
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
  onTarget: (value: string) => void;
  onSort: (value: string) => void;
}

export default function ProductListingsToolbar({ search, status, target, sort, statusOptions, onSearch, onStatus, onTarget, onSort }: Readonly<Props>) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
      <TextField label="Search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Product, size, color" sx={{ flex: 1 }} />
      <TextField select label="Status" value={status} onChange={(event) => onStatus(event.target.value)} sx={{ minWidth: { md: 150 } }}>
        <MenuItem value="ALL">All status</MenuItem>
        {statusOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
      </TextField>
      <TextField select label="Delivery" value={target} onChange={(event) => onTarget(event.target.value)} sx={{ minWidth: { md: 150 } }}>
        <MenuItem value="ALL">All delivery</MenuItem>
        <MenuItem value="HOST">Host</MenuItem>
        <MenuItem value="VENUE">Venue</MenuItem>
      </TextField>
      <TextField select label="Sort" value={sort} onChange={(event) => onSort(event.target.value)} sx={{ minWidth: { md: 170 } }}>
        <MenuItem value="updated_desc">Newest updated</MenuItem>
        <MenuItem value="name_asc">Name A-Z</MenuItem>
        <MenuItem value="price_desc">Price high-low</MenuItem>
        <MenuItem value="quantity_asc">Low inventory</MenuItem>
      </TextField>
    </Stack>
  );
}