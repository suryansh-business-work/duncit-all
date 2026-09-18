import { useId } from 'react';
import { Link as RouterLink } from 'react-router';
import { Box, Chip, Dialog, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { DuncitButton } from '@duncit/buttons';

import { CircleButton } from '../../components/CircleButton';
import { useNavigationData } from '../../components/header/navigation';
import { SearchForm } from '../../components/header/search-form';
import { PetTypeChips } from '../../components/PetTypeChips';
import { ProductGrid } from '../../components/ProductGrid';
import type { StoreSearchPage } from '../../graphql/catalog';
import { paths } from '../../lib/paths';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';
import { FilterPanel } from './filter-panel';
import type { ShelfControls, ShelfScope } from './useShelfFilters';

interface FilterScreenProps {
  open: boolean;
  onClose: () => void;
  page: StoreSearchPage | undefined;
  controls: ShelfControls;
  scope: ShelfScope;
}

/** The phone's full-page filter: search, pets, top searches, filters, popular picks, "Show N". */
export function FilterScreen({ open, onClose, page, controls, scope }: Readonly<FilterScreenProps>) {
  const { t } = useStoreT();
  const titleId = useId();
  const nav = useNavigationData();
  const quick = [
    ...nav.collections.map((c) => ({ id: c.id, label: c.name, to: paths.collection(c.slug) })),
    ...nav.categories.filter((c) => c.show_in_menu).map((c) => ({ id: c.id, label: c.name, to: paths.category(c.slug) })),
  ].slice(0, 10);
  return (
    <Dialog fullScreen open={open} onClose={onClose} aria-labelledby={titleId} slotProps={{ paper: { sx: { borderRadius: 0, bgcolor: T.page } } }}>
      <Stack spacing={2.5} sx={{ p: 2, pb: 12 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <CircleButton aria-label={t('ecommStore.filters.close')} onClick={onClose}>
            <ArrowBackRoundedIcon />
          </CircleButton>
          <Typography id={titleId} variant="h3" component="h2" sx={{ flexGrow: 1, textAlign: 'center', pr: 6 }}>
            {t('ecommStore.filters.title')}
          </Typography>
        </Stack>
        <SearchForm id="filter-search" onDone={onClose} />
        {scope.pet_type ? null : (
          <Stack spacing={1}>
            <Typography variant="h4" component="h3">
              {t('ecommStore.filters.petType')}
            </Typography>
            <PetTypeChips pets={nav.pet_types} selectedSlug={controls.filters.pet} onSelect={controls.setPet} label={t('ecommStore.filters.petType')} />
          </Stack>
        )}
        {quick.length > 0 ? (
          <Stack spacing={1}>
            <Typography variant="h4" component="h3">
              {t('ecommStore.filters.topSearches')}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
              {quick.map((q) => (
                <Chip key={q.id} label={q.label} component={RouterLink} to={q.to} clickable onClick={onClose} sx={{ bgcolor: T.surface, minHeight: 40 }} />
              ))}
            </Stack>
          </Stack>
        ) : null}
        <Box sx={{ bgcolor: T.surface, borderRadius: `${T.radius.card}px`, p: 2 }}>
          <FilterPanel page={page} controls={controls} scope={scope} />
        </Box>
        {page && page.items.length > 0 ? (
          <Stack spacing={1}>
            <Typography variant="h4" component="h3">
              {t('ecommStore.filters.popular')}
            </Typography>
            <ProductGrid products={page.items.slice(0, 4)} />
          </Stack>
        ) : null}
      </Stack>
      <Box sx={{ position: 'fixed', insetInline: 0, bottom: 0, p: 2, pb: 'calc(16px + env(safe-area-inset-bottom))', bgcolor: T.page }}>
        <DuncitButton variant="contained" size="large" fullWidth onClick={onClose}>
          {t('ecommStore.filters.show', { count: page?.total ?? 0 })}
        </DuncitButton>
      </Box>
    </Dialog>
  );
}
