import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import type { VenueChatContact } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import { mailtoUrl, telUrl } from '@/utils/pod-pending';

interface LinkProps {
  icon: 'call' | 'mail-outline';
  value: string;
  url: string;
  label: string;
  testID: string;
}

/** One tappable way to reach them: the phone dials, the email opens the mail app. */
function ContactLink({ icon, value, url, label, testID }: Readonly<LinkProps>) {
  const { primary } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="link"
      tabIndex={0}
      aria-label={`${label} ${value}`}
      hitSlop={8}
      gap={4}
      alignItems="center"
      flexShrink={1}
      pressStyle={PRESS_STYLE.inline}
      onPress={() => fireAndForget(Linking.openURL(url))}
    >
      <MaterialIcons name={icon} size={14} color={primary} aria-hidden />
      <Text fontSize={12} fontWeight="600" color="$primary" numberOfLines={1}>
        {value}
      </Text>
    </XStack>
  );
}

/**
 * How to reach the other side of a venue chat outside it — their name, phone
 * and email (`venueChatCounterpart(room).contact`). Nothing when the room
 * carries neither. mWeb twin: VenueChatContactLine.
 */
export function VenueChatContactRow({ contact }: Readonly<{ contact: VenueChatContact | null }>) {
  const { t } = useTranslation();
  if (!contact) return null;

  return (
    <XStack testID="venue-chat-contact" gap={10} alignItems="center" flexWrap="wrap">
      {contact.name ? (
        <Text fontSize={12} fontWeight="700" color="$color" numberOfLines={1}>
          {contact.name}
        </Text>
      ) : null}
      {contact.phone ? (
        <ContactLink
          testID="venue-chat-contact-phone"
          icon="call"
          value={contact.phone}
          url={telUrl(contact.phone)}
          label={t('availability.offers.chat.contactPhone')}
        />
      ) : null}
      {contact.email ? (
        <ContactLink
          testID="venue-chat-contact-email"
          icon="mail-outline"
          value={contact.email}
          url={mailtoUrl(contact.email)}
          label={t('availability.offers.chat.contactEmail')}
        />
      ) : null}
    </XStack>
  );
}
