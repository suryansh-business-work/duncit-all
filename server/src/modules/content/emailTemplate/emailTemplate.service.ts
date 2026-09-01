import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import mjml2html from 'mjml';
import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { EmailTemplateModel } from './emailTemplate.model';
import { TEMPLATE_DEFAULTS, type TemplateDefault } from './emailTemplate.defaults';
import { emailFragmentService } from '@modules/content/emailFragment/emailFragment.service';
import { CATEGORY_NOTE_KEY } from '@modules/content/emailFragment/emailFragment.defaults';
import { TEMPLATE_CATEGORIES, TEMPLATE_FOOTER_NOTES } from '@services/email/template-categories';

const DEFAULT_TEMPLATE_SUBJECTS: Record<string, string> = {
  'email-verification-otp': 'Verify your Duncit email',
  'login-otp': 'Your Duncit sign-in code',
  'payment-release-approved': 'Payment release approved',
  'venue-slot-request': 'New slot booking request — {{pod_title}}',
  'pod-backout-spot-filled': 'Your spot was filled — {{pod_title}}',
  'gift-card-received': '{{sender_name}} sent you a Duncit gift card 🎁',
};

/** Walk the MJML source and extract every {{ var }} reference. */
export function detectVariables(mjml: string): string[] {
  const set = new Set<string>();
  const re = /{{\s*(\w+)\s*}}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(mjml))) set.add(m[1]);
  return [...set];
}

/** Escaped so a var name containing regex metacharacters — such as the dot-path
 * of a translation key like `t:email.podRefund.title` — matches literally
 * instead of letting `.` stand for any character. */
const escapeVarName = (name: string) => name.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

export function applyVars(source: string, vars: Record<string, string>): string {
  let out = source;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(String.raw`{{\s*${escapeVarName(k)}\s*}}`, 'g'), v ?? '');
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

/**
 * The templates that ship as code rather than as a file on disk (rule 28).
 * Checked BEFORE the disk, so a slug that exists in both is the catalogue's —
 * nothing is in both today, and the code copy is the one under review.
 */
const CODE_DEFAULTS = new Map(TEMPLATE_DEFAULTS.map((tpl) => [tpl.slug, tpl]));

/** The on-disk MJML for a slug, in the same shape the code catalogue uses. */
function diskDefault(slug: string): TemplateDefault | null {
  const filePath = path.join(TEMPLATES_DIR, `${slug}.mjml`);
  if (!fs.existsSync(filePath)) return null;
  return {
    slug,
    name: slug.replaceAll('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    description: '',
    subject: DEFAULT_TEMPLATE_SUBJECTS[slug] ?? `Duncit · ${slug}`,
    mjml: fs.readFileSync(filePath, 'utf8'),
  };
}

async function loadTemplate(slug: string) {
  const existing = await EmailTemplateModel.findOne({ slug });
  if (existing) return existing;

  const seed = CODE_DEFAULTS.get(slug) ?? diskDefault(slug);
  if (!seed) return null;
  const created = await EmailTemplateModel.create({
    template_id: crypto.randomUUID(),
    slug,
    name: seed.name,
    description: seed.description,
    subject: seed.subject,
    mjml: seed.mjml,
    // The seeded MJML is a BODY — its header and footer live in the fragment.
    // Without these two a fresh install would render every email with no logo
    // and no footer at all.
    fragment_key: TEMPLATE_CATEGORIES[slug] ?? null,
    footer_note: TEMPLATE_FOOTER_NOTES[slug] ?? '',
    variables: detectVariables(seed.mjml).map((key) => ({ key })),
  });
  return created;
}

/**
 * The sentence the fragment's footer renders.
 *
 * The template's own — every one of them had a different line baked into its
 * MJML, and "you backed out of this pod" is worth more to a reader than "there
 * was activity on your account". Falling back to the category's localized note
 * only when a template has nothing of its own.
 */
function withFooterNote(
  tpl: { footer_note?: string; fragment_key?: string | null },
  vars: Record<string, string>
): Record<string, string> {
  if (vars.footer_note) return vars;
  const own = (tpl.footer_note ?? '').trim();
  // Substituted here, not left to the caller's pass. `footer_note` is added to
  // the map AFTER the `t:` keys, and applyVars walks the map once — so a note
  // written as `{{t:email.policyAcceptance.footer}}` was injected into the
  // footer only once every translation had already been replaced, and shipped
  // to the reader as those literal braces.
  if (own) return { ...vars, footer_note: applyVars(own, vars) };
  const key = CATEGORY_NOTE_KEY[tpl.fragment_key as keyof typeof CATEGORY_NOTE_KEY];
  return { ...vars, footer_note: (key && vars[`t:${key}`]) || '' };
}

/**
 * The ONE way a template body becomes an email.
 *
 * Wrap in the fragment, fill the footer sentence, substitute the variables.
 * Every path goes through this — the send, the editor's preview, the test send,
 * and the disk fallback — because when they each did it themselves they drifted:
 * the preview and the test send forgot `footer_note` and rendered a literal
 * `{{footer_note}}` into the footer of every message an admin looked at.
 */
export async function renderTemplateBody(input: {
  mjml: string;
  fragment_key?: string | null;
  footer_note?: string;
  vars?: Record<string, string>;
}): Promise<{ html: string; errors: string[] }> {
  const vars = input.vars ?? {};
  const source = await emailFragmentService.wrap(input.mjml, input.fragment_key);
  return renderMjml(
    source,
    withFooterNote({ footer_note: input.footer_note, fragment_key: input.fragment_key }, vars)
  );
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
   * Import every shipped template into the DB so the DB-first render path never
   * has to touch the filesystem in production. Idempotent: existing slugs are
   * left untouched (so admin edits in the editor are never overwritten).
   * Best-effort per template — one bad body must not block the rest.
   *
   * The code catalogue is seeded alongside the disk files rather than instead
   * of them: the slugs in it were being SENT with no template to render, so
   * waiting for a first send to import them is what produced a FAILED row and
   * an email nobody received.
   */
  async seedDefaults(): Promise<void> {
    const onDisk = fs.existsSync(TEMPLATES_DIR)
      ? fs
          .readdirSync(TEMPLATES_DIR)
          .filter((f) => f.endsWith('.mjml'))
          .map((f) => f.replace(/\.mjml$/, ''))
      : [];
    const slugs = new Set([...CODE_DEFAULTS.keys(), ...onDisk]);
    for (const slug of slugs) {
      await loadTemplate(slug).catch((err) => {
        logs.server.error('emailTemplate', 'seedDefaults', {
          error: err,
          slug,
          msg: `${slug} failed`,
        });
        return null;
      });
    }
  },

  /**
   * Render a stored template by slug for use from email.service.
   *
   * The body is wrapped in its category's header/footer fragment first, when it
   * names one. A template that names none renders exactly as it did before
   * fragments existed — which is why `fragment_key` defaults to null.
   */
  async render(slug: string, vars: Record<string, string> = {}) {
    const tpl = await loadTemplate(slug);
    if (!tpl) throw new GraphQLError(`Email template '${slug}' not found`);
    const { html, errors } = await renderTemplateBody({
      mjml: tpl.mjml,
      fragment_key: tpl.fragment_key,
      footer_note: tpl.footer_note,
      vars,
    });
    return {
      subject: applyVars(tpl.subject, vars),
      html,
      errors,
    };
  },
};
