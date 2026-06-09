import { InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import type { CrmServiceOffered } from '../../../api/data.gql';

export type TargetFilter = 'ALL' | 'VENUE' | 'HOST';
export type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export interface ServicesFilterState {
  search: string;
  target: TargetFilter;
  status: StatusFilter;
}

export const EMPTY_FILTERS: ServicesFilterState = { search: '', target: 'ALL', status: 'ALL' };

/** Client-side filter: title / category-name search + Venue|Host + active state. */
export function filterServices(rows: CrmServiceOffered[], f: ServicesFilterState): CrmServiceOffered[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    const haystack = [r.title, r.super_category_name, r.category_name, r.sub_category_name]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (f.target === 'VENUE' && !r.applies_to_venue) return false;
    if (f.target === 'HOST' && !r.applies_to_host) return false;
    if (f.status === 'ACTIVE' && !r.is_active) return false;
    if (f.status === 'INACTIVE' && r.is_active) return false;
    return true;
  });
}

interface Props {
  value: ServicesFilterState;
  onChange: (next: ServicesFilterState) => void;
}

export default function ServicesOfferedFilters({ value, onChange }: Readonly<Props>) {
  const set = (patch: Partial<ServicesFilterState>) => onChange({ ...value, ...patch });
  return (
    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
      <TextField
        size="small"
        placeholder="Search title or category…"
        value={value.search}
        onChange={(e) => set({ search: e.target.value })}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        sx={{ minWidth: 240, flex: 1 }}
      />
      <TextField select size="small" label="Applies to" value={value.target} onChange={(e) => set({ target: e.target.value as TargetFilter })} sx={{ minWidth: 140 }}>
        <MenuItem value="ALL">All</MenuItem>
        <MenuItem value="VENUE">Venue</MenuItem>
        <MenuItem value="HOST">Host</MenuItem>
      </TextField>
      <TextField select size="small" label="Status" value={value.status} onChange={(e) => set({ status: e.target.value as StatusFilter })} sx={{ minWidth: 130 }}>
        <MenuItem value="ALL">All</MenuItem>
        <MenuItem value="ACTIVE">Active</MenuItem>
        <MenuItem value="INACTIVE">Inactive</MenuItem>
      </TextField>
    </Stack>
  );
}
