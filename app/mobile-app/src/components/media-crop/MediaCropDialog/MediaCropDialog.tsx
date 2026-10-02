import { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { ModalSafeArea } from '@/components/ModalSafeArea';
import { Text, XStack, YStack } from 'tamagui';

import { AiMonitoringChip } from '@/components/ai-monitoring';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { MobileUploadSettings } from '@/hooks/useUploadSettings';
import {
  aspectCropRect,
  croppablePresets,
  presetAspect,
  suggestPresetKey,
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_STEP,
} from '../cropRect';
import { useTranslation } from '@/hooks/useTranslation';
import { CropActions, CropHeader } from './CropChrome';
import { FileDetailsPanel, UploadProgress, ZoomButton } from './CropControls';
import { initialKey, NO_CROP_KEY, optionsFor } from './cropOptions';
import { CropPresetChips } from './CropPresetChips';
import { MediaPreview } from './MediaPreview';
import type { CropResult, PickedMedia, UploadStage } from './types';

interface Props {
  media: PickedMedia | null;
  settings: MobileUploadSettings | null;
  uploading: boolean;
  stage: UploadStage;
  progress: number | null;
  error?: string | null;
  onConfirm: (result: CropResult) => void;
  onCancel: () => void;
}

/**
 * Preset-aware crop + upload dialog for the native app (and native web). Shows
 * full file details for image AND video, a preset/zoom crop step + suggested
 * size for images, and an honest upload progress bar. The crop rect it emits is
 * applied server-side (sharp) so the final artifact is cropped + compressed.
 * The preset + zoom selection resets itself whenever a new asset is staged.
 */
export function MediaCropDialog({
  media,
  settings,
  uploading,
  stage,
  progress,
  error,
  onConfirm,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  // `null` = the user hasn't picked a chip yet → fall back to the suggested /
  // admin-default preset. Reset whenever a new asset is staged.
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const mediaUri = media?.uri;
  useEffect(() => {
    setPickedKey(null);
    setZoom(MIN_ZOOM);
  }, [mediaUri]);

  if (!media) return null;

  const presets = settings?.crop_presets ?? [];
  const options = optionsFor(presets);
  const isImage = media.kind === 'image';
  const suggestedKey = isImage ? suggestPresetKey(media.width, media.height, presets) : null;
  const selectedKey =
    pickedKey ?? initialKey(options, suggestedKey, settings?.default_crop_key ?? NO_CROP_KEY);
  const setSelectedKey = setPickedKey;
  // The croppable preset the user is on — undefined for No Crop or a video, in
  // which cases the upload keeps the source frame (server compresses only).
  const activePreset = isImage
    ? croppablePresets(presets).find((p) => p.key === selectedKey)
    : undefined;
  const aspect = activePreset
    ? presetAspect(activePreset.width, activePreset.height)
    : media.width / media.height;

  const confirm = () => {
    if (!activePreset) {
      onConfirm({ cropRect: null, cropPresetKey: NO_CROP_KEY });
      return;
    }
    onConfirm({
      cropRect: aspectCropRect(
        media.width,
        media.height,
        activePreset.width,
        activePreset.height,
        zoom,
      ),
      cropPresetKey: activePreset.key,
    });
  };

  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <ModalThemeScope>
        <YStack
          flex={1}
          backgroundColor="rgba(0,0,0,0.92)"
          testID="media-crop-dialog"
          onAccessibilityEscape={uploading ? undefined : onCancel}
        >
          <ModalSafeArea edges={['top', 'bottom']} style={{ flex: 1 }}>
            <CropHeader isImage={isImage} uploading={uploading} onCancel={onCancel} />

            <YStack
              flex={1}
              alignItems="center"
              justifyContent="center"
              gap={14}
              paddingHorizontal={16}
            >
              <MediaPreview media={media} aspect={aspect} zoom={zoom} />
              {activePreset ? (
                <Text testID="crop-suggested-size" fontSize={12} color="rgba(255,255,255,0.85)">
                  Output {activePreset.width}×{activePreset.height}px
                </Text>
              ) : null}
              {isImage ? (
                <CropPresetChips
                  options={options}
                  selectedKey={selectedKey}
                  suggestedKey={suggestedKey}
                  onSelect={setSelectedKey}
                />
              ) : null}
              {activePreset ? (
                <XStack gap={20}>
                  <ZoomButton
                    icon="zoom-out"
                    label={t('mweb.common.zoomOut')}
                    testID="crop-zoom-out"
                    onPress={zoomOut}
                  />
                  <ZoomButton
                    icon="zoom-in"
                    label={t('mweb.common.zoomIn')}
                    testID="crop-zoom-in"
                    onPress={zoomIn}
                  />
                </XStack>
              ) : null}
            </YStack>

            <YStack paddingHorizontal={16} gap={10}>
              {/* Every status, story, profile post and review photo lands here
                  before it is sent, so this is the one screen that can carry the
                  notice for all of them. */}
              <XStack>
                <AiMonitoringChip testID="crop-ai-monitoring" />
              </XStack>
              <FileDetailsPanel media={media} />
              {uploading ? <UploadProgress stage={stage} progress={progress} /> : null}
              {error ? (
                <Text testID="crop-error" fontSize={13} color="$danger">
                  {error}
                </Text>
              ) : null}
              <CropActions
                isImage={isImage}
                uploading={uploading}
                onPrimary={onPrimary}
                onCancel={onCancel}
                onConfirm={confirm}
              />
            </YStack>
          </ModalSafeArea>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
