import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { PodDetail } from '@/hooks/useDetails';
import { useThemeColors } from '@/hooks/useThemeColors';

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

/** Hosts — one row per host name. */
export function HostsSection({ hosts }: Readonly<{ hosts: string[] }>) {
  const { primary } = useThemeColors();
  if (hosts.length === 0)
    return (
      <Text fontSize={13} color="$muted">
        Host info coming soon.
      </Text>
    );
  return (
    <YStack gap={8}>
      {hosts.map((name) => (
        <XStack key={name} alignItems="center" gap={8}>
          <MaterialIcons name="person" size={16} color={primary} />
          <Text fontSize={13.5} fontWeight="700" color="$color">
            {name}
          </Text>
        </XStack>
      ))}
    </YStack>
  );
}

/** Attendees — "going / spots" + a progress bar. */
export function AttendeesSection({ going, spots }: Readonly<{ going: number; spots: number }>) {
  const pct = spots > 0 ? Math.min(100, Math.round((going / spots) * 100)) : 0;
  return (
    <YStack gap={8}>
      <Text fontSize={13.5} fontWeight="700" color="$color">
        {going}
        {spots > 0 ? ` / ${spots}` : ''} going
      </Text>
      {spots > 0 ? (
        <YStack height={8} borderRadius={4} backgroundColor="$background" overflow="hidden">
          <YStack height={8} width={`${pct}%`} backgroundColor="$primary" />
        </YStack>
      ) : null}
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
