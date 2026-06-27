import { Card, CardContent, MenuItem, Stack, TextField } from '@mui/material';
import { STATUS_OPTIONS } from './helpers';

interface Props {
  search: string;
  setSearch: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  roles: any[];
}

export default function UsersFilters({
  search,
  setSearch,
  role,
  setRole,
  status,
  setStatus,
  roles,
}: Readonly<Props>) {
  return (
    <Card>
      <CardContent sx={{ pb: 1.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            size="small"
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
          />
          <TextField
            size="small"
            select
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            sx={{ minWidth: 180 }}
            InputLabelProps={{ shrink: true }}
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="">Any</MenuItem>
            {roles.map((r: any) => (
              <MenuItem key={r.key} value={r.key}>
                {r.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            sx={{ minWidth: 160 }}
            InputLabelProps={{ shrink: true }}
            SelectProps={{ displayEmpty: true }}
          >
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>
                {s || 'Any'}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </CardContent>
    </Card>
  );
}
