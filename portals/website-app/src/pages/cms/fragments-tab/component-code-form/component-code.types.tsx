import { z } from 'zod';
import type { CmsDraftInput } from '@duncit/gql-types';

/** HTML, or Astro markup (the same markup, checked by the Astro compiler). */
export const MARKUP_MODES = ['html', 'astro'] as const;
export type MarkupMode = (typeof MARKUP_MODES)[number];

/**
 * A component's code. Each field is checked by the server as it is typed (and
 * again on save); this schema only bounds the sizes, like the API does.
 */
export const componentCodeSchema = () =>
  z.object({
    mode: z.enum(MARKUP_MODES),
    html: z.string().max(2_000_000),
    scss: z.string().max(500_000),
    js: z.string().max(500_000),
  });

export type ComponentCodeValues = z.input<ReturnType<typeof componentCodeSchema>>;
export type ComponentCodeOutput = z.output<ReturnType<typeof componentCodeSchema>>;

export interface ComponentDraft {
  project: string;
  html: string;
  css: string;
  scss: string;
  js: string;
}

/** Astro markup is opened in Astro mode: a fence or a directive gives it away. */
const looksLikeAstro = (html: string) => html.trimStart().startsWith('---') || /\s(?:class:list|set:html|client:\w+)=/.test(html);

export const toComponentCodeValues = (draft: ComponentDraft): ComponentCodeValues => ({
  mode: looksLikeAstro(draft.html) ? 'astro' : 'html',
  html: draft.html,
  scss: draft.scss,
  js: draft.js,
});

/**
 * The draft to save. The visual editor's own styles stay as they are; when the
 * markup changed, its stored layout is dropped so it re-reads the new markup
 * the next time it opens.
 */
export function toDraftInput(values: ComponentCodeOutput, draft: ComponentDraft, baseUpdatedAt: string | null): CmsDraftInput {
  return {
    project: values.html === draft.html ? draft.project : '',
    html: values.html,
    css: draft.css,
    scss: values.scss,
    js: values.js,
    base_updated_at: baseUpdatedAt,
  };
}
