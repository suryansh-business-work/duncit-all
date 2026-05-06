import { GraphQLError } from 'graphql';
import { PolicyModel, type IPolicy } from './policy.model';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const toPub = (p: IPolicy) => ({
  id: String(p._id),
  slug: p.slug,
  title: p.title,
  content: p.content || '',
  is_active: p.is_active,
  sort_order: p.sort_order,
  created_at: p.created_at.toISOString(),
  updated_at: p.updated_at.toISOString(),
});

function normaliseSlug(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function assertSlug(slug: string) {
  if (!slug || !SLUG_RE.test(slug)) {
    throw new GraphQLError(
      'Slug must be lowercase letters, numbers and dashes only (e.g. "privacy-policy")',
      { extensions: { code: 'BAD_USER_INPUT' } }
    );
  }
}

export const policyService = {
  async list(filter?: { is_active?: boolean; search?: string }) {
    const q: any = {};
    if (typeof filter?.is_active === 'boolean') q.is_active = filter.is_active;
    if (filter?.search) {
      const r = new RegExp(filter.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ title: r }, { slug: r }];
    }
    const docs = await PolicyModel.find(q).sort({ sort_order: 1, title: 1 });
    return docs.map(toPub);
  },

  async publicList() {
    const docs = await PolicyModel.find({ is_active: true }).sort({ sort_order: 1, title: 1 });
    return docs.map(toPub);
  },

  async getById(id: string) {
    const doc = await PolicyModel.findById(id);
    return doc ? toPub(doc) : null;
  },

  async getBySlug(slug: string) {
    const normalised = normaliseSlug(slug);
    if (!normalised) return null;
    const doc = await PolicyModel.findOne({ slug: normalised });
    return doc ? toPub(doc) : null;
  },

  async create(input: any) {
    if (!input.title?.trim())
      throw new GraphQLError('Title is required', { extensions: { code: 'BAD_USER_INPUT' } });
    const slug = normaliseSlug(input.slug);
    assertSlug(slug);
    const exists = await PolicyModel.findOne({ slug });
    if (exists)
      throw new GraphQLError('A policy with this slug already exists', {
        extensions: { code: 'CONFLICT' },
      });
    const doc = await PolicyModel.create({
      slug,
      title: input.title.trim(),
      content: input.content ?? '',
      is_active: input.is_active ?? true,
      sort_order: input.sort_order ?? 0,
    });
    return toPub(doc);
  },

  async update(id: string, input: any) {
    const doc = await PolicyModel.findById(id);
    if (!doc) throw new GraphQLError('Policy not found', { extensions: { code: 'NOT_FOUND' } });
    if (input.slug !== undefined) {
      const slug = normaliseSlug(input.slug);
      assertSlug(slug);
      if (slug !== doc.slug) {
        const exists = await PolicyModel.findOne({ slug, _id: { $ne: doc._id } });
        if (exists)
          throw new GraphQLError('A policy with this slug already exists', {
            extensions: { code: 'CONFLICT' },
          });
        doc.slug = slug;
      }
    }
    if (input.title !== undefined) {
      if (!input.title.trim())
        throw new GraphQLError('Title is required', { extensions: { code: 'BAD_USER_INPUT' } });
      doc.title = input.title.trim();
    }
    if (input.content !== undefined) doc.content = input.content;
    if (input.is_active !== undefined) doc.is_active = !!input.is_active;
    if (input.sort_order !== undefined) doc.sort_order = Number(input.sort_order) || 0;
    await doc.save();
    return toPub(doc);
  },

  async remove(id: string) {
    const r = await PolicyModel.findByIdAndDelete(id);
    return !!r;
  },

  /**
   * Idempotently seed policies that the app expects to exist (referenced
   * from UI surfaces such as the "Backout Terms & Conditions" link).
   */
  async seedDefaults() {
    const defaults = [
      {
        slug: 'backout-terms',
        title: 'Backout Terms & Conditions',
        content:
          '<h3>Backout Terms &amp; Conditions</h3>' +
          '<p>By backing out of a pod you acknowledge:</p>' +
          '<ul>' +
          '<li>For paid pods, refunds are processed only when the pod reaches the refund threshold ' +
          '(by default 80% capacity) <em>or</em> a referral you share fills your spot.</li>' +
          '<li>Until then, your spot will be held open and your refund stays pending.</li>' +
          '<li>Repeated last-minute backouts may affect your standing on the platform.</li>' +
          '</ul>' +
          '<p>Edit this content from <strong>Admin &rsaquo; Policies &rsaquo; backout-terms</strong>.</p>',
        is_active: true,
        sort_order: 100,
      },
    ];
    for (const p of defaults) {
      const existing = await PolicyModel.findOne({ slug: p.slug });
      if (!existing) await PolicyModel.create(p);
    }
  },
};
