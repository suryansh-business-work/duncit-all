import type { ReactNode } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AppsRoundedIcon from '@mui/icons-material/AppsRounded';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import { renderSuperCategoryMark } from '../../components/app-header/superCategoryIcon';

export interface VibeSub {
  id: string;
  name: string;
  icon?: string | null;
}
export interface VibeCategory {
  id: string;
  name: string;
  icon?: string | null;
  subs: VibeSub[];
}

interface HomeVibeChipsProps {
  categories: VibeCategory[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Right-aligned slot in the header (e.g. the Filters button). */
  action?: ReactNode;
}

const railSx = {
  mx: { xs: -1.25, sm: -2 },
  px: { xs: 1.25, sm: 2 },
  overflowX: 'auto',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
} as const;

interface VibeTabProps {
  label: string;
  icon: ReactNode;
  selected: boolean;
  onClick: () => void;
}

/** A vertical icon-over-label tab for a top-level category (not an MUI Chip). */
function VibeTab({ label, icon, selected, onClick }: Readonly<VibeTabProps>) {
  return (
    <Stack
      component="button"
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      alignItems="center"
      spacing={0.5}
      sx={{
        flex: '0 0 auto',
        width: 76,
        px: 0.5,
        py: 0.75,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        color: selected ? 'primary.main' : 'text.secondary',
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: selected ? 'primary.main' : 'action.hover',
          color: selected ? 'primary.contrastText' : 'text.secondary',
        }}
      >
        {icon}
      </Box>
      <Typography variant="caption" sx={{ fontWeight: selected ? 900 : 700, lineHeight: 1.15, textAlign: 'center' }} noWrap>
        {label}
      </Typography>
    </Stack>
  );
}

interface VibeChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

/** A pill for a sub-category in the second row. */
function VibeChip({ label, selected, onClick }: Readonly<VibeChipProps>) {
  return (
    <Chip
      label={label}
      clickable
      color={selected ? 'primary' : 'default'}
      variant={selected ? 'filled' : 'outlined'}
      onClick={onClick}
      sx={{ height: 36, px: 0.75, fontWeight: 900, borderRadius: 3, flex: '0 0 auto' }}
    />
  );
}

/** "What's your vibe" — top-level categories as a horizontal icon tabber; the
 * selected category's sub-categories appear as pills directly below. */
export default function HomeVibeChips({ categories, selectedId, onSelect, action }: Readonly<HomeVibeChipsProps>) {
  const hasCategories = categories.length > 0;
  if (!hasCategories && !action) return null;

  const activeCategory =
    categories.find((c) => c.id === selectedId || c.subs.some((s) => s.id === selectedId)) ?? null;
  const subs = activeCategory?.subs ?? [];

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="space-between" sx={{ px: 0.25 }}>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
          <AutoAwesomeIcon color="primary" sx={{ fontSize: 18 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.15 }} noWrap>
            What's your vibe today?
          </Typography>
        </Stack>
        {action && <Box sx={{ flex: '0 0 auto' }}>{action}</Box>}
      </Stack>

      {hasCategories && (
        <Box sx={railSx}>
          <Stack direction="row" spacing={0.5} sx={{ width: 'max-content', pb: 0.25 }}>
            <VibeTab
              label="All"
              icon={<AppsRoundedIcon sx={{ fontSize: 20 }} />}
              selected={selectedId === ''}
              onClick={() => onSelect('')}
            />
            {categories.map((category) => {
              const selected = category.id === selectedId || category.subs.some((s) => s.id === selectedId);
              const mark = renderSuperCategoryMark(category.icon) ?? <CategoryOutlinedIcon sx={{ fontSize: 20 }} />;
              return (
                <VibeTab
                  key={category.id}
                  label={category.name}
                  icon={mark}
                  selected={selected}
                  onClick={() => onSelect(category.id === selectedId ? '' : category.id)}
                />
              );
            })}
          </Stack>
        </Box>
      )}

      {hasCategories && activeCategory && subs.length > 0 && (
        <Box sx={railSx}>
          <Stack direction="row" spacing={1} sx={{ width: 'max-content', pb: 0.25 }}>
            <VibeChip
              label={`All ${activeCategory.name}`}
              selected={selectedId === activeCategory.id}
              onClick={() => onSelect(activeCategory.id)}
            />
            {subs.map((sub) => (
              <VibeChip
                key={sub.id}
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
