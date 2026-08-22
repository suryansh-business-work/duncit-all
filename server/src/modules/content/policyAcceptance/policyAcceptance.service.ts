import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PolicyModel, type IPolicy } from '@modules/content/policy/policy.model';
import { policyService, toPub as policyToPub } from '@modules/content/policy/policy.service';
import { UserModel } from '@modules/access/user/user.model';
import { sendPolicyAcceptanceEmail } from '@services/email/email.service';
import { getUrlConfigs } from '@config/url-configs';
import { logs } from '@observability/log';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import {
  PolicyAcceptanceModel,
  policyContentHash,
  type IPolicyAcceptance,
  type PolicyAcceptanceMethod,
  type PolicyAcceptanceSurface,
} from './policyAcceptance.model';

/**
 * Reads and writes over the acceptance log.
 *
 * The SERVER decides what is outstanding, on purpose: the signup form's tick
 * boxes shape the form, they cannot stop a hand-rolled mutation — the same
 * reasoning `assertEligibleDob` already carries on the register resolver.
 */

/** Allowlists for the shared table engine (policyAcceptancesTable — DUNCIT
 * TABLE CONTRACT v1). The accepting user's name and email are joined AFTER the
 * page is fetched, so offering them as sort or search keys would silently do
 * nothing; the policy identity is on the row itself and therefore is real. */
const ACCEPTANCE_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['policy_no', 'policy_slug', 'policy_title'],
  sortFields: {
    accepted_at: 'accepted_at',
    policy_no: 'policy_no',
    policy_slug: 'policy_slug',
    policy_title: 'policy_title',
    policy_updated_at: 'policy_updated_at',
    method: 'method',
    surface: 'surface',
  },
  filterFields: {
    policy_no: { type: 'string' },
    policy_slug: { type: 'string' },
    policy_title: { type: 'string' },
    content_hash: { type: 'string' },
    method: { type: 'enum' },
    surface: { type: 'enum' },
    accepted_at: { type: 'date' },
    policy_updated_at: { type: 'date' },
  },
  defaultSort: { accepted_at: -1 },
};

/** Who accepted, resolved at read time so a renamed account reads correctly. */
interface Acceptor {
  name: string;
  email: string;
}

const BLANK_ACCEPTOR: Acceptor = { name: '', email: '' };

/** One acceptance's answer to "has this person already agreed to this text?". */
const acceptanceKey = (policyId: Types.ObjectId | string, contentHash: string): string =>
  `${policyId.toString()}:${contentHash}`;

const objectIds = (ids: readonly string[]): string[] =>
  [...new Set(ids.map(String))].filter((id) => Types.ObjectId.isValid(id));

/**
 * Names and addresses for a page of rows, in one projected query.
 *
 * Read rather than denormalised: a legal log that shows the address somebody
 * had two years ago is a log nobody can act on. The policy identity IS copied
 * onto the row, because the policy can be hard-deleted and the account cannot.
 */
