import { useState } from 'react';
import { AppImage } from '@/components/AppImage';
import { Text, XStack, YStack } from 'tamagui';

import { AttendeesDialog, type AttendeePerson } from '@/components/details/AttendeesDialog';
import type { PodPerson } from '@/hooks/useDetails';

/** Builds the full attendee list — hosts first, each flagged for highlighting. */
export function buildAttendeePeople(
  people: PodPerson[],
  attendeeIds: string[],
  hostIds: string[],
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
    };
  });
  return [...list.filter((p) => p.is_host), ...list.filter((p) => !p.is_host)];
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
        <Text fontSize={13} fontWeight="800" color="$onPrimary">
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
  onOpenProfile,
}: Readonly<{
  people: AttendeePerson[];
  spots: number;
  /** Past pods show "attended" instead of "going". */
  expired?: boolean;
  onOpenProfile: (userId: string) => void;
}>) {
  const [open, setOpen] = useState(false);
  const going = people.length;
  const pct = spots > 0 ? Math.min(100, Math.round((going / spots) * 100)) : 0;
  const previews = people.slice(0, MAX_AVATAR_PREVIEW);
  const extra = going - previews.length;

  return (
    <YStack gap={8}>
      <Text fontSize={13.5} fontWeight="700" color="$color">
        {going}
        {spots > 0 ? ` / ${spots}` : ''} {expired ? 'attended' : 'going'}
      </Text>
      {spots > 0 ? (
        <YStack height={8} borderRadius={4} backgroundColor="$background" overflow="hidden">
          <YStack height={8} width={`${pct}%`} backgroundColor="$primary" />
        </YStack>
      ) : null}
      {going === 0 ? (
        <Text fontSize={12} color="$muted">
          Be the first to join!
        </Text>
      ) : (
        <XStack
          testID="attendees-avatar-group"
          role="button"
          aria-label="View all attendees"
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
                <Text fontSize={11.5} fontWeight="800" color="$muted">
                  +{extra}
                </Text>
              </YStack>
            ) : null}
          </XStack>
          <Text fontSize={12.5} fontWeight="800" color="$primary">
            View all
          </Text>
        </XStack>
      )}
      <AttendeesDialog
        open={open}
        people={people}
        onClose={() => setOpen(false)}
        onOpenProfile={(userId) => {
          setOpen(false);
          onOpenProfile(userId);
        }}
      />
    </YStack>
  );
}
