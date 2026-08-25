import type { Tpl } from './queries';

/**
 * How long after the last keystroke an unsaved draft saves itself.
 *
 * Long enough that typing a sentence is one save rather than twenty, short
 * enough that closing the tab straight after an edit still keeps it.
 */
export const AUTOSAVE_DELAY_MS = 1200;

/** Exactly what `updateEmailTemplate` is sent — see `editableSnapshot`. */
export interface TemplateSnapshot {
  name: string;
  description: string;
  subject: string;
  mjml: string;
  fragment_key: string | null;
  footer_note: string;
  variables: { key: string; description: string; sample: string }[];
  is_active: boolean;
}

/**
 * The fields the editor actually writes, normalised.
 *
 * "Has this changed?" used to compare the whole server object against the
 * draft, which meant `updated_at` — a field the server rewrites on every save
 * and the editor never touches — counted as an edit. With auto-save that is
 * not a cosmetic problem: a draft that can never look clean saves itself
 * forever. Comparing only what is sent makes a saved template identical to the
 * one that comes back.
 */
export function editableSnapshot(tpl: Tpl): TemplateSnapshot {
  return {
    name: tpl.name,
    description: tpl.description ?? '',
    subject: tpl.subject,
    mjml: tpl.mjml,
    fragment_key: tpl.fragment_key ?? null,
    footer_note: tpl.footer_note ?? '',
    variables: tpl.variables.map((v) => ({
      key: v.key,
      description: v.description ?? '',
      sample: v.sample ?? '',
    })),
    is_active: tpl.is_active,
  };
}

/** The sample values a fresh selection preloads into the preview JSON box. */
export function sampleVarsJson(tpl: Tpl): string {
  return JSON.stringify(
    Object.fromEntries(tpl.variables.map((v) => [v.key, v.sample ?? `{{${v.key}}}`])),
    null,
    2
  );
}
