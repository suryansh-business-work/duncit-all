import type { ComponentProps } from 'react';
import { AppImage } from '@/components/AppImage';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { StatusVideo } from '@/components/status/StatusVideo';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Author line: the name plus the optional sub-label (followed club/pod/user) and
 * the countdown until the status is auto-removed. */
export function StatusHeaderText({
  name,
  subLabel,
  remaining,
  onPress,
}: Readonly<{
  name: string;
  subLabel?: string | null;
  remaining: string | null;
  /** When set, the name is a button that opens the author's profile. */
  onPress?: () => void;
}>) {
  const { t } = useTranslation();
  return (
    <YStack flex={1}>
      {onPress ? (
        <Text
          testID="status-author"
          role="button"
          tabIndex={0}
          hitSlop={8}
          aria-label={t('mweb.podDetails.openProfileOf', { vars: { name } })}
          pressStyle={PRESS_STYLE.inline}
          onPress={onPress}
          color="#ffffff"
          fontSize={16}
          fontWeight="600"
          numberOfLines={1}
        >
          {name}
        </Text>
      ) : (
        <Text color="#ffffff" fontSize={16} fontWeight="600" numberOfLines={1}>
          {name}
        </Text>
      )}
      {subLabel ? (
        <Text
          testID="status-sublabel"
          color="rgba(255,255,255,0.75)"
          fontSize={11.5}
          fontWeight="500"
          numberOfLines={1}
        >
          {subLabel}
        </Text>
      ) : null}
      {remaining ? (
        <Text
          testID="status-remaining"
          color="rgba(255,255,255,0.75)"
          fontSize={11.5}
          fontWeight="500"
        >
          {remaining}
        </Text>
      ) : null}
    </YStack>
  );
}

/** One of the header's round icon buttons (sound, kebab, close) — they only
 * ever differ by their icon, label and what they do. */
export function StatusRoundButton({
  testID,
  label,
  icon,
  onPress,
  spaced,
}: Readonly<{
  testID: string;
  label: string;
  icon: ComponentProps<typeof MaterialIcons>['name'];
  onPress: () => void;
  /** Every button but the last one leaves a gap before its neighbour. */
  spaced?: boolean;
}>) {
  return (
    <XStack
      pressStyle={PRESS_STYLE.surface}
      testID={testID}
      role="button"
      tabIndex={0}
      hitSlop={4}
      aria-label={label}
      onPress={onPress}
      width={36}
      height={36}
      marginRight={spaced ? 8 : 0}
      alignItems="center"
      justifyContent="center"
      borderRadius={18}
      backgroundColor="rgba(255,255,255,0.16)"
    >
      <MaterialIcons name={icon} size={20} color="#ffffff" />
    </XStack>
  );
}

/** The header's speaker. Only a video slide has sound to turn off, so every
 * other slide renders nothing here. */
export function StatusMuteButton({
  visible,
  muted,
  onToggle,
}: Readonly<{ visible: boolean; muted: boolean; onToggle: () => void }>) {
  const { t } = useTranslation();
  if (!visible) return null;
  return (
    <StatusRoundButton
      testID="status-mute"
      label={muted ? t('mweb.status.unmuteVideo') : t('mweb.status.muteVideo')}
      icon={muted ? 'volume-off' : 'volume-up'}
      onPress={onToggle}
      spaced
    />
  );
}

/** The slide media — a video plays to its end (or the 15s cap), an image just
 * fills the frame. Renders nothing while a slide carries no media. */
export function StatusMedia({
  isVideo,
  uri,
  muted,
  onEnded,
}: Readonly<{ isVideo: boolean; uri?: string | null; muted: boolean; onEnded: () => void }>) {
  return (
    <>
      {isVideo && uri ? <StatusVideo uri={uri} muted={muted} onEnded={onEnded} /> : null}
      {!isVideo && uri ? (
        <AppImage
          testID="status-viewer-image"
          source={{ uri }}
          style={{ flex: 1, width: '100%' }}
          resizeMode="cover"
        />
      ) : null}
    </>
  );
}
