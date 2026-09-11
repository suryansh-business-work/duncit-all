import { useState } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import ResponsiveDialog from '../../components/ResponsiveDialog';
import { useTranslation } from '../../i18n/useTranslation';
import type { ExploreDateFilter, ExploreFilters, ExplorePreset, ExplorePriceFilter, ExploreSort } from './exploreFilters';

interface ExploreFilterSheetProps {
  open: boolean;
  filters: ExploreFilters;
  setFilters: (filters: ExploreFilters) => void;
  categories: any[];
  activeCount: number;
  resultCount: number;
  onClose: () => void;
}

const PRESETS: Array<[ExplorePreset, string]> = [['ALL', 'mweb.explore.presetAll'], ['TONIGHT', 'mweb.explore.presetTonight'], ['TRENDING', 'mweb.explore.presetTrending'], ['NEAR', 'mweb.explore.presetNearMe']];
const SORTS: Array<[ExploreSort, string]> = [['SOONEST', 'mweb.explore.sortSoonest'], ['TRENDING', 'mweb.explore.sortTrending'], ['PRICE_LOW', 'mweb.explore.sortPriceLow'], ['PRICE_HIGH', 'mweb.explore.sortPriceHigh']];
const PRICES: Array<[ExplorePriceFilter, string]> = [['ALL', 'mweb.podType.all'], ['FREE', 'mweb.podType.free'], ['PAID', 'mweb.podType.paid']];
const DATES: Array<[ExploreDateFilter, string]> = [['ALL', 'mweb.explore.dateAnyTime'], ['TODAY', 'mweb.explore.dateToday'], ['TOMORROW', 'mweb.explore.dateTomorrow'], ['WEEK', 'mweb.explore.dateThisWeek'], ['MONTH', 'mweb.explore.dateThisMonth']];

/** Pill chips on the sheet's surface: soft at rest, green when chosen. The
 * explicit min-height keeps the coarse-pointer 44px rule off a 36px pill. */
const CHIP_SX = { height: 36, minHeight: 36, fontWeight: 600, px: 0.5 } as const;
const LABEL_SX = { color: 'text.secondary', fontWeight: 600 } as const;

function ChipRow<T extends string>({ items, value, onChange }: Readonly<{ items: Array<[T, string]>; value: T; onChange: (value: T) => void }>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={0.75} useFlexGap sx={{
      flexWrap: "wrap"
    }}>
      {items.map(([itemValue, labelKey]) => {
        const selected = value === itemValue;
        return (
          <Chip
            key={itemValue}
            label={t(labelKey)}
            clickable
            color={selected ? 'primary' : 'default'}
            variant="filled"
            onClick={() => onChange(itemValue)}
            sx={CHIP_SX}
          />
        );
      })}
    </Stack>
  );
}

const VIBE_COLLAPSED_COUNT = 9;

export default function ExploreFilterSheet({ open, filters, setFilters, categories, activeCount, resultCount, onClose }: Readonly<ExploreFilterSheetProps>) {
  const { t } = useTranslation();
  const [showAllVibes, setShowAllVibes] = useState(false);
  const reset = () => setFilters({ preset: 'ALL', categoryId: '', price: 'ALL', date: 'ALL', sort: 'SOONEST', search: '' });
  // Keep the panel short on small screens: show a handful of vibes, overflow the
  // rest behind a "+N more" toggle so filter controls never push past the sheet (item 1).
  const visibleCats = showAllVibes ? categories : categories.slice(0, VIBE_COLLAPSED_COUNT);
  const hiddenCount = Math.max(0, categories.length - VIBE_COLLAPSED_COUNT);

  return (
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      title={
        <Box>
          <Typography sx={{ fontSize: '1.0625rem', fontWeight: 600, lineHeight: 1.2 }}>
            {t('mweb.explore.filtersTitle')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            {t('mweb.explore.filtersSummary', { vars: { activeCount, resultCount } })}
          </Typography>
        </Box>
      }
      sheetMaxHeight="88dvh"
      actions={
        <Stack direction="row" spacing={1} sx={{ width: '100%', alignItems: 'center' }}>
          <DuncitButton onClick={reset} color="inherit" disabled={activeCount === 0}>
            {t('mweb.explore.reset')}
          </DuncitButton>
          <DuncitButton variant="contained" size="large" onClick={onClose} sx={{ flex: 1 }}>
            {t('mweb.explore.showResults', { vars: { count: resultCount } })}
          </DuncitButton>
        </Stack>
      }
    >
      <Stack spacing={2}>
        <Stack spacing={0.8}>
          <Typography
            variant="overline"
            sx={LABEL_SX}>{t('mweb.explore.quickPresets')}</Typography>
          <ChipRow items={PRESETS} value={filters.preset} onChange={(preset) => setFilters({ ...filters, preset })} />
        </Stack>
        <Stack spacing={0.8}>
          <Typography
            variant="overline"
            sx={LABEL_SX}>{t('mweb.explore.sortBy')}</Typography>
          <ChipRow items={SORTS} value={filters.sort} onChange={(sort) => setFilters({ ...filters, sort })} />
        </Stack>
        <Stack spacing={0.8}>
          <Typography
            variant="overline"
            sx={LABEL_SX}>{t('mweb.explore.vibe')}</Typography>
          <Stack direction="row" spacing={0.75} useFlexGap sx={{
            flexWrap: "wrap"
          }}>
            <Chip label={t('mweb.home.vibeAll')} clickable color={filters.categoryId ? 'default' : 'primary'} variant="filled" onClick={() => setFilters({ ...filters, categoryId: '' })} sx={CHIP_SX} />
            {visibleCats.map((category: any) => {
              const selected = filters.categoryId === category.id;
              return <Chip key={category.id} label={category.name} clickable color={selected ? 'primary' : 'default'} variant="filled" onClick={() => setFilters({ ...filters, categoryId: selected ? '' : category.id })} sx={CHIP_SX} />;
            })}
            {hiddenCount > 0 && (
              <Chip
                label={showAllVibes ? t('mweb.explore.showLess') : t('mweb.explore.moreVibes', { vars: { count: hiddenCount } })}
                clickable
                variant="outlined"
                onClick={() => setShowAllVibes((v) => !v)}
                sx={CHIP_SX}
              />
            )}
          </Stack>
        </Stack>
        <Stack spacing={0.8}>
          <Typography
            variant="overline"
            sx={LABEL_SX}>{t('mweb.explore.price')}</Typography>
          <ChipRow items={PRICES} value={filters.price} onChange={(price) => setFilters({ ...filters, price })} />
        </Stack>
        <Stack spacing={0.8}>
          <Typography
            variant="overline"
            sx={LABEL_SX}>{t('mweb.explore.when')}</Typography>
          <ChipRow items={DATES} value={filters.date} onChange={(date) => setFilters({ ...filters, date })} />
        </Stack>
      </Stack>
    </ResponsiveDialog>
  );
}