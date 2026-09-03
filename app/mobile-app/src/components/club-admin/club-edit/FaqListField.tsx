import { XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { FieldLabel } from '@/components/Field';
import { LabeledInput } from '@/components/LabeledInput';
import { useTranslation } from '@/hooks/useTranslation';
import { nextFaqId, type ClubFaqRow } from './club-edit.form';

interface Props {
  value: ClubFaqRow[];
  onChange: (next: ClubFaqRow[]) => void;
}

/** Question/answer rows, added and removed one at a time — the Tamagui twin
 * of the club form's FAQ list (rule 27). */
export function FaqListField({ value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const update = (id: string, patch: Partial<ClubFaqRow>) =>
    onChange(value.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  return (
    <YStack gap={10} testID="club-edit-faqs">
      <FieldLabel label={t('mweb.clubEdit.faqs')} testID="club-edit-faqs" />
      {value.map((row) => (
        <YStack
          key={row.id}
          testID={`club-edit-faq-${row.id}`}
          gap={8}
          padding={12}
          borderRadius={12}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
        >
          <LabeledInput
            testID={`club-edit-faq-${row.id}-question`}
            label={t('mweb.clubEdit.question')}
            value={row.question}
            onChangeText={(text) => update(row.id, { question: text })}
          />
          <LabeledInput
            testID={`club-edit-faq-${row.id}-answer`}
            label={t('clubForm.faqListField.answer')}
            value={row.answer}
            onChangeText={(text) => update(row.id, { answer: text })}
            multiline
          />
          <XStack justifyContent="flex-end">
            <DuncitButton
              testID={`club-edit-faq-${row.id}-remove`}
              label={t('clubForm.mediaRow.remove')}
              onPress={() => onChange(value.filter((item) => item.id !== row.id))}
              variant="ghost"
              tone="danger"
              size="sm"
            />
          </XStack>
        </YStack>
      ))}
      <DuncitButton
        testID="club-edit-faq-add"
        label={t('mweb.clubEdit.addFaq')}
        onPress={() => onChange([...value, { id: nextFaqId(), question: '', answer: '' }])}
        variant="outline"
        tone="neutral"
      />
    </YStack>
  );
}
