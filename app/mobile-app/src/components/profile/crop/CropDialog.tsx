import { useState } from 'react';
import { Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { CroppedPhoto, PickedPhoto } from '@/hooks/useProfilePhoto';
import { CropControls } from './CropControls';
import { cropToAvatar } from './cropImage';

const VIEWPORT = 280;
const MAX_ZOOM = 3;
const MIN_ZOOM = 1;
const ZOOM_STEP = 0.25;

interface Props {
  photo: PickedPhoto | null;
  saving: boolean;
  onConfirm: (cropped: CroppedPhoto) => void;
  onCancel: () => void;
}

/** Crop + zoom + rotate + preview before a profile photo is uploaded (item 9).
 * A circular viewport frames a centered square; controls adjust zoom/rotation
 * and the result is produced natively by expo-image-manipulator on confirm. */
export function CropDialog({ photo, saving, onConfirm, onCancel }: Readonly<Props>) {
  const { onPrimary } = useThemeColors();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [processing, setProcessing] = useState(false);

  if (!photo) return null;

  const reset = () => {
    setZoom(1);
    setRotation(0);
  };
  const cancel = () => {
    reset();
    onCancel();
  };
  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
  const rotate = () => setRotation((r) => (r + 90) % 360);

  const confirm = async () => {
    setProcessing(true);
    try {
      const cropped = await cropToAvatar({
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        zoom,
        rotation,
      });
      reset();
      onConfirm(cropped);
    } finally {
      setProcessing(false);
    }
  };

  const busy = processing || saving;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={cancel}>
      <ModalThemeScope>
        <YStack flex={1} backgroundColor="rgba(0,0,0,0.92)" testID="crop-dialog">
          <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
            <XStack alignItems="center" justifyContent="space-between" padding={16}>
              <Text color="#ffffff" fontSize={17} fontWeight="900">
                Adjust photo
              </Text>
              <XStack
                testID="crop-cancel"
                role="button"
                aria-label="Cancel"
                onPress={cancel}
                width={36}
                height={36}
                alignItems="center"
                justifyContent="center"
                borderRadius={18}
                backgroundColor="rgba(255,255,255,0.16)"
              >
                <MaterialIcons name="close" size={20} color="#ffffff" />
              </XStack>
            </XStack>

            <YStack flex={1} alignItems="center" justifyContent="center">
              <YStack
                width={VIEWPORT}
                height={VIEWPORT}
                borderRadius={VIEWPORT / 2}
                overflow="hidden"
                borderWidth={2}
                borderColor="rgba(255,255,255,0.85)"
              >
                <Image
                  testID="crop-preview"
                  source={{ uri: photo.uri }}
                  style={{
                    width: VIEWPORT,
                    height: VIEWPORT,
                    transform: [{ scale: zoom }, { rotate: `${rotation}deg` }],
                  }}
                  resizeMode="cover"
                />
              </YStack>
            </YStack>

            <CropControls onZoomIn={zoomIn} onZoomOut={zoomOut} onRotate={rotate} />

            <XStack gap={12} paddingHorizontal={16} paddingTop={8}>
              <XStack
                testID="crop-cancel-btn"
                role="button"
                aria-label="Discard"
                onPress={cancel}
                flex={1}
                height={48}
                alignItems="center"
                justifyContent="center"
                borderRadius={999}
                borderWidth={1}
                borderColor="rgba(255,255,255,0.4)"
                pressStyle={{ opacity: 0.8 }}
              >
                <Text fontSize={14} fontWeight="900" color="#ffffff">
                  Discard
                </Text>
              </XStack>
              <XStack
                testID="crop-confirm"
                role="button"
                aria-label="Save photo"
                aria-disabled={busy}
                onPress={busy ? undefined : confirm}
                flex={1}
                height={48}
                alignItems="center"
                justifyContent="center"
                gap={8}
                borderRadius={999}
                backgroundColor="$primary"
                opacity={busy ? 0.7 : 1}
                pressStyle={{ opacity: 0.85 }}
              >
                {busy ? <Spinner size="small" color={onPrimary} /> : null}
                <Text fontSize={14} fontWeight="900" color={onPrimary}>
                  {busy ? 'Saving…' : 'Save'}
                </Text>
              </XStack>
            </XStack>
          </SafeAreaView>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
