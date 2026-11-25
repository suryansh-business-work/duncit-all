import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useController, type Control } from 'react-hook-form';
import { Input, Label, Text, XStack, YStack, useTheme } from 'tamagui';
import { crmNormalizeServiceTitles } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';
import type { AddServiceOfferedValues } from './service-offered.types';

const FIELD_ID = 'field-service-titles';

/**
 * Several titles at once under one slot, as the portal's chip input takes
 * them: type a title and press Enter (or Add); each is trimmed, a blank is
 * ignored and a title already in the list is not added twice. Each chip can
 * be removed again.
 */
export function ServiceTitlesField({
  control,
}: Readonly<{ control: Control<AddServiceOfferedValues> }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { field, fieldState } = useController({ control, name: 'titles' });
  const [draft, setDraft] = useState('');
  const label = t('crm.data.serviceTitles');

  const add = () => {
    field.onChange(crmNormalizeServiceTitles([...field.value, draft]));
    setDraft('');
  };
  const remove = (title: string) => field.onChange(field.value.filter((v) => v !== title));

  return (
    <YStack gap="$2">
      <Label htmlFor={FIELD_ID} fontWeight="600">
        {label}
      </Label>
      <XStack gap="$2" alignItems="center">
        <Input
          id={FIELD_ID}
          flex={1}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          submitBehavior="submit"
          returnKeyType="done"
          placeholder={t('crm.data.typeATitleAndPressEnter')}
          placeholderTextColor="$muted"
          aria-label={label}
          aria-invalid={Boolean(fieldState.error)}
          borderColor={fieldState.error ? '$danger' : '$inputBorder'}
          testID="service-titles-input"
        />
        <DuncitButton
          label={t('crm.common.add')}
          onPress={add}
          variant="outline"
          disabled={!draft.trim()}
          testID="service-titles-add"
        />
      </XStack>
      {field.value.length > 0 ? (
        <XStack flexWrap="wrap" gap="$2" role="list" aria-label={label}>
          {field.value.map((title) => (
            <XStack
              key={title}
              role="listitem"
              alignItems="center"
              gap="$1"
              backgroundColor="$soft"
              borderRadius={RADII.pill}
              paddingLeft="$3"
              paddingRight="$1"
            >
              <Text>{title}</Text>
              <XStack
                role="button"
                aria-label={t('shell.a11y.removeNamed', { vars: { name: title } })}
                onPress={() => remove(title)}
                padding="$2"
                hitSlop={8}
                testID={`service-title-remove-${title}`}
              >
                <MaterialIcons name="close" size={16} color={theme.muted?.val} />
              </XStack>
            </XStack>
          ))}
        </XStack>
      ) : null}
      {fieldState.error ? (
        <Text color="$danger" fontSize="$2" role="alert">
          {fieldState.error.message}
        </Text>
      ) : (
        <Text color="$muted" fontSize="$2">
          {t('crm.data.addOneOrMoreEG')}
        </Text>
      )}
    </YStack>
  );
}
