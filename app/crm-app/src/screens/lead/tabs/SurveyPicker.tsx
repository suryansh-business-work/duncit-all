import { Label, Text, XStack, YStack } from 'tamagui';

import { SelectChip } from '@/components/mobile/SelectChip';
import { useTranslation } from '@/hooks/useTranslation';

interface Ref {
  id: string;
  name: string;
}

function Choice({
  label,
  options,
  value,
  onPick,
  testID,
}: Readonly<{
  label: string;
  options: readonly Ref[];
  value: string;
  onPick: (id: string) => void;
  testID: string;
}>) {
  if (options.length === 0) return null;
  const picked = value || options[0]?.id;
  return (
    <YStack gap="$1">
      <Label fontWeight="600">{label}</Label>
      <XStack flexWrap="wrap" gap="$2" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <SelectChip
            key={o.id}
            label={o.name}
            onPress={() => onPick(o.id)}
            selected={picked === o.id}
            testID={`${testID}-${o.id}`}
          />
        ))}
      </XStack>
    </YStack>
  );
}

interface Props {
  categories: readonly Ref[];
  subCategories: readonly Ref[];
  categoryId: string;
  subCategoryId: string;
  onCategory: (id: string) => void;
  onSubCategory: (id: string) => void;
}

/** A lead in several categories: which category's survey to use (the first until one is picked). */
export function SurveyPicker(props: Readonly<Props>) {
  const { t } = useTranslation();
  if (props.categories.length <= 1 && props.subCategories.length <= 1) return null;
  return (
    <YStack gap="$2" testID="survey-picker">
      <Text color="$muted" fontWeight="600">
        {t('crm.leadSurvey.pickWhich')}
      </Text>
      <Choice
        label={t('crm.common.category')}
        options={props.categories}
        value={props.categoryId}
        onPick={props.onCategory}
        testID="survey-category"
      />
      <Choice
        label={t('crm.leadSurvey.subCategory')}
        options={props.subCategories}
        value={props.subCategoryId}
        onPick={props.onSubCategory}
        testID="survey-sub-category"
      />
    </YStack>
  );
}
