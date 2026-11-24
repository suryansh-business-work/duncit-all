import { z } from 'zod';
import type { Translate } from '@duncit/shell';
import { numberIn } from '../reel-live';

/**
 * The export options Remotion's web renderer offers, as far as a reel needs
 * them: the file type and codec, the quality, the resolution, the stretch of
 * the reel to render, sound or none, and how the browser encodes it.
 *
 * Which codec a file type may carry, and which sound codec goes with it, is
 * fixed here — the renderer refuses a mismatched pair only after the operator
 * has waited for it to start, so the form refuses it first.
 */

export const EXPORT_CONTAINERS = ['mp4', 'webm', 'mkv', 'mov', 'mp3', 'wav'] as const;
export type ExportContainer = (typeof EXPORT_CONTAINERS)[number];

export const VIDEO_CODECS = ['h264', 'h265', 'vp9', 'vp8', 'av1'] as const;
export type ExportVideoCodec = (typeof VIDEO_CODECS)[number];

export type ExportAudioCodec = 'aac' | 'opus' | 'mp3' | 'pcm-s16';

export const QUALITIES = ['very-low', 'low', 'medium', 'high', 'very-high'] as const;
export type ExportQuality = (typeof QUALITIES)[number];

export const HARDWARE_MODES = ['no-preference', 'prefer-hardware', 'prefer-software'] as const;
export type ExportHardware = (typeof HARDWARE_MODES)[number];

/** Resolution multipliers of the reel's own frame. */
export const SCALES = ['0.5', '1', '1.5', '2'] as const;

/** The video codecs each file type can carry; an audio-only file carries none. */
export const CODECS_BY_CONTAINER: Readonly<Record<ExportContainer, readonly ExportVideoCodec[]>> = {
  mp4: ['h264', 'h265', 'av1'],
  webm: ['vp9', 'vp8', 'av1'],
  mkv: ['h264', 'h265', 'vp9', 'vp8', 'av1'],
  mov: ['h264', 'h265'],
  mp3: [],
  wav: [],
};

/** The sound codec that goes with each file type. */
export const AUDIO_CODEC_OF: Readonly<Record<ExportContainer, ExportAudioCodec>> = {
  mp4: 'aac',
  mov: 'aac',
  webm: 'opus',
  mkv: 'opus',
  mp3: 'mp3',
  wav: 'pcm-s16',
};

export const MIME_OF: Readonly<Record<ExportContainer, string>> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
};

export const isAudioOnly = (container: ExportContainer): boolean => CODECS_BY_CONTAINER[container].length === 0;

/** The longest keyframe gap offered; past it, seeking in the file gets slow. */
const MAX_KEYFRAME_S = 10;

export const buildReelExportSchema = (t: Translate, durationS: number) =>
  z
    .object({
      container: z.enum(EXPORT_CONTAINERS),
      video_codec: z.enum(VIDEO_CODECS),
      video_quality: z.enum(QUALITIES),
      audio_quality: z.enum(QUALITIES),
      scale: z.enum(SCALES),
      hardware: z.enum(HARDWARE_MODES),
      keyframe_s: numberIn(t, 1, MAX_KEYFRAME_S),
      muted: z.boolean(),
      from_s: numberIn(t, 0, durationS),
      to_s: numberIn(t, 0, durationS),
    })
    .superRefine((values, ctx) => {
      if (!isAudioOnly(values.container) && !CODECS_BY_CONTAINER[values.container].includes(values.video_codec)) {
        ctx.addIssue({ code: 'custom', path: ['video_codec'], message: t('ai.reels.exportOptions.codecMismatch') });
      }
      if (values.to_s <= values.from_s) {
        ctx.addIssue({ code: 'custom', path: ['to_s'], message: t('ai.reels.exportOptions.rangeOrder') });
      }
      if (isAudioOnly(values.container) && values.muted) {
        ctx.addIssue({ code: 'custom', path: ['muted'], message: t('ai.reels.exportOptions.audioMuted') });
      }
    });

export type ReelExportFormValues = z.output<ReturnType<typeof buildReelExportSchema>>;

/** H.264 MP4 at high quality, the whole reel with sound: the file every network accepts. */
export const exportDefaults = (durationS: number): ReelExportFormValues => ({
  container: 'mp4',
  video_codec: 'h264',
  video_quality: 'high',
  audio_quality: 'high',
  scale: '1',
  hardware: 'no-preference',
  keyframe_s: 5,
  muted: false,
  from_s: 0,
  to_s: durationS,
});

/** The options handed to the renderer. */
export interface ReelRenderOptions {
  container: ExportContainer;
  videoCodec: ExportVideoCodec | null;
  audioCodec: ExportAudioCodec | null;
  videoBitrate: ExportQuality;
  audioBitrate: ExportQuality;
  muted: boolean;
  scale: number;
  hardwareAcceleration: ExportHardware;
  keyframeIntervalInSeconds: number;
  /** Null for the whole reel. */
  frameRange: [number, number] | null;
  mimeType: string;
}

/** The form's values as renderer options, the stretch turned into the frames it covers. */
export function toRenderOptions(values: ReelExportFormValues, fps: number, durationInFrames: number): ReelRenderOptions {
  const first = Math.max(0, Math.round(values.from_s * fps));
  const last = Math.min(durationInFrames - 1, Math.max(first, Math.round(values.to_s * fps) - 1));
  const whole = first === 0 && last >= durationInFrames - 1;
  const audioOnly = isAudioOnly(values.container);
  return {
    container: values.container,
    videoCodec: audioOnly ? null : values.video_codec,
    audioCodec: values.muted ? null : AUDIO_CODEC_OF[values.container],
    videoBitrate: values.video_quality,
    audioBitrate: values.audio_quality,
    muted: values.muted,
    scale: Number(values.scale),
    hardwareAcceleration: values.hardware,
    keyframeIntervalInSeconds: values.keyframe_s,
    frameRange: whole ? null : [first, last],
    mimeType: MIME_OF[values.container],
  };
}

export interface ReelExportFormProps {
  open: boolean;
  /** The reel's length in seconds: the stretch to render is chosen within it. */
  durationS: number;
  /** What the operator chose last time, so a second export starts where the first left off. */
  initialValues?: ReelExportFormValues;
  onClose: () => void;
  onSubmit: (values: ReelExportFormValues) => void;
}
