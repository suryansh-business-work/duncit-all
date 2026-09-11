import { isVideoMedia } from '@duncit/utils';

export interface HeroMedia {
  url: string;
  type: string;
}

/** A carousel slide: the media row, plus where its picture sits in the
 * full-screen viewer (`viewerIndex`), which only counts the still images. */
export interface HeroSlide {
  url: string;
  video: boolean;
  viewerIndex: number;
}

/**
 * Turn a pod's or club's cover media into carousel slides.
 *
 * The hero used to keep `type === 'IMAGE'` rows only, so a cover video was
 * dropped on the floor: a pod whose media was one clip rendered the empty
 * calendar placeholder, and mWeb — which has played them all along — showed a
 * different pod than the app did (rule 27). Videos are slides now, and the
 * viewer index is tracked separately because the full-screen viewer still
 * shows pictures alone.
 */
export const heroSlides = (media: readonly HeroMedia[]): HeroSlide[] => {
  let viewerIndex = 0;
  return media
    .filter((m) => !!m.url)
    .map((m) => {
      const video = isVideoMedia(m);
      return { url: m.url, video, viewerIndex: video ? -1 : viewerIndex++ };
    });
};
