import { formatDuration } from '@duncit/media-picker';

/**
 * A length of time as a reel shows it: `0:07`, `1:24`. The shared formatter
 * answers nothing for a zero length — right for a file whose length is unknown,
 * wrong for an empty reel, which is exactly zero seconds long.
 */
export const formatReelDuration = (ms: number): string => formatDuration(ms / 1000) || '0:00';
