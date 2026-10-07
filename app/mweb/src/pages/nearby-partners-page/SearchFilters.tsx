import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Box, Chip, Slider, Stack, Typography } from '@mui/material';
import { POD_REQUEST_MAX_RADIUS_KM } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { SEARCH_CATEGORIES } from './queries';
import type { NearbySearchState } from './useNearbySearch';

const RAIL_SX = {
  overflowX: 'auto',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
} as const;
const CHIP_SX = { height: 36, minHeight: 36, fontWeight: 600, flex: '0 0 auto' } as const;

interface Props {
  state: NearbySearchState;
}

/** The radius (0–10 km) and the category chips (several may be on; none = all). */
export default function SearchFilters({ state }: Readonly<Props>) {
  const { t } = useTranslation();
  // The slider moves freely; the search only re-runs where the thumb is let go.
  const [dragKm, setDragKm] = useState<number | null>(null);
  const shownKm = dragKm ?? state.radiusKm;
  const categoriesQuery = useQuery(SEARCH_CATEGORIES, { fetchPolicy: 'cache-first' });
  const selected = useMemo(() => new Set(state.categoryIds), [state.categoryIds]);
  const categories = useMemo(
    () => (categoriesQuery.data?.categories ?? []).filter((row) => row.is_active),
    [categoriesQuery.data]
  );
  const kmLabel = (km: number) => t('podRequests.radiusValue', { vars: { km } });

  const toggle = (id: string) =>
    state.setCategoryIds(selected.has(id) ? state.categoryIds.filter((row) => row !== id) : [...state.categoryIds, id]);

  return (
    <Stack spacing={1.5} data-testid="nearby-search-filters">
      <Box>
        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Typography id="nearby-radius-label" variant="subtitle2" sx={{ fontWeight: 600 }}>
            {t('podRequests.radiusLabel')}
          </Typography>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            {kmLabel(shownKm)}
          </Typography>
        </Stack>
        <Slider
          value={shownKm}
          min={0}
          max={POD_REQUEST_MAX_RADIUS_KM}
          step={0.5}
          marks
          valueLabelDisplay="auto"
          valueLabelFormat={kmLabel}
          getAriaValueText={kmLabel}
          aria-labelledby="nearby-radius-label"
          onChange={(_, value) => setDragKm(Array.isArray(value) ? value[0] : value)}
          onChangeCommitted={(_, value) => {
            setDragKm(null);
            state.setRadiusKm(Array.isArray(value) ? value[0] : value);
          }}
          data-testid="nearby-radius"
        />
      </Box>
      <Stack spacing={1}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {t('podRequests.categoryLabel')}
        </Typography>
        <Box sx={RAIL_SX}>
          <Stack direction="row" spacing={1} role="group" aria-label={t('podRequests.categoryLabel')} sx={{ width: 'max-content', pb: 0.25 }}>
            <Chip
              label={t('podRequests.allCategories')}
              clickable
              color={selected.size === 0 ? 'primary' : 'default'}
              variant={selected.size === 0 ? 'filled' : 'outlined'}
              aria-pressed={selected.size === 0}
              onClick={() => state.setCategoryIds([])}
              sx={CHIP_SX}
              data-testid="nearby-category-all"
            />
            {categories.map((category) => (
              <Chip
                key={category.id}
                label={category.name}
                clickable
                color={selected.has(category.id) ? 'primary' : 'default'}
                variant={selected.has(category.id) ? 'filled' : 'outlined'}
                aria-pressed={selected.has(category.id)}
                onClick={() => toggle(category.id)}
                sx={CHIP_SX}
                data-testid={`nearby-category-${category.id}`}
              />
            ))}
          </Stack>
        </Box>
      </Stack>
    </Stack>
  );
}
