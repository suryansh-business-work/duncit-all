import { useState } from 'react';
import { Text, YStack } from 'tamagui';
import { attendeeSeatCount } from '@duncit/utils';

import { AttendeesDialog, type AttendeePerson } from '@/components/details/AttendeesDialog';
import { useTranslation } from '@/hooks/useTranslation';
import type { PodSpotFill } from '@/hooks/useDetails';

import { AttendeeAvatarGroup } from './AttendeeAvatarGroup';
import { buildSpotFillRows } from './attendeePeople';

/** Attendees — avatar group (hosts highlighted) opening the full-list dialog (3). */
export function AttendeesSection({
  people,
  spots,
  expired,
  spotFills = [],
  showCount = true,
  seatsTaken,
  onOpenProfile,
}: Readonly<{
  people: AttendeePerson[];
  spots: number;
  /** Occupancy from the server (people + the seats they bought beyond their own). */
  seatsTaken?: number;
  /** Past pods show "attended" instead of "going". */
  expired?: boolean;
  /** Filled Backout seats — old attendee struck through, filler named. */
  spotFills?: PodSpotFill[];
  /** The "N going" line belongs to a pod, which people attend. A club's members
   * are not going anywhere, so its section renders the avatars alone. */
  showCount?: boolean;
  onOpenProfile: (userId: string) => void;
}>) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  // Seats, not faces: one person can be bringing three more, and the number
  // beside "of N spots" has to mean the same thing the capacity does.
  const going = seatsTaken ?? attendeeSeatCount(people);
  const pct = spots > 0 ? Math.min(100, Math.round((going / spots) * 100)) : 0;
  const fillRows = buildSpotFillRows(spotFills, t);
  const withTotal = expired
    ? 'mweb.podDetails.attendeesAttended'
    : 'mweb.podDetails.attendeesGoing';
  const withoutTotal = expired
    ? 'mweb.podDetails.attendeesAttendedNoTotal'
    : 'mweb.podDetails.attendeesGoingNoTotal';
  const countLine =
    spots > 0
      ? t(withTotal, { vars: { count: going, total: spots } })
      : t(withoutTotal, { vars: { count: going } });

  return (
    <YStack gap={8}>
      {showCount ? (
        <Text fontSize={14} fontWeight="600" color="$color">
          {countLine}
        </Text>
      ) : null}
      {spots > 0 ? (
        <YStack height={8} borderRadius={999} backgroundColor="$soft" overflow="hidden">
          <YStack height={8} borderRadius={999} width={`${pct}%`} backgroundColor="$primary" />
        </YStack>
      ) : null}
      {going === 0 ? (
        <Text fontSize={12} color="$muted">
          {t('mweb.podDetails.beFirstToJoin')}
        </Text>
      ) : (
        <AttendeeAvatarGroup people={people} going={going} onOpen={() => setOpen(true)} />
      )}
      {fillRows.length > 0 ? (
        <YStack gap={2}>
          {fillRows.map((fill) => (
            <Text key={fill.key} fontSize={12} color="$muted">
              <Text fontSize={12} color="$muted" textDecorationLine="line-through">
                {fill.old_name}
              </Text>
              {' · '}
              {fill.filled_by_label}
            </Text>
          ))}
        </YStack>
      ) : null}
      <AttendeesDialog
        open={open}
        people={people}
        spotFills={fillRows}
        seatCount={going}
        spotFilledTitle={t('mweb.podDetails.spotFilled')}
        onClose={() => setOpen(false)}
        onOpenProfile={(userId) => {
          setOpen(false);
          onOpenProfile(userId);
        }}
      />
    </YStack>
  );
}
