import type { Control } from 'react-hook-form';
import { Label, Text, YStack } from 'tamagui';

import { ChoiceField, type ChoiceOption } from '@/components/ChoiceField';
import { StateView } from '@/components/StateView';
import {
  useCategoryOptions,
  type CategoryLevel,
} from '@/features/services-offered/useCategoryOptions';
import { useTranslation } from '@/hooks/useTranslation';
import type { AddServiceOfferedValues } from './service-offered.types';

interface Props {
  control: Control<AddServiceOfferedValues>;
  name: 'super_category_id' | 'category_id' | 'sub_category_id';
  level: CategoryLevel;
  /** The level above's pick ('' for SUPER, or while nothing is picked there). */
  parentId: string;
  label: string;
  /** Under the picker: what the level is, or that it is optional. */
  hint: string;
  /** Said instead of the picker when the parent holds no categories at this level. */
  emptyText?: string;
  onPick?: (option: ChoiceOption | null) => void;
  testID: string;
}

/**
 * One level of the Super → Category → Sub pickers. Below SUPER it waits for
 * the level above (and says it is optional); a parent with nothing under it
 * says so instead of offering an empty picker, as the portal's helper text
 * does. Remount it per parent (key) so a new parent never shows the old list.
 */
export function CategoryLevelField({
  control,
  name,
  level,
  parentId,
  label,
  hint,
  emptyText,
  onPick,
  testID,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const categories = useCategoryOptions(level, parentId, t('crmApp.common.loadFailed'));
  const waiting = level !== 'SUPER' && !parentId;

  if (!waiting && categories.options.length > 0) {
    return (
      <YStack gap="$1">
        <ChoiceField
          control={control}
          name={name}
          label={label}
          options={categories.options}
          searchLabel={t('crmApp.editor.search')}
          onPick={onPick}
          testID={testID}
        />
        <Text color="$muted" fontSize="$2">
          {hint}
        </Text>
      </YStack>
    );
  }
  if (categories.error) {
    return (
      <YStack gap="$1">
        <Label fontWeight="600">{label}</Label>
        <StateView error={categories.error} onRetry={categories.refetch} />
      </YStack>
    );
  }
  // Waiting for the level above, then reading, then (nothing found) the empty note.
  let status = emptyText ?? hint;
  if (categories.loading) status = t('crmApp.common.loading');
  if (waiting) status = hint;
  return (
    <YStack gap="$1" aria-disabled testID={`${testID}-disabled`}>
      <Label fontWeight="600" color="$muted">
        {label}
      </Label>
      <Text color="$muted" fontSize="$2" aria-live="polite">
        {status}
      </Text>
    </YStack>
  );
}
