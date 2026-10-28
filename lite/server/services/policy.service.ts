import { SETTING_BOUNDS } from '../../shared/limits';
import { LitePolicyModel, type LitePolicy } from '../models/policy.model';
import type { LiteUserDoc } from '../models/user.model';
import { badInput, notFound } from '../utils/errors';
import { iso } from '../utils/ids';
import { slugify, uniqueSlug } from '../utils/slug';
import { cleanText, wholeNumber } from '../utils/validate';

/** A long policy is a few thousand words of HTML; this leaves room without letting a page grow without bound. */
const MAX_CONTENT = 200_000;
const MAX_TITLE = 120;
/**
 * Markup the editor never produces: refused, so a pasted payload cannot ride
 * along. The site prints a policy's HTML as written, so this is its guard.
 */
const FORBIDDEN_MARKUP = ['<script', '<iframe', '<object', '<embed', '<form', 'javascript:', 'vbscript:', 'data:text/html'];

/** What may stand before an attribute name inside a tag: whitespace, a slash or the end of a quoted value. */
const ATTRIBUTE_SEPARATORS = new Set([' ', '/', '\n', '\t', '\r', '"', "'"]);

const isLetter = (char: string | undefined): boolean => char !== undefined && char >= 'a' && char <= 'z';

/** Does this tag's text (between < and >) carry an on…= attribute? */
function tagHasHandler(tag: string): boolean {
  let at = tag.indexOf('on');
  while (at !== -1) {
    let end = at + 2;
    while (isLetter(tag[end])) end += 1;
    let next = end;
    while (tag[next] === ' ') next += 1;
    if (ATTRIBUTE_SEPARATORS.has(tag[at - 1] ?? '') && end > at + 2 && tag[next] === '=') return true;
    at = tag.indexOf('on', at + 2);
  }
  return false;
}

/** An inline event handler (onerror=, onclick=…) on any tag. Prose between tags is not looked at. */
const hasEventHandler = (lowered: string): boolean => lowered.split('<').some((part) => tagHasHandler(part.split('>')[0] ?? ''));

export interface PolicyInput {
  title?: string | null;
  slug?: string | null;
  content?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
}

type PolicyRow = LitePolicy & { _id: unknown };

const toPolicy = (doc: PolicyRow) => ({
  id: String(doc._id),
  title: doc.title,
  slug: doc.slug,
  content: doc.content ?? '',
  sort_order: doc.sort_order ?? 0,
  is_active: doc.is_active ?? true,
  updated_at: iso(doc.updated_at),
});

function cleanContent(raw: string | null | undefined): string {
  const content = cleanText(raw, MAX_CONTENT, 'Content', true);
  const lowered = content.toLowerCase();
  if (FORBIDDEN_MARKUP.some((marker) => lowered.includes(marker)) || hasEventHandler(lowered)) {
    throw badInput('The policy text cannot hold scripts, frames, forms, embedded objects or event handlers');
  }
  return content;
}

export const policyService = {
  /** The live policies, in the console's order: what the footer links to. */
  async publicList() {
    const docs = await LitePolicyModel.find({ is_active: true }).sort({ sort_order: 1, title: 1 }).select('title slug').lean();
    return docs.map((doc) => ({ id: String(doc._id), title: doc.title, slug: doc.slug }));
  },

  /** One live policy by its link, or null (switched off or never written). */
  async bySlug(slug: string) {
    const doc = await LitePolicyModel.findOne({ slug: String(slug ?? '').toLowerCase(), is_active: true }).lean();
    return doc ? toPolicy(doc) : null;
  },

  async adminList() {
    const docs = await LitePolicyModel.find().sort({ sort_order: 1, title: 1 }).lean();
    return docs.map(toPolicy);
  },

  /** Create (no id) or update a policy; a new or changed link is made unique among policies. */
  async upsert(id: string | null | undefined, input: PolicyInput, admin: LiteUserDoc) {
    const doc = id ? await LitePolicyModel.findById(id) : new LitePolicyModel({});
    if (!doc) throw notFound('Policy');
    doc.title = cleanText(input.title, MAX_TITLE, 'Title', true);
    if (!id || input.slug) {
      const wanted = slugify(input.slug || doc.title);
      const taken = await LitePolicyModel.exists({ slug: wanted, _id: { $ne: doc._id } });
      doc.slug = taken ? await uniqueSlug(wanted, async (s) => Boolean(await LitePolicyModel.exists({ slug: s })), 'policy') : wanted;
    }
    doc.content = cleanContent(input.content);
    doc.sort_order = wholeNumber(input.sort_order ?? doc.sort_order ?? 0, 'Sort order', SETTING_BOUNDS.sortOrder);
    doc.is_active = input.is_active ?? doc.is_active ?? true;
    doc.updated_by = admin._id;
    await doc.save();
    return toPolicy(doc.toObject());
  },

  async remove(id: string) {
    const res = await LitePolicyModel.deleteOne({ _id: id });
    return res.deletedCount > 0;
  },
};
