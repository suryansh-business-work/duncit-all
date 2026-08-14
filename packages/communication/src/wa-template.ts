/**
 * What an AiSensy campaign and template look like, and how to read a template
 * body — shared because three surfaces answer the same questions about them.
 *
 * These shapes existed as three separate copies: the server's Project-API
 * reader, the Marketing portal's queries, and the Tech portal's AiSensy page.
 * The `{{n}}` parser existed twice, written two different ways. Rule 40 puts
 * anything used in more than two places here.
 *
 * The server MIRRORS this file rather than importing it (`server/src` takes no
 * `@duncit/*` dependency, so the Docker image stays self-contained) — change
 * one, change the other.
 */

/** Meta's own template category, which is what AiSensy bills against. */
export type WaTemplateCategory = 'UTILITY' | 'MARKETING' | 'AUTHENTICATION' | 'SERVICE';

export const WA_TEMPLATE_CATEGORIES: readonly WaTemplateCategory[] = [
  'UTILITY',
  'MARKETING',
  'AUTHENTICATION',
  'SERVICE',
];

/** What a header carries. Empty when the template has no header at all. */
export type WaHeaderFormat = '' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';

/** A template AiSensy holds for the project. */
export interface AisensyTemplate {
  name: string;
  status: string;
  category: string;
  language: string;
  /** The BODY text, with its `{{1}}` placeholders intact. */
  body: string;
  /** How many placeholders the body expects — the length a send must match. */
  param_count: number;
  /** The HEADER component's text. Empty for a media header or no header. */
  header: string;
  /** TEXT, IMAGE, VIDEO, DOCUMENT — empty when there is no header. */
  header_format: string;
  footer: string;
  /** Button labels, in the order WhatsApp stacks them. */
  buttons: string[];
}

/** A campaign, which is the name a send is addressed to. */
export interface AisensyCampaign {
  name: string;
  status: string;
  template_name: string;
  type: string;
}

/** A header image or document, supplied per send. AiSensy requires the URL to
 * be publicly reachable — it fetches the asset itself and rejects the send
 * otherwise. */
export interface WaMediaRef {
  url: string;
  filename: string;
}

const PLACEHOLDER = /\{\{(\d+)\}\}/g;

/**
 * How many placeholders a body declares.
 *
 * The HIGHEST `{{n}}`, not the count of them: a body that says `{{2}}` twice
 * and never says `{{3}}` still needs a 2-long array, and one that jumps from
 * `{{1}}` to `{{3}}` needs 3 — AiSensy fills positionally, so the gap is a slot
 * that must still be sent.
 */
export function templateParamCount(body: string): number {
  let highest = 0;
  for (const [, digits] of String(body ?? '').matchAll(PLACEHOLDER)) {
    highest = Math.max(highest, Number(digits));
  }
  return highest;
}

/** One piece of a body: literal text, or the placeholder between the text. */
export interface WaBodySegment {
  text: string;
  /** The `n` of `{{n}}`, or 0 when this piece is literal text. */
  placeholder: number;
}

/**
 * A body split into text and placeholders, so a preview can render the real
 * values in place without a second parser on the client.
 */
export function templateSegments(body: string): WaBodySegment[] {
  const source = String(body ?? '');
  const segments: WaBodySegment[] = [];
  let cursor = 0;
  for (const match of source.matchAll(PLACEHOLDER)) {
    const at = match.index ?? 0;
    if (at > cursor) segments.push({ text: source.slice(cursor, at), placeholder: 0 });
    segments.push({ text: match[0], placeholder: Number(match[1]) });
    cursor = at + match[0].length;
  }
  if (cursor < source.length) segments.push({ text: source.slice(cursor), placeholder: 0 });
  return segments;
}

/** The body with its placeholders filled — what the recipient will read. */
export function renderTemplateBody(body: string, params: readonly string[]): string {
  return templateSegments(body)
    .map((segment) => (segment.placeholder === 0 ? segment.text : (params[segment.placeholder - 1] ?? segment.text)))
    .join('');
}

/** Why a set of params cannot be sent against a template, or null when it can. */
export function templateParamError(
  params: readonly string[],
  expected: number
): string | null {
  if (params.length !== expected) {
    return `This template takes ${expected} value(s); ${params.length} were given.`;
  }
  const blank = params.findIndex((value) => !String(value ?? '').trim());
  if (blank >= 0) {
    return `Value ${blank + 1} is empty — WhatsApp renders a blank there.`;
  }
  return null;
}
