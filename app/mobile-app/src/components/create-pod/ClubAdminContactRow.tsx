import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { mailtoUrl, telUrl, whatsappUrl } from '@/utils/pod-pending';
import { PRESS_STYLE } from '@duncit/buttons-native';
import type { CreatePodClubDetails } from './useCreatePodClubDetails';

type ClubAdmin = CreatePodClubDetails['club_admins'][number];
type IconName = 'phone' | 'chat' | 'email';

interface ContactLine {
  key: string;
  icon: IconName;
  label: string;
  value: string;
  url: string;
}

const AVATAR_STYLE = { width: 36, height: 36, borderRadius: 18 } as const;

/** One club admin in a compact row — name, then a tappable line per channel
 * the profile actually has. mWeb twin: create-pod ClubAdminContactRow. */
export function ClubAdminContactRow({ admin }: Readonly<{ admin: ClubAdmin }>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const lines: ContactLine[] = [];
  if (admin.phone) {
    lines.push({
      key: 'phone',
      icon: 'phone',
      label: t('mweb.podPending.phone'),
      value: admin.phone,
      url: telUrl(admin.phone),
    });
  }
  const wa = whatsappUrl(admin.whatsapp ?? '');
  if (wa && admin.whatsapp) {
    lines.push({
      key: 'whatsapp',
      icon: 'chat',
      label: t('mweb.podPending.whatsapp'),
      value: admin.whatsapp,
      url: wa,
    });
  }
  if (admin.email) {
    lines.push({
      key: 'email',
      icon: 'email',
      label: t('mweb.podPending.email'),
      value: admin.email,
      url: mailtoUrl(admin.email),
    });
  }

  return (
    <XStack testID="club-preview-admin" gap={10} alignItems="flex-start">
      {admin.avatar_url ? (
        <AppImage source={{ uri: admin.avatar_url }} style={AVATAR_STYLE} />
      ) : (
        <YStack
          {...AVATAR_STYLE}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$soft"
        >
          <Text fontSize={14} fontWeight="700" color="$color">
            {(admin.name?.[0] ?? '?').toUpperCase()}
          </Text>
        </YStack>
      )}
      <YStack flex={1} gap={4}>
        <Text fontSize={14} fontWeight="600" color="$color" numberOfLines={1}>
          {admin.name}
        </Text>
        {lines.map((line) => (
          <XStack
            key={line.key}
            testID={`club-preview-admin-${line.key}`}
            role="link"
            aria-label={`${line.label}: ${line.value}`}
            hitSlop={8}
            onPress={() => Linking.openURL(line.url)}
            alignItems="center"
            gap={6}
            pressStyle={PRESS_STYLE.inline}
          >
            <MaterialIcons name={line.icon} size={14} color={accent} />
            <Text fontSize={13} color="$accent" numberOfLines={1} flexShrink={1}>
              {line.value}
            </Text>
          </XStack>
        ))}
      </YStack>
    </XStack>
  );
}