async function loadAcceptors(ids: readonly string[]): Promise<Map<string, Acceptor>> {
  const valid = objectIds(ids);
  if (valid.length === 0) return new Map();
  const rows: any[] = await UserModel.find({ _id: { $in: valid } })
    .select('auth.email profile.first_name profile.last_name')
    .lean();
  return new Map(
    rows.map((u) => [
      String(u._id),
      {
        name: `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim(),
        email: u.auth?.email ?? '',
      },
    ])
  );
}

/**
 * How far back the "everything else this person accepted" panel reads.
 *
 * A cap rather than the whole trail: the panel is context beside the row being
 * inspected, and an account with hundreds of rows would push the row itself off
 * the screen. The log table itself is where the complete set is read.
 */
const USER_ACCEPTANCE_LIMIT = 50;

/**
 * The accepting account as it reads TODAY — name, address, phone, standing.
 *
 * Separate from {@link loadAcceptors}, which answers the same question for a
 * whole page in two fields: this is the one-row read behind a detail panel, and
 * it is the only place that needs to say whether the account still exists.
 */
async function loadAccount(userId: string) {
  if (!Types.ObjectId.isValid(userId)) return null;
  const user: any = await UserModel.findById(userId)
    .select(
      'auth.email auth.phone.number auth.phone.extension profile.first_name profile.last_name metadata.status metadata.deleted_at created_at'
    )
    .lean();
  if (!user) return null;
  const extension = user.auth?.phone?.extension ?? '';
  const number = user.auth?.phone?.number ?? '';
  return {
    id: String(user._id),
    name: `${user.profile?.first_name ?? ''} ${user.profile?.last_name ?? ''}`.trim(),
    email: user.auth?.email ?? '',
    phone: number ? `${extension} ${number}`.trim() : '',
    status: user.metadata?.status ?? '',
    is_deleted: !!user.metadata?.deleted_at,
    created_at: user.created_at?.toISOString?.() ?? '',
  };
}

const toRow = (a: IPolicyAcceptance, acceptors: Map<string, Acceptor>) => {
  const acceptor = acceptors.get(String(a.user_id)) ?? BLANK_ACCEPTOR;
  return {
    id: String(a._id),
    user_id: String(a.user_id),
    user_name: acceptor.name,
    user_email: acceptor.email,
    policy_id: String(a.policy_id),
    policy_no: a.policy_no || '',
    policy_slug: a.policy_slug || '',
    policy_title: a.policy_title || '',
    content_hash: a.content_hash,
    policy_updated_at: a.policy_updated_at?.toISOString() ?? '',
    method: a.method,
    surface: a.surface,
    accepted_at: a.accepted_at?.toISOString() ?? '',
  };
};

/**
 * The rows themselves. Upsert-on-(user, policy, hash) rather than insert, so a
 * double submit, a retried mutation and "accept all" over something already
 * accepted all settle to the same single fact.
 */
async function writeRows(input: {
  user_id: string;
  policies: IPolicy[];
  method: PolicyAcceptanceMethod;
  surface: PolicyAcceptanceSurface;
}): Promise<void> {
  if (input.policies.length === 0) return;
  const accepted_at = new Date();
  const user_id = new Types.ObjectId(input.user_id);
  await PolicyAcceptanceModel.bulkWrite(
    input.policies.map((policy) => {
      const policy_id = new Types.ObjectId(String(policy._id));
      const content_hash = policyContentHash(policy.content);
      return {
        updateOne: {
          filter: { user_id, policy_id, content_hash },
          update: {
            $setOnInsert: {
              user_id,
              policy_id,
              content_hash,
              policy_no: policy.policy_no ?? '',
              policy_slug: policy.slug,
              policy_title: policy.title,
              policy_updated_at: policy.updated_at,
              method: input.method,
              surface: input.surface,
              accepted_at,
            },
          },
          upsert: true,
        },
      };
    })
  );
}

/**
 * Their copy of what they just agreed to, with somewhere to go and read it.
 *
 * Whole thing best-effort, URL lookup included — the rows are the record, and
 * a config read must never be able to fail a signup whose acceptance already
 * landed.
 */
async function sendAcceptanceReceipt(
  to: string,
  name: string,
  policies: IPolicy[]
): Promise<void> {
  const { appUrl } = await getUrlConfigs();
  const base = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
  await sendPolicyAcceptanceEmail({
    to,
    name,
    // Titles are API data, not translated copy, so they are joined as they are;
    // every label around them is a `{{t:}}` key in the template.
    policies: policies.map((policy) => policy.title).join(' · '),
    policies_url: `${base}/policies`,
  });
}

/**
 * Refuse a signup whose submitted list does not cover what signup requires.
 *
 * Called BEFORE the account is created, so a rejection leaves nothing behind —
 * and the ids of what is missing ride the error so a client can re-open the
 * dialog on exactly those rather than guessing.
 */
export async function assertPoliciesAccepted(
  policyIds?: readonly string[] | null
): Promise<void> {
  const required = await policyService.signupRequired();
  if (required.length === 0) return;
  const submitted = new Set(objectIds(policyIds ?? []));
  const missing = required.filter((policy) => !submitted.has(String(policy._id)));
  if (missing.length === 0) return;
  throw new GraphQLError('Accept all the policies to continue', {
    extensions: {
      code: 'BAD_USER_INPUT',
      missing_policy_ids: missing.map((policy) => String(policy._id)),
    },
  });
}

export const policyAcceptanceService = {
  /** The list the signup dialog renders. Unauthenticated — the form is not
   * signed in yet, which is the whole reason this is not `myPendingPolicies`. */
  async signupPolicies() {
    const docs = await policyService.signupRequired();
    return docs.map(policyToPub);
  },

  /**
   * What this account still owes, measured against the CURRENT wording.
   *
   * A policy whose content was edited after they accepted comes back here, so
   * "ask again after an edit" needs no extra bookkeeping anywhere.
   */
  async pending(userId: string) {
    const required = await policyService.signupRequired();
    if (required.length === 0) return [];
    const rows = await PolicyAcceptanceModel.find({ user_id: new Types.ObjectId(userId) })
      .select('policy_id content_hash')
      .lean();
    const accepted = new Set(
      rows.map((row: any) => acceptanceKey(row.policy_id, row.content_hash))
    );
    return required
      .filter((policy) => {
        const key = acceptanceKey(policy._id, policyContentHash(policy.content));
        return !accepted.has(key);
      })
      .map(policyToPub);
  },

  /**
   * Accept from inside the account — for people who predate the gate, and for
   * re-accepting after Legal edits a policy.
   */
  async accept(userId: string, policyIds: readonly string[], surface: PolicyAcceptanceSurface) {
    const ids = objectIds(policyIds);
    if (ids.length === 0) {
      throw new GraphQLError('Select at least one policy to accept', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const policies = await PolicyModel.find({ _id: { $in: ids }, is_active: true });
    if (policies.length === 0) {
      throw new GraphQLError('Policy not found', { extensions: { code: 'NOT_FOUND' } });
    }
    await writeRows({ user_id: userId, policies, method: 'ACCOUNT', surface });
    return true;
  },

  /**
   * The acceptance a brand-new account owes, plus its receipt.
   *
   * Called AFTER the account is committed and never inside the transaction
   * `signupWithGoogle` runs in: a row written in that session would survive a
   * rollback and point at a user that was never created.
   *
   * The WRITE throws — an account whose acceptance we failed to record is the
   * one thing this feature exists to prevent. The EMAIL does not: a receipt
   * that cannot be delivered is a FAILED row in the email log, not a failed
   * signup, exactly as the welcome mail behaves beside it.
   */
  async recordSignupAcceptance(input: {
    user_id: string;
    email: string;
    name: string;
    policy_ids: readonly string[];
    method: PolicyAcceptanceMethod;
    surface: PolicyAcceptanceSurface;
  }): Promise<void> {
    const ids = objectIds(input.policy_ids);
    if (ids.length === 0) return;
    const policies = await PolicyModel.find({ _id: { $in: ids } });
    if (policies.length === 0) return;
    await writeRows({
      user_id: input.user_id,
      policies,
      method: input.method,
      surface: input.surface,
    });
    sendAcceptanceReceipt(input.email, input.name, policies).catch((error) =>
      logs.server.error('policyAcceptance.service', 'recordSignupAcceptance', {
        error,
        msg: 'acceptance receipt failed',
        userId: input.user_id,
      })
    );
  },

  /**
   * Everything behind ONE row of the acceptance log.
   *
   * A row on its own answers "who, what, when" and nothing else — the wording
   * it points at is a bare sha256, and the person is an id. This assembles the
   * whole picture in one round trip: the account as it reads today, the policy
   * as it reads today, the exact version they agreed to (matched on that hash),
   * the full wording history so a later edit is visible as one, this account's
   * trail through THIS policy, and what else they have accepted.
   *
   * Null policy and null version are both normal and both meaningful. A policy
   * can be hard-deleted, and a version can predate the day this system started
   * keeping history — saying "the wording is no longer on file" is honest; a
   * blank panel is not.
   */
  async detail(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new GraphQLError('Acceptance not found', { extensions: { code: 'NOT_FOUND' } });
    }
    const row = await PolicyAcceptanceModel.findById(id);
    if (!row) {
      throw new GraphQLError('Acceptance not found', { extensions: { code: 'NOT_FOUND' } });
    }

    const userId = String(row.user_id);
    const policyId = String(row.policy_id);
    const [acceptors, account, policy, policyHistory, userAcceptances] = await Promise.all([
      loadAcceptors([userId]),
      loadAccount(userId),
      Types.ObjectId.isValid(policyId) ? PolicyModel.findById(policyId) : null,
      PolicyAcceptanceModel.find({ user_id: row.user_id, policy_id: row.policy_id }).sort({
        accepted_at: -1,
      }),
      PolicyAcceptanceModel.find({ user_id: row.user_id })
        .sort({ accepted_at: -1 })
        .limit(USER_ACCEPTANCE_LIMIT),
    ]);

    const versions = policy ? await policyService.versions(policyId) : [];
    return {
      acceptance: toRow(row, acceptors),
      account,
      policy: policy ? policyToPub(policy) : null,
      accepted_version: versions.find((v) => v.content_hash === row.content_hash) ?? null,
      versions,
      policy_history: policyHistory.map((doc) => toRow(doc, acceptors)),
      user_acceptances: userAcceptances.map((doc) => toRow(doc, acceptors)),
    };
  },

  /** One page of the Legal portal's acceptance log. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IPolicyAcceptance>(
      PolicyAcceptanceModel,
      {},
      input,
      ACCEPTANCE_TABLE_CONFIG
    );
    const acceptors = await loadAcceptors(docs.map((doc) => String(doc.user_id)));
    return { rows: docs.map((doc) => toRow(doc, acceptors)), total, page, page_size };
  },
};
