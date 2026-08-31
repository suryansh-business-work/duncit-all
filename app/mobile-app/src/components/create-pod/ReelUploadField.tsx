import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AiMonitoringChip } from '@/components/ai-monitoring';
import { uploadToImagekitDirect } from '@/services/imagekit-upload';
import { compressUploadedVideo } from '@/services/video-compression';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { MB, useUploadLimits } from '@/hooks/useUploadLimits';
import { ReelPanelBody } from './ReelPanelBody';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Reels stream directly to ImageKit (multipart) — the cap is the admin's
 * `max_video_mb` for the app, checked client-side from the picked asset
 * before any bytes leave the device. */
const REEL_FOLDER = '/pods/reels';

interface Props {
  value: string;
  onChange: (url: string) => void;
}

/** Step 1 "Pod Reel" accordion — one more optional expand-in-place card (same
 * pattern as OptionalSettingsCards). Picks a video from the library and streams
 * it straight to ImageKit, bypassing the server's base64 upload size cap. */
export function ReelUploadField({ value, onChange }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ stage: 'upload' | 'compress'; pct: number } | null>(
    null,
  );
  const [error, setError] = useState<string | undefined>();
  const { color, onPrimary } = useThemeColors();
  const { t } = useTranslation();
  const limits = useUploadLimits();
  const podReel = t('mweb.createPod.podReel');

  const pickAndUpload = async () => {
    setError(undefined);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t('mweb.createPod.reelPermission'));
      return;
    }
    // Videos only, no base64 — the file streams from its URI in the multipart body.
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    // fileSize can be missing on some pickers — the cap check is skipped then.
    if (asset.fileSize != null && asset.fileSize > limits.maxVideoBytes) {
      setError(
        t('mweb.createPod.reelOverCap', {
          vars: { max: Math.round(limits.maxVideoBytes / MB) },
        }),
      );
      return;
    }
    setUploading(true);
    try {
      // Real byte progress while uploading, then the server-side FFmpeg pass
      // (no-op when the admin has video compression off) with its real % too.
      const rawUrl = await uploadToImagekitDirect(
        {
          uri: asset.uri,
          name: asset.fileName ?? `reel-${Date.now()}.mp4`,
          type: asset.mimeType ?? 'video/mp4',
        },
        REEL_FOLDER,
        (pct) => setProgress({ stage: 'upload', pct }),
      );
      setProgress({ stage: 'compress', pct: 0 });
      const url = await compressUploadedVideo(rawUrl, REEL_FOLDER, (pct) =>
        setProgress({ stage: 'compress', pct }),
      );
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('mweb.createPod.uploadFailed'));
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const removeReel = () => {
    setError(undefined);
    onChange('');
  };

  const pctVars = { vars: { pct: progress?.pct ?? 0 } };
  const stageLabel =
    progress?.stage === 'compress'
      ? t('mweb.createPod.compressingPct', pctVars)
      : t('mweb.createPod.uploadingPct', pctVars);
  const busyLabel = progress ? stageLabel : t('mweb.createPod.uploading');

  return (
    <YStack borderWidth={1} borderColor="$borderColor" borderRadius={12} overflow="hidden">
      <XStack
        testID="optional-reel"
        role="button"
        aria-label={podReel}
        aria-expanded={open}
        onPress={() => setOpen(!open)}
        padding={12}
        gap={10}
        alignItems="center"
        pressStyle={PRESS_STYLE.row}
      >
        <YStack
          width={36}
          height={36}
          borderRadius={18}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$primary"
        >
          <MaterialIcons name="movie" size={18} color={onPrimary} />
        </YStack>
        <YStack flex={1}>
          <Text fontSize={14} fontWeight="700" color="$color">
            {podReel}
          </Text>
          <Text fontSize={12} color="$muted">
            {t('mweb.createPod.reelSubtitle')}
          </Text>
        </YStack>
        {value ? (
          <Text fontSize={12} fontWeight="600" color="$primary">
            {t('mweb.createPod.summaryAdded')}
          </Text>
        ) : (
          <MaterialIcons name={open ? 'expand-less' : 'chevron-right'} size={22} color={color} />
        )}
      </XStack>
      {open ? (
        <YStack padding={12} paddingTop={0} gap={8}>
          <XStack>
            <AiMonitoringChip testID="reel-ai-monitoring" />
          </XStack>
          <ReelPanelBody
            value={value}
            uploading={uploading}
            busyLabel={busyLabel}
            error={error}
            onPick={() => void pickAndUpload()}
            onRemove={removeReel}
          />
        </YStack>
      ) : null}
    </YStack>
  );
}
