import {
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export type StatusFilterValue = 'all' | 'operational' | 'issues';

export interface FilterState {
  query: string;
  status: StatusFilterValue;
  group: string;
}

interface FiltersProps {
  value: FilterState;
  groupTitles: string[];
  onChange: (next: FilterState) => void;
}

export default function StatusFilters({ value, groupTitles, onChange }: Readonly<FiltersProps>) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      mb={3}
    >
      <TextField
        size="small"
        placeholder="Search services…"
        value={value.query}
        onChange={(event) => onChange({ ...value, query: event.target.value })}
        sx={{ flex: 1 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        inputProps={{ 'aria-label': 'Search services' }}
      />
      <TextField
        size="small"
        select
        label="Group"
        value={value.group}
        onChange={(event) => onChange({ ...value, group: event.target.value })}
        sx={{ minWidth: 140 }}
      >
        <MenuItem value="all">All groups</MenuItem>
        {groupTitles.map((title) => (
          <MenuItem key={title} value={title}>
            {title}
          </MenuItem>
        ))}
      </TextField>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={value.status}
        onChange={(_event, next: StatusFilterValue | null) => {
          if (next !== null) onChange({ ...value, status: next });
        }}
        aria-label="Filter by status"
      >
        <ToggleButton value="all">All</ToggleButton>
        <ToggleButton value="operational">Operational</ToggleButton>
        <ToggleButton value="issues">Issues</ToggleButton>
      </ToggleButtonGroup>
    </Stack>
  );
}
