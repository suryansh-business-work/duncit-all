import type { ReactNode } from 'react';
import { Linking } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface ChatLinkCandidate {
  key: string;
  label: string;
  href?: string | null;
  icon: ReactNode;
}

type ChatLink = ChatLinkCandidate & { href: string };

interface ClubChats {
  club_whats_app_community_link?: string | null;
  club_whats_app_group_link?: string | null;
}

/** The club's WhatsApp community and group chat as surface pills. mWeb twin:
 * club-details-page/ClubSocialLinks. Also used by create-pod's club details sheet. */
export function ClubSocialLinks({ club }: Readonly<{ club: ClubChats }>) {
  const { t } = useTranslation();
  const { color } = useThemeColors();
  const candidates: ChatLinkCandidate[] = [
    {
      key: 'community',
      label: t('mweb.common.community'),
      href: club.club_whats_app_community_link,
      icon: <Ionicons name="logo-whatsapp" size={18} color={color} />,
    },
    {
      key: 'group',
      label: t('mweb.common.groupChat'),
      href: club.club_whats_app_group_link,
      icon: <MaterialIcons name="chat" size={18} color={color} />,
    },
  ];
  const links = candidates.filter((link): link is ChatLink => !!link.href);
  if (links.length === 0) return null;

  return (
    <XStack gap={8} flexWrap="wrap">
      {links.map((link) => (
        <XStack
          key={link.key}
          testID={`club-chat-${link.key}`}
          role="button"
          tabIndex={0}
          aria-label={link.label}
          onPress={() => Linking.openURL(link.href)}
          alignItems="center"
          gap={8}
          height={44}
          paddingHorizontal={18}
          borderRadius={999}
          borderWidth={1}
          borderColor="$cardBorder"
          backgroundColor="$surface"
          pressStyle={PRESS_STYLE.control}
        >
          {link.icon}
          <Text fontSize={14} fontWeight="600" color="$color">
            {link.label}
          </Text>
        </XStack>
      ))}
    </XStack>
  );
}
