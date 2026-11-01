import { useMemo, useState } from 'react';
import { Box, FormHelperText, Stack, Typography } from '@mui/material';
import { categoryIconLookup, clubCountsByCategory, createPodCategoryLevels, superCategoryIdOf } from '@duncit/utils';
import { requiredLabel } from '../../../../forms/components/requiredLabel';
import { hostCategoryKeyOf } from '../create-pod.form';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { CreatePodCategoryIcon, CreatePodClub, CreatePodForm, CreatePodHostCategory } from '../create-pod.types';
import CategoryChipRow from './CategoryChipRow';
import CategorySuperFilter from './CategorySuperFilter';
import CategoryTile from './CategoryTile';

interface Props {
  form: CreatePodForm;
  /** Every sub-category the host is granted (Super > Category > Sub). */
  hostCategories: CreatePodHostCategory[];
  /** SUB- and CATEGORY-level icons; a chip shows its own level's, else its parent's. */
  categoryIcons?: CreatePodCategoryIcon[];
  /** Every club, so each chip can say how many it has where the pod would run. */
  clubs: CreatePodClub[];
}

const NO_ICONS: CreatePodCategoryIcon[] = [];

/** What's category picker: the host narrows by Super, then Category, and picks
 * one of their granted sub-categories from a sideways-scrolling chip row. A chip
 * with no club where the pod would run is disabled. Changing it resets the
 * club/venue/slot picks. Native twin. */
export default function HostCategoryField({ form, hostCategories, categoryIcons = NO_ICONS, clubs }: Readonly<Props>) {
  const {
    setValue,
    watch,
    formState: { errors },
  } = form;
  const { t } = useTranslation();
  const selectedKey = watch('host_category_key');
  const locationId = watch('location_id');
  const podMode = watch('pod_mode');
  const iconOf = useMemo(() => categoryIconLookup(categoryIcons), [categoryIcons]);
  const counts = useMemo(() => clubCountsByCategory(clubs, hostCategories, { locationId, podMode }), [clubs, hostCategories, locationId, podMode]);
  const [pick, setPick] = useState(() => {
    const selected = hostCategories.find((category) => hostCategoryKeyOf(category) === selectedKey);
    return { superId: selected ? superCategoryIdOf(selected) : '', categoryId: selected?.category_id ?? '' };
  });
  const levels = createPodCategoryLevels(hostCategories, pick);

  const pickCategory = (key: string) => {
    setValue('host_category_key', key, { shouldDirty: true, shouldValidate: true });
    // A club valid for the old category may not match the new one.
    setValue('club_id', '', { shouldDirty: true });
    setValue('venue_id', '', { shouldDirty: true });
    setValue('venue_slot_id', '', { shouldDirty: true });
  };

  return (
    <Stack spacing={1.25}>
      <Box>
        <Typography variant="subtitle2" component="div">
          {requiredLabel(t('mweb.createPod.categoryLabel'), true)}
        </Typography>
        <Typography variant="caption" data-testid="create-pod-category-hint" sx={{ color: 'text.secondary', display: 'block' }}>
          {t('mweb.createPod.categoryHint')}
        </Typography>
      </Box>
      {hostCategories.length > 0 ? (
        <>
          <CategorySuperFilter
            options={levels.supers}
            value={levels.superId}
            onChange={(superId) => setPick({ superId, categoryId: '' })}
            label={t('mweb.createPod.categoryFor')}
            testId="create-pod-category-super"
          />
          <CategorySuperFilter
            options={levels.groups}
            value={levels.categoryId}
            onChange={(categoryId) => setPick({ superId: levels.superId, categoryId })}
            label={t('mweb.createPod.categoryGroup')}
            testId="create-pod-category-group"
          />
          <CategoryChipRow label={t('mweb.createPod.categoryLabel')} testId="create-pod-category-subs">
            {levels.subs.map((category) => {
              const key = hostCategoryKeyOf(category);
              return (
                <CategoryTile
                  key={key}
                  category={category}
                  icon={iconOf(category)}
                  selected={key === selectedKey}
                  clubCount={counts.get(key) ?? 0}
                  testId={`create-pod-category-${key}`}
                  onPick={() => pickCategory(key)}
                />
              );
            })}
          </CategoryChipRow>
        </>
      ) : (
        <Typography data-testid="create-pod-category-empty" variant="body2" sx={{ color: 'text.secondary' }}>
          {t('mweb.createPod.categoryEmpty')}
        </Typography>
      )}
      {errors.host_category_key && <FormHelperText error>{errors.host_category_key.message}</FormHelperText>}
    </Stack>
  );
}
