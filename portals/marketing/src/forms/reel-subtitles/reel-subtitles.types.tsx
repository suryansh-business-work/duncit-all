import { z } from 'zod';
import type { Translate } from '@duncit/shell';

/** Which sound to transcribe, and in what language it is spoken. */
export const buildReelSubtitlesSchema = (t: Translate) =>
  z.object({
    asset_id: z.string().min(1, t('ai.reels.voice.subtitlesSourceRequired')),
    language: z.string().trim().min(2, t('ai.reels.voice.languageRequired')),
  });

export interface ReelSubtitlesFormValues {
  asset_id: string;
  language: string;
}

export interface ReelSubtitlesFormProps {
  /** The reel's sound sources: generated voiceovers and clips with sound. Empty means nothing to transcribe. */
  sources: readonly { value: string; label: string }[];
  languages: readonly { value: string; label: string }[];
  defaultLanguage: string;
  submitting: boolean;
  onSubmit: (values: ReelSubtitlesFormValues) => void;
}
