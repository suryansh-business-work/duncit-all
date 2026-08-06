import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { EMAIL_CATEGORIES } from '@services/email/email.provider';
import { EmailFragmentModel } from './emailFragment.model';
import { FRAGMENT_DEFAULTS } from './emailFragment.defaults';

/**
 * Header/footer fragments.
 *
 * Nine ship with the product, one per email category, seeded on boot and never
 * deletable — a template that lost its header mid-flight would send bare, and
 * the category list is closed in code so a deleted one could not be seeded
 * back. Beyond those, an admin adds their own and removes them again.
 */

const notFound = (key: string) =>
  new GraphQLError(`No email fragment "${key}"`, { extensions: { code: 'NOT_FOUND' } });
const badInput = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

/** Where the header goes in: just inside the opening `<mj-body …>`. */
function bodyOpenEnd(mjml: string): number {
  const open = mjml.search(/<mj-body\b/i);
  if (open === -1) return -1;
  const close = mjml.indexOf('>', open);
  return close === -1 ? -1 : close + 1;
}

/**
 * Wrap a template's MJML with a fragment's header and footer.
 *
 * The fragments are `<mj-section>`s, so they are injected INSIDE `<mj-body>` —
 * appending them around the whole document would produce two `<mjml>` roots and
 * MJML would silently drop one. A template with no `<mj-body>` is returned
 * untouched rather than mangled: it is not a document this can wrap, and a
 * broken email is worse than an unwrapped one.
 */
export function composeFragment(
  templateMjml: string,
  header: string,
  footer: string
): { mjml: string; wrapped: boolean } {
  const start = bodyOpenEnd(templateMjml);
  const end = templateMjml.toLowerCase().lastIndexOf('</mj-body>');
  if (start === -1 || end === -1 || end < start) return { mjml: templateMjml, wrapped: false };

  const head = header.trim() ? `\n${header}\n` : '';
  const foot = footer.trim() ? `\n${footer}\n` : '';
  if (!head && !foot) return { mjml: templateMjml, wrapped: false };

  const composed =
    templateMjml.slice(0, start) +
    head +
    templateMjml.slice(start, end) +
    foot +
    templateMjml.slice(end);
  return { mjml: composed, wrapped: true };
}

/**
 * A url-safe key from a display name, e.g. "Weekend Banner" → weekend-banner.
 *
 * A single left-to-right pass: `/^-+|-+$/` on arbitrary admin input is the
 * shape that backtracks superlinearly (S8786), and a fragment name is typed by
 * a person into a text box.
 */
function slugify(name: string): string {
  let out = '';
  for (const char of name.toLowerCase()) {
    const safe = /[a-z0-9]/.test(char);
    if (safe) out += char;
    else if (out.length > 0 && !out.endsWith('-')) out += '-';
  }
  while (out.endsWith('-')) out = out.slice(0, -1);
  return out.slice(0, 48) || 'fragment';
}

