import { CameraView } from 'expo-camera';
import { Text, YStack } from 'tamagui';

interface Props {
  granted: boolean;
  /** False while a code is in flight or its verdict is on screen — otherwise the
   * same ticket submits on every frame the camera delivers. */
  scanning: boolean;
  onCode: (token: string) => void;
}

/** The live camera square, or the reason it is not showing one. */
export function ScannerFrame({ granted, scanning, onCode }: Readonly<Props>) {
  if (!granted) {
    return (
      <Text testID="ticket-scan-permission" fontSize={13} color="$muted">
        Camera access is needed to scan tickets. Allow it for Duncit in your device settings and
        reopen this screen.
      </Text>
    );
  }
  return (
    <YStack gap={8}>
      <YStack
        testID="ticket-scan-camera"
        width="100%"
        aspectRatio={1}
        borderRadius={16}
        overflow="hidden"
        backgroundColor="#000"
      >
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanning ? ({ data }) => onCode(String(data).trim()) : undefined}
        />
      </YStack>
      <Text fontSize={12} color="$muted" textAlign="center">
        Hold the attendee&apos;s ticket QR inside the frame.
      </Text>
    </YStack>
  );
}
