import { Box, Chip, Stack } from '@mui/material';
import type { SearchCategory } from '../search-page/useSearchDiscovery';
import { useTranslation } from '../../i18n/useTranslation';

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

/** Pill chips on the page ground: surface at rest, green when chosen. The
 * explicit min-height keeps the coarse-pointer 44px rule off a 36px pill. */
const chipBase = { height: 36, minHeight: 36, fontWeight: 600, px: 0.5, flex: '0 0 auto' } as const;
const chipSx = (selected: boolean) =>
  selected ? chipBase : { ...chipBase, bgcolor: 'background.paper', border: '1px solid var(--duncit-card-border)' };

/** Horizontally scrollable category rail below the club search bar — the mWeb
 * twin of the native ClubsSearchFilter chip row ("All" first, select on tap). */
export default function ClubCategoryChips({
  categories,
  selectedId,
  onSelect,
}: Readonly<ClubCategoryChipsProps>) {
  const { t } = useTranslation();
  if (categories.length === 0) return null;
  return (
    <Box sx={railSx}>
      <Stack direction="row" spacing={1} sx={{ width: 'max-content', pb: 0.25 }}>
        <Chip
          label={t('mweb.common.all')}
          clickable
          color={selectedId === '' ? 'primary' : 'default'}
          onClick={() => onSelect('')}
          sx={chipSx(selectedId === '')}
        />
        {categories.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            clickable
            color={selectedId === category.id ? 'primary' : 'default'}
            onClick={() => onSelect(category.id)}
            sx={chipSx(selectedId === category.id)}
          />
        ))}
      </Stack>
    </Box>
  );
}
