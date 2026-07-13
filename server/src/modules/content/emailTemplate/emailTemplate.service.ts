import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import mjml2html from 'mjml';
import { GraphQLError } from 'graphql';
import { EmailTemplateModel } from './emailTemplate.model';

const DEFAULT_TEMPLATE_SUBJECTS: Record<string, string> = {
  'email-verification-otp': 'Verify your Duncit email',
  'payment-release-approved': 'Payment release approved',
  'venue-slot-request': 'New slot booking request — {{pod_title}}',
};

/** Walk the MJML source and extract every {{ var }} reference. */
export function detectVariables(mjml: string): string[] {
  const set = new Set<string>();
  const re = /{{\s*(\w+)\s*}}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(mjml))) set.add(m[1]);
  return [...set];
}

export function applyVars(source: string, vars: Record<string, string>): string {
  let out = source;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(String.raw`{{\s*${k}\s*}}`, 'g'), v ?? '');
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
/**
 * Directory holding the on-disk MJML templates. This file lives at
 * <root>/modules/content/emailTemplate, so three `..` reach <root> (src in dev,
 * dist in prod) before descending into services/email/templates. The previous
 * two-`..` path resolved to <root>/modules/services/... which never existed, so
 * every first-read disk import silently failed.
 */
const TEMPLATES_DIR = path.join(__dirname, '..', '..', '..', 'services', 'email', 'templates');

async function loadTemplate(slug: string) {
  const existing = await EmailTemplateModel.findOne({ slug });
  if (existing) return existing;

  const filePath = path.join(TEMPLATES_DIR, `${slug}.mjml`);
  if (!fs.existsSync(filePath)) return null;
  const mjml = fs.readFileSync(filePath, 'utf8');
  const created = await EmailTemplateModel.create({
    template_id: crypto.randomUUID(),
    slug,
    name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    subject: DEFAULT_TEMPLATE_SUBJECTS[slug] ?? `Duncit · ${slug}`,
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

  /**
   * Import every on-disk MJML template into the DB so the DB-first render path
   * never has to touch the filesystem in production. Idempotent: existing slugs
   * are left untouched (so admin edits in the editor are never overwritten).
   * Best-effort per file — one bad template must not block the rest.
   */
  async seedDefaults(): Promise<void> {
    if (!fs.existsSync(TEMPLATES_DIR)) return;
    const slugs = fs
      .readdirSync(TEMPLATES_DIR)
      .filter((f) => f.endsWith('.mjml'))
      .map((f) => f.replace(/\.mjml$/, ''));
    for (const slug of slugs) {
      await loadTemplate(slug).catch((err) => {
        console.error(`[emailTemplate.seedDefaults] ${slug} failed:`, err);
        return null;
      });
    }
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
