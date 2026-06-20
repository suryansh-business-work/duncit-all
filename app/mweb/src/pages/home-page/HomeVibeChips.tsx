import { Box, Chip, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

export interface VibeSub {
  id: string;
  name: string;
}
export interface VibeCategory {
  id: string;
  name: string;
  subs: VibeSub[];
}

interface HomeVibeChipsProps {
  categories: VibeCategory[];
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

interface VibeChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  small?: boolean;
}

function VibeChip({ label, selected, onClick, small }: Readonly<VibeChipProps>) {
  return (
    <Chip
      label={label}
      clickable
      color={selected ? 'primary' : 'default'}
      variant={selected ? 'filled' : 'outlined'}
      onClick={onClick}
      sx={{ height: small ? 36 : 42, px: 0.75, fontWeight: 900, borderRadius: 3, flex: '0 0 auto' }}
    />
  );
}

/** "What's your vibe" — Categories in row 1; the selected category's
 * Subcategories appear in a second row directly below. */
export default function HomeVibeChips({ categories, selectedId, onSelect }: Readonly<HomeVibeChipsProps>) {
  if (categories.length === 0) return null;

  const activeCategory =
    categories.find((c) => c.id === selectedId || c.subs.some((s) => s.id === selectedId)) ?? null;
  const subs = activeCategory?.subs ?? [];

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ px: 0.25 }}>
        <AutoAwesomeIcon color="primary" sx={{ fontSize: 18 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.15 }}>
          What's your vibe today?
        </Typography>
      </Stack>

      <Box sx={railSx}>
        <Stack direction="row" spacing={1} sx={{ width: 'max-content', pb: 0.25 }}>
          <VibeChip label="All" selected={selectedId === ''} onClick={() => onSelect('')} />
          {categories.map((category) => {
            const selected = category.id === selectedId || category.subs.some((s) => s.id === selectedId);
            return (
              <VibeChip
                key={category.id}
                label={category.name}
                selected={selected}
                onClick={() => onSelect(category.id === selectedId ? '' : category.id)}
              />
            );
          })}
        </Stack>
      </Box>

      {activeCategory && subs.length > 0 && (
        <Box sx={railSx}>
          <Stack direction="row" spacing={1} sx={{ width: 'max-content', pb: 0.25 }}>
            <VibeChip
              small
              label={`All ${activeCategory.name}`}
              selected={selectedId === activeCategory.id}
              onClick={() => onSelect(activeCategory.id)}
            />
            {subs.map((sub) => (
              <VibeChip
                key={sub.id}
                small
                label={sub.name}
                selected={selectedId === sub.id}
                onClick={() => onSelect(selectedId === sub.id ? activeCategory.id : sub.id)}
              />
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
