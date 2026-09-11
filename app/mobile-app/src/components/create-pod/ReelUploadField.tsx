import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AiMonitoringChip } from '@/components/ai-monitoring';
import { SurfaceCard } from '@/components/SurfaceCard';
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
  const { accent, muted } = useThemeColors();
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
    <SurfaceCard padding={0} overflow="hidden">
      <XStack
        testID="optional-reel"
        role="button"
        aria-label={podReel}
        aria-expanded={open}
        onPress={() => setOpen(!open)}
        paddingHorizontal={16}
        paddingVertical={14}
        gap={12}
        alignItems="center"
        pressStyle={PRESS_STYLE.row}
      >
        <YStack
          width={40}
          height={40}
          borderRadius={20}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$soft"
        >
          <MaterialIcons name="movie" size={20} color={accent} />
        </YStack>
        <Text flex={1} fontSize={15} fontWeight="600" color="$color">
          {podReel}
        </Text>
        {value ? (
          <XStack
            height={26}
            alignItems="center"
            paddingHorizontal={10}
            borderRadius={999}
            backgroundColor="$primary"
          >
            <Text fontSize={12} fontWeight="600" color="$onPrimary">
              {t('mweb.createPod.summaryAdded')}
            </Text>
          </XStack>
        ) : (
          <MaterialIcons name={open ? 'expand-less' : 'chevron-right'} size={22} color={muted} />
        )}
      </XStack>
      {open ? (
        <YStack paddingHorizontal={16} paddingBottom={16} gap={10}>
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
    </SurfaceCard>
  );
}
