import { useEffect, useState } from 'react';
import { useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { useThemeColors } from '@/hooks/useThemeColors';
import { CountryCodeField } from './CountryCodeField';
import type { AccountEditValues } from './account-edit.types';

interface Props {
  control: Control<AccountEditValues>;
  setValue: UseFormSetValue<AccountEditValues>;
}

/**
 * Contact + WhatsApp numbers with country-code dropdowns (bug 4) and a
 * "same as contact number" toggle (bug 3). While the toggle is on, the WhatsApp
 * fields mirror the contact number live and are locked from manual edits. RN twin
 * of mWeb's ContactFields.
 */
export function ContactFields({ control, setValue }: Readonly<Props>) {
  const { primary, muted } = useThemeColors();
  const phoneExtension = useWatch({ control, name: 'phone_extension' });
  const phoneNumber = useWatch({ control, name: 'phone_number' });
  const whatsappExtension = useWatch({ control, name: 'whatsapp_extension' });
  const whatsappNumber = useWatch({ control, name: 'whatsapp_number' });

  const [sameAsContact, setSameAsContact] = useState(
    () => !!phoneNumber && phoneNumber === whatsappNumber && phoneExtension === whatsappExtension,
  );

  useEffect(() => {
    if (!sameAsContact) return;
    setValue('whatsapp_extension', phoneExtension, { shouldDirty: true, shouldValidate: true });
    setValue('whatsapp_number', phoneNumber, { shouldDirty: true, shouldValidate: true });
  }, [sameAsContact, phoneExtension, phoneNumber, setValue]);

  return (
    <YStack gap={10}>
      <Text fontSize={12} fontWeight="900" color="$muted" letterSpacing={0.6}>
        CONTACT NUMBER
      </Text>
      <XStack gap={12} alignItems="flex-end">
        <YStack width={120}>
          <CountryCodeField
            control={control}
            name="phone_extension"
            label="Code"
            testID="phone-code"
          />
        </YStack>
        <YStack flex={1}>
          <FormTextField
            control={control}
            name="phone_number"
            label="Phone number"
            hint="10-digit number"
            keyboardType="phone-pad"
            maxLength={15}
          />
        </YStack>
      </XStack>

      <XStack
        testID="whatsapp-same-toggle"
        role="checkbox"
        aria-label="WhatsApp number same as contact number"
        aria-checked={sameAsContact}
        onPress={() => setSameAsContact((on) => !on)}
        alignItems="center"
        gap={8}
        pressStyle={{ opacity: 0.7 }}
      >
        <MaterialIcons
          name={sameAsContact ? 'check-box' : 'check-box-outline-blank'}
          size={22}
          color={sameAsContact ? primary : muted}
        />
        <Text fontSize={13.5} color="$color">
          WhatsApp number same as contact number
        </Text>
      </XStack>

      <Text fontSize={12} fontWeight="900" color="$muted" letterSpacing={0.6}>
        WHATSAPP NUMBER
      </Text>
      <XStack gap={12} alignItems="flex-end">
        <YStack width={120}>
          <CountryCodeField
            control={control}
            name="whatsapp_extension"
            label="Code"
            testID="whatsapp-code"
            disabled={sameAsContact}
          />
        </YStack>
        <YStack flex={1}>
          <FormTextField
            control={control}
            name="whatsapp_number"
            label="WhatsApp number"
            hint="10-digit number"
            keyboardType="phone-pad"
            maxLength={15}
            editable={!sameAsContact}
          />
        </YStack>
      </XStack>
    </YStack>
  );
}
