import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import { mailtoUrl, telUrl } from '@/utils/pod-pending';

interface LinkProps {
  kind: 'phone' | 'email';
  /** The number (with its country code) or the address, as on record. */
  value: string;
  testID: string;
}

/**
 * One tappable way to reach a side of a venue chat outside it: the phone dials
 * (tel:), the email opens the mail app (mailto:). mWeb twin: the contact
 * sheet's links.
 */
export function VenueChatContactLink({ kind, value, testID }: Readonly<LinkProps>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const phone = kind === 'phone';
  const label = phone
    ? t('availability.offers.chat.contactPhone')
    : t('availability.offers.chat.contactEmail');
  return (
    <XStack
      testID={testID}
      role="link"
      tabIndex={0}
      aria-label={`${label} ${value}`}
      hitSlop={8}
      gap={6}
      alignItems="center"
      flexShrink={1}
      minHeight={32}
      pressStyle={PRESS_STYLE.inline}
      onPress={() => fireAndForget(Linking.openURL(phone ? telUrl(value) : mailtoUrl(value)))}
    >
      <MaterialIcons name={phone ? 'call' : 'mail-outline'} size={16} color={accent} aria-hidden />
      <Text fontSize={13} fontWeight="600" color="$accent" numberOfLines={1}>
        {value}
      </Text>
    </XStack>
  );
}
