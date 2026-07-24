import type { ReactNode } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AppsRoundedIcon from '@mui/icons-material/AppsRounded';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import { renderSuperCategoryMark } from '../../components/app-header/superCategoryIcon';
import VibeTab, { DEFAULT_ICON_SIZE } from './VibeTab';
import type { IconLayout } from './VibeTab';

export interface VibeSub {
  id: string;
  name: string;
  icon?: string | null;
}
export interface VibeCategory {
  id: string;
  name: string;
  icon?: string | null;
  iconLayout?: IconLayout | null;
  subs: VibeSub[];
}

interface HomeVibeChipsProps {
  categories: VibeCategory[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Admin-managed icon for the leading "All" tab (branding). */
  allIcon?: string | null;
  /** Admin-managed icon layout (position + size) for the "All" tab (branding). */
  allLayout?: IconLayout | null;
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
export default function HomeVibeChips({ categories, selectedId, onSelect, allIcon, allLayout, action }: Readonly<HomeVibeChipsProps>) {
  const hasCategories = categories.length > 0;
  if (!hasCategories && !action) return null;

  const activeCategory =
    categories.find((c) => c.id === selectedId || c.subs.some((s) => s.id === selectedId)) ?? null;
  const subs = activeCategory?.subs ?? [];
  const allIconSize = allLayout?.height ?? DEFAULT_ICON_SIZE;
  const allMark = renderSuperCategoryMark(allIcon, allIconSize) ?? <AppsRoundedIcon sx={{ fontSize: 34 }} />;

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
              icon={allMark}
              selected={selectedId === ''}
              onClick={() => onSelect('')}
              layout={allLayout}
            />
            {categories.map((category) => {
              const selected = category.id === selectedId || category.subs.some((s) => s.id === selectedId);
              const layout = category.iconLayout ?? null;
              const iconWidth = layout?.width ?? DEFAULT_ICON_SIZE;
              const iconHeight = layout?.height ?? DEFAULT_ICON_SIZE;
              const mark =
                renderSuperCategoryMark(category.icon, iconWidth, iconHeight) ??
                <CategoryOutlinedIcon sx={{ fontSize: 34 }} />;
              return (
                <VibeTab
                  key={category.id}
                  label={category.name}
                  icon={mark}
                  selected={selected}
                  onClick={() => onSelect(category.id === selectedId ? '' : category.id)}
                  layout={layout}
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
