import { Box, Chip, Stack } from '@mui/material';
import type { SearchCategory } from '../search-page/useSearchDiscovery';

interface ClubCategoryChipsProps {
  categories: SearchCategory[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const railSx = {
  mx: { xs: -1.25, sm: -2 },
  px: { xs: 1.25, sm: 2 },
  overflowX: 'auto',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
} as const;

const chipSx = { height: 32, fontWeight: 800, borderRadius: 999, flex: '0 0 auto' } as const;

/** Horizontally scrollable category rail below the club search bar — the mWeb
 * twin of the native ClubsSearchFilter chip row ("All" first, select on tap). */
export default function ClubCategoryChips({
  categories,
  selectedId,
  onSelect,
}: Readonly<ClubCategoryChipsProps>) {
  if (categories.length === 0) return null;
  return (
    <Box sx={railSx}>
      <Stack direction="row" spacing={1} sx={{ width: 'max-content', pb: 0.25 }}>
        <Chip
          label="All"
          clickable
          color={selectedId === '' ? 'primary' : 'default'}
          variant={selectedId === '' ? 'filled' : 'outlined'}
          onClick={() => onSelect('')}
          sx={chipSx}
        />
        {categories.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            clickable
            color={selectedId === category.id ? 'primary' : 'default'}
            variant={selectedId === category.id ? 'filled' : 'outlined'}
            onClick={() => onSelect(category.id)}
            sx={chipSx}
          />
        ))}
      </Stack>
    </Box>
  );
}
