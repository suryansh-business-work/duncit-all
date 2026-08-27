import { AppImage } from '@/components/AppImage';

import { ScrollView, Text, YStack } from 'tamagui';

import type { ClubDetail } from '@/hooks/useDetails';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

type ClubHost = ClubDetail['hosts'][number];

interface Props {
  hosts: ClubHost[];
  /** Section heading — the same rail renders the club hosts and the club admins. */
  title?: string;
  /** testID prefix, so the two rails stay distinguishable. */
  testIdPrefix?: string;
  onOpenHost: (id: string) => void;
}

/** Hosts who run this club's events — tap an avatar to open their profile. */
export function ClubHostsRail({
  hosts,
  title,
  testIdPrefix = 'club-host',
  onOpenHost,
}: Readonly<Props>) {
  const { t } = useTranslation();
  // Resolved here, not as parameter defaults: a default is evaluated before
  // any hook runs, so `t` would not exist yet.
  const titleText = title ?? t('mweb.details.clubHosts');
  if (hosts.length === 0) return null;
  return (
    <YStack gap={8} testID={`${testIdPrefix}s`}>
      <Text fontSize={16} fontWeight="700" color="$color">
        {titleText}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 14 }}
      >
        {hosts.map((host) => (
          <YStack
            pressStyle={PRESS_STYLE.surface}
            key={host.id}
            testID={`${testIdPrefix}-${host.id}`}
            width={72}
            alignItems="center"
            gap={4}
            role="button"
            aria-label={host.name}
            onPress={() => onOpenHost(host.id)}
          >
            {host.avatar_url ? (
              <AppImage
                source={{ uri: host.avatar_url }}
                style={{ width: 56, height: 56, borderRadius: 28 }}
              />
            ) : (
              <YStack
                width={56}
                height={56}
                borderRadius={28}
                backgroundColor="$primary"
                alignItems="center"
                justifyContent="center"
              >
                <Text color="$onPrimary" fontWeight="700" fontSize={18}>
                  {host.name.charAt(0).toUpperCase()}
                </Text>
              </YStack>
            )}
            <Text fontSize={12} fontWeight="700" color="$color" numberOfLines={1}>
              {host.name}
            </Text>
          </YStack>
        ))}
      </ScrollView>
    </YStack>
  );
}
