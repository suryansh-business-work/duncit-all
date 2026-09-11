import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface StatusTileProps {
  label: string;
  image?: string | null;
  /** Show the "+" add-story badge (own tile only). */
  badge?: boolean;
  /** Hairline ring when true (already seen), the accent ring when false (Bug 2). */
  seen?: boolean;
  /** Upload progress 0–100 — shows a % overlay while posting (Bug 1). */
  progress?: number;
  onPress?: () => void;
  /** Press handler for the "+" badge — used to add another story. */
  onBadgePress?: () => void;
  testID?: string;
}

/** A circular story avatar with a label. The ring is the solid accent for an
 * unseen story and a hairline once seen (Bug 2) — 2.5px deep either way, so a
 * tile never changes size; an optional "+" badge marks the upload tile and a %
 * overlay shows upload progress (Bug 1). mWeb twin: HomeStatusTile. */
export function StatusTile({
  label,
  image,
  badge,
  seen,
  progress,
  onPress,
  onBadgePress,
  testID,
}: Readonly<StatusTileProps>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  const initial = (label[0] ?? '?').toUpperCase();
  const badgeTestID = testID ? `${testID}-badge` : undefined;
  const progressTestID = testID ? `${testID}-progress` : undefined;
  const uploading = typeof progress === 'number' && progress > 0 && progress < 100;

  const avatar = (
    <YStack
      width={58}
      height={58}
      borderRadius={999}
      backgroundColor="$primary"
      alignItems="center"
      justifyContent="center"
      overflow="hidden"
    >
      {image ? (
        <AppImage
          source={{ uri: image }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : (
        <Text fontSize={22} fontWeight="600" color="$onPrimary">
          {initial}
        </Text>
      )}
      {uploading ? (
        <YStack
          testID={progressTestID}
          position="absolute"
          top={0}
          bottom={0}
          left={0}
          right={0}
          alignItems="center"
          justifyContent="center"
          backgroundColor="rgba(0,0,0,0.5)"
        >
          <Text fontSize={15} fontWeight="600" color="#ffffff">
            {Math.round(progress)}%
          </Text>
        </YStack>
      ) : null}
    </YStack>
  );

  const ringInner = (
    <YStack padding={2} borderRadius={999} backgroundColor="$surface">
      {avatar}
    </YStack>
  );

  return (
    <YStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      width={70}
      alignItems="center"
      gap={6}
      pressStyle={PRESS_STYLE.control}
    >
      {seen ? (
        <YStack
          testID={testID ? `${testID}-seen-ring` : undefined}
          padding={1.5}
          borderRadius={999}
          borderWidth={1}
          borderColor="$borderColor"
        >
          {ringInner}
        </YStack>
      ) : (
        <YStack padding={2.5} borderRadius={999} backgroundColor="$accent">
          {ringInner}
        </YStack>
      )}
      {badge ? (
        <YStack
          pressStyle={PRESS_STYLE.surface}
          testID={badgeTestID}
          role="button"
          aria-label={t('mweb.common.addStory')}
          onPress={onBadgePress}
          position="absolute"
          top={42}
          right={6}
          width={22}
          height={22}
          borderRadius={11}
          backgroundColor="$primary"
          alignItems="center"
          justifyContent="center"
          borderWidth={2}
          borderColor="$surface"
        >
          <MaterialIcons name="add" size={13} color={onPrimary} />
        </YStack>
      ) : null}
      <Text fontSize={12} fontWeight="600" color="$color" numberOfLines={1}>
        {label}
      </Text>
    </YStack>
  );
}
