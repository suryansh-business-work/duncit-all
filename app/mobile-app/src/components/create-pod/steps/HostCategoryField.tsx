import { useMemo, useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import {
  categoryIconLookup,
  clubCountsByCategory,
  createPodCategoryLevels,
  superCategoryIdOf,
} from '@duncit/utils';

import { FieldLabel } from '@/components/Field';
import { ScrollRail } from '@/components/ScrollRail';
import { useTranslation } from '@/hooks/useTranslation';
import { hostCategoryKeyOf } from '../create-pod.form';
import type {
  CreatePodCategoryIcon,
  CreatePodClub,
  CreatePodForm,
  CreatePodHostCategory,
} from '../create-pod.types';
import { CategorySuperFilter } from './CategorySuperFilter';
import { CategoryTile } from './CategoryTile';

const NO_ICONS: CreatePodCategoryIcon[] = [];

interface Props {
  form: CreatePodForm;
  /** Every sub-category the host is granted (Super > Category > Sub). */
  hostCategories: CreatePodHostCategory[];
  /** SUB- and CATEGORY-level icons; a chip shows its own level's, else its parent's. */
  categoryIcons?: CreatePodCategoryIcon[];
  /** Every club, so each chip can say how many it has where the pod would run. */
  clubs: CreatePodClub[];
}

/** What's category picker: the host narrows by Super, then Category, and picks
 * one of their granted sub-categories from a sideways-scrolling chip row. A chip
 * with no club where the pod would run is disabled. Changing it resets the
 * club/venue/slot picks. mWeb twin. */
export function HostCategoryField({
  form,
  hostCategories,
  categoryIcons = NO_ICONS,
  clubs,
}: Readonly<Props>) {
  const { setValue, watch, formState } = form;
  const { t } = useTranslation();
  const selectedKey = watch('host_category_key');
  const locationId = watch('location_id');
  const podMode = watch('pod_mode');
  const iconOf = useMemo(() => categoryIconLookup(categoryIcons), [categoryIcons]);
  const counts = useMemo(
    () => clubCountsByCategory(clubs, hostCategories, { locationId, podMode }),
    [clubs, hostCategories, locationId, podMode],
  );
  const [pick, setPick] = useState(() => {
    const selected = hostCategories.find((category) => hostCategoryKeyOf(category) === selectedKey);
    return {
      superId: selected ? superCategoryIdOf(selected) : '',
      categoryId: selected?.category_id ?? '',
    };
  });
  const levels = createPodCategoryLevels(hostCategories, pick);
  const error = formState.errors.host_category_key?.message;

  const pickCategory = (key: string) => {
    setValue('host_category_key', key, { shouldDirty: true, shouldValidate: true });
    // A club valid for the old category may not match the new one.
    setValue('club_id', '', { shouldDirty: true });
    setValue('venue_id', '', { shouldDirty: true });
    setValue('venue_slot_id', '', { shouldDirty: true });
  };

  return (
    <YStack gap={10} testID="create-pod-category">
      <YStack gap={2}>
        <FieldLabel label={t('mweb.createPod.categoryLabel')} required />
        <Text fontSize={12} color="$muted">
          {t('mweb.createPod.categoryHint')}
        </Text>
      </YStack>
      {hostCategories.length === 0 ? (
        <Text testID="create-pod-category-empty" fontSize={13} color="$muted">
          {t('mweb.createPod.categoryEmpty')}
        </Text>
      ) : (
        <>
          <CategorySuperFilter
            options={levels.supers}
            value={levels.superId}
            onChange={(superId) => setPick({ superId, categoryId: '' })}
            label={t('mweb.createPod.categoryFor')}
            testID="create-pod-category-super"
          />
          <CategorySuperFilter
            options={levels.groups}
            value={levels.categoryId}
            onChange={(categoryId) => setPick({ superId: levels.superId, categoryId })}
            label={t('mweb.createPod.categoryGroup')}
            testID="create-pod-category-group"
          />
          <XStack role="radiogroup" aria-label={t('mweb.createPod.categoryLabel')}>
            <ScrollRail testID="create-pod-category-subs" gap={8} alignItems="center">
              {levels.subs.map((category) => {
                const key = hostCategoryKeyOf(category);
                return (
                  <CategoryTile
                    key={key}
                    category={category}
                    icon={iconOf(category)}
                    selected={key === selectedKey}
                    clubCount={counts.get(key) ?? 0}
                    testID={`create-pod-category-${key}`}
                    onPick={() => pickCategory(key)}
                  />
                );
              })}
            </ScrollRail>
          </XStack>
        </>
      )}
      {error ? (
        <Text role="alert" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
