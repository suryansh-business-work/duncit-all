import { GraphQLError } from 'graphql';
import { PolicyModel, type IPolicy } from './policy.model';
import { nextEntityNo } from '@modules/venues/entityIdCounter';
import {
  applyTableQueryInMemory,
  runTableQuery,
  type TableEntityConfig,
  type TableQueryInput,
} from '@utils/table-query';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const toPub = (p: IPolicy) => ({
  id: String(p._id),
  policy_no: p.policy_no ?? '',
  slug: p.slug,
  title: p.title,
  policy_type: p.policy_type || '',
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

/** Allowlists for the shared table engine (policiesTable — DUNCIT TABLE CONTRACT v1). */
const POLICY_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['policy_no', 'title', 'slug', 'policy_type'],
  sortFields: {
    policy_no: 'policy_no',
    title: 'title',
    slug: 'slug',
    policy_type: 'policy_type',
    sort_order: 'sort_order',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    is_active: { type: 'boolean' },
    policy_no: { type: 'string' },
    slug: { type: 'string' },
    policy_type: { type: 'string' },
    sort_order: { type: 'number' },
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
  },
  defaultSort: { sort_order: 1, title: 1 },
};

/**
 * Allowlists for the by-type aggregate, mirroring the legal-document one so the
 * two dashboard sections sort, search and filter identically.
 */
const POLICY_STATS_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['policy_type'],
  sortFields: { policy_type: 'policy_type', count: 'count' },
  filterFields: {
    policy_type: { type: 'string' },
    count: { type: 'number' },
  },
  defaultSort: { count: -1 },
};

export const policyService = {
  async list(filter?: { is_active?: boolean; search?: string }) {
    const q: any = {};
    if (typeof filter?.is_active === 'boolean') q.is_active = filter.is_active;
    if (filter?.search) {
      const r = new RegExp(filter.search.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'i');
      q.$or = [{ title: r }, { slug: r }];
    }
    const docs = await PolicyModel.find(q).sort({ sort_order: 1, title: 1 });
    return docs.map(toPub);
  },

  /** Server-side table page (search/filter/sort/paginate) for the policiesTable query. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IPolicy>(
      PolicyModel,
      {},
      input,
      POLICY_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  /**
   * How many policies there are, and how they split by type.
   *
   * Counted from the policies themselves rather than from a list of types, so
   * it cannot drift: a policy created, retyped or deleted changes this answer
   * on the next read, and a type nobody uses simply does not appear — the same
   * behaviour the Documents by Type section has always had.
   */
  async stats() {
    const total = await PolicyModel.estimatedDocumentCount();
    const grouped = await PolicyModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$policy_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return {
      total,
      by_type: grouped.map((g) => ({ policy_type: g._id || 'Other', count: g.count })),
    };
  },

  /** In-memory table page over the computed by-type aggregate (policyStatsTable). */
  async statsTable(input?: TableQueryInput | null) {
    const { by_type } = await this.stats();
    return applyTableQueryInMemory(by_type, input, POLICY_STATS_TABLE_CONFIG);
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
      policy_type: (input.policy_type ?? '').trim(),
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
    if (input.policy_type !== undefined) doc.policy_type = String(input.policy_type ?? '').trim();
    if (input.content !== undefined) doc.content = input.content;
    if (input.is_active !== undefined) doc.is_active = !!input.is_active;
    if (input.sort_order !== undefined) doc.sort_order = Number(input.sort_order) || 0;
    await doc.save();
    return toPub(doc);
  },


  /**
   * Give an id to any record that has none.
   *
   * The hook that mints them fires on INSERT, so anything written before the
   * id existed keeps a blank one for good — a dash in the column meant to be
   * its permanent handle. Idempotent, and it only looks for the missing.
   */
  async backfillIds(): Promise<{ repaired: number }> {
    const idless = await PolicyModel.find({
      $or: [{ policy_no: null }, { policy_no: { $exists: false } }, { policy_no: '' }],
    }).select('_id');
    for (const doc of idless) {
      doc.policy_no = await nextEntityNo('POL', 'policy');
      await doc.save();
    }
    return { repaired: idless.length };
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
          '<li>Your booking moves to <strong>Backout in process</strong> and your seat is released ' +
          'for public booking immediately.</li>' +
          '<li>You will get the refund only if someone fills your spot. For paid pods the refund is ' +
          'processed after the configured Backouts deduction.</li>' +
          '<li>Until the seat is rebooked you can cancel the backout ("Keep My Spot") and restore ' +
          'your booking.</li>' +
          '<li>Backout attempts are limited per pod; once the limit is reached you can no longer ' +
          'back out of that pod.</li>' +
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
