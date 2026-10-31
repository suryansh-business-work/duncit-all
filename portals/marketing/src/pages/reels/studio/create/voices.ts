import { localeOptions, type useTranslation } from '@duncit/app-settings';

/** A workspace locale, as the translation hook lists them. */
type Locale = ReturnType<typeof useTranslation>['locales'][number];

/**
 * The voices the speech model offers. These are the provider's own voice ids —
 * what `generateReelVoiceover` is handed — labelled here so the picker can say
 * what each sounds like.
 */
export type ReelVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export const VOICE_LABEL: Readonly<Record<ReelVoice, string>> = {
  alloy: 'ai.reels.voice.voiceAlloy',
  echo: 'ai.reels.voice.voiceEcho',
  fable: 'ai.reels.voice.voiceFable',
  onyx: 'ai.reels.voice.voiceOnyx',
  nova: 'ai.reels.voice.voiceNova',
  shimmer: 'ai.reels.voice.voiceShimmer',
};

export const DEFAULT_VOICE: ReelVoice = 'alloy';

/** The tone a script is written in — the words the model is given. */
export type ReelTone = 'ENERGETIC' | 'CALM' | 'PLAYFUL' | 'INSPIRING' | 'INFORMATIVE';

export const TONE_LABEL: Readonly<Record<ReelTone, string>> = {
  ENERGETIC: 'ai.reels.create.toneEnergetic',
  CALM: 'ai.reels.create.toneCalm',
  PLAYFUL: 'ai.reels.create.tonePlayful',
  INSPIRING: 'ai.reels.create.toneInspiring',
  INFORMATIVE: 'ai.reels.create.toneInformative',
};

/** The lengths a reel is written for, in seconds. */
export const REEL_LENGTHS_S = [15, 30, 45, 60] as const;
export type ReelLengthS = (typeof REEL_LENGTHS_S)[number];

/**
 * The languages a voiceover or subtitles can be made in: the workspace's own
 * locales when the admin has set them up, else every language the platform
 * knows. Labelled in English, the way admin lists are.
 */
export function languageOptions(locales: readonly Locale[]): { value: string; label: string }[] {
  const source = locales.length > 0 ? locales : localeOptions();
  return source.map((locale) => ({ value: locale.code, label: locale.english_label || locale.label }));
}
