import { z } from 'zod';
import { YOUTUBE_URL } from '@duncit/regex';

import type { Translate } from './translate';

/**
 * A YouTube link an owner pastes beside an uploaded clip — on a venue's videos
 * and on a dish's — checked ONE way on every surface that takes one (the
 * Partners venue form, the Venues console editor, the menu editor and the
 * native desk). The pattern is @duncit/regex's `YOUTUBE_URL`; the server
 * mirrors it (`venue.media.ts`).
 */
export function makeYoutubeLinkSchema(t: Translate) {
  return z.object({
    url: z.string().trim().regex(YOUTUBE_URL, t('venueFoodOwner.videos.youtubeInvalid')),
  });
}

export type YoutubeLinkValues = z.infer<ReturnType<typeof makeYoutubeLinkSchema>>;

export const youtubeLinkDefaults: YoutubeLinkValues = { url: '' };
