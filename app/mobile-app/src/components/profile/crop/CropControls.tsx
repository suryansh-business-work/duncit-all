import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

type IconName = keyof typeof MaterialIcons.glyphMap;

interface ControlProps {
  icon: IconName;
  label: string;
  testID: string;
  onPress: () => void;
}

/** A round, labelled crop control (zoom in/out, rotate). */
function Control({ icon, label, testID, onPress }: Readonly<ControlProps>) {
  return (
    <YStack alignItems="center" gap={6}>
      <XStack
        testID={testID}
        role="button"
        aria-label={label}
        onPress={onPress}
        width={52}
        height={52}
        alignItems="center"
        justifyContent="center"
        borderRadius={26}
        backgroundColor="rgba(255,255,255,0.16)"
        pressStyle={{ opacity: 0.7 }}
      >
        <MaterialIcons name={icon} size={24} color="#ffffff" />
      </XStack>
      <Text fontSize={11} fontWeight="700" color="rgba(255,255,255,0.85)">
        {label}
      </Text>
    </YStack>
  );
}

interface Props {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotate: () => void;
}

/** Zoom + rotate control row for the avatar crop dialog (item 9). */
export function CropControls({ onZoomIn, onZoomOut, onRotate }: Readonly<Props>) {
  return (
    <XStack justifyContent="center" gap={28} paddingVertical={12}>
      <Control icon="zoom-out" label="Zoom out" testID="crop-zoom-out" onPress={onZoomOut} />
      <Control icon="zoom-in" label="Zoom in" testID="crop-zoom-in" onPress={onZoomIn} />
      <Control icon="rotate-right" label="Rotate" testID="crop-rotate" onPress={onRotate} />
    </XStack>
  );
}
