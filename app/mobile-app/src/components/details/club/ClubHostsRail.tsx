import { Image } from 'react-native';
import { ScrollView, Text, YStack } from 'tamagui';

import type { ClubDetail } from '@/hooks/useDetails';

type ClubHost = ClubDetail['hosts'][number];

interface Props {
  hosts: ClubHost[];
  onOpenHost: (id: string) => void;
}

/** Hosts who run this club's events — tap an avatar to open their profile. */
export function ClubHostsRail({ hosts, onOpenHost }: Readonly<Props>) {
  if (hosts.length === 0) return null;
  return (
    <YStack gap={8} testID="club-hosts">
      <Text fontSize={16} fontWeight="900" color="$color">
        Club Hosts
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 14 }}
      >
        {hosts.map((host) => (
          <YStack
            key={host.id}
            testID={`club-host-${host.id}`}
            width={72}
            alignItems="center"
            gap={4}
            role="button"
            aria-label={host.name}
            onPress={() => onOpenHost(host.id)}
          >
            {host.avatar_url ? (
              <Image
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
                <Text color="$onPrimary" fontWeight="900" fontSize={18}>
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
