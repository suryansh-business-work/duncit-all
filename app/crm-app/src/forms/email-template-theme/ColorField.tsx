import { View } from 'react-native';
import { useController, type Control } from 'react-hook-form';
import { XStack, YStack } from 'tamagui';
import { isHexColor } from '@duncit/regex';

import { TextField } from '@/components/TextField';
import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';
import type { EmailThemeColorField, EmailThemeValues } from './email-template-theme.types';

interface Props {
  control: Control<EmailThemeValues>;
  name: EmailThemeColorField;
  label: string;
  /** Copy key of the hint under the code, when the field has one. */
  hintKey?: string;
}

/**
 * A colour as its hex code beside a swatch of it — the portal's swatch and
 * code pair. The swatch paints the email's colour (data, not the app's theme)
 * once the code is valid.
 */
export function ColorField({ control, name, label, hintKey }: Readonly<Props>) {
  const { t } = useTranslation();
  const { field } = useController({ control, name });
  const value = String(field.value).trim();
  return (
    <XStack gap="$2" alignItems="flex-start">
      <YStack
        width={44}
        height={44}
        marginTop="$6"
        borderRadius={RADII.sm}
        borderWidth={1}
        borderColor="$inputBorder"
        backgroundColor="$soft"
        overflow="hidden"
        accessibilityElementsHidden
      >
        {isHexColor(value) ? (
          <View style={{ flex: 1, backgroundColor: value }} testID={`theme-swatch-${name}`} />
        ) : null}
      </YStack>
      <YStack flex={1}>
        <TextField
          control={control}
          name={name}
          label={label}
          hint={hintKey ? t(hintKey) : undefined}
          testID={`theme-${name}`}
        />
      </YStack>
    </XStack>
  );
}
