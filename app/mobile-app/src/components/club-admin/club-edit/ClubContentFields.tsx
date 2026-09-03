import { Controller, type Control } from 'react-hook-form';
import { YStack } from 'tamagui';

import { ChipArrayField } from '@/components/create-pod';
import { useTranslation } from '@/hooks/useTranslation';
import type { ClubEditFormValues } from './club-edit.form';
import { FaqListField } from './FaqListField';

type BulletField = 'who_we_are' | 'what_we_do' | 'perks' | 'values';

interface Props {
  control: Control<ClubEditFormValues>;
}

/** The club page's content: the four bullet lists and the FAQs. */
export function ClubContentFields({ control }: Readonly<Props>) {
  const { t } = useTranslation();
  const bullets: { name: BulletField; label: string }[] = [
    { name: 'who_we_are', label: t('clubForm.contentSection.whoWeAre') },
    { name: 'what_we_do', label: t('clubForm.contentSection.whatWeDo') },
    { name: 'perks', label: t('clubForm.common.perks') },
    { name: 'values', label: t('clubForm.contentSection.values') },
  ];

  return (
    <YStack gap={14}>
      {bullets.map((bullet) => (
        <Controller
          key={bullet.name}
          control={control}
          name={bullet.name}
          render={({ field, fieldState }) => (
            <ChipArrayField
              label={bullet.label}
              required
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              testID={`club-edit-${bullet.name}`}
            />
          )}
        />
      ))}
      <Controller
        control={control}
        name="faqs"
        render={({ field }) => <FaqListField value={field.value} onChange={field.onChange} />}
      />
    </YStack>
  );
}
