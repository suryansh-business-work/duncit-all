import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PolicyModel, type IPolicy, type IPolicyVersion } from './policy.model';
import { policyContentHash } from '@modules/content/policyAcceptance/policyAcceptance.model';
import { policyNotifyService } from './policy.notify';
import { userDisplayMap } from '@modules/access/user/user.display';
import { logs } from '@observability/log';
import { nextEntityNo } from '@modules/venues/entityIdCounter';
import {
  applyTableQueryInMemory,
  runTableQuery,
  type TableEntityConfig,
  type TableQueryInput,
} from '@utils/table-query';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** How many earlier wordings one policy keeps, so history never grows unbounded. */
const MAX_VERSIONS = 50;

/** Exported so the acceptance module can return the very same Policy shape
 * rather than growing a second, drifting copy of it. */
export const toPub = (p: IPolicy) => ({
  id: String(p._id),
  policy_no: p.policy_no ?? '',
  slug: p.slug,
  title: p.title,
  policy_type: p.policy_type || '',
  content: p.content || '',
  is_active: p.is_active,
  requires_signup_acceptance: p.requires_signup_acceptance !== false,
  sort_order: p.sort_order,
  // The live wording counts as a version, so a policy nobody has edited reads
  // as "1 version" rather than none — which is what it is.
  version_count: (p.versions?.length ?? 0) + 1,
  content_hash: policyContentHash(p.content || ''),
  last_notified_at: p.last_notified_at ? p.last_notified_at.toISOString() : null,
  last_notified_count: p.last_notified_count ?? 0,
  created_at: p.created_at.toISOString(),
  updated_at: p.updated_at.toISOString(),
});

/**
 * Every wording this policy has ever had, oldest first, numbered from 1.
 *
 * The stored array holds only SUPERSEDED wordings — a snapshot is written just
 * before an edit overwrites it — so the live document is appended here as the
 * newest entry. Building the list in one place is what lets an acceptance row
 * be matched back to the exact words behind its `content_hash`: the log records
 * the hash and nothing else, and a history missing its newest entry would fail
 * to resolve precisely the acceptances that matter most.
 */
export function policyVersionHistory(p: IPolicy) {
  const stored = [...(p.versions ?? [])].sort(
    (a, b) => (a.created_at?.getTime?.() ?? 0) - (b.created_at?.getTime?.() ?? 0)
  );
  const entries = stored.map((v: IPolicyVersion, index) => ({
    id: v._id.toString(),
    version_no: index + 1,
    title: v.title ?? '',
    slug: v.slug ?? '',
    policy_type: v.policy_type ?? '',
    content: v.content ?? '',
    content_hash: v.content_hash || policyContentHash(v.content ?? ''),
    updated_by: v.updated_by ? v.updated_by.toString() : null,
    created_at: v.created_at?.toISOString?.() ?? '',
    is_current: false,
  }));
  entries.push({
    id: p._id.toString(),
    version_no: entries.length + 1,
    title: p.title,
    slug: p.slug,
    policy_type: p.policy_type || '',
    content: p.content || '',
    content_hash: policyContentHash(p.content || ''),
    updated_by: p.updated_by ? p.updated_by.toString() : null,
    created_at: p.updated_at?.toISOString?.() ?? '',
    is_current: true,
  });
  return entries;
}

/**
 * Freeze the current wording before an edit replaces it.
 *
 * The hash is computed here rather than read back later, so a version written
 * today still matches an acceptance row written years ago even if the way the
 * hash is derived is ever changed.
 *
 * `updated_by` is the policy's OWN current value, not the person doing the
 * edit: the snapshot is the wording being replaced, so the name on it has to be
 * whoever wrote THAT — naming the replacer would credit every version to the
 * person who came after it.
 */
function snapshot(doc: IPolicy) {
  doc.versions.push({
    title: doc.title,
    slug: doc.slug,
    policy_type: doc.policy_type,
    content: doc.content,
    content_hash: policyContentHash(doc.content || ''),
    updated_by: doc.updated_by ?? null,
  } as any);
  if (doc.versions.length > MAX_VERSIONS) {
    doc.versions.splice(0, doc.versions.length - MAX_VERSIONS);
  }
}

/** The acting user as an id the model can store, or null for an unknown caller. */
const actorId = (userId: string | null): Types.ObjectId | null =>
  userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null;

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

