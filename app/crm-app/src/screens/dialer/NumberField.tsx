import { MaterialIcons } from '@expo/vector-icons';
import { Input, XStack, useTheme } from 'tamagui';

import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';
import { dialable } from '@/services/dialer';

interface Props {
  number: string;
  onChange: (next: string) => void;
}

/**
 * The number being dialled, large, with backspace (a long press clears it).
 * It never opens the keyboard: the dial pad types into it, and a pasted or
 * linked number is cleaned to dialable characters.
 */
export function NumberField({ number, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <XStack
      alignItems="center"
      gap="$2"
      backgroundColor="$surface"
      borderRadius={RADII.lg}
      borderWidth={1}
      borderColor="$borderColor"
      paddingHorizontal="$3"
      minHeight={64}
    >
      <Input
        flex={1}
        value={number}
        onChangeText={(text) => onChange(dialable(text))}
        placeholder={t('crmApp.dialer.placeholder')}
        aria-label={t('crmApp.dialer.placeholder')}
        placeholderTextColor="$muted"
        keyboardType="phone-pad"
        fontSize="$9"
        fontWeight="600"
        letterSpacing={1}
        borderWidth={0}
        backgroundColor="transparent"
        showSoftInputOnFocus={false}
        testID="dialer-number"
      />
      {number ? (
        <XStack
          role="button"
          aria-label={t('crmApp.dialer.backspace')}
          aria-description={t('crmApp.dialer.clearHint')}
          onPress={() => onChange(number.slice(0, -1))}
          onLongPress={() => onChange('')}
          padding="$2"
          borderRadius={RADII.sm}
          pressStyle={{ backgroundColor: '$soft' }}
          hitSlop={8}
          testID="dialer-backspace"
        >
          <MaterialIcons name="backspace" size={26} color={theme.muted?.val} />
        </XStack>
      ) : null}
    </XStack>
  );
}
