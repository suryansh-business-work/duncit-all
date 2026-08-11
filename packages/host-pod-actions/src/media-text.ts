import type { HostPodMedia } from './types';

const VIDEO_URL_RE = /\.(mp4|mov|webm)$/i;

/** The non-empty, trimmed lines of a newline-joined URL field. */
export const splitMediaLines = (text: string): string[] =>
  text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

/** True when the field carries at least one line at all (image or video). */
export const hasMediaLine = (text: string): boolean => splitMediaLines(text).length > 0;

/** True when at least one line is an image — a pod's cover cannot be a video. */
export const hasImageLine = (text: string): boolean =>
  splitMediaLines(text).some((url) => !VIDEO_URL_RE.test(url));

/** The media field's lines as the server's PodMediaInput list. */
export const mediaTextToInput = (text: string): HostPodMedia[] =>
  splitMediaLines(text).map((url) => ({
    url,
    type: VIDEO_URL_RE.test(url) ? 'VIDEO' : 'IMAGE',
  }));

/** The pod's stored media as the newline-joined field value. */
export const mediaToText = (media?: HostPodMedia[] | null): string =>
  (media ?? []).map((item) => item.url).join('\n');
