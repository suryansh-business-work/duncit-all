import { useMemo, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLessRounded';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMoreRounded';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import {
  foodMenuView,
  foodSectionsAfterSearch,
  toggleAllFoodSections,
  toggleFoodSection,
  type FoodMenuGroup,
  type VenueFoodItem,
} from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';
import SearchPillField from '../../pod-list/SearchPillField';
import FoodMenuList from './FoodMenuList';

interface Props {
  venueId: string;
  /** The menu's sections as the page shows them (the veg-only switch already applied). */
  groups: FoodMenuGroup[];
  currency: string;
  canOrder: boolean;
  quantityOf: (itemId: string) => number;
  onQuantity: (itemId: string, quantity: number) => void;
  onOpenImage: (item: VenueFoodItem) => void;
}

/**
 * Finding a dish: a search over names and descriptions, and — on a menu with
 * categories — sections that fold, with one button to open or fold them all.
 * Typing a search opens every section, so a match is never hidden in a
 * folded one. The filtering is `@duncit/utils`, shared with native.
 * Native twin: components/details/venue-food/FoodMenuBrowser.
 */
export default function FoodMenuBrowser({ groups, ...list }: Readonly<Props>) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<string[]>([]);

  const { shown, sectioned, allOpen } = useMemo(
    () => foodMenuView(groups, query, collapsed),
    [groups, query, collapsed],
  );

  const search = (next: string) => {
    setQuery(next);
    setCollapsed((prev) => foodSectionsAfterSearch(prev, next));
  };

  return (
    <Stack spacing={1.5}>
      <SearchPillField
        testId="venue-food-search"
        value={query}
        onChange={search}
        placeholder={t('mweb.venueFood.menuSearch.placeholder')}
        ariaLabel={t('mweb.venueFood.menuSearch.label')}
        enterKeyHint="search"
        endAdornment={
          query ? (
            <DuncitIconButton data-testid="venue-food-search-clear" aria-label={t('mweb.common.clearSearch')} size="small" onClick={() => search('')}>
              <CloseIcon fontSize="small" />
            </DuncitIconButton>
          ) : null
        }
      />
      {sectioned && shown.length > 0 && (
        <DuncitButton
          size="small"
          variant="text"
          startIcon={allOpen ? <UnfoldLessIcon /> : <UnfoldMoreIcon />}
          onClick={() => setCollapsed((prev) => toggleAllFoodSections(shown, prev))}
          sx={{ alignSelf: 'flex-end' }}
          data-testid="venue-food-toggle-all"
        >
          {allOpen ? t('mweb.venueFood.menuSearch.collapseAll') : t('mweb.venueFood.menuSearch.expandAll')}
        </DuncitButton>
      )}
      {shown.length === 0 ? (
        <Typography role="status" variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 3 }} data-testid="venue-food-search-empty">
          {t('mweb.venueFood.menuSearch.noResults', { vars: { query: query.trim() } })}
        </Typography>
      ) : (
        <FoodMenuList
          {...list}
          groups={shown}
          sectioned={sectioned}
          collapsed={collapsed}
          onToggle={(key) => setCollapsed((prev) => toggleFoodSection(prev, key))}
        />
      )}
    </Stack>
  );
}
