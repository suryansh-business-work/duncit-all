/**
 * The LLMs a prompt can be handed to from the AI Library, and how.
 *
 * Each platform opens a new chat pre-filled from a query parameter. Those
 * parameters are what the products themselves use for "share a prompt" links;
 * if one changes, this table is the only place to update.
 *
 * Long prompts do not fit in a URL: browsers and the platforms' own servers
 * start refusing somewhere past a few thousand characters. Past
 * {@link MAX_PREFILL_CHARS} the link opens an empty chat and the caller copies
 * the prompt to the clipboard instead, so the reader pastes it.
 */

export type PromptPlatformId = 'CLAUDE' | 'CHATGPT' | 'GROK' | 'PERPLEXITY';

export interface PromptPlatform {
  id: PromptPlatformId;
  /** Product name — a brand, so it is never translated. */
  name: string;
  /** New-chat address. */
  home: string;
  /** Query parameter the new chat reads its first message from. */
  param: string;
  /**
   * Where the composer is, for the injection script: tried in order, first
   * match wins. A contenteditable editor and a textarea need different writes.
   */
  composer: readonly string[];
}

export const PROMPT_PLATFORMS: readonly PromptPlatform[] = [
  {
    id: 'CLAUDE',
    name: 'Claude',
    home: 'https://claude.ai/new',
    param: 'q',
    composer: ['div.ProseMirror[contenteditable="true"]', '[contenteditable="true"]', 'textarea'],
  },
  {
    id: 'CHATGPT',
    name: 'ChatGPT',
    home: 'https://chatgpt.com/',
    param: 'q',
    composer: ['#prompt-textarea', '[contenteditable="true"]', 'textarea'],
  },
  {
    id: 'GROK',
    name: 'Grok',
    home: 'https://grok.com/',
    param: 'q',
    composer: ['textarea', '[contenteditable="true"]'],
  },
  {
    id: 'PERPLEXITY',
    name: 'Perplexity',
    home: 'https://www.perplexity.ai/search',
    param: 'q',
    composer: ['textarea', '[contenteditable="true"]'],
  },
];

/** Past this many characters a prefilled link is unreliable; copy and paste instead. */
export const MAX_PREFILL_CHARS = 6000;

export const platformById = (id: PromptPlatformId): PromptPlatform => {
  const found = PROMPT_PLATFORMS.find((platform) => platform.id === id);
  // The id type is the table's own keys, so this only fails if the two drift.
  if (!found) throw new Error(`Unknown prompt platform ${id}`);
  return found;
};

export interface PlatformLink {
  url: string;
  /** False when the prompt was too long to ride in the URL: copy it, then open. */
  prefilled: boolean;
}

/** The link that opens `platform` with `text` as the first message, when it fits. */
export function platformLink(platform: PromptPlatform, text: string): PlatformLink {
  if (!text.trim() || text.length > MAX_PREFILL_CHARS) return { url: platform.home, prefilled: false };
  const url = new URL(platform.home);
  url.searchParams.set(platform.param, text);
  return { url: url.toString(), prefilled: true };
}
