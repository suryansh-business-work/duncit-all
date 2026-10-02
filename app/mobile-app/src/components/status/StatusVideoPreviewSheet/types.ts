import type { VideoTrim } from '@/services/video-compression';

/** Story videos are short clips — capped at 15s (Bug 3). */
export const MAX_STORY_VIDEO_SECONDS = 15;

export interface PendingStoryVideo {
  uri: string;
  durationSeconds: number;
}

export interface StatusVideoPreviewSheetProps {
  video: PendingStoryVideo | null;
  onCancel: () => void;
  /** `trim` is null when the clip already fits the 15s cap. */
  onConfirm: (trim: VideoTrim | null) => void;
}
