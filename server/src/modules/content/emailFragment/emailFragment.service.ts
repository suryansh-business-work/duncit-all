import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { EMAIL_CATEGORIES, type EmailCategory } from '@services/email/email.provider';
import { EmailFragmentModel } from './emailFragment.model';
import { FRAGMENT_DEFAULTS } from './emailFragment.defaults';

/**
 * Header/footer fragments — nine, one per email category, editable and
 * undeletable. There is no create and no delete on purpose: the categories are
 * a closed set in the code, so a tenth fragment could never be reached and a
 * deleted one would leave its templates unwrapped with no way back.
 */

const notFound = (category: string) =>
  new GraphQLError(`No email fragment for category '${category}'`, {
    extensions: { code: 'NOT_FOUND' },
  });

const CATEGORIES = new Set<string>(EMAIL_CATEGORIES);

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

export const emailFragmentService = {
  /** All nine, in the code's category order rather than alphabetically. */
  async list() {
    const docs = await EmailFragmentModel.find().exec();
    const byCategory = new Map(docs.map((doc) => [doc.category, doc]));
    return EMAIL_CATEGORIES.map((category) => byCategory.get(category)).filter(Boolean);
  },

  byCategory: (category: string) => EmailFragmentModel.findOne({ category }).exec(),

  async update(
    category: string,
    input: {
      name?: string;
      description?: string;
      header_mjml?: string;
      footer_mjml?: string;
      is_active?: boolean;
    }
  ) {
    if (!CATEGORIES.has(category)) throw notFound(category);
    const doc = await EmailFragmentModel.findOneAndUpdate(
      { category },
      { $set: input },
      { new: true }
    );
    if (!doc) throw notFound(category);
    return doc;
  },

  /**
   * Restore one fragment to what it shipped with. The counterpart of not having
   * a delete: an admin who breaks a footer needs a way back that does not
   * involve losing the row.
   */
  async reset(category: string) {
    const seed = FRAGMENT_DEFAULTS.find((f) => f.category === category);
    if (!seed) throw notFound(category);
    const doc = await EmailFragmentModel.findOneAndUpdate(
      { category },
      { $set: { header_mjml: seed.header_mjml, footer_mjml: seed.footer_mjml } },
      { new: true }
    );
    if (!doc) throw notFound(category);
    return doc;
  },

  /**
   * Create any of the nine that do not exist yet. Idempotent, and it never
   * touches an existing row — an admin's edits survive every deploy.
   */
  async seedDefaults(): Promise<void> {
    for (const seed of FRAGMENT_DEFAULTS) {
      await EmailFragmentModel.updateOne(
        { category: seed.category },
        { $setOnInsert: { ...seed, fragment_id: crypto.randomUUID(), is_active: true } },
        { upsert: true }
      ).catch((error) => {
        logs.server.error('emailFragment', 'seedDefaults', { error, category: seed.category });
        return null;
      });
    }
  },

  /**
   * The wrapped MJML for a template, or the template unchanged when it names no
   * fragment or that fragment is switched off.
   */
  async wrap(templateMjml: string, category?: EmailCategory | string | null): Promise<string> {
    if (!category) return templateMjml;
    const fragment = await EmailFragmentModel.findOne({ category }).exec();
    if (!fragment?.is_active) return templateMjml;
    return composeFragment(templateMjml, fragment.header_mjml, fragment.footer_mjml).mjml;
  },
};
