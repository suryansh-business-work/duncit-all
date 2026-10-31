import { useMemo, useState } from 'react';
import { Box, FormHelperText, Stack, Typography } from '@mui/material';
import { categoriesForSuper, categoryIconLookup, createPodSuperOptions, superCategoryIdOf } from '@duncit/utils';
import { requiredLabel } from '../../../../forms/components/requiredLabel';
import { hostCategoryKeyOf } from '../create-pod.form';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { CreatePodCategoryIcon, CreatePodForm, CreatePodHostCategory } from '../create-pod.types';
import CategorySuperFilter from './CategorySuperFilter';
import CategoryTile from './CategoryTile';

interface Props {
  form: CreatePodForm;
  hostCategories: CreatePodHostCategory[];
  /** SUB- and CATEGORY-level icons; a tile shows its own level's, else its parent's. */
  categoryIcons?: CreatePodCategoryIcon[];
}

const NO_ICONS: CreatePodCategoryIcon[] = [];

/** What's category picker — the host chooses which of their onboarded
 * categories this pod is for, as tiles with each category's own icon. A host
 * onboarded under both "For You" and "For Your Pet" narrows the tiles to one.
 * Changing it resets the club/venue/slot picks. Native twin. */
export default function HostCategoryField({ form, hostCategories, categoryIcons = NO_ICONS }: Readonly<Props>) {
  const {
    setValue,
    watch,
    formState: { errors },
  } = form;
  const { t } = useTranslation();
  const selectedKey = watch('host_category_key');
  const supers = useMemo(() => createPodSuperOptions(hostCategories), [hostCategories]);
  const iconOf = useMemo(() => categoryIconLookup(categoryIcons), [categoryIcons]);
  const selected = hostCategories.find((category) => hostCategoryKeyOf(category) === selectedKey);
  const [superId, setSuperId] = useState(() => (selected ? superCategoryIdOf(selected) : (supers[0]?.id ?? '')));
  const shown = categoriesForSuper(hostCategories, supers.length, superId);

  const pickCategory = (key: string) => {
    setValue('host_category_key', key, { shouldDirty: true, shouldValidate: true });
    // A club valid for the old category may not match the new one.
    setValue('club_id', '', { shouldDirty: true });
    setValue('venue_id', '', { shouldDirty: true });
    setValue('venue_slot_id', '', { shouldDirty: true });
  };

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="subtitle2" component="div">
          {requiredLabel(t('mweb.createPod.categoryLabel'), true)}
        </Typography>
        <Typography variant="caption" data-testid="create-pod-category-hint" sx={{ color: 'text.secondary', display: 'block' }}>
          {t('mweb.createPod.categoryHint')}
        </Typography>
      </Box>
      {supers.length > 1 && <CategorySuperFilter options={supers} value={superId} onChange={setSuperId} />}
      {hostCategories.length > 0 ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}>
          {shown.map((category) => {
            const key = hostCategoryKeyOf(category);
            return (
              <CategoryTile
                key={key}
                category={category}
                icon={iconOf(category)}
                selected={key === selectedKey}
                testId={`create-pod-category-${key}`}
                onPick={() => pickCategory(key)}
              />
            );
          })}
        </Box>
      ) : (
        <Typography data-testid="create-pod-category-empty" variant="body2" sx={{ color: 'text.secondary' }}>
          {t('mweb.createPod.categoryEmpty')}
        </Typography>
      )}
      {errors.host_category_key && <FormHelperText error>{errors.host_category_key.message}</FormHelperText>}
    </Stack>
  );
}
