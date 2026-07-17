import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import type { PodDetail } from '@/hooks/useDetails';
import { type HostPerson } from './AttendeesSection';

export { AttendeesSection, buildAttendeePeople, buildHostPeople } from './AttendeesSection';

/** A wrapped list of pill chips, or an empty hint. */
export function ChipList({
  items,
  emptyText,
  tint,
}: Readonly<{
  items: string[];
  emptyText: string;
  tint: string;
}>) {
  if (items.length === 0)
    return (
      <Text fontSize={13} color="$muted">
        {emptyText}
      </Text>
    );
  return (
    <XStack gap={8} flexWrap="wrap">
      {items.map((item) => (
        <XStack
          key={item}
          alignItems="center"
          gap={5}
          borderRadius={999}
          paddingHorizontal={11}
          paddingVertical={6}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$background"
        >
          <MaterialIcons name="check-circle" size={13} color={tint} />
          <Text fontSize={12.5} fontWeight="700" color="$color">
            {item}
          </Text>
        </XStack>
      ))}
    </XStack>
  );
}

/** About — description + extra info (or a placeholder). */
export function AboutSection({ pod }: Readonly<{ pod: PodDetail }>) {
  const text = [pod.pod_description, pod.pod_info].filter(Boolean).join('\n\n');
  return (
    <Text fontSize={13.5} color="$color" lineHeight={20}>
      {text || 'Details coming soon.'}
    </Text>
  );
}

/** One tappable host row — avatar + name → opens the host's public profile. */
function HostRow({
  host,
  onOpenProfile,
}: Readonly<{ host: HostPerson; onOpenProfile: (userId: string) => void }>) {
  const name = host.full_name || 'Host';
  return (
    <XStack
      testID={`host-row-${host.user_id}`}
      role="button"
      aria-label={`View ${name}'s profile`}
      onPress={() => onOpenProfile(host.user_id)}
      alignItems="center"
      gap={10}
      paddingVertical={6}
      pressStyle={{ opacity: 0.7 }}
    >
      <YStack
        width={40}
        height={40}
        borderRadius={20}
        overflow="hidden"
        backgroundColor="$primary"
        alignItems="center"
        justifyContent="center"
      >
        {host.profile_photo ? (
          <AppImage source={{ uri: host.profile_photo }} style={{ width: 40, height: 40 }} />
        ) : (
          <Text fontSize={15} fontWeight="800" color="$onPrimary">
            {(host.full_name?.[0] ?? 'H').toUpperCase()}
          </Text>
        )}
      </YStack>
      <YStack flex={1}>
        <Text fontSize={14} fontWeight="700" color="$color">
          {name}
        </Text>
        <Text fontSize={11.5} color="$muted">
          Host
        </Text>
      </YStack>
      <MaterialIcons name="chevron-right" size={20} color="#9aa0a6" />
    </XStack>
  );
}

/** Hosts — one tappable row per host (name + photo) opening their profile. */
export function HostsSection({
  hosts,
  onOpenProfile,
}: Readonly<{ hosts: HostPerson[]; onOpenProfile: (userId: string) => void }>) {
  if (hosts.length === 0)
    return (
      <Text fontSize={13} color="$muted">
        Host info coming soon.
      </Text>
    );
  return (
    <YStack gap={6}>
      {hosts.map((host) => (
        <HostRow key={host.user_id} host={host} onOpenProfile={onOpenProfile} />
      ))}
    </YStack>
  );
}

/** Place charges — label · ₹amount (+ note). */
export function ChargesSection({
  charges,
}: Readonly<{
  charges: { label: string; amount: number; note?: string | null }[];
}>) {
  return (
    <YStack gap={8}>
      {charges.map((c) => (
        <XStack key={c.label} alignItems="center" justifyContent="space-between" gap={8}>
          <YStack flex={1}>
            <Text fontSize={13.5} fontWeight="700" color="$color">
              {c.label}
            </Text>
            {c.note ? (
              <Text fontSize={11.5} color="$muted">
                {c.note}
              </Text>
            ) : null}
          </YStack>
          <Text fontSize={13.5} fontWeight="900" color="$color">
            ₹{c.amount}
          </Text>
        </XStack>
      ))}
    </YStack>
  );
}
