import crypto from 'node:crypto';
import mjml2html from 'mjml';
import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { EmailTemplateModel } from './emailTemplate.model';
import { TEMPLATE_DEFAULTS, type TemplateDefault } from './emailTemplate.defaults';
import { LEGACY_TEMPLATE_FINGERPRINTS, shippedFingerprint } from './emailTemplate.legacy';
import { emailFragmentService } from '@modules/content/emailFragment/emailFragment.service';
import { CATEGORY_NOTE_KEY } from '@modules/content/emailFragment/emailFragment.defaults';
import { TEMPLATE_CATEGORIES, TEMPLATE_FOOTER_NOTES } from '@services/email/template-categories';

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

/** Every `{{ name }}` the text references, translation keys included. */
const PLACEHOLDER_RE = /{{\s*([^{}\s]+)\s*}}/g;

const referencedVars = (text: string): Set<string> => {
  const names = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER_RE)) names.add(match[1]);
  return names;
};

/**
 * Substitute the variables a text actually references.
 *
 * `vars` carries the WHOLE translation catalogue — thousands of `t:` keys — on
 * every send, and this used to compile a regex and walk the full document once
 * per key, so a one-time code paid a few hundred milliseconds of CPU before a
 * single byte reached the mail server. Scanning the text for its placeholders
 * first turns that into one pass plus a replace per key that is really there.
 *
 * Substitution repeats while a value introduces a placeholder of its own — a
 * footer note is itself written as `{{t:email.footer.account}}`, and a
 * sentence of copy can carry `{{app_name}}` — so the result depends neither on
 * the order the map was assembled in nor on whether that same placeholder was
 * already filled somewhere else in the document on an earlier pass. The pass
 * cap is what stops a value that names itself from looping.
 */
export function applyVars(source: string, vars: Record<string, string>): string {
  let out = source;
  for (let pass = 0; pass < 4; pass += 1) {
    const pending = [...referencedVars(out)].filter((k) => k in vars);
    if (pending.length === 0) break;
    for (const k of pending) {
      out = out.replace(new RegExp(String.raw`{{\s*${escapeVarName(k)}\s*}}`, 'g'), vars[k] ?? '');
    }
  }
  return out;
}

/**
 * Compile one MJML document to HTML.
 *
 * AWAITED, because mjml2html is asynchronous. It became so in mjml 5 and this
 * file went on calling it as though it were not — a cast to a hand-written
 * `{ html?: string }` shape hid the Promise from the compiler, so every render
 * read `html` off a Promise, got `undefined`, and carried on. That is the whole
 * of what the email system was doing wrong: the send path handed `undefined` to
 * the logo swap and logged "Cannot read properties of undefined (reading
 * 'split')", the editor's preview answered "Cannot return null for non-nullable
 * field EmailTemplateRender.html", and once that crash was guarded both
 * surfaces settled on the honest but useless "MJML produced no output".
 *
 * The cast is gone with it. `MJMLParseResults` is what the package declares, so
 * the next major that changes this signature fails `tsc` here instead of
 * shipping empty emails.
 */
/**
 * Compiled HTML per MJML source, keyed on the source's hash.
 *
 * The placeholders are left in through the compile and filled in afterwards,
 * which is what makes the output reusable: a template's markup is the same on
 * every send and only the values differ, so the compile — the slowest step on
 * the way to the mail server — runs once per template edit instead of once per
 * message. A template or fragment saved in the editor is new source, hence a
 * new key; the map is capped so a preview loop cannot grow it without bound.
 */
const COMPILE_CACHE_MAX = 64;
const compiled = new Map<string, { html: string; errors: string[] }>();

async function compileMjml(source: string): Promise<{ html: string; errors: string[] }> {
  const key = crypto.createHash('sha256').update(source).digest('hex');
  const hit = compiled.get(key);
  if (hit) return hit;
  let result: { html: string; errors: string[] };
  try {
    // `soft` validation COLLECTS problems instead of throwing, so a body mjml
    // cannot build anything from does not reach the catch below — it returns
    // with no `html` at all.
    const out = await mjml2html(source, { validationLevel: 'soft' });
    const errors = (out.errors ?? []).map(
      (e) => e.formattedMessage || e.message || 'Unknown MJML error'
    );
    // Nothing rendered AND nothing said why is the worst pair: the preview
    // looks merely blank, and a send goes out empty in silence. Name it, so
    // the editor shows a reason and the send paths that check `errors` stop.
    // `|| ''` rather than the declared type alone — trusting that declaration
    // is what produced this bug, and `html: String!` must never receive null.
    const html = out.html || '';
    if (!html && errors.length === 0) errors.push('MJML produced no output');
    result = { html, errors };
  } catch (e: any) {
    result = { html: '', errors: [e.message || String(e)] };
  }
  if (compiled.size >= COMPILE_CACHE_MAX) {
    const oldest = compiled.keys().next().value;
    if (oldest !== undefined) compiled.delete(oldest);
  }
  compiled.set(key, result);
  return result;
}

export async function renderMjml(
  mjml: string,
  vars: Record<string, string> = {}
): Promise<{ html: string; errors: string[] }> {
  const { html, errors } = await compileMjml(mjml);
  return { html: html ? applyVars(html, vars) : '', errors };
}

/**
 * Every template Duncit ships, by slug — all of them code (rule 28: there are
 * no `.mjml` files on disk). Seeded into the database on boot and on a slug's
 * first use; from then on the stored row is what Communications > Emails >
 * Templates edits and what every send renders.
 */
