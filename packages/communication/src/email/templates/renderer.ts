import { EmailTemplateError } from '../errors';

/**
 * Template rendering.
 *
 * Deliberately an INTERFACE with a small default behind it. Duncit's server
 * renders MJML out of Mongo so an admin can edit a template without a deploy;
 * a script wants a string in a constant. Both are "give me html for this name
 * and these variables", so both implement {@link EmailTemplateRenderer} and the
 * channel never learns which it has.
 */

/** A rendered message. `subject` overrides the caller's when the template sets one. */
export interface RenderedEmail {
  html: string;
  text?: string;
  subject?: string;
}

export interface EmailTemplateRenderer {
  /** Throws an {@link EmailTemplateError} when the template is missing or broken. */
  render(template: string, variables: Record<string, unknown>): Promise<RenderedEmail>;
}

/** A template held in memory: HTML with `{{name}}` placeholders. */
export interface EmailTemplateDefinition {
  html: string;
  text?: string;
  subject?: string;
}

const PLACEHOLDER = /\{\{\s*([\w.]+)\s*\}\}/g;

/**
 * Fill `{{name}}` placeholders. Dotted names read into nested objects, so a
 * template can say `{{booking.id}}` without the caller flattening first.
 *
 * A placeholder with no value renders EMPTY rather than leaving `{{name}}` in
 * the message — a customer seeing raw template syntax is worse than a gap, and
 * the gap is what a missing-variable test catches.
 */
export function applyVariables(source: string, variables: Record<string, unknown>): string {
  return source.replace(PLACEHOLDER, (_match, path: string) => {
    const value = path
      .split('.')
      .reduce<unknown>(
        (node, key) =>
          node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined,
        variables,
      );
    if (value === undefined || value === null) return '';
    return String(value);
  });
}

/**
 * The default renderer: a plain map of templates, filled with
 * {@link applyVariables}. Enough for a script or a test; a host with its own
 * template store implements the interface instead.
 */
export class InMemoryTemplateRenderer implements EmailTemplateRenderer {
  constructor(private readonly templates: Record<string, EmailTemplateDefinition>) {}

  async render(template: string, variables: Record<string, unknown>): Promise<RenderedEmail> {
    const found = this.templates[template];
    if (!found) {
      throw new EmailTemplateError(`No template registered under "${template}"`, template);
    }
    return {
      html: applyVariables(found.html, variables),
      text: found.text === undefined ? undefined : applyVariables(found.text, variables),
      subject: found.subject === undefined ? undefined : applyVariables(found.subject, variables),
    };
  }
}
