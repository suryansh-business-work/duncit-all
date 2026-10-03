/**
 * The policy acceptance log against a real database: the signup gate, the
 * pending list, the idempotent write path, the receipt and the Legal portal's
 * detail and table reads. Only the receipt mail and the URL config are mocked.
 */
jest.mock('@services/email/email.service', () => ({
  ...jest.requireActual('@services/email/email.service'),
  sendPolicyAcceptanceEmail: jest.fn(),
}));
jest.mock('@config/url-configs', () => ({
  ...jest.requireActual('@config/url-configs'),
  getUrlConfigs: jest.fn(),
}));

import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { sendPolicyAcceptanceEmail } from '@services/email/email.service';
import { getUrlConfigs } from '@config/url-configs';
import { PolicyModel } from '@modules/content/policy/policy.model';
import { UserModel } from '@modules/access/user/user.model';
import { PolicyAcceptanceModel, policyContentHash } from '../../policyAcceptance.model';
import { assertPoliciesAccepted, policyAcceptanceService as svc } from '../../policyAcceptance.service';

const sendMail = sendPolicyAcceptanceEmail as jest.Mock;
const urls = getUrlConfigs as jest.Mock;

const policy = (slug: string, over: Record<string, unknown> = {}) =>
  PolicyModel.create({ slug, title: slug.toUpperCase(), content: `<p>${slug}</p>`, ...over });

const waitFor = async (done: () => boolean) => {
  for (let i = 0; i < 400 && !done(); i += 1) await new Promise((r) => setTimeout(r, 5));
};

const insertUser = async (doc: Record<string, unknown>) => {
  const _id = new Types.ObjectId();
  await UserModel.collection.insertOne({ _id, ...doc });
  return String(_id);
};

beforeEach(() => {
  sendMail.mockReset().mockResolvedValue(undefined);
  urls.mockReset().mockResolvedValue({ websiteUrl: 'https://duncit.example/' });
});

describe('assertPoliciesAccepted', () => {
  it('passes anything when no policy gates signup', async () => {
    await policy('optional', { requires_signup_acceptance: false });
    await policy('retired', { is_active: false });
    await expect(assertPoliciesAccepted(null)).resolves.toBeUndefined();
    await expect(assertPoliciesAccepted(undefined)).resolves.toBeUndefined();
  });

  it('names exactly the required policies that were not submitted', async () => {
    const terms = await policy('terms', { sort_order: 1 });
    const privacy = await policy('privacy', { sort_order: 2 });
    await policy('optional', { requires_signup_acceptance: false });

    await expect(assertPoliciesAccepted([String(terms._id), 'not-an-id'])).rejects.toMatchObject({
      message: 'Accept all the policies to continue',
      extensions: { code: 'BAD_USER_INPUT', missing_policy_ids: [String(privacy._id)] },
    });
    await expect(assertPoliciesAccepted(null)).rejects.toMatchObject({
      extensions: { missing_policy_ids: [String(terms._id), String(privacy._id)] },
    });
    await expect(
      assertPoliciesAccepted([String(privacy._id), String(terms._id), String(terms._id)])
    ).resolves.toBeUndefined();
  });
});

describe('signupPolicies / pending', () => {
  it('lists the active, signup-gating policies in order', async () => {
    await policy('zeta', { sort_order: 2 });
    await policy('alpha', { sort_order: 1 });
    await policy('off', { requires_signup_acceptance: false });
    const list = await svc.signupPolicies();
    expect(list.map((p) => p.slug)).toEqual(['alpha', 'zeta']);
    expect(list[0].content_hash).toBe(policyContentHash('<p>alpha</p>'));
  });

  it('owes nothing when nothing is required', async () => {
    expect(await svc.pending(new Types.ObjectId().toHexString())).toEqual([]);
  });

  it('owes what was never accepted, and owes it again after the wording changes', async () => {
    const userId = new Types.ObjectId().toHexString();
    const terms = await policy('terms', { sort_order: 1 });
    const privacy = await policy('privacy', { sort_order: 2 });
    expect((await svc.pending(userId)).map((p) => p.slug)).toEqual(['terms', 'privacy']);

    await svc.accept(userId, [String(terms._id), String(privacy._id)], 'MWEB');
    expect(await svc.pending(userId)).toEqual([]);

    await PolicyModel.updateOne({ _id: terms._id }, { $set: { content: '<p>terms v2</p>' } });
    expect((await svc.pending(userId)).map((p) => p.slug)).toEqual(['terms']);
    // Another account's acceptance does not count for this one.
    expect(await svc.pending(new Types.ObjectId().toHexString())).toHaveLength(2);
  });
});

