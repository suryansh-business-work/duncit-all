import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface StatusTileProps {
  label: string;
  image?: string | null;
  /** Show the "+" add-story badge (own tile only). */
  badge?: boolean;
  /** Grey/desaturated ring when true, vibrant gradient ring when false (Bug 2). */
  seen?: boolean;
  /** Upload progress 0–100 — shows a % overlay while posting (Bug 1). */
  progress?: number;
  onPress?: () => void;
  /** Press handler for the "+" badge — used to add another story. */
  onBadgePress?: () => void;
  testID?: string;
}

/** A circular story avatar with a label. The ring is a vibrant gradient for an
 * unseen story and a grey ring once seen (Bug 2); an optional "+" badge marks
 * the upload tile and a % overlay shows upload progress (Bug 1). */
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
  const { onPrimary, muted } = useThemeColors();
  const initial = (label[0] ?? '?').toUpperCase();
  const badgeTestID = testID ? `${testID}-badge` : undefined;
  const progressTestID = testID ? `${testID}-progress` : undefined;
  const uploading = typeof progress === 'number' && progress > 0 && progress < 100;

  const avatar = (
    <YStack
      width={58}
      height={58}
      borderRadius={999}
      backgroundColor="$muted"
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
        <Text fontSize={22} fontWeight="900" color="$onPrimary">
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
          <Text fontSize={15} fontWeight="900" color="#ffffff">
            {Math.round(progress)}%
          </Text>
        </YStack>
      ) : null}
    </YStack>
  );

  const ringInner = (
    <YStack padding={2} borderRadius={999} backgroundColor="$background">
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
      pressStyle={{ opacity: 0.8 }}
    >
      {seen ? (
        <YStack padding={2.5} borderRadius={999} backgroundColor={muted}>
          {ringInner}
        </YStack>
      ) : (
        <LinearGradient
          colors={['#ff4f73', '#ff7a59']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 2.5, borderRadius: 999 }}
        >
          {ringInner}
        </LinearGradient>
      )}
      {badge ? (
        <YStack
          testID={badgeTestID}
          role="button"
          aria-label="Add story"
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
          borderColor="$background"
        >
          <MaterialIcons name="add" size={13} color={onPrimary} />
        </YStack>
      ) : null}
      <Text fontSize={11} fontWeight="700" color="$color" numberOfLines={1}>
        {label}
      </Text>
    </YStack>
  );
}
