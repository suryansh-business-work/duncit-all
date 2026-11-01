import { z } from 'zod';
import type { Translate } from '@duncit/shell';
import { valuesOf } from '../../pages/reels/editor/labels';
import { DEFAULT_VOICE, VOICE_LABEL, type ReelVoice } from '../../pages/reels/studio/create/voices';

/** The longest text the speech model reads in one pass. */
export const MAX_VOICEOVER_LENGTH = 2000;

/** What is spoken, in which voice, in which language. */
export const buildReelVoiceoverSchema = (t: Translate) =>
  z.object({
    text: z
      .string()
      .trim()
      .min(1, t('ai.reels.voice.textRequired'))
      .max(MAX_VOICEOVER_LENGTH, t('ai.reels.voice.textMax', { vars: { max: MAX_VOICEOVER_LENGTH } })),
    voice: z.enum(valuesOf(VOICE_LABEL)),
    language: z.string().trim().min(2, t('ai.reels.voice.languageRequired')),
  });

export interface ReelVoiceoverFormValues {
  text: string;
  voice: ReelVoice;
  language: string;
}

export const reelVoiceoverInitialValues = (text: string, language: string): ReelVoiceoverFormValues => ({
  text,
  voice: DEFAULT_VOICE,
  language,
});

export interface ReelVoiceoverFormProps {
  /** What the box opens with — the script's lines joined, or nothing. */
  initialText?: string;
  languages: readonly { value: string; label: string }[];
  /** The reader's own language, picked before they choose another. */
  defaultLanguage: string;
  submitting: boolean;
  onSubmit: (values: ReelVoiceoverFormValues) => void;
}
