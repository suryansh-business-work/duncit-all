import type { ReactNode } from 'react';
import { Text, XStack } from 'tamagui';

import type { PodMembership } from '@/utils/pod-history';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';

type StatusTone = 'success' | 'warning';

/** Booking-status chip copy — "Backout in process" is its own visible state
 * (computed once here so children stay branch-free; mirrors mWeb). `label` is a
 * translation key: the words live in @duncit/i18n so the two apps agree. */
export const STATUS_CHIP: Record<PodMembership['status'], { label: string; tone: StatusTone }> = {
  JOINED: { label: 'mweb.podHistory.statusJoined', tone: 'success' },
  BACKOUT_IN_PROCESS: { label: 'mweb.podHistory.statusBackoutInProcess', tone: 'warning' },
  BACKED_OUT: { label: 'mweb.podHistory.statusBackedOut', tone: 'warning' },
};

export function Chip({
  label,
  tone,
}: Readonly<{ label: string; tone: 'success' | 'warning' | 'muted' }>) {
  const bg = tone === 'success' ? '$primary' : '$soft';
  return (
    <XStack borderRadius={999} paddingHorizontal={10} paddingVertical={4} backgroundColor={bg}>
      <Text fontSize={12} fontWeight="600" color={tone === 'success' ? '$onPrimary' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}

export function Card({ title, children }: Readonly<{ title?: string; children: ReactNode }>) {
  return (
    <SurfaceCard gap={12}>
      {title ? <SectionHeader title={title} /> : null}
      {children}
    </SurfaceCard>
  );
}
