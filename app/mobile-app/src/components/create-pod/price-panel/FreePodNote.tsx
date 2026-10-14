import { Text } from 'tamagui';
import type { FreePodVenueNotice } from '@duncit/utils';

import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { FreeVenueNote } from '../FreeVenueNote';

interface Props {
  /** Whether the picked slot leaves the host something to settle with the venue. */
  venueNotice: FreePodVenueNotice;
  /** A club admin is creating the pod for a host — the venue note speaks of the host. */
  forClubAdmin?: boolean;
}

/**
 * What Step 4 shows INSTEAD of the price field and the earnings panel when the
 * pod is free: there is nothing to calculate, so it says so in words — people
 * join without paying and Duncit collects and pays nothing — and, when the slot
 * costs something, that the venue is settled off the platform.
 * mWeb twin: FreePodNote (rule 27).
 */
export function FreePodNote({ venueNotice, forClubAdmin = false }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <SurfaceCard testID="create-pod-free-note" gap={12}>
      <SectionHeader
        testID="create-pod-free-note-header"
        title={t('mweb.createPod.freePodTitle')}
      />
      <Text testID="create-pod-free-note-body" fontSize={13} color="$muted">
        {t('mweb.createPod.freePodBody')}
      </Text>
      <FreeVenueNote
        notice={venueNotice}
        forClubAdmin={forClubAdmin}
        testID="create-pod-free-note-venue"
      />
    </SurfaceCard>
  );
}
