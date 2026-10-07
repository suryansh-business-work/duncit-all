import { useMemo, useState } from 'react';
import Chip from '@mui/material/Chip';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { categoryOptions, useAdminCategories } from '@duncit/category';
import { useTranslation } from '@duncit/shell';
import { POD_REQUEST_MAX_RADIUS_KM, clampPodRequestRadius } from '@duncit/utils';

interface Props {
  radiusKm: number;
  onRadius: (km: number) => void;
  categoryIds: readonly string[];
  onCategories: (ids: string[]) => void;
}

/**
 * The search's two knobs: how far (0–10 km) and which categories. "All
 * categories" is the empty selection; each chip toggles one category in.
 */
export default function SearchFilters({ radiusKm, onRadius, categoryIds, onCategories }: Readonly<Props>) {
  const { t } = useTranslation();
  const { categories } = useAdminCategories();
  // The slider moves freely; the search only re-runs once it is let go.
  const [draft, setDraft] = useState(radiusKm);
  const [committed, setCommitted] = useState(radiusKm);
  if (committed !== radiusKm) {
    setCommitted(radiusKm);
    setDraft(radiusKm);
  }
  const options = useMemo(() => categoryOptions(categories, ''), [categories]);
  const selected = new Set(categoryIds);
  const toggle = (id: string) =>
    onCategories(selected.has(id) ? categoryIds.filter((value) => value !== id) : [...categoryIds, id]);

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography id="pod-request-radius" variant="subtitle2" sx={{ fontWeight: 700 }}>
          {t('podRequests.radiusLabel')}: {t('podRequests.radiusValue', { vars: { km: draft } })}
        </Typography>
        <Slider
          aria-labelledby="pod-request-radius"
          value={draft}
          min={0}
          max={POD_REQUEST_MAX_RADIUS_KM}
          step={0.5}
          marks
          valueLabelDisplay="auto"
          getAriaValueText={(km) => t('podRequests.radiusValue', { vars: { km } })}
          valueLabelFormat={(km) => t('podRequests.radiusValue', { vars: { km } })}
          onChange={(_, value) => setDraft(clampPodRequestRadius(value))}
          onChangeCommitted={(_, value) => onRadius(clampPodRequestRadius(value))}
          sx={{ maxWidth: 420 }}
        />
      </Stack>
      <Stack spacing={1}>
        <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>
          {t('podRequests.categoryLabel')}
        </Typography>
        <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Chip
            label={t('podRequests.allCategories')}
            color={categoryIds.length === 0 ? 'primary' : 'default'}
            variant={categoryIds.length === 0 ? 'filled' : 'outlined'}
            aria-pressed={categoryIds.length === 0}
            onClick={() => onCategories([])}
          />
          {options.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              color={selected.has(option.value) ? 'primary' : 'default'}
              variant={selected.has(option.value) ? 'filled' : 'outlined'}
              aria-pressed={selected.has(option.value)}
              onClick={() => toggle(option.value)}
            />
          ))}
        </Stack>
      </Stack>
    </Stack>
  );
}