/** Rename a policy's slug, refusing one another policy already answers to. */
async function applySlug(doc: IPolicy, raw: string): Promise<void> {
  const slug = normaliseSlug(raw);
  assertSlug(slug);
  if (slug === doc.slug) return;
  const exists = await PolicyModel.findOne({ slug, _id: { $ne: doc._id } });
  if (exists) {
    throw new GraphQLError('A policy with this slug already exists', {
      extensions: { code: 'CONFLICT' },
    });
  }
  doc.slug = slug;
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
    requires_signup_acceptance: { type: 'boolean' },
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

  /**
   * The policies a new account must accept — the list the signup dialog and the
   * "still outstanding" check are both built from.
   *
   * A retired policy stops gating signup the moment it is deactivated, which is
   * why `is_active` is part of the question and not a separate one.
   *
   * `$ne: false` rather than `true`, because a schema default is applied when a
   * document is WRITTEN, never to documents already stored: every policy Legal
   * wrote before the flag existed has no such field at all, and an equality
   * match drops exactly those — the oldest and most important ones — from the
   * signup list. Absent means true here, the same reading `toPub` gives it.
   */
  async signupRequired() {
    return PolicyModel.find({ is_active: true, requires_signup_acceptance: { $ne: false } }).sort({
      sort_order: 1,
      title: 1,
    });
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

  async create(userId: string | null, input: any) {
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
      // Whoever wrote the first wording, so version 1 has an author too.
      updated_by: actorId(userId),
      is_active: input.is_active ?? true,
      requires_signup_acceptance: input.requires_signup_acceptance ?? true,
      sort_order: input.sort_order ?? 0,
    });
    return toPub(doc);
  },

  /**
   * Apply an edit, keeping the wording it replaced.
   *
   * A snapshot is written on EVERY save rather than only on a content change:
   * a retitled policy is a different policy to somebody reading the log, and
   * deciding after the fact which fields were "material enough" to record is
   * how a history ends up with gaps nobody can explain.
   *
   * `notify_accepted_users` emails everyone who has already accepted it. It is
   * a deliberate tick, never inferred from the edit — a typo fix in a heading
   * is not a reason to mail a hundred thousand people — and it only fires when
   * the WORDING actually changed, because a notice about an unchanged policy
   * is a notice nobody can act on.
   */
  async update(userId: string | null, id: string, input: any) {
    const doc = await PolicyModel.findById(id);
    if (!doc) throw new GraphQLError('Policy not found', { extensions: { code: 'NOT_FOUND' } });
    const hashBefore = policyContentHash(doc.content || '');
    snapshot(doc);
    doc.updated_by = actorId(userId);
    if (input.slug !== undefined) await applySlug(doc, input.slug);
    if (input.title !== undefined) {
      if (!input.title.trim())
        throw new GraphQLError('Title is required', { extensions: { code: 'BAD_USER_INPUT' } });
      doc.title = input.title.trim();
    }
    if (input.policy_type !== undefined) doc.policy_type = String(input.policy_type ?? '').trim();
    if (input.content !== undefined) doc.content = input.content;
    if (input.is_active !== undefined) doc.is_active = !!input.is_active;
    if (input.requires_signup_acceptance !== undefined) {
      doc.requires_signup_acceptance = !!input.requires_signup_acceptance;
    }
    if (input.sort_order !== undefined) doc.sort_order = Number(input.sort_order) || 0;
    await doc.save();

    const wordingChanged = policyContentHash(doc.content || '') !== hashBefore;
    if (input.notify_accepted_users && wordingChanged) {
      await this.notifyAcceptedUsers(doc, String(input.notify_summary ?? '').trim());
    }
    return toPub(doc);
  },

  /**
   * Send the "this policy changed" notice, and record that it went out.
   *
   * Awaited rather than fired and forgotten: the portal reports how many people
   * were told, and a count the caller never sees is a count nobody can trust.
   * The individual sends inside are already best-effort, so a dead mailbox
   * costs one log row and not the save that has just landed.
   */
  async notifyAcceptedUsers(doc: IPolicy, summary: string): Promise<number> {
    let notified = 0;
    try {
      notified = await policyNotifyService.notifyAccepted(doc, summary);
    } catch (error) {
      logs.server.error('policy.service', 'notifyAcceptedUsers', {
        error,
        msg: 'policy update notice failed',
        policyId: doc._id.toString(),
      });
      return 0;
    }
    doc.last_notified_at = new Date();
    doc.last_notified_count = notified;
    doc.last_notified_hash = policyContentHash(doc.content || '');
    await doc.save();
    return notified;
  },

  /** How many accounts a change notice would reach right now. */
  notifyRecipientCount(id: string): Promise<number> {
    return policyNotifyService.recipientCount(id);
  },

  /**
   * Send the notice on its own, without editing anything.
   *
   * The same mail the update checkbox sends, reachable when Legal decides
   * afterwards that people should have been told — or when the first attempt
   * went out while the mailbox was misconfigured.
   */
  async notifyPolicyAcceptedUsers(id: string, summary: string): Promise<number> {
    if (!Types.ObjectId.isValid(id)) {
      throw new GraphQLError('Invalid policy id', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const doc = await PolicyModel.findById(id);
    if (!doc) throw new GraphQLError('Policy not found', { extensions: { code: 'NOT_FOUND' } });
    return this.notifyAcceptedUsers(doc, summary);
  },

  /**
   * One policy's full wording history, oldest first.
   *
   * Editor names are resolved at read time in one projected query, the same way
   * the acceptance log resolves the accepting account: a name copied onto a
   * snapshot years ago is a name that stopped being true the day they changed
   * it.
   */
  async versions(id: string) {
    if (!Types.ObjectId.isValid(id)) return [];
    const doc = await PolicyModel.findById(id);
    if (!doc) return [];
    const entries = policyVersionHistory(doc);
    const names = await userDisplayMap(
      entries.map((entry) => entry.updated_by ?? '').filter(Boolean)
    );
    return entries.map((entry) => ({
      ...entry,
      updated_by_name: entry.updated_by ? (names.get(entry.updated_by)?.name ?? '') : '',
    }));
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

  /**
   * Write the signup flag onto policies stored before it existed.
   *
   * `signupRequired` already reads an absent flag as true, so the gate is
   * correct without this. It runs so the STORED data says what the schema
   * claims it defaults to: the admin table filters this field by plain
   * equality, and a policy that gates signup while the console's "requires
   * acceptance" filter hides it is the same bug wearing a different face.
   *
   * Only ever fills in what is missing — a policy Legal deliberately set to
   * false is left alone.
   */
  async backfillSignupAcceptance(): Promise<{ repaired: number }> {
    const r = await PolicyModel.updateMany(
      { requires_signup_acceptance: { $exists: false } },
      { $set: { requires_signup_acceptance: true } }
    );
    return { repaired: r.modifiedCount ?? 0 };
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
