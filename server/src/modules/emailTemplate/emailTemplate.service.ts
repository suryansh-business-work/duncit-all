import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import mjml2html from 'mjml';
import { GraphQLError } from 'graphql';
import { EmailTemplateModel } from './emailTemplate.model';

/** Walk the MJML source and extract every {{ var }} reference. */
export function detectVariables(mjml: string): string[] {
  const set = new Set<string>();
  const re = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(mjml))) set.add(m[1]);
  return [...set];
}

export function applyVars(source: string, vars: Record<string, string>): string {
  let out = source;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), v ?? '');
  }
  return out;
}

export function renderMjml(
  mjml: string,
  vars: Record<string, string> = {}
): { html: string; errors: string[] } {
  const expanded = applyVars(mjml, vars);
  try {
    const result = mjml2html(expanded, { validationLevel: 'soft' }) as unknown as {
      html: string;
      errors: { formattedMessage?: string; message?: string }[];
    };
    return {
      html: result.html,
      errors: (result.errors || []).map(
        (e) => e.formattedMessage || e.message || 'Unknown MJML error'
      ),
    };
  } catch (e: any) {
    return { html: '', errors: [e.message || String(e)] };
  }
}

/**
 * Find a template by slug in the database. If it doesn't exist yet we fall
 * back to the on-disk MJML file so first-run sends still work before an admin
 * has visited the editor. The disk version is auto-imported to the DB on
 * first read so it can be edited in the UI from then on.
 */
async function loadTemplate(slug: string) {
  const existing = await EmailTemplateModel.findOne({ slug });
  if (existing) return existing;

  const filePath = path.join(
    __dirname,
    '..',
    '..',
    'services',
    'email',
    'templates',
    `${slug}.mjml`
  );
  if (!fs.existsSync(filePath)) return null;
  const mjml = fs.readFileSync(filePath, 'utf8');
  const created = await EmailTemplateModel.create({
    template_id: crypto.randomUUID(),
    slug,
    name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    subject: `Duncit · ${slug}`,
    mjml,
    variables: detectVariables(mjml).map((key) => ({ key })),
  });
  return created;
}

export const emailTemplateService = {
  list: () => EmailTemplateModel.find().sort({ slug: 1 }).exec(),
  byId: (template_id: string) => EmailTemplateModel.findOne({ template_id }).exec(),
  bySlug: (slug: string) => loadTemplate(slug),

  async create(input: any) {
    if (await EmailTemplateModel.findOne({ slug: input.slug }))
      throw new GraphQLError('Slug already exists', {
        extensions: { code: 'CONFLICT' },
      });
    return EmailTemplateModel.create({
      ...input,
      template_id: crypto.randomUUID(),
    });
  },

  async update(template_id: string, input: any) {
    const doc = await EmailTemplateModel.findOneAndUpdate(
      { template_id },
      { $set: input },
      { new: true }
    );
    if (!doc) throw new GraphQLError('Template not found', { extensions: { code: 'NOT_FOUND' } });
    return doc;
  },

  async delete(template_id: string) {
    const r = await EmailTemplateModel.deleteOne({ template_id });
    return r.deletedCount > 0;
  },

  /** Render a stored template by slug for use from email.service. */
  async render(slug: string, vars: Record<string, string> = {}) {
    const tpl = await loadTemplate(slug);
    if (!tpl) throw new GraphQLError(`Email template '${slug}' not found`);
    const { html, errors } = renderMjml(tpl.mjml, vars);
    return {
      subject: applyVars(tpl.subject, vars),
      html,
      errors,
    };
  },
};
