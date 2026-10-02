import { z } from 'zod';
import type { ReelMusic } from '@duncit/gql-types';
import type { Translate } from '@duncit/shell';
import { numberIn, toMs, toPercent, toSeconds, toShare } from '../reel-live';

/** The furthest a song's start can be pushed — the server clamps it to the song's real length. */
const MAX_TRIM_SECONDS = 3600;

/** The reel's music: how loud, and where in the song it starts. */
export const buildReelMusicSchema = (t: Translate) =>
  z.object({
    volume_pct: numberIn(t, 0, 100),
    trim_s: numberIn(t, 0, MAX_TRIM_SECONDS),
  });

export type ReelMusicFormValues = z.output<ReturnType<typeof buildReelMusicSchema>>;

export const musicToForm = (music: ReelMusic): ReelMusicFormValues => ({
  volume_pct: toPercent(music.volume),
  trim_s: toSeconds(music.trim_start_ms),
});

export const formToMusic = (values: ReelMusicFormValues): Partial<ReelMusic> => ({
  volume: toShare(values.volume_pct),
  trim_start_ms: toMs(values.trim_s),
});

export interface ReelMusicFormProps {
  music: ReelMusic;
  onChange: (patch: Partial<ReelMusic>) => void;
}
