import { AppImage } from '@/components/AppImage';
import { Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';

import type { AttendeePerson, SpotFillRow } from './attendees';

/** One attendee row — photo, name, host badge, tap-through to the profile. */
export function AttendeeRow({
  person,
  label,
  onPress,
}: Readonly<{ person: AttendeePerson; label: string; onPress: () => void }>) {
  const { t } = useTranslation();
  const name = person.full_name || t('mweb.podDetails.attendee');
  return (
    <XStack
      testID={`attendee-row-${person.user_id}`}
      role="button"
      tabIndex={0}
      aria-label={name}
      onPress={onPress}
      alignItems="center"
      gap={12}
      padding={10}
      borderRadius={12}
      pressStyle={{ opacity: 0.8, backgroundColor: '$soft' }}
    >
      {person.profile_photo ? (
        <AppImage
          source={{ uri: person.profile_photo }}
          style={{ width: 40, height: 40, borderRadius: 20 }}
        />
      ) : (
        <YStack
          width={40}
          height={40}
          alignItems="center"
          justifyContent="center"
          borderRadius={20}
          backgroundColor="$soft"
        >
          <Text fontSize={15} fontWeight="600" color="$color">
            {(person.full_name?.[0] ?? '?').toUpperCase()}
          </Text>
        </YStack>
      )}
      <YStack flex={1}>
        <Text fontSize={14} fontWeight="600" color="$color" numberOfLines={1}>
          {name}
        </Text>
        <Text fontSize={11.5} color="$muted">
          {label || t('mweb.podDetails.viewProfile')}
        </Text>
      </YStack>
      {person.is_host ? (
        <YStack
          borderRadius={999}
          backgroundColor="$accent"
          paddingHorizontal={10}
          paddingVertical={3}
        >
          <Text fontSize={11} fontWeight="600" color="$onPrimary">
            {t('mweb.podDetails.host')}
          </Text>
        </YStack>
      ) : null}
    </XStack>
  );
}

/** One struck-through former attendee whose seat a replacement rebooked. */
export function SpotFillRowItem({
  fill,
  onPress,
}: Readonly<{ fill: SpotFillRow; onPress: () => void }>) {
  return (
    <XStack
      testID={`spot-fill-row-${fill.key}`}
      role="button"
      tabIndex={0}
      aria-label={fill.old_name}
      onPress={onPress}
      alignItems="center"
      gap={12}
      padding={10}
      borderRadius={12}
      pressStyle={{ opacity: 0.8, backgroundColor: '$soft' }}
    >
      {fill.old_photo ? (
        <AppImage
          source={{ uri: fill.old_photo }}
          style={{ width: 40, height: 40, borderRadius: 20, opacity: 0.6 }}
        />
      ) : (
        <YStack
          width={40}
          height={40}
          alignItems="center"
          justifyContent="center"
          borderRadius={20}
          backgroundColor="$soft"
        >
          <Text fontSize={15} fontWeight="600" color="$muted">
            {fill.old_name.charAt(0).toUpperCase()}
          </Text>
        </YStack>
      )}
      <YStack flex={1}>
        <Text
          fontSize={14}
          fontWeight="600"
          color="$muted"
          textDecorationLine="line-through"
          numberOfLines={1}
        >
          {fill.old_name}
        </Text>
        <Text fontSize={11.5} color="$muted">
          {fill.filled_by_label}
        </Text>
      </YStack>
    </XStack>
  );
}
