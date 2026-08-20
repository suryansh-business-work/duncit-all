import { useState } from 'react';
import { AppImage } from '@/components/AppImage';
import { Text, XStack, YStack } from 'tamagui';
import { attendeeSeatCount } from '@duncit/utils';

import {
  AttendeesDialog,
  type AttendeePerson,
  type SpotFillRow,
} from '@/components/details/AttendeesDialog';
import { useTranslation } from '@/hooks/useTranslation';
import type { PodPerson, PodSpotFill } from '@/hooks/useDetails';

/** Builds the full attendee list — hosts first, each flagged for highlighting. */
export function buildAttendeePeople(
  people: PodPerson[],
  attendeeIds: string[],
  hostIds: string[],
  seatsByUser: Record<string, number> = {},
): AttendeePerson[] {
  const byId = new Map(people.map((p) => [p.user_id, p]));
  const hosts = new Set(hostIds);
  const list = (attendeeIds ?? []).map((id) => {
    const person = byId.get(id);
    return {
      user_id: id,
      full_name: person?.full_name ?? null,
      profile_photo: person?.profile_photo ?? null,
      is_host: hosts.has(id),
      seats: seatsByUser[id] ?? 1,
    };
  });
  return [...list.filter((p) => p.is_host), ...list.filter((p) => !p.is_host)];
}

/** A pod host's public profile — name + photo, keyed by user id for navigation. */
export interface HostPerson {
  user_id: string;
  full_name?: string | null;
  profile_photo?: string | null;
}

/** Resolve the pod's host ids to their public profiles, in host order. Missing
 * profiles keep the id (so the row stays tappable) with null name/photo. */
export function buildHostPeople(people: PodPerson[], hostIds: string[]): HostPerson[] {
  const byId = new Map(people.map((p) => [p.user_id, p]));
  return (hostIds ?? []).map((id) => {
    const person = byId.get(id);
    return {
      user_id: id,
      full_name: person?.full_name ?? null,
      profile_photo: person?.profile_photo ?? null,
    };
  });
}

type Translate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

/** Resolve the raw spot fills to display rows ONCE — the caption line and the
 * dialog both render these, so the fallback copy can't drift between them. */
export function buildSpotFillRows(fills: PodSpotFill[], t: Translate): SpotFillRow[] {
  return (fills ?? []).map((fill) => ({
    key: fill.backout_no,
    old_user_id: fill.backed_out_user_id,
    old_name: fill.backed_out_user_name || t('mweb.podDetails.formerAttendee'),
    old_photo: fill.backed_out_profile_photo ?? null,
    filled_by_label: t('mweb.podDetails.spotFilledBy', {
      vars: { name: fill.replacement_user_name || t('mweb.podDetails.newAttendee') },
    }),
  }));
}

const MAX_AVATAR_PREVIEW = 8;

/** One avatar bubble in the overlapping preview row (hosts get a primary ring). */
function AttendeeBubble({ person, first }: Readonly<{ person: AttendeePerson; first: boolean }>) {
  return (
    <YStack
      marginLeft={first ? 0 : -10}
      width={36}
      height={36}
      borderRadius={18}
      overflow="hidden"
      borderWidth={2}
      borderColor={person.is_host ? '$primary' : '$background'}
      backgroundColor="$primary"
      alignItems="center"
      justifyContent="center"
      zIndex={person.is_host ? 1 : 0}
    >
      {person.profile_photo ? (
        <AppImage source={{ uri: person.profile_photo }} style={{ width: 36, height: 36 }} />
      ) : (
        <Text fontSize={13} fontWeight="600" color="$onPrimary">
          {(person.full_name?.[0] ?? '?').toUpperCase()}
        </Text>
      )}
    </YStack>
  );
}

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
  const previews = people.slice(0, MAX_AVATAR_PREVIEW);
  const extra = going - previews.length;
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
        <Text fontSize={13.5} fontWeight="700" color="$color">
          {countLine}
        </Text>
      ) : null}
      {spots > 0 ? (
        <YStack height={8} borderRadius={4} backgroundColor="$background" overflow="hidden">
          <YStack height={8} width={`${pct}%`} backgroundColor="$primary" />
        </YStack>
      ) : null}
      {going === 0 ? (
        <Text fontSize={12} color="$muted">
          {t('mweb.podDetails.beFirstToJoin')}
        </Text>
      ) : (
        <XStack
          testID="attendees-avatar-group"
          role="button"
          aria-label={t('mweb.podDetails.viewAllAttendees')}
          onPress={() => setOpen(true)}
          alignItems="center"
          gap={8}
          pressStyle={{ opacity: 0.8 }}
        >
          <XStack alignItems="center">
            {previews.map((person, index) => (
              <AttendeeBubble key={person.user_id} person={person} first={index === 0} />
            ))}
            {extra > 0 ? (
              <YStack
                marginLeft={-10}
                width={36}
                height={36}
                borderRadius={18}
                alignItems="center"
                justifyContent="center"
                borderWidth={2}
                borderColor="$background"
                backgroundColor="$surface"
              >
                <Text fontSize={11.5} fontWeight="600" color="$muted">
                  +{extra}
                </Text>
              </YStack>
            ) : null}
          </XStack>
          <Text fontSize={12.5} fontWeight="600" color="$primary">
            {t('mweb.podDetails.viewAll')}
          </Text>
        </XStack>
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
