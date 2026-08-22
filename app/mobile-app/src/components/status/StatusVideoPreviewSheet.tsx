import { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { VideoTrim } from '@/services/video-compression';
import { useTranslation } from '@/hooks/useTranslation';

/** Story videos are short clips — capped at 15s (Bug 3). */
export const MAX_STORY_VIDEO_SECONDS = 15;

export interface PendingStoryVideo {
  uri: string;
  durationSeconds: number;
}

interface Props {
  video: PendingStoryVideo | null;
  onCancel: () => void;
  /** `trim` is null when the clip already fits the 15s cap. */
  onConfirm: (trim: VideoTrim | null) => void;
}

const TRIM_STEP_SECONDS = 1;
/** Tallest the preview may be, and the share of the window it gives up first. */
const PREVIEW_MAX_HEIGHT = 300;
const PREVIEW_HEIGHT_RATIO = 0.38;

const fmt = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

interface StepButtonProps {
  testID: string;
  icon: 'chevron-left' | 'chevron-right';
  disabled: boolean;
  onPress: () => void;
}

function StepButton({ testID, icon, disabled, onPress }: Readonly<StepButtonProps>) {
  const { muted } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={icon === 'chevron-left' ? 'Earlier start' : 'Later start'}
      aria-disabled={disabled}
      onPress={disabled ? undefined : onPress}
      width={40}
      height={40}
      alignItems="center"
      justifyContent="center"
      borderRadius={999}
      borderWidth={1}
      borderColor="$borderColor"
      opacity={disabled ? 0.4 : 1}
      pressStyle={{ opacity: 0.7 }}
    >
      <MaterialIcons name={icon} size={24} color={muted} />
    </XStack>
  );
}

function PreviewBody({
  video,
  onCancel,
  onConfirm,
}: Readonly<Props & { video: PendingStoryVideo }>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  const { height: windowHeight } = useWindowDimensions();
  const [start, setStart] = useState(0);
  const player = useVideoPlayer(video.uri, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  const needsTrim = video.durationSeconds > MAX_STORY_VIDEO_SECONDS;
  const maxStart = Math.max(0, video.durationSeconds - MAX_STORY_VIDEO_SECONDS);
  const windowEnd = Math.min(video.durationSeconds, start + MAX_STORY_VIDEO_SECONDS);
  // A hard 300 plus the title, the stepper and the button row is ~490px of
  // unshrinkable content — taller than an iPhone SE and taller than ANY phone
  // in landscape, which is what made "Trim & Post" unreachable. The preview is
  // the part that can afford to give way.
  const previewHeight = Math.min(
    PREVIEW_MAX_HEIGHT,
    Math.round(windowHeight * PREVIEW_HEIGHT_RATIO),
  );

  const seekTo = (value: number) => {
    const clamped = Math.min(maxStart, Math.max(0, value));
    setStart(clamped);
    player.currentTime = clamped;
  };
  const confirm = () => onConfirm(needsTrim ? { start, duration: MAX_STORY_VIDEO_SECONDS } : null);

  const footer = (
    <XStack gap={12}>
      <XStack
        testID="story-video-cancel"
        role="button"
        aria-label={t('mweb.common.cancel')}
        onPress={onCancel}
        flex={1}
        height={46}
        alignItems="center"
        justifyContent="center"
        borderRadius={12}
        borderWidth={1}
        borderColor="$borderColor"
        pressStyle={{ opacity: 0.85 }}
      >
        <Text fontSize={14} fontWeight="600" color="$color">
          Cancel
        </Text>
      </XStack>
      <XStack
        testID="story-video-post"
        role="button"
        aria-label={needsTrim ? 'Trim and post' : 'Post story'}
        onPress={confirm}
        flex={1}
        height={46}
        alignItems="center"
        justifyContent="center"
        borderRadius={12}
        backgroundColor="$primary"
        pressStyle={{ opacity: 0.85 }}
      >
        <Text fontSize={14} fontWeight="700" color={onPrimary}>
          {needsTrim ? 'Trim & Post' : 'Post story'}
        </Text>
      </XStack>
    </XStack>
  );

  return (
    <DuncitDialog
      open
      onClose={onCancel}
      testID="story-video-sheet"
      variant="center"
      title={t('mweb.common.previewYourVideoStory')}
      closeLabel="Close"
      showCloseButton={false}
      footer={footer}
    >
      <YStack gap={12}>
        <YStack
          height={previewHeight}
          borderRadius={14}
          overflow="hidden"
          backgroundColor="#000000"
        >
          <VideoView
            testID="story-video-preview"
            player={player}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
          />
        </YStack>
        {needsTrim ? (
          <YStack gap={8}>
            <Text fontSize={13} fontWeight="700" color="$muted">
              Videos can be up to {MAX_STORY_VIDEO_SECONDS} seconds long. Pick the{' '}
              {MAX_STORY_VIDEO_SECONDS}s you want to post.
            </Text>
            <XStack alignItems="center" justifyContent="center" gap={14}>
              <StepButton
                testID="story-trim-earlier"
                icon="chevron-left"
                disabled={start <= 0}
                onPress={() => seekTo(start - TRIM_STEP_SECONDS)}
              />
              <Text fontSize={13.5} fontWeight="700" color="$color" testID="story-trim-window">
                {fmt(start)} – {fmt(windowEnd)} of {fmt(video.durationSeconds)}
              </Text>
              <StepButton
                testID="story-trim-later"
                icon="chevron-right"
                disabled={start >= maxStart}
                onPress={() => seekTo(start + TRIM_STEP_SECONDS)}
              />
            </XStack>
          </YStack>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}

/** Preview a picked story video before posting (Bug 3). Clips over the 15s cap
 * must pick a 15s window (stepper seek; the server cuts the video during the
 * FFmpeg pass) before they can post. Mirrors mWeb's StatusVideoPreviewDialog. */
export function StatusVideoPreviewSheet({ video, onCancel, onConfirm }: Readonly<Props>) {
  // The body owns the player, so it is mounted only while there is a video —
  // which is also what gates the dialog.
  if (!video) return null;
  return <PreviewBody video={video} onCancel={onCancel} onConfirm={onConfirm} />;
}
