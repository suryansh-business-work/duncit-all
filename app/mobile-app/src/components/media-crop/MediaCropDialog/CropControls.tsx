import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { FileDetails } from '../FileDetails';
import { STAGE_LABELS, type PickedMedia, type UploadStage } from './types';

type IconName = keyof typeof MaterialIcons.glyphMap;

interface ZoomButtonProps {
  icon: IconName;
  label: string;
  testID: string;
  onPress: () => void;
}

export function ZoomButton({ icon, label, testID, onPress }: Readonly<ZoomButtonProps>) {
  return (
    <XStack
      testID={testID}
      role="button"
      tabIndex={0}
      aria-label={label}
      onPress={onPress}
      width={48}
      height={48}
      alignItems="center"
      justifyContent="center"
      borderRadius={24}
      backgroundColor="rgba(255,255,255,0.16)"
      pressStyle={PRESS_STYLE.row}
    >
      <MaterialIcons name={icon} size={22} color="#ffffff" />
    </XStack>
  );
}

/** White-on-dark wrapper so FileDetails reads on the dialog's dark scrim. */
export function FileDetailsPanel({ media }: Readonly<{ media: PickedMedia }>) {
  return (
    <YStack backgroundColor="rgba(255,255,255,0.08)" borderRadius={16} padding={12}>
      <FileDetails media={media} />
    </YStack>
  );
}

export function UploadProgress({
  stage,
  progress,
}: Readonly<{ stage: UploadStage; progress: number | null }>) {
  const label = STAGE_LABELS[stage];
  if (progress === null) {
    // Image path: the server crops + compresses + uploads in one call with no
    // progress channel, so show an honest indeterminate spinner, not a fake %.
    return (
      <XStack testID="crop-progress" alignItems="center" gap={8}>
        <Spinner size="small" color="#ffffff" />
        <Text fontSize={12} color="rgba(255,255,255,0.85)">
          {label}…
        </Text>
      </XStack>
    );
  }
  return (
    <YStack gap={4} testID="crop-progress">
      <YStack height={6} borderRadius={3} backgroundColor="rgba(255,255,255,0.2)" overflow="hidden">
        <YStack height={6} width={`${progress}%`} backgroundColor="$primary" />
      </YStack>
      <Text fontSize={12} color="rgba(255,255,255,0.85)">
        {label}… {progress}%
      </Text>
    </YStack>
  );
}
