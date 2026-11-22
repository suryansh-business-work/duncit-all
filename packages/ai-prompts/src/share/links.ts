import type { PromptKind } from '../types';

/**
 * The URL that opens one prompt's details in the AI Library. The library page
 * reads `prompt` and opens that prompt; `selectedtab` lands the page on that
 * prompt's kind underneath. Shared by the AI Features table (which links code
 * prompts) and the library's own "Share" action, so both build the same link.
 */
export const libraryPromptPath = (key: string, kind: PromptKind = 'CODE'): string =>
  `/library?selectedtab=${kind}&prompt=${encodeURIComponent(key)}`;

/** The same link, absolute, for pasting to a colleague. */
export const libraryPromptUrl = (portalOrigin: string, key: string, kind: PromptKind = 'CODE'): string =>
  new URL(libraryPromptPath(key, kind), portalOrigin).toString();
