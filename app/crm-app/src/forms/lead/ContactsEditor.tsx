import { useFieldArray, type Control } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import { emptyCrmContact } from '@duncit/forms/schemas';

import { Card } from '@/components/Card';
import { DuncitButton } from '@/components/DuncitButton';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeadFormValues } from '@/features/leads/editor/values';

/** The lead's contacts: the first is the primary one; add or remove rows like the portal's Contacts section. */
export function ContactsEditor({ control }: Readonly<{ control: Control<LeadFormValues> }>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'contacts' as never });
  return (
    <Card title={t('crmApp.lead.contacts')}>
      {fields.map((row, index) => (
        <YStack
          key={row.id}
          gap="$2"
          paddingVertical="$2"
          borderBottomWidth={1}
          borderColor="$borderColor"
        >
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontWeight="700">
              {index === 0
                ? t('crmApp.editor.primaryContact')
                : t('crmApp.editor.contactN', { vars: { n: index + 1 } })}
            </Text>
            {fields.length > 1 ? (
              <DuncitButton
                label={t('crmApp.editor.removeContact')}
                onPress={() => remove(index)}
                variant="ghost"
                tone="danger"
                size="sm"
                testID={`contact-remove-${index}`}
              />
            ) : null}
          </XStack>
          <TextField
            control={control}
            name={`contacts.${index}.name`}
            label={t('crmApp.editor.contactName')}
            testID={`contact-${index}-name`}
          />
          <TextField
            control={control}
            name={`contacts.${index}.role`}
            label={t('crmApp.editor.contactRole')}
          />
          <TextField
            control={control}
            name={`contacts.${index}.mobile_number`}
            label={t('crmApp.editor.mobile')}
            keyboardType="phone-pad"
            testID={`contact-${index}-mobile`}
          />
          <TextField
            control={control}
            name={`contacts.${index}.whatsapp_number`}
            label={t('crmApp.editor.whatsapp')}
            keyboardType="phone-pad"
          />
          <TextField
            control={control}
            name={`contacts.${index}.email`}
            label={t('crmApp.editor.email')}
            keyboardType="email-address"
            autoComplete="email"
            testID={`contact-${index}-email`}
          />
        </YStack>
      ))}
      <DuncitButton
        label={t('crmApp.editor.addContact')}
        onPress={() => append({ ...emptyCrmContact } as never)}
        variant="outline"
        testID="contact-add"
      />
    </Card>
  );
}
