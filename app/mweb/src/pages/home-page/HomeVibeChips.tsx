import type { ReactNode } from 'react';
import { Box, Chip, Stack } from '@mui/material';
import AppsRoundedIcon from '@mui/icons-material/AppsRounded';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import { renderSuperCategoryMark } from '../../components/app-header/superCategoryIcon';
import { useTranslation } from '../../i18n/useTranslation';
import HomeRail from './HomeRail';
import VibeTab from './VibeTab';
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
  /** Admin-managed icon for the leading "All" chip (branding). */
  allIcon?: string | null;
  /** Optional trailing slot above the chips (Home's filter now sits beside the search bar). */
  action?: ReactNode;
}

/** The glyph size inside a chip's 24px icon circle. */
const MARK_SIZE = 16;

interface VibeChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

/** A pill for a sub-category in the second row. */
function VibeChip({ label, selected, onClick }: Readonly<VibeChipProps>) {
  const restSx = selected
    ? null
    : { bgcolor: 'background.paper', border: '1px solid var(--duncit-card-border)', '&:hover': { bgcolor: 'action.hover' } };
  return (
    <Chip
      label={label}
      clickable
      color={selected ? 'primary' : 'default'}
      variant="filled"
      onClick={onClick}
      sx={{ height: 32, minHeight: 32, px: 0.5, fontSize: 12.5, fontWeight: 600, borderRadius: 999, flex: '0 0 auto', ...restSx }}
    />
  );
}

/** The vibe row — top-level categories as icon pills (with a leading "All");
 * the selected category's sub-categories appear as smaller pills directly
 * below. Native twin: HomeVibeChips. */
export default function HomeVibeChips({ categories, selectedId, onSelect, allIcon, action }: Readonly<HomeVibeChipsProps>) {
  const { t } = useTranslation();
  const hasCategories = categories.length > 0;
  if (!hasCategories && !action) return null;

  const activeCategory =
    categories.find((c) => c.id === selectedId || c.subs.some((s) => s.id === selectedId)) ?? null;
  const subs = activeCategory?.subs ?? [];
  const allMark = renderSuperCategoryMark(allIcon, MARK_SIZE) ?? <AppsRoundedIcon sx={{ fontSize: MARK_SIZE }} />;

  return (
    <Stack spacing={1.25}>
      {action && <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>{action}</Box>}

      {hasCategories && (
        <HomeRail gap={1}>
          <VibeTab
            label={t('mweb.home.vibeAll')}
            icon={allMark}
            selected={selectedId === ''}
            onClick={() => onSelect('')}
          />
          {categories.map((category) => {
            const selected = category.id === selectedId || category.subs.some((s) => s.id === selectedId);
            const mark =
              renderSuperCategoryMark(category.icon, MARK_SIZE) ??
              <CategoryOutlinedIcon sx={{ fontSize: MARK_SIZE }} />;
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
        </HomeRail>
      )}

      {hasCategories && activeCategory && subs.length > 0 && (
        <HomeRail gap={1}>
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
        </HomeRail>
      )}
    </Stack>
  );
}
