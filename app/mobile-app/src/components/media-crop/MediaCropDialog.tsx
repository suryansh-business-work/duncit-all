import { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { MobileUploadSettings, UploadCropPreset } from '@/hooks/useUploadSettings';
import {
  aspectCropRect,
  croppablePresets,
  presetAspect,
  previewBoxSize,
  suggestPresetKey,
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_STEP,
  type CropRect,
} from './cropRect';
import { FileDetails } from './FileDetails';
import type { MediaDetails } from './format';

export type UploadStage = 'processing' | 'uploading' | 'compressing';

export interface PickedMedia extends MediaDetails {
  uri: string;
  base64?: string | null;
}

export interface CropResult {
  cropRect: CropRect | null;
  cropPresetKey: string;
}

const NO_CROP: UploadCropPreset = {
  key: 'NO_CROP',
  label: 'No Crop',
  width: 0,
  height: 0,
  enabled: true,
};

const STAGE_LABELS: Record<UploadStage, string> = {
  processing: 'Cropping & compressing',
  uploading: 'Uploading',
  compressing: 'Compressing',
};

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

interface ChipsProps {
  options: readonly UploadCropPreset[];
  selectedKey: string;
  suggestedKey: string | null;
  onSelect: (key: string) => void;
}

/** Selectable crop-aspect chips (No Crop + admin presets), with a "Suggested" tag. */
function CropPresetChips({ options, selectedKey, suggestedKey, onSelect }: Readonly<ChipsProps>) {
  return (
    <XStack gap={8} flexWrap="wrap" justifyContent="center">
      {options.map((preset) => {
        const selected = preset.key === selectedKey;
        const suffix = preset.key === suggestedKey ? ' · Suggested' : '';
        return (
          <XStack
            key={preset.key}
            testID={`crop-preset-${preset.key}`}
            role="button"
            aria-label={preset.label}
            aria-selected={selected}
            onPress={() => onSelect(preset.key)}
            paddingHorizontal={12}
            paddingVertical={6}
            borderRadius={999}
            borderWidth={1}
            borderColor={selected ? '$primary' : 'rgba(255,255,255,0.3)'}
            backgroundColor={selected ? '$primary' : 'transparent'}
            pressStyle={{ opacity: 0.8 }}
          >
            <Text fontSize={12} fontWeight="700" color="#ffffff">
              {preset.label}
              {suffix}
            </Text>
          </XStack>
        );
      })}
    </XStack>
  );
}

interface PreviewProps {
  media: PickedMedia;
  aspect: number;
  zoom: number;
}

/** Cropped preview (image scaled inside the aspect frame) or a video placeholder. */
function MediaPreview({ media, aspect, zoom }: Readonly<PreviewProps>) {
  const box = previewBoxSize(aspect);
  if (media.kind === 'video') {
    return (
      <YStack
        testID="crop-video-preview"
        width={box.width}
        height={box.height}
        borderRadius={12}
        alignItems="center"
        justifyContent="center"
        gap={8}
        backgroundColor="rgba(255,255,255,0.1)"
      >
        <MaterialIcons name="videocam" size={40} color="#ffffff" />
        <Text fontSize={12} color="rgba(255,255,255,0.85)">
          Video ready to upload
        </Text>
      </YStack>
    );
  }
  return (
    <YStack
      width={box.width}
      height={box.height}
      borderRadius={12}
      overflow="hidden"
      borderWidth={2}
      borderColor="rgba(255,255,255,0.85)"
    >
      <AppImage
        testID="crop-image-preview"
        source={{ uri: media.uri }}
        style={{ width: box.width, height: box.height, transform: [{ scale: zoom }] }}
        resizeMode="cover"
      />
    </YStack>
  );
}

export function optionsFor(presets: readonly UploadCropPreset[]): UploadCropPreset[] {
  return [NO_CROP, ...croppablePresets(presets)];
}

export function initialKey(
  options: readonly UploadCropPreset[],
  suggestedKey: string | null,
  defaultCropKey: string,
): string {
  const preferred = suggestedKey ?? defaultCropKey;
  return options.some((o) => o.key === preferred) ? preferred : NO_CROP.key;
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
    pickedKey ?? initialKey(options, suggestedKey, settings?.default_crop_key ?? NO_CROP.key);
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
      onConfirm({ cropRect: null, cropPresetKey: NO_CROP.key });
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
        <YStack flex={1} backgroundColor="rgba(0,0,0,0.92)" testID="media-crop-dialog">
          <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
            <XStack alignItems="center" justifyContent="space-between" padding={16}>
              <Text color="#ffffff" fontSize={17} fontWeight="900">
                {isImage ? 'Crop & upload' : 'Upload video'}
              </Text>
              <XStack
                testID="crop-close"
                role="button"
                aria-label="Cancel"
                onPress={uploading ? undefined : onCancel}
                width={36}
                height={36}
                alignItems="center"
                justifyContent="center"
                borderRadius={18}
                backgroundColor="rgba(255,255,255,0.16)"
                opacity={uploading ? 0.5 : 1}
              >
                <MaterialIcons name="close" size={20} color="#ffffff" />
              </XStack>
            </XStack>

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
                    label="Zoom out"
                    testID="crop-zoom-out"
                    onPress={zoomOut}
                  />
                  <ZoomButton
                    icon="zoom-in"
                    label="Zoom in"
                    testID="crop-zoom-in"
                    onPress={zoomIn}
                  />
                </XStack>
              ) : null}
            </YStack>

            <YStack paddingHorizontal={16} gap={10}>
              <FileDetailsPanel media={media} />
              {uploading ? <UploadProgress stage={stage} progress={progress} /> : null}
              {error ? (
                <Text testID="crop-error" fontSize={12} color="#ff8a80">
                  {error}
                </Text>
              ) : null}
              <XStack gap={12} paddingBottom={8}>
                <XStack
                  testID="crop-cancel"
                  role="button"
                  aria-label="Cancel"
                  onPress={uploading ? undefined : onCancel}
                  flex={1}
                  height={48}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={999}
                  borderWidth={1}
                  borderColor="rgba(255,255,255,0.4)"
                  opacity={uploading ? 0.6 : 1}
                  pressStyle={{ opacity: 0.8 }}
                >
                  <Text fontSize={14} fontWeight="900" color="#ffffff">
                    Cancel
                  </Text>
                </XStack>
                <XStack
                  testID="crop-confirm"
                  role="button"
                  aria-label="Upload"
                  aria-disabled={uploading}
                  onPress={uploading ? undefined : confirm}
                  flex={1}
                  height={48}
                  alignItems="center"
                  justifyContent="center"
                  gap={8}
                  borderRadius={999}
                  backgroundColor="$primary"
                  opacity={uploading ? 0.7 : 1}
                  pressStyle={{ opacity: 0.85 }}
                >
                  {uploading ? <Spinner size="small" color={onPrimary} /> : null}
                  <Text fontSize={14} fontWeight="900" color={onPrimary}>
                    {isImage ? 'Use photo' : 'Upload'}
                  </Text>
                </XStack>
              </XStack>
            </YStack>
          </SafeAreaView>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}

type IconName = keyof typeof MaterialIcons.glyphMap;

interface ZoomButtonProps {
  icon: IconName;
  label: string;
  testID: string;
  onPress: () => void;
}

function ZoomButton({ icon, label, testID, onPress }: Readonly<ZoomButtonProps>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      width={48}
      height={48}
      alignItems="center"
      justifyContent="center"
      borderRadius={24}
      backgroundColor="rgba(255,255,255,0.16)"
      pressStyle={{ opacity: 0.7 }}
    >
      <MaterialIcons name={icon} size={22} color="#ffffff" />
    </XStack>
  );
}

/** White-on-dark wrapper so FileDetails reads on the dialog's dark scrim. */
function FileDetailsPanel({ media }: Readonly<{ media: PickedMedia }>) {
  return (
    <YStack backgroundColor="rgba(255,255,255,0.08)" borderRadius={12} padding={12}>
      <FileDetails media={media} />
    </YStack>
  );
}

function UploadProgress({
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
