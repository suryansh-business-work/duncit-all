import { useState } from 'react';
import { Text, YStack } from 'tamagui';

import { FieldLabel } from '@/components/Field';
import { ChipSelectField } from '@/components/create-pod';
import { useCategoryTree } from '@/hooks/useCategoryTree';
import { useTranslation } from '@/hooks/useTranslation';
import { categoryChoices, middleCategoryId, subChoices, superChoices } from '@/utils/category-tree';

interface Props {
  /** The club's `super_category_id`. */
  superId: string;
  /** The club's `category_id` — the SUB level, which is what a club persists. */
  subId: string;
  onChange: (superId: string, subId: string) => void;
  superError?: string;
  subError?: string;
}

/**
 * Super › Category › Sub for the club editor — the Tamagui twin of the
 * `AdminCategorySelect` cascade mWeb and the Partners console render inside
 * @duncit/club-form's Basic section (rule 27).
 *
 * A club stores only the Super and the Sub, so the middle level is DERIVED from
 * the saved Sub's parent; it is held in local state only for the moment a
 * middle is chosen but its Sub is not. That is the same split
 * `BasicSection.categoryValueOf` makes on the MUI side, and it is what lets the
 * saved category render without the form owning a field the server never sees.
 */
export function ClubCategoryField({
  superId,
  subId,
  onChange,
  superError,
  subError,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { categories } = useCategoryTree();
  // The one level the club does not persist, and only while its Sub is unpicked.
  const [draft, setDraft] = useState({ superId: '', categoryId: '' });

  const derivedMiddle = middleCategoryId(categories, subId);
  const draftMiddle = draft.superId === superId ? draft.categoryId : '';
  const middleId = derivedMiddle || draftMiddle;

  const pickSuper = (next: string) => {
    setDraft({ superId: next, categoryId: '' });
    // A Sub under the old Super cannot survive the move.
    onChange(next, '');
  };
  const pickMiddle = (next: string) => {
    setDraft({ superId, categoryId: next });
    onChange(superId, '');
  };

  const superFirst = t('clubForm.basicSection.superFirst');

  return (
    <YStack gap={12} testID="club-edit-category">
      <FieldLabel
        label={t('clubForm.basicSection.category')}
        required
        testID="club-edit-category"
      />
      <Text testID="club-edit-category-hint" fontSize={12} color="$muted">
        {t('clubForm.basicSection.categoryHint')}
      </Text>
      <ChipSelectField
        label={t('clubForm.basicSection.superCategory')}
        required
        options={superChoices(categories)}
        value={superId}
        onChange={pickSuper}
        error={superError}
        testID="club-edit-super-category"
      />
      <ChipSelectField
        label={t('clubForm.basicSection.categoryLevel')}
        options={categoryChoices(categories, superId)}
        value={middleId}
        onChange={pickMiddle}
        emptyHint={superFirst}
        testID="club-edit-middle-category"
      />
      <ChipSelectField
        label={t('clubForm.basicSection.subCategory')}
        required
        options={subChoices(categories, middleId, superId)}
        value={subId}
        onChange={(next) => onChange(superId, next)}
        error={subError}
        emptyHint={superFirst}
        testID="club-edit-sub-category"
      />
    </YStack>
  );
}
