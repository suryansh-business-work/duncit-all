import { MenuItem, TextField } from '@mui/material';
import { ALL_ROLES, ROLE_OPTIONS, type RoleFilterValue } from './roles';

interface Props {
  value: RoleFilterValue;
  onChange: (value: RoleFilterValue) => void;
}

/**
 * Page-level Role filter. It drives the table's `externalFilters` rather than a
 * column filter, so the chosen role stays pinned across search, sort and paging
 * instead of reading as one dismissible chip among many.
 */
export default function RoleFilter({ value, onChange }: Readonly<Props>) {
  return (
    <TextField
      select
      size="small"
      label="Role"
      value={value}
      onChange={(e) => onChange(e.target.value as RoleFilterValue)}
      sx={{ minWidth: 200 }}
    >
      <MenuItem value={ALL_ROLES}>All roles</MenuItem>
      {ROLE_OPTIONS.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