const CODE_DEFAULTS = new Map(TEMPLATE_DEFAULTS.map((tpl) => [tpl.slug, tpl]));

/** The shipped default for a slug — the body a database outage falls back to. */
export const shippedDefault = (slug: string): TemplateDefault | undefined => CODE_DEFAULTS.get(slug);

/**
 * A subject with its icons taken out, for recognising an untouched one.
 * The shipped subjects used to end in an emoji; rule 22 took them out.
 */
const withoutIcons = (subject: string): string =>
  subject.replaceAll(/\p{Extended_Pictographic}|️/gu, '').replaceAll(/\s+/g, ' ').trim();

/**
 * Is a stored subject one Duncit wrote rather than an admin — the shipped one
 * with its old emoji, or the `Duncit · <slug>` placeholder the on-disk import
 * gave every template that had no subject of its own.
 */
function isShippedSubject(slug: string, stored: string, shipped: string): boolean {
  if (stored === shipped) return false;
  return stored === `Duncit · ${slug}` || withoutIcons(stored) === withoutIcons(shipped);
}

interface StoredBody {
  slug: string;
  mjml: string;
  subject: string;
  variables?: { key: string }[];
}

/**
 * Bring one stored row onto its shipped default, if nobody has edited it.
 *
 * `current` — already the shipped body. `edited` — not any body Duncit ever
 * shipped, so an admin's, and left alone. `upgraded` — an old default, now
 * replaced. The subject moves only when it is a shipped one too.
 */
async function upgradeRow(row: StoredBody): Promise<'current' | 'edited' | 'upgraded' | 'raced'> {
  const seed = CODE_DEFAULTS.get(row.slug);
  const current = shippedFingerprint(row.mjml);
  if (!seed || current === shippedFingerprint(seed.mjml)) return 'current';
  if (!LEGACY_TEMPLATE_FINGERPRINTS[row.slug]?.includes(current)) return 'edited';

  const known = new Set((row.variables ?? []).map((variable) => variable.key));
  const added = detectVariables(seed.mjml)
    .filter((key) => !known.has(key))
    .map((key) => ({ key }));
  const subject = isShippedSubject(row.slug, row.subject, seed.subject) ? { subject: seed.subject } : {};
  const result = await EmailTemplateModel.updateOne(
    { slug: row.slug, mjml: row.mjml },
    {
      $set: { mjml: seed.mjml, ...subject },
      ...(added.length ? { $push: { variables: { $each: added } } } : {}),
    }
  ).catch((error) => {
    logs.server.error('emailTemplate', 'upgradeShippedDefaults', { error, slug: row.slug });
    return null;
  });
  // Nothing modified means the body changed between the read and the write —
  // an admin saved in that moment, or another instance got there first.
  return result?.modifiedCount ? 'upgraded' : 'raced';
}

/** Find a template by slug, creating it from its shipped default on first use. */
async function loadTemplate(slug: string) {
  const existing = await EmailTemplateModel.findOne({ slug });
  if (existing) return existing;

  const seed = CODE_DEFAULTS.get(slug);
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
   * Create every shipped template the database does not have yet, then bring
   * the untouched ones up to the current design. Idempotent, and best-effort
   * per template — one bad body must not block the rest.
   *
   * Seeded at boot rather than on a slug's first send: a slug that was SENT
   * with no template to render produced a FAILED row and an email nobody
   * received.
   */
  async seedDefaults(): Promise<void> {
    await Promise.all(
      [...CODE_DEFAULTS.keys()].map((slug) =>
        loadTemplate(slug).catch((err) => {
          logs.server.error('emailTemplate', 'seedDefaults', {
            error: err,
            slug,
            msg: `${slug} failed`,
          });
          return null;
        })
      )
    );
    await emailTemplateService.upgradeShippedDefaults();
  },

  /**
   * Move every stored template still holding an OLD shipped body onto the new
   * one — and leave every template an admin has edited exactly as it is.
   *
   * "Untouched" is decided by fingerprint, never by date: a stored body that
   * matches one of `LEGACY_TEMPLATE_FINGERPRINTS[slug]` is a default nobody
   * changed, so replacing it loses nothing. Anything else was typed by
   * somebody in the editor, and the seed's promise is that it survives every
   * deploy. The write is conditional on the body still being the one that was
   * read, so two instances booting together cannot race an admin's save.
   */
  async upgradeShippedDefaults(): Promise<{ upgraded: string[]; kept: string[] }> {
    const stored = await EmailTemplateModel.find(
      { slug: { $in: [...CODE_DEFAULTS.keys()] } },
      { slug: 1, mjml: 1, subject: 1, variables: 1 }
    ).lean();
    const outcomes = await Promise.all(
      stored.map(async (row) => ({ slug: row.slug, outcome: await upgradeRow(row) }))
    );
    const upgraded = outcomes.filter((o) => o.outcome === 'upgraded').map((o) => o.slug);
    const kept = outcomes.filter((o) => o.outcome === 'edited').map((o) => o.slug);
    if (upgraded.length || kept.length) {
      logs.server.info('emailTemplate', 'upgradeShippedDefaults', {
        upgraded: upgraded.length,
        kept_edited: kept,
        msg: `${upgraded.length} template(s) moved to the new design; ${kept.length} edited by an admin and left as they are`,
      });
    }
    return { upgraded, kept };
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