describe('accept', () => {
  it('refuses an empty or all-invalid selection', async () => {
    const userId = new Types.ObjectId().toHexString();
    for (const ids of [[], ['nope', '']]) {
      await expect(svc.accept(userId, ids, 'APP')).rejects.toMatchObject({
        message: 'Select at least one policy to accept',
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
  });

  it('refuses when none of the ids is an active policy', async () => {
    const retired = await policy('retired', { is_active: false });
    await expect(
      svc.accept(new Types.ObjectId().toHexString(), [String(retired._id), new Types.ObjectId().toHexString()], 'APP')
    ).rejects.toMatchObject({ message: 'Policy not found', extensions: { code: 'NOT_FOUND' } });
    expect(await PolicyAcceptanceModel.countDocuments()).toBe(0);
  });

  it('writes one ACCOUNT row per active policy and settles a repeat to the same fact', async () => {
    const userId = new Types.ObjectId().toHexString();
    const terms = await policy('terms');
    const retired = await policy('retired', { is_active: false });
    expect(await svc.accept(userId, [String(terms._id), String(retired._id)], 'APP')).toBe(true);

    const rows = await PolicyAcceptanceModel.find().lean();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      policy_no: terms.policy_no,
      policy_slug: 'terms',
      policy_title: 'TERMS',
      content_hash: policyContentHash('<p>terms</p>'),
      method: 'ACCOUNT',
      surface: 'APP',
    });
    expect(String(rows[0].user_id)).toBe(userId);
    expect(rows[0].policy_updated_at.toISOString()).toBe(terms.updated_at.toISOString());

    await svc.accept(userId, [String(terms._id)], 'MWEB');
    const again = await PolicyAcceptanceModel.find().lean();
    expect(again).toHaveLength(1);
    expect(again[0].surface).toBe('APP');
    expect(again[0].accepted_at.getTime()).toBe(rows[0].accepted_at.getTime());
  });
});

describe('recordBrandConsent', () => {
  it('records a BRAND_CONSENT row from the Partners portal, tolerating a policy without a number', async () => {
    const userId = new Types.ObjectId().toHexString();
    const consent = await policy('brand-consent');
    await svc.recordBrandConsent(userId, { ...consent.toObject(), policy_no: null } as never);
    const row = await PolicyAcceptanceModel.findOne().lean();
    expect(row).toMatchObject({ method: 'BRAND_CONSENT', surface: 'PORTAL', policy_no: '', policy_slug: 'brand-consent' });
  });
});

describe('recordSignupAcceptance', () => {
  const base = { user_id: new Types.ObjectId().toHexString(), email: 'new@duncit.com', name: 'Asha' };

  it('does nothing for no valid ids or ids that match no policy', async () => {
    await svc.recordSignupAcceptance({ ...base, policy_ids: ['x'], method: 'SIGNUP_FORM', surface: 'MWEB' });
    await svc.recordSignupAcceptance({
      ...base,
      policy_ids: [new Types.ObjectId().toHexString()],
      method: 'SIGNUP_FORM',
      surface: 'MWEB',
    });
    expect(await PolicyAcceptanceModel.countDocuments()).toBe(0);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('writes the rows (inactive policies included) and mails the receipt with the policy hub link', async () => {
    const terms = await policy('terms');
    const old = await policy('old', { is_active: false });
    await svc.recordSignupAcceptance({
      ...base,
      policy_ids: [String(terms._id), String(old._id)],
      method: 'GOOGLE_SIGNUP',
      surface: 'APP',
    });
    expect(await PolicyAcceptanceModel.countDocuments({ method: 'GOOGLE_SIGNUP', surface: 'APP' })).toBe(2);
    await waitFor(() => sendMail.mock.calls.length > 0);
    expect(sendMail).toHaveBeenCalledWith({
      to: 'new@duncit.com',
      name: 'Asha',
      policies: expect.stringMatching(/^(TERMS · OLD|OLD · TERMS)$/),
      policies_url: 'https://duncit.example/policies',
    });
  });

  it('keeps a website url without a trailing slash as it is', async () => {
    urls.mockResolvedValue({ websiteUrl: 'https://duncit.example' });
    const terms = await policy('terms');
    await svc.recordSignupAcceptance({ ...base, policy_ids: [String(terms._id)], method: 'SIGNUP_FORM', surface: 'WEBSITE' });
    await waitFor(() => sendMail.mock.calls.length > 0);
    expect(sendMail.mock.calls[0][0].policies_url).toBe('https://duncit.example/policies');
  });

  it.each([
    ['the mail provider fails', () => sendMail.mockRejectedValue(new Error('smtp down'))],
    ['the url config cannot be read', () => urls.mockRejectedValue(new Error('config down'))],
  ])('logs, but does not fail the signup, when %s', async (_label, breakIt) => {
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined as never);
    breakIt();
    const terms = await policy('terms');
    await expect(
      svc.recordSignupAcceptance({ ...base, policy_ids: [String(terms._id)], method: 'APPLE_SIGNUP', surface: 'APP' })
    ).resolves.toBeUndefined();
    await waitFor(() => error.mock.calls.length > 0);
    expect(error).toHaveBeenCalledWith('policyAcceptance.service', 'recordSignupAcceptance', {
      error: expect.any(Error),
      msg: 'acceptance receipt failed',
      userId: base.user_id,
    });
    expect(await PolicyAcceptanceModel.countDocuments()).toBe(1);
    error.mockRestore();
  });
});

describe('detail', () => {
  const accepted = (userId: string, p: { _id: unknown; slug: string }, hash: string, at: string) =>
    PolicyAcceptanceModel.create({
      user_id: userId,
      policy_id: p._id,
      policy_no: 'POL-X',
      policy_slug: p.slug,
      policy_title: p.slug,
      content_hash: hash,
      policy_updated_at: new Date('2026-01-01T00:00:00Z'),
      method: 'SIGNUP_FORM',
      surface: 'MWEB',
      accepted_at: new Date(at),
    });

  it.each(['not-an-id', new Types.ObjectId().toHexString()])('reports %s as not found', async (id) => {
    await expect(svc.detail(id)).rejects.toMatchObject({ message: 'Acceptance not found', extensions: { code: 'NOT_FOUND' } });
  });

  it('assembles the account, the policy, the version accepted and both trails', async () => {
    const userId = await insertUser({
      auth: { email: 'asha@duncit.com', phone: { extension: '+91', number: '9000000001' } },
      profile: { first_name: 'Asha', last_name: 'Rao' },
      metadata: { status: 'ACTIVE', deleted_at: new Date('2026-03-01T00:00:00Z') },
      created_at: new Date('2025-12-01T00:00:00Z'),
    });
    const oldHash = policyContentHash('<p>old terms</p>');
    const terms = await policy('terms', {
      content: '<p>new terms</p>',
      versions: [{ title: 'TERMS', slug: 'terms', content: '<p>old terms</p>', content_hash: oldHash }],
    });
    const privacy = await policy('privacy');
    const first = await accepted(userId, terms, oldHash, '2026-01-01T00:00:00Z');
    await accepted(userId, terms, policyContentHash('<p>new terms</p>'), '2026-02-01T00:00:00Z');
    await accepted(userId, privacy, 'h-privacy', '2026-01-15T00:00:00Z');

    const d = await svc.detail(String(first._id));
    expect(d.acceptance).toMatchObject({
      id: String(first._id),
      user_name: 'Asha Rao',
      user_email: 'asha@duncit.com',
      policy_no: 'POL-X',
      content_hash: oldHash,
      accepted_at: '2026-01-01T00:00:00.000Z',
      policy_updated_at: '2026-01-01T00:00:00.000Z',
    });
    expect(d.account).toEqual({
      id: userId,
      name: 'Asha Rao',
      email: 'asha@duncit.com',
      phone: '+91 9000000001',
      status: 'ACTIVE',
      is_deleted: true,
      created_at: '2025-12-01T00:00:00.000Z',
    });
    expect(d.policy?.slug).toBe('terms');
    expect(d.versions.map((v) => v.is_current)).toEqual([false, true]);
    expect(d.accepted_version).toMatchObject({ version_no: 1, content_hash: oldHash, is_current: false });
    expect(d.policy_history.map((r) => r.accepted_at)).toEqual(['2026-02-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z']);
    expect(d.user_acceptances.map((r) => r.policy_slug)).toEqual(['terms', 'privacy', 'terms']);
  });

  it('stays honest when the policy is gone, the wording unknown and the account bare', async () => {
    const userId = await insertUser({ auth: { phone: { number: '' } }, profile: {}, metadata: {} });
    const gonePolicy = { _id: new Types.ObjectId(), slug: 'deleted' };
    const row = await accepted(userId, gonePolicy, 'h-unknown', '2026-01-01T00:00:00Z');

    const d = await svc.detail(String(row._id));
    expect(d.policy).toBeNull();
    expect(d.versions).toEqual([]);
    expect(d.accepted_version).toBeNull();
    expect(d.account).toEqual({
      id: userId,
      name: '',
      email: '',
      phone: '',
      status: '',
      is_deleted: false,
      created_at: '',
    });
    expect(d.acceptance).toMatchObject({ user_name: '', user_email: '' });
  });

  it('shows a number-only phone and no account when the user no longer exists', async () => {
    const withPhone = await insertUser({ auth: { phone: { number: '9000000002' } } });
    const p = await policy('terms');
    const row = await accepted(withPhone, p, 'h1', '2026-01-01T00:00:00Z');
    expect((await svc.detail(String(row._id))).account?.phone).toBe('9000000002');

    const ghost = await accepted(new Types.ObjectId().toHexString(), p, 'h2', '2026-01-02T00:00:00Z');
    const d = await svc.detail(String(ghost._id));
    expect(d.account).toBeNull();
    expect(d.acceptance).toMatchObject({ user_name: '', user_email: '' });
    // A policy whose live wording does not match the row has no accepted version.
    expect(d.accepted_version).toBeNull();
    expect(d.versions).toHaveLength(1);
  });
});

describe('table', () => {
  it('joins each row to its acceptor and honours search and sort', async () => {
    const asha = await insertUser({ auth: { email: 'asha@duncit.com' }, profile: { first_name: 'Asha' } });
    const terms = await policy('terms');
    const privacy = await policy('privacy');
    await svc.accept(asha, [String(terms._id)], 'MWEB');
    await svc.accept(new Types.ObjectId().toHexString(), [String(privacy._id)], 'APP');

    const all = await svc.table({ sort_by: 'policy_slug', sort_dir: 'asc' });
    expect(all.total).toBe(2);
    expect(all.rows.map((r) => [r.policy_slug, r.user_name, r.user_email])).toEqual([
      ['privacy', '', ''],
      ['terms', 'Asha', 'asha@duncit.com'],
    ]);

    const searched = await svc.table({ search: 'terms' });
    expect(searched.rows.map((r) => r.policy_slug)).toEqual(['terms']);
  });

  it('returns an empty page without a user lookup', async () => {
    const spy = jest.spyOn(UserModel, 'find');
    const page = await svc.table(null);
    expect(page).toMatchObject({ rows: [], total: 0, page: 1 });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
