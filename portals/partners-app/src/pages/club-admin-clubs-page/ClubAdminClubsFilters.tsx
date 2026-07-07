import { Button, Stack, TextField } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import { AdminCategorySelect, type AdminCategoryValue } from '@duncit/category';

interface Props {
  searchInput: string;
  onSearchInput: (value: string) => void;
  category: AdminCategoryValue;
  onCategory: (value: AdminCategoryValue) => void;
  onClear: () => void;
  active: boolean;
}

/** Debounced search + the shared Super → Category → Sub cascade, used to filter
 * the "Your Clubs" list server-side. All levels are optional (filter mode). */
export default function ClubAdminClubsFilters({
  searchInput,
  onSearchInput,
  category,
  onCategory,
  onClear,
  active,
}: Readonly<Props>) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      alignItems={{ xs: 'stretch', md: 'flex-start' }}
    >
      <TextField
        label="Search clubs"
        placeholder="Name or slug…"
        value={searchInput}
        onChange={(event) => onSearchInput(event.target.value)}
        size="small"
        sx={{ minWidth: { md: 220 } }}
      />
      <AdminCategorySelect value={category} onChange={onCategory} direction="row" size="small" />
      {active && (
        <Button size="small" startIcon={<ClearIcon />} onClick={onClear} sx={{ mt: { md: 0.5 }, flexShrink: 0 }}>
          Clear
        </Button>
      )}
    </Stack>
  );
}
