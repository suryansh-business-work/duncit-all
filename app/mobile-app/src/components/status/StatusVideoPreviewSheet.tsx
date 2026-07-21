import { useState } from 'react';
import { Modal } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { VideoTrim } from '@/services/video-compression';

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
  const { onPrimary } = useThemeColors();
  const [start, setStart] = useState(0);
  const player = useVideoPlayer(video.uri, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  const needsTrim = video.durationSeconds > MAX_STORY_VIDEO_SECONDS;
  const maxStart = Math.max(0, video.durationSeconds - MAX_STORY_VIDEO_SECONDS);
  const windowEnd = Math.min(video.durationSeconds, start + MAX_STORY_VIDEO_SECONDS);

  const seekTo = (value: number) => {
    const clamped = Math.min(maxStart, Math.max(0, value));
    setStart(clamped);
    player.currentTime = clamped;
  };
  const confirm = () => onConfirm(needsTrim ? { start, duration: MAX_STORY_VIDEO_SECONDS } : null);

  return (
    <YStack
      width="92%"
      maxWidth={420}
      backgroundColor="$background"
      borderRadius={20}
      padding={16}
      gap={12}
    >
      <Text fontSize={17} fontWeight="900" color="$color">
        Preview your video story
      </Text>
      <YStack height={300} borderRadius={14} overflow="hidden" backgroundColor="#000000">
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
            <Text fontSize={13.5} fontWeight="900" color="$color" testID="story-trim-window">
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
      <XStack gap={12}>
        <XStack
          testID="story-video-cancel"
          role="button"
          aria-label="Cancel"
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
          <Text fontSize={14} fontWeight="800" color="$color">
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
          <Text fontSize={14} fontWeight="900" color={onPrimary}>
            {needsTrim ? 'Trim & Post' : 'Post story'}
          </Text>
        </XStack>
      </XStack>
    </YStack>
  );
}

/** Preview a picked story video before posting (Bug 3). Clips over the 15s cap
 * must pick a 15s window (stepper seek; the server cuts the video during the
 * FFmpeg pass) before they can post. Mirrors mWeb's StatusVideoPreviewDialog. */
export function StatusVideoPreviewSheet({ video, onCancel, onConfirm }: Readonly<Props>) {
  return (
    <Modal visible={video !== null} transparent animationType="fade" onRequestClose={onCancel}>
      <ModalThemeScope>
        <YStack flex={1} alignItems="center" justifyContent="center" testID="story-video-sheet">
          <YStack
            role="button"
            aria-label="Close"
            onPress={onCancel}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.6)"
          />
          {video ? <PreviewBody video={video} onCancel={onCancel} onConfirm={onConfirm} /> : null}
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
