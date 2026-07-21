import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { uploadToImagekitDirect } from '@/services/imagekit-upload';
import { compressUploadedVideo } from '@/services/video-compression';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ReelPanelBody } from './ReelPanelBody';

/** Reels stream directly to ImageKit (multipart) — the 100MB cap is checked
 * client-side from the picked asset before any bytes leave the device. */
const MAX_REEL_BYTES = 100 * 1024 * 1024;
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
  const [progress, setProgress] = useState<{ stage: string; pct: number } | null>(null);
  const [error, setError] = useState<string | undefined>();
  const { color, onPrimary } = useThemeColors();

  const pickAndUpload = async () => {
    setError(undefined);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Media access is needed to upload a reel.');
      return;
    }
    // Videos only, no base64 — the file streams from its URI in the multipart body.
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    // fileSize can be missing on some pickers — skip the cap check then.
    if (asset.fileSize != null && asset.fileSize > MAX_REEL_BYTES) {
      setError('That video is over 100MB — pick a smaller reel.');
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
        (pct) => setProgress({ stage: 'Uploading', pct }),
      );
      setProgress({ stage: 'Compressing', pct: 0 });
      const url = await compressUploadedVideo(rawUrl, REEL_FOLDER, (pct) =>
        setProgress({ stage: 'Compressing', pct }),
      );
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const removeReel = () => {
    setError(undefined);
    onChange('');
  };

  return (
    <YStack borderWidth={1} borderColor="$borderColor" borderRadius={12} overflow="hidden">
      <XStack
        testID="optional-reel"
        role="button"
        aria-label="Pod Reel"
        aria-expanded={open}
        onPress={() => setOpen(!open)}
        padding={12}
        gap={10}
        alignItems="center"
        pressStyle={{ opacity: 0.7 }}
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
          <Text fontSize={14} fontWeight="900" color="$color">
            Pod Reel
          </Text>
          <Text fontSize={12} color="$muted">
            A short video shown in Explore.
          </Text>
        </YStack>
        {value ? (
          <Text fontSize={12} fontWeight="800" color="$primary">
            Added
          </Text>
        ) : (
          <MaterialIcons name={open ? 'expand-less' : 'chevron-right'} size={22} color={color} />
        )}
      </XStack>
      {open ? (
        <YStack padding={12} paddingTop={0}>
          <ReelPanelBody
            value={value}
            uploading={uploading}
            busyLabel={progress ? `${progress.stage}… ${progress.pct}%` : 'Uploading…'}
            error={error}
            onPick={() => void pickAndUpload()}
            onRemove={removeReel}
          />
        </YStack>
      ) : null}
    </YStack>
  );
}
