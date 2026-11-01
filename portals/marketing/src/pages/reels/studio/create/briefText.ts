import type { Translate } from '@duncit/shell';
import { briefLengthSeconds, type ReelBriefFormValues } from '../../../../forms/reel-brief';
import { TONE_LABEL } from './voices';

/**
 * The brief as one text for the ideas step: the topic first, then who it is
 * for, how it should feel and how long it runs — each on its own labelled line,
 * in the reader's language, which the writer reads as well as any other.
 */
export function briefText(values: ReelBriefFormValues, t: Translate): string {
  const lines = [values.topic.trim()];
  if (values.audience.trim() !== '') lines.push(t('ai.reels.create.briefAudience', { vars: { audience: values.audience.trim() } }));
  lines.push(t('ai.reels.create.briefTone', { vars: { tone: t(TONE_LABEL[values.tone]) } }));
  lines.push(t('ai.reels.create.briefLength', { vars: { seconds: briefLengthSeconds(values) } }));
  return lines.join('\n');
}

/** The script's lines as one voiceover: what each scene says, in order. */
export const scriptNarration = (scenes: readonly { text: string }[]): string =>
  scenes
    .map((scene) => scene.text.trim())
    .filter((text) => text !== '')
    .join('\n');
