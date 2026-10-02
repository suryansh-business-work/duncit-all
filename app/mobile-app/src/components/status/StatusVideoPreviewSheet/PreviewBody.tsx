import { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

import { PreviewFooter, StepButton } from './PreviewControls';
import {
  MAX_STORY_VIDEO_SECONDS,
  type PendingStoryVideo,
  type StatusVideoPreviewSheetProps,
} from './types';

const TRIM_STEP_SECONDS = 1;
/** Tallest the preview may be, and the share of the window it gives up first. */
const PREVIEW_MAX_HEIGHT = 300;
const PREVIEW_HEIGHT_RATIO = 0.38;

const fmt = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function PreviewBody({
  video,
  onCancel,
  onConfirm,
}: Readonly<StatusVideoPreviewSheetProps & { video: PendingStoryVideo }>) {
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
    <PreviewFooter
      needsTrim={needsTrim}
      onPrimary={onPrimary}
      onCancel={onCancel}
      onConfirm={confirm}
    />
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
          borderRadius={18}
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
            <Text fontSize={13} fontWeight="500" color="$muted">
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
              <Text fontSize={13.5} fontWeight="600" color="$color" testID="story-trim-window">
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