/** The first free key in the `base`, `base-2`, `base-3` … sequence. */
async function uniqueKey(name: string): Promise<string> {
  const base = slugify(name);
  for (let suffix = 1; suffix < 200; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    if (!(await EmailFragmentModel.exists({ key: candidate }))) return candidate;
  }
  // Two hundred fragments named the same thing is not a naming collision, it is
  // a mistake — but a send must never be what discovers it.
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * Give a fragment written before `key` existed one.
 *
 * The nine were originally keyed by `category` alone. A database seeded by that
 * version has nine rows with no `key`, and `key` is non-nullable in the schema —
 * so the very first read of `emailFragments` fails with "Cannot return null for
 * non-nullable field EmailFragment.key" and the whole page is empty. It also
 * blocks the unique index on `key`, since nine nulls collide.
 *
 * Runs at the top of `seedDefaults`, i.e. on boot, before anything reads them.
 * Written through the raw collection so mongoose's own casting cannot re-apply
 * the defaults that hid the problem.
 */
async function backfillKeys(): Promise<void> {
  const collection = EmailFragmentModel.collection;
  const legacy = await collection
    .find({ $or: [{ key: { $exists: false } }, { key: null }, { key: '' }] })
    .toArray();
  if (legacy.length === 0) return;

  for (const doc of legacy) {
    // The nine take their category as their key, which is what they were
    // identified by; anything else falls back to its name so no row is left
    // unreadable.
    const key = (doc.category as string) || slugify((doc.name as string) ?? 'fragment');
    await collection.updateOne(
      { _id: doc._id },
      { $set: { key, is_system: Boolean(doc.category) } }
    );
  }
  logs.server.info('emailFragment', 'backfillKeys', { updated: legacy.length });
}

/** The nine first, in the code's category order, then the custom ones by name. */
const ORDER = new Map(EMAIL_CATEGORIES.map((c, i) => [c as string, i]));
const rank = (doc: { category: string | null }) =>
  doc.category ? (ORDER.get(doc.category) ?? 99) : 999;

export const emailFragmentService = {
  async list() {
    const docs = await EmailFragmentModel.find().sort({ name: 1 }).exec();
    return docs.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  },

  byKey: (key: string) => EmailFragmentModel.findOne({ key }).exec(),

  /** Add a fragment of your own. It belongs to no category and can be deleted. */
  async create(input: {
    name: string;
    description?: string | null;
    header_mjml?: string | null;
    footer_mjml?: string | null;
  }) {
    const name = input.name?.trim();
    if (!name) throw badInput('A fragment needs a name');
    return EmailFragmentModel.create({
      fragment_id: crypto.randomUUID(),
      key: await uniqueKey(name),
      category: null,
      is_system: false,
      name,
      description: input.description ?? '',
      header_mjml: input.header_mjml ?? '',
      footer_mjml: input.footer_mjml ?? '',
      is_active: true,
    });
  },

  async update(
    key: string,
    input: {
      name?: string;
      description?: string;
      header_mjml?: string;
      footer_mjml?: string;
      is_active?: boolean;
    }
  ) {
    const doc = await EmailFragmentModel.findOneAndUpdate({ key }, { $set: input }, { new: true });
    if (!doc) throw notFound(key);
    return doc;
  },

  /**
   * Delete a fragment an admin added. The nine that ship are refused: they are
   * what every categorised template falls back to.
   *
   * Templates naming it are released rather than left pointing at nothing — a
   * dangling key would render them bare with no way to see why.
   */
  async remove(key: string) {
    const doc = await EmailFragmentModel.findOne({ key });
    if (!doc) return false;
    if (doc.is_system) {
      throw badInput(
        `"${doc.name}" ships with Duncit and cannot be deleted. Switch it off instead.`
      );
    }
    const { EmailTemplateModel } = await import(
      '@modules/content/emailTemplate/emailTemplate.model'
    );
    const released = await EmailTemplateModel.updateMany(
      { fragment_key: key },
      { $set: { fragment_key: null } }
    );
    await EmailFragmentModel.deleteOne({ _id: doc._id });
    logs.server.info('emailFragment', 'remove', {
      key,
      templates_released: released.modifiedCount ?? 0,
    });
    return true;
  },

  /**
   * Restore one of the nine to what it shipped with. The counterpart of not
   * having a delete: an admin who breaks a footer needs a way back.
   */
  async reset(key: string) {
    const seed = FRAGMENT_DEFAULTS.find((f) => f.category === key);
    if (!seed) throw badInput('Only the fragments that ship with Duncit can be reset');
    const doc = await EmailFragmentModel.findOneAndUpdate(
      { key },
      { $set: { header_mjml: seed.header_mjml, footer_mjml: seed.footer_mjml } },
      { new: true }
    );
    if (!doc) throw notFound(key);
    return doc;
  },

  /**
   * Create any of the nine that do not exist yet. Idempotent, and it never
   * touches an existing row — an admin's edits survive every deploy.
   */
  async seedDefaults(): Promise<void> {
    await backfillKeys();
    for (const seed of FRAGMENT_DEFAULTS) {
      await EmailFragmentModel.updateOne(
        { key: seed.category },
        {
          $setOnInsert: {
            ...seed,
            key: seed.category,
            is_system: true,
            fragment_id: crypto.randomUUID(),
            is_active: true,
          },
        },
        { upsert: true }
      ).catch((error) => {
        logs.server.error('emailFragment', 'seedDefaults', { error, key: seed.category });
        return null;
      });
    }
  },

  /**
   * The wrapped MJML for a template, or the template unchanged when it names no
   * fragment, names one that no longer exists, or names one switched off.
   */
  async wrap(templateMjml: string, key?: string | null): Promise<string> {
    if (!key) return templateMjml;
    const fragment = await EmailFragmentModel.findOne({ key }).exec();
    if (!fragment?.is_active) return templateMjml;
    return composeFragment(templateMjml, fragment.header_mjml, fragment.footer_mjml).mjml;
  },
};
