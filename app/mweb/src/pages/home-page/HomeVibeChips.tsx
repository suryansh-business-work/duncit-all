import type { ReactNode } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AppsRoundedIcon from '@mui/icons-material/AppsRounded';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import { renderSuperCategoryMark } from '../../components/app-header/superCategoryIcon';
import { useTranslation } from '../../i18n/useTranslation';
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
  /** Admin-managed heading (branding.home_vibe_heading); empty falls back to the bundled copy. */
  heading?: string | null;
  /** Admin-managed sub-heading (branding.home_vibe_subheading); empty falls back to the bundled copy. */
  subheading?: string | null;
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
      sx={{ height: 36, px: 0.75, fontWeight: 700, borderRadius: 999, flex: '0 0 auto' }}
    />
  );
}

/** "What's your vibe" — top-level categories as a rail of card tiles; the
 * selected category's sub-categories appear as pills directly below. The
 * heading + sub-heading are admin-managed (Category catalogue) with the
 * bundled copy as the fallback. */
export default function HomeVibeChips({ categories, selectedId, onSelect, allIcon, allLayout, heading, subheading, action }: Readonly<HomeVibeChipsProps>) {
  const { t } = useTranslation();
  const hasCategories = categories.length > 0;
  if (!hasCategories && !action) return null;
  const headingText = heading?.trim() || t('mweb.home.vibeHeading');
  const subheadingText = subheading?.trim() || t('mweb.home.vibeSubheading');

  const activeCategory =
    categories.find((c) => c.id === selectedId || c.subs.some((s) => s.id === selectedId)) ?? null;
  const subs = activeCategory?.subs ?? [];
  const allIconSize = allLayout?.height ?? DEFAULT_ICON_SIZE;
  const allMark = renderSuperCategoryMark(allIcon, allIconSize) ?? <AppsRoundedIcon sx={{ fontSize: 34 }} />;

  return (
    <Stack spacing={1}>
      <Stack
        direction="row"
        spacing={0.75}
        sx={{
          alignItems: "flex-start",
          justifyContent: "space-between",
          px: 0.25
        }}>
        <Box sx={{ minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={0.75}
            sx={{
              alignItems: "center",
              minWidth: 0
            }}>
            <AutoAwesomeIcon color="primary" sx={{ fontSize: 18 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.15 }} noWrap>
              {headingText}
            </Typography>
          </Stack>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 600,
              display: 'block',
              mt: 0.25
            }}>
            {subheadingText}
          </Typography>
        </Box>
        {action && <Box sx={{ flex: '0 0 auto' }}>{action}</Box>}
      </Stack>

      {hasCategories && (
        <Box sx={railSx}>
          <Stack direction="row" spacing={0.5} sx={{ width: 'max-content', pb: 0.25 }}>
            <VibeTab
              label={t('mweb.home.vibeAll')}
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
              label={t('mweb.home.vibeAllOf', { vars: { name: activeCategory.name } })}
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
