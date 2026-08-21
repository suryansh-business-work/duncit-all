import type { AiPrompt } from './types';

/**
 * The text one prompt row is searched against.
 *
 * The body is in here on purpose: the question an operator actually arrives
 * with is "which prompt is the one that says X" — they remember a sentence, not
 * a row name.
 */
export const promptSearchText = (p: AiPrompt): string =>
  [p.name, p.key ?? '', p.category, p.description ?? '', p.target_model, p.content].join(' ');
