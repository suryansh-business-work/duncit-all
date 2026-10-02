import { AppImage } from '@/components/AppImage';
import { Text, XStack, YStack } from 'tamagui';

import type { AttendeePerson } from '@/components/details/AttendeesDialog';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

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
      borderColor={person.is_host ? '$accent' : '$surface'}
      backgroundColor="$soft"
      alignItems="center"
      justifyContent="center"
      zIndex={person.is_host ? 1 : 0}
    >
      {person.profile_photo ? (
        <AppImage source={{ uri: person.profile_photo }} style={{ width: 36, height: 36 }} />
      ) : (
        <Text fontSize={13} fontWeight="600" color="$color">
          {(person.full_name?.[0] ?? '?').toUpperCase()}
        </Text>
      )}
    </YStack>
  );
}

/** The overlapping avatar preview (hosts first) plus a "+N" bubble for the
 * seats beyond it; tapping it opens the full list. */
export function AttendeeAvatarGroup({
  people,
  going,
  onOpen,
}: Readonly<{ people: AttendeePerson[]; going: number; onOpen: () => void }>) {
  const { t } = useTranslation();
  const previews = people.slice(0, MAX_AVATAR_PREVIEW);
  const extra = going - previews.length;
  return (
    <XStack
      testID="attendees-avatar-group"
      role="button"
      tabIndex={0}
      aria-label={t('mweb.podDetails.viewAllAttendees')}
      onPress={onOpen}
      alignItems="center"
      gap={8}
      pressStyle={PRESS_STYLE.control}
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
            borderColor="$surface"
            backgroundColor="$soft"
          >
            <Text fontSize={11.5} fontWeight="600" color="$muted">
              +{extra}
            </Text>
          </YStack>
        ) : null}
      </XStack>
      <Text fontSize={12.5} fontWeight="600" color="$accent">
        {t('mweb.podDetails.viewAll')}
      </Text>
    </XStack>
  );
}
