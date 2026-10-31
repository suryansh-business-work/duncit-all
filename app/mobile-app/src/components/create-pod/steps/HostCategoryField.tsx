import { useMemo, useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import {
  categoriesForSuper,
  categoryIconLookup,
  createPodSuperOptions,
  superCategoryIdOf,
} from '@duncit/utils';

import { FieldLabel } from '@/components/Field';
import { useTranslation } from '@/hooks/useTranslation';
import { hostCategoryKeyOf } from '../create-pod.form';
import type {
  CreatePodCategoryIcon,
  CreatePodForm,
  CreatePodHostCategory,
} from '../create-pod.types';
import { CategorySuperFilter } from './CategorySuperFilter';
import { CategoryTile } from './CategoryTile';

const COLUMNS = 3;
const NO_ICONS: CreatePodCategoryIcon[] = [];

interface Props {
  form: CreatePodForm;
  hostCategories: CreatePodHostCategory[];
  /** SUB- and CATEGORY-level icons; a tile shows its own level's, else its parent's. */
  categoryIcons?: CreatePodCategoryIcon[];
}

/** `items` in rows of COLUMNS, so every tile in a row shares its width. */
function rowsOf<T>(items: readonly T[]): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += COLUMNS)
    rows.push(items.slice(index, index + COLUMNS));
  return rows;
}

/** What's category picker — the host chooses which of their onboarded
 * categories this pod is for, as tiles with each category's own icon. A host
 * onboarded under both "For You" and "For Your Pet" narrows the tiles to one.
 * Changing it resets the club/venue/slot picks. mWeb twin. */
export function HostCategoryField({
  form,
  hostCategories,
  categoryIcons = NO_ICONS,
}: Readonly<Props>) {
  const { setValue, watch, formState } = form;
  const { t } = useTranslation();
  const selectedKey = watch('host_category_key');
  const supers = useMemo(() => createPodSuperOptions(hostCategories), [hostCategories]);
  const iconOf = useMemo(() => categoryIconLookup(categoryIcons), [categoryIcons]);
  const selected = hostCategories.find((category) => hostCategoryKeyOf(category) === selectedKey);
  const [superId, setSuperId] = useState(() =>
    selected ? superCategoryIdOf(selected) : (supers[0]?.id ?? ''),
  );
  const shown = categoriesForSuper(hostCategories, supers.length, superId);
  const error = formState.errors.host_category_key?.message;

  const pickCategory = (key: string) => {
    setValue('host_category_key', key, { shouldDirty: true, shouldValidate: true });
    // A club valid for the old category may not match the new one.
    setValue('club_id', '', { shouldDirty: true });
    setValue('venue_id', '', { shouldDirty: true });
    setValue('venue_slot_id', '', { shouldDirty: true });
  };

  return (
    <YStack gap={12} testID="create-pod-category">
      <YStack gap={2}>
        <FieldLabel label={t('mweb.createPod.categoryLabel')} required />
        <Text fontSize={12} color="$muted">
          {t('mweb.createPod.categoryHint')}
        </Text>
      </YStack>
      {supers.length > 1 ? (
        <CategorySuperFilter options={supers} value={superId} onChange={setSuperId} />
      ) : null}
      {hostCategories.length === 0 ? (
        <Text testID="create-pod-category-empty" fontSize={13} color="$muted">
          {t('mweb.createPod.categoryEmpty')}
        </Text>
      ) : (
        rowsOf(shown).map((row) => (
          <XStack key={row.map(hostCategoryKeyOf).join(',')} gap={8}>
            {row.map((category) => {
              const key = hostCategoryKeyOf(category);
              return (
                <CategoryTile
                  key={key}
                  category={category}
                  icon={iconOf(category)}
                  selected={key === selectedKey}
                  testID={`create-pod-category-${key}`}
                  onPick={() => pickCategory(key)}
                />
              );
            })}
            {Array.from({ length: COLUMNS - row.length }, (_, index) => (
              <YStack key={`gap-${index}`} flex={1} />
            ))}
          </XStack>
        ))
      )}
      {error ? (
        <Text role="alert" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
