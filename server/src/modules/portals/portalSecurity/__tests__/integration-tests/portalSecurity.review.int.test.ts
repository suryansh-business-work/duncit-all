import { Types } from 'mongoose';
import { startTestServer, type TestServer } from '@test/harness';
import { lockAccount, unlockAccount } from '@modules/access/accountDeletion/accountDeletion.lock';
import { PolicyModel } from '@modules/content/policy/policy.model';
import { TeamStructureNodeModel } from '@modules/hr/teamStructure/teamStructure.model';
import { setCurrentPolicyVersion } from '../../portalSecurity.claims';
import {
  PortalSecurityAccessLogModel,
  PortalSecurityExceptionModel,
  PortalSecurityVerificationModel,
} from '../../portalSecurity.model';
import { computePolicyVersion, refreshPolicyVersion } from '../../portalSecurity.policy';
import { portalSecurityService } from '../../portalSecurity.service';
import {
  CHALLENGE,
  DECIDE,
  EXCEPTION_STATUS,
  REQUEST_EXCEPTION,
  SUBMIT,
  account,
  failure,
  pending,
  submitInput,
  tokenFor,
} from './portalSecurity.helpers';

/**
 * The corners of Security Verification the main suite leaves alone: the wording
 * and its version following Legal's policies, where an alternative request
 * stands, accounts that cannot be verified, what is written when a write fails,
 * and the reviewer's table with its searches, filters and names.
 */

// The first policy written in a run also mints its permanent number, which is slower than a unit step.
jest.setTimeout(30_000);

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});
afterEach(() => {
  setCurrentPolicyVersion(null);
  jest.restoreAllMocks();
});

const policy = (slug: string, title: string, policy_type: string, content = '<p>wording</p>', is_active = true) =>
  PolicyModel.create({ slug, title, policy_type, content, is_active });

describe('the wording follows the policies Legal publishes', () => {
  it('links the full policies for these topics and leaves out retired ones and other topics', async () => {
    await policy('privacy', 'Privacy Policy', 'Privacy Policy');
    await policy('security', 'Security Policy', 'Security Policy');
    await policy('retired-privacy', 'Old Privacy Policy', 'Privacy Policy', '<p>old</p>', false);
    await policy('refunds', 'Refund Policy', 'Refund Policy');
    const id = await account('links@duncit.com', ['USER', 'FINANCE_MANAGER']);

    const data = await server
      .client(pending(id))
      .request<{ portalSecurityChallenge: { links: Array<{ title: string; policy_type: string; url: string }> } }>(CHALLENGE);

    const links = data.portalSecurityChallenge.links;
    expect(links.map((link) => [link.title, link.policy_type])).toEqual([
      ['Privacy Policy', 'Privacy Policy'],
      ['Security Policy', 'Security Policy'],
    ]);
    expect(links[0]!.url).toMatch(/^https?:\/\/.+\/policies\/privacy$/);
    expect(links[1]!.url).toMatch(/\/policies\/security$/);
  });

  it('changes the version when a linked policy is edited, and not when some other policy is', async () => {
    const empty = await computePolicyVersion();
    await policy('privacy', 'Privacy Policy', 'Privacy Policy', '<p>one</p>');
    const withPrivacy = await computePolicyVersion();
    expect(withPrivacy).not.toBe(empty);

    await PolicyModel.updateOne({ slug: 'privacy' }, { $set: { content: '<p>two</p>' } });
    const edited = await computePolicyVersion();
    expect(edited).not.toBe(withPrivacy);

    await policy('refunds', 'Refund Policy', 'Refund Policy', '<p>refunds</p>');
    expect(await computePolicyVersion()).toBe(edited);
  });

  it('asks a verified session to verify again once Legal edits a linked policy, and takes the new consent', async () => {
    await policy('privacy', 'Privacy Policy', 'Privacy Policy', '<p>one</p>');
    const id = await account('legal-edit@duncit.com', ['USER', 'FINANCE_MANAGER']);
    const first = await server.client(pending(id)).request<{ submitPortalSecurityVerification: { token: string } }>(SUBMIT, {
      input: await submitInput(),
    });
    const verified = first.submitPortalSecurityVerification.token;
    const oldVersion = await computePolicyVersion();
    const activity = `query { myLoginActivity { retention_days } }`;
    await server.client(verified).request(activity);

    // Legal edits the privacy policy; the server's periodic refresh picks it up.
    await PolicyModel.updateOne({ slug: 'privacy' }, { $set: { content: '<p>two</p>' } });
    await refreshPolicyVersion();

    expect((await failure(server.client(verified).request(activity))).extensions?.code).toBe('UNAUTHENTICATED');
    const asked = await server.client(verified).request<{ portalSecurityChallenge: { reverify: boolean; policy_version: string } }>(CHALLENGE);
    expect(asked.portalSecurityChallenge.reverify).toBe(true);

    // The old wording cannot be consented to any more; the new one can, and works.
    const stale = await failure(server.client(verified).request(SUBMIT, { input: await submitInput({ policy_version: oldVersion }) }));
    expect(stale.extensions?.code).toBe('POLICY_CHANGED');
    const again = await server.client(verified).request<{ submitPortalSecurityVerification: { token: string } }>(SUBMIT, {
      input: await submitInput({ policy_version: asked.portalSecurityChallenge.policy_version }),
    });
    await server.client(again.submitPortalSecurityVerification.token).request(activity);
  });
});

describe('where an alternative request stands', () => {
  const REASON = 'My laptop has no location service';

  it('is nothing before a request, and shows up on the screen and in the status once one is made', async () => {
    const id = await account('status@duncit.com', ['USER', 'FINANCE_MANAGER']);
    const client = server.client(pending(id));
    const before = await client.request<{ portalSecurityException: unknown }>(EXCEPTION_STATUS);
    expect(before.portalSecurityException).toBeNull();

    await client.request(REQUEST_EXCEPTION, { input: { reason: REASON } });

    const after = await client.request<{ portalSecurityException: { status: string; reason: string } }>(EXCEPTION_STATUS);
    expect(after.portalSecurityException).toMatchObject({ status: 'PENDING', reason: REASON });
    const screen = await client.request<{ portalSecurityChallenge: { exception: { status: string } } }>(CHALLENGE);
    expect(screen.portalSecurityChallenge.exception.status).toBe('PENDING');
  });

  it('calls an approval that has run out expired, and remembers that it did', async () => {
    const id = await account('lapsed@duncit.com', ['USER', 'FINANCE_MANAGER']);
    const created = await PortalSecurityExceptionModel.create({
      user_id: new Types.ObjectId(id),
      portal_key: 'finance',
      reason: REASON,
      status: 'APPROVED',
      expires_at: new Date(Date.now() - 1_000),
    });

    const data = await server.client(pending(id)).request<{ portalSecurityException: { status: string } }>(EXCEPTION_STATUS);

    expect(data.portalSecurityException.status).toBe('EXPIRED');
    expect((await PortalSecurityExceptionModel.findById(created._id).lean())?.status).toBe('EXPIRED');
  });

  it('lets a person ask again after a rejection, and then shows the newer request', async () => {
    const id = await account('again@duncit.com', ['USER', 'FINANCE_MANAGER']);
    await PortalSecurityExceptionModel.create({
      user_id: new Types.ObjectId(id),
      portal_key: 'finance',
      reason: 'The first reason I gave',
      status: 'REJECTED',
      created_at: new Date(Date.now() - 60_000),
    });

    const second = await server
      .client(pending(id))
      .request<{ requestPortalSecurityException: { id: string; status: string; reason: string } }>(REQUEST_EXCEPTION, {
        input: { reason: REASON },
      });

    expect(second.requestPortalSecurityException).toMatchObject({ status: 'PENDING', reason: REASON });
    expect(await PortalSecurityExceptionModel.countDocuments({ user_id: new Types.ObjectId(id) })).toBe(2);
    const status = await server.client(pending(id)).request<{ portalSecurityException: { id: string } }>(EXCEPTION_STATUS);
    expect(status.portalSecurityException.id).toBe(second.requestPortalSecurityException.id);
  });

  it("keeps one console's request from answering for another's", async () => {
    const id = await account('other-console@duncit.com', ['USER', 'FINANCE_MANAGER']);
    await PortalSecurityExceptionModel.create({ user_id: new Types.ObjectId(id), portal_key: 'tech', reason: REASON, status: 'PENDING' });

    const data = await server.client(pending(id, 'finance')).request<{ portalSecurityException: unknown }>(EXCEPTION_STATUS);

    expect(data.portalSecurityException).toBeNull();
  });
});

describe('accounts that cannot be verified', () => {
  const ctxFor = (userId: string) =>
    ({ req: { ip: '127.0.0.1', headers: {} }, device_id: null, user: null, portalSecurity: { userId, portal: 'finance', reverify: false } }) as never;

  it('refuse an account that is not active', async () => {
    const id = await account('suspended@duncit.com', ['USER', 'FINANCE_MANAGER'], 'Asha', { status: 'SUSPENDED' });
    const error = await failure(server.client(pending(id)).request(CHALLENGE));
    expect(error.extensions?.code).toBe('FORBIDDEN');
    expect(error.message).toMatch(/not active/);
  });

  it('refuse an account that was sealed while the screen was open, and an id that is not an account', async () => {
    const id = await account('sealed@duncit.com', ['USER', 'FINANCE_MANAGER']);
    lockAccount(id);
    try {
      await expect(portalSecurityService.challenge(ctxFor(id))).rejects.toMatchObject({ extensions: { code: 'UNAUTHENTICATED' } });
    } finally {
      unlockAccount(id);
    }
    await expect(portalSecurityService.challenge(ctxFor('not-an-id'))).rejects.toMatchObject({ extensions: { code: 'UNAUTHENTICATED' } });
  });

  it('refuse a sealed account at the door, before any of this runs', async () => {
    const id = await account('sealed-door@duncit.com', ['USER', 'FINANCE_MANAGER']);
    lockAccount(id);
    try {
      expect((await failure(server.client(pending(id)).request(CHALLENGE))).extensions?.code).toBe('UNAUTHENTICATED');
    } finally {
      unlockAccount(id);
    }
  });
});

describe('verifying with an administrator-approved alternative', () => {
  const approved = async (id: string) =>
    PortalSecurityExceptionModel.create({
      user_id: new Types.ObjectId(id),
      portal_key: 'finance',
      reason: 'My laptop has no location service',
      status: 'APPROVED',
      expires_at: new Date(Date.now() + 3_600_000),
    });

  it('keeps no location, even when one was sent with it', async () => {
    const id = await account('both@duncit.com', ['USER', 'FINANCE_MANAGER']);
    const exception = await approved(id);

    const result = await server.client(pending(id)).request<{ submitPortalSecurityVerification: { record_id: string } }>(SUBMIT, {
      input: await submitInput({ exception_id: String(exception._id) }),
    });

    const row = await PortalSecurityVerificationModel.findById(result.submitPortalSecurityVerification.record_id).lean();
    expect(row).toMatchObject({ result: 'EXCEPTION_APPROVED', has_location: false, location_sealed: null, accuracy_m: null });
  });

  it('gives the approval back when the verification could not be written, so the person can try again', async () => {
    const id = await account('rollback@duncit.com', ['USER', 'FINANCE_MANAGER']);
    const exception = await approved(id);
    jest.spyOn(PortalSecurityVerificationModel, 'create').mockRejectedValueOnce(new Error('disk full') as never);

    await failure(server.client(pending(id)).request(SUBMIT, { input: await submitInput({ location: null, exception_id: String(exception._id) }) }));

    const after = await PortalSecurityExceptionModel.findById(exception._id).lean();
    expect(after).toMatchObject({ status: 'APPROVED', used_at: null });
    // …and it still works.
    const retry = await server.client(pending(id)).request<{ submitPortalSecurityVerification: { token: string } }>(SUBMIT, {
      input: await submitInput({ location: null, exception_id: String(exception._id) }),
    });
    expect(retry.submitPortalSecurityVerification.token).toEqual(expect.any(String));
  });
});

describe('the reviewer\'s tables', () => {
  const TABLE = `query($query: TableQueryInput) { portalSecurityLogsTable(query: $query) { total rows { user_name portal_key result is_employee } } }`;
  const REQUESTS = `query($query: TableQueryInput) { portalSecurityExceptionsTable(query: $query) { total rows {
    id user_name portal_key reason status decided_by_name decision_note expires_at used_at created_at } } }`;
  const DETAIL = `query($id: ID!) { portalSecurityLog(id: $id) {
    id result latitude longitude has_location location_error
    exception { id status reason decided_by_name } related { id } access_history { actor_name action } } }`;

  const logRow = (over: Record<string, unknown> = {}) =>
    PortalSecurityVerificationModel.create({
      user_id: new Types.ObjectId(),
      user_name: 'Someone',
      user_email: 'someone@duncit.com',
      portal_key: 'finance',
      result: 'VERIFIED',
      method: 'GPS',
      policy_version: 'v1',
      notice_version: 'n1',
      ip_masked: '10.0.x.x',
      ...over,
    });

  const reviewer = async (named = true) => {
    const id = await account(`reviewer-${named}@duncit.com`, ['USER', 'TECH_MANAGER'], 'Rohan', { named });
    return tokenFor(id, ['USER', 'TECH_MANAGER']);
  };

  it('searches, filters and sorts the log, and writes down what was asked for — never what was shown', async () => {
    await logRow({ user_name: 'Meera Nair', portal_key: 'tech', employee: { is_employee: true } });
    await logRow({ user_name: 'Meera Pillai', portal_key: 'tech', employee: { is_employee: false } });
    await logRow({ user_name: 'Zoya Khan', portal_key: 'finance', employee: { is_employee: true } });
    const token = await reviewer();

    const data = await server.client(token).request<{ portalSecurityLogsTable: { total: number; rows: Array<{ user_name: string; is_employee: boolean }> } }>(TABLE, {
      query: {
        search: 'Meera',
        filters: [
          { field: 'portal_key', op: 'eq', value: 'tech' },
          { field: 'is_employee', op: 'is_true' },
        ],
        sort_by: 'user_name',
        sort_dir: 'asc',
      },
    });

    expect(data.portalSecurityLogsTable.total).toBe(1);
    expect(data.portalSecurityLogsTable.rows).toEqual([expect.objectContaining({ user_name: 'Meera Nair', is_employee: true })]);
    const trail = await PortalSecurityAccessLogModel.findOne({ action: 'LIST' }).lean();
    expect(trail?.query_summary).toBe('search="Meera"; portal_key eq; is_employee is_true');
    expect(JSON.stringify(trail)).not.toContain('Nair');
  });

  it('sorts by the newest first when nothing else is asked, and pages', async () => {
    await logRow({ user_name: 'Older', created_at: new Date(Date.now() - 120_000) });
    await logRow({ user_name: 'Newer', created_at: new Date(Date.now() - 60_000) });
    const token = await reviewer();

    const data = await server.client(token).request<{ portalSecurityLogsTable: { total: number; rows: Array<{ user_name: string }> } }>(TABLE, {
      query: { page: 1, page_size: 1 },
    });

    expect(data.portalSecurityLogsTable.total).toBe(2);
    expect(data.portalSecurityLogsTable.rows.map((row) => row.user_name)).toEqual(['Newer']);
  });

  it('lists the requests with who decided them, and filters by status', async () => {
    const asker = new Types.ObjectId();
    await PortalSecurityExceptionModel.create({ user_id: asker, user_name: 'Asha Rao', portal_key: 'finance', reason: 'No location service', status: 'PENDING' });
    await PortalSecurityExceptionModel.create({
      user_id: new Types.ObjectId(),
      user_name: 'Dev Rao',
      portal_key: 'tech',
      reason: 'Blocked by policy',
      status: 'REJECTED',
      decided_by_name: 'Rohan Rao',
      decision_note: 'Come to the office',
      decided_at: new Date(),
    });
    const token = await reviewer();

    const all = await server.client(token).request<{ portalSecurityExceptionsTable: { total: number } }>(REQUESTS);
    expect(all.portalSecurityExceptionsTable.total).toBe(2);

    const rejected = await server.client(token).request<{
      portalSecurityExceptionsTable: { rows: Array<{ user_name: string; decided_by_name: string; decision_note: string; expires_at: string | null; used_at: string | null }> };
    }>(REQUESTS, { query: { filters: [{ field: 'status', op: 'eq', value: 'REJECTED' }] } });
    expect(rejected.portalSecurityExceptionsTable.rows).toEqual([
      expect.objectContaining({ user_name: 'Dev Rao', decided_by_name: 'Rohan Rao', decision_note: 'Come to the office', expires_at: null, used_at: null }),
    ]);
  });

  it('answers NOT_FOUND to a decision on a request that does not exist', async () => {
    const token = await reviewer();
    const error = await failure(server.client(token).request(DECIDE, { input: { id: new Types.ObjectId().toString(), approve: true } }));
    expect(error.extensions?.code).toBe('NOT_FOUND');
  });

  it('names a reviewer by their e-mail when the account has no name', async () => {
    const token = await reviewer(false);
    const asker = await account('asker-nameless@duncit.com', ['USER', 'FINANCE_MANAGER']);
    const request = await PortalSecurityExceptionModel.create({ user_id: new Types.ObjectId(asker), portal_key: 'finance', reason: 'No location service' });

    const decided = await server.client(token).request<{ decidePortalSecurityException: { decided_by_name: string } }>(DECIDE, {
      input: { id: String(request._id), approve: true },
    });
    expect(decided.decidePortalSecurityException.decided_by_name).toBe('person@duncit.com');

    const row = await logRow({ user_id: new Types.ObjectId(asker) });
    const detail = await server.client(token).request<{ portalSecurityLog: { access_history: Array<{ actor_name: string }> } }>(DETAIL, { id: String(row._id) });
    expect(detail.portalSecurityLog.access_history[0]?.actor_name).toBe('person@duncit.com');
  });

  it('opens a refusal in full: no position, the request it led to, and the same person\'s other verifications', async () => {
    const id = await account('refused@duncit.com', ['USER', 'FINANCE_MANAGER']);
    await server.client(pending(id)).request(REQUEST_EXCEPTION, { input: { reason: 'Browser blocked it', location_error: 'PERMISSION_DENIED' } });
    await logRow({ user_id: new Types.ObjectId(id), user_name: 'Asha Rao' });
    const denied = await PortalSecurityVerificationModel.findOne({ result: 'LOCATION_DENIED' }).lean();
    const token = await reviewer();

    const data = await server.client(token).request<{
      portalSecurityLog: {
        result: string;
        latitude: number | null;
        longitude: number | null;
        has_location: boolean;
        location_error: string;
        exception: { status: string; reason: string };
        related: Array<{ id: string }>;
      };
    }>(DETAIL, { id: String(denied?._id) });

    expect(data.portalSecurityLog).toMatchObject({
      result: 'LOCATION_DENIED',
      latitude: null,
      longitude: null,
      has_location: false,
      location_error: 'PERMISSION_DENIED',
      exception: { status: 'PENDING', reason: 'Browser blocked it' },
    });
    expect(data.portalSecurityLog.related).toHaveLength(1);
  });
});

describe('people and requests the happy paths do not meet', () => {
  const seat = (userId: string, over: Record<string, unknown> = {}) =>
    TeamStructureNodeModel.create({
      structure_id: new Types.ObjectId(),
      kind: 'ROLE',
      title: 'Payments Engineer',
      employment_type: 'CONTRACT',
      status: 'FILLED',
      user_id: new Types.ObjectId(userId),
      ...over,
    });

  it('records a seat with no department as exactly that, and shows what kind of engagement it is', async () => {
    const id = await account('no-dept@duncit.com', ['USER', 'FINANCE_MANAGER']);
    await seat(id);

    const result = await server.client(pending(id)).request<{ submitPortalSecurityVerification: { record_id: string } }>(SUBMIT, {
      input: await submitInput(),
    });

    const row = await PortalSecurityVerificationModel.findById(result.submitPortalSecurityVerification.record_id).lean();
    expect(row?.employee).toMatchObject({ is_employee: true, title: 'Payments Engineer', department: null, employment_type: 'CONTRACT' });
  });

  it('does not count an AI seat, a vacant seat or a department as a person on the team', async () => {
    const id = await account('not-a-person@duncit.com', ['USER', 'FINANCE_MANAGER']);
    await seat(id, { employment_type: 'AI_AGENT' });
    await seat(id, { status: 'VACANT' });
    await seat(id, { kind: 'DEPARTMENT' });

    const result = await server.client(pending(id)).request<{ submitPortalSecurityVerification: { record_id: string } }>(SUBMIT, {
      input: await submitInput(),
    });

    const row = await PortalSecurityVerificationModel.findById(result.submitPortalSecurityVerification.record_id).lean();
    expect(row?.employee).toMatchObject({ is_employee: false, title: null });
  });

  it('verifies an account that signs in without an e-mail address', async () => {
    const id = await account('unused@duncit.com', ['USER', 'FINANCE_MANAGER'], 'Asha', { withEmail: false });

    const result = await server.client(pending(id)).request<{ submitPortalSecurityVerification: { record_id: string } }>(SUBMIT, {
      input: await submitInput(),
    });

    const row = await PortalSecurityVerificationModel.findById(result.submitPortalSecurityVerification.record_id).lean();
    expect(row).toMatchObject({ user_name: 'Asha Rao', user_email: '' });
  });

  it('records a refusal for an account with no e-mail and no role cache: no address, and only the role the account defaults to', async () => {
    const id = await account('bare@duncit.com', [], 'Asha', { withEmail: false, withRoleKeys: false });

    await server.client(pending(id)).request(REQUEST_EXCEPTION, { input: { reason: 'The browser blocked it' } });

    const row = await PortalSecurityVerificationModel.findOne({ user_id: new Types.ObjectId(id) }).lean();
    expect(row).toMatchObject({ result: 'LOCATION_DENIED', user_email: '', roles: ['USER'] });
  });

  it('records a refusal even when the address and the sign-in time cannot be read — as blanks, not guesses', async () => {
    const id = await account('blind@duncit.com', ['USER', 'FINANCE_MANAGER']);
    const ctx = {
      req: { headers: {} },
      device_id: null,
      user: null,
      portalSecurity: { userId: id, portal: 'finance', reverify: false },
    } as never;

    await portalSecurityService.requestException(ctx, { reason: 'The browser blocked it' });

    const row = await PortalSecurityVerificationModel.findOne({ user_id: new Types.ObjectId(id) }).lean();
    expect(row).toMatchObject({ result: 'LOCATION_DENIED', ip_sealed: null, ip_hash: null, ip_masked: null, signed_in_at: null });
  });

  it('stores nothing, and touches no approval, when an ordinary verification cannot be written', async () => {
    const id = await account('plain-failure@duncit.com', ['USER', 'FINANCE_MANAGER']);
    const approval = await PortalSecurityExceptionModel.create({
      user_id: new Types.ObjectId(id),
      portal_key: 'finance',
      reason: 'My laptop has no location service',
      status: 'APPROVED',
      expires_at: new Date(Date.now() + 3_600_000),
    });
    jest.spyOn(PortalSecurityVerificationModel, 'create').mockRejectedValueOnce(new Error('disk full') as never);

    await failure(server.client(pending(id)).request(SUBMIT, { input: await submitInput() }));

    expect(await PortalSecurityVerificationModel.countDocuments()).toBe(0);
    expect((await PortalSecurityExceptionModel.findById(approval._id).lean())?.status).toBe('APPROVED');
  });

  it('tells the person when a request was decided, by whom the note came, and how long an approval lasts', async () => {
    const id = await account('decided@duncit.com', ['USER', 'FINANCE_MANAGER']);
    const decidedAt = new Date(Date.now() - 60_000);
    const expiresAt = new Date(Date.now() + 3_600_000);
    await PortalSecurityExceptionModel.create({
      user_id: new Types.ObjectId(id),
      portal_key: 'finance',
      reason: 'My laptop has no location service',
      status: 'APPROVED',
      decision_note: 'Verified by phone',
      decided_at: decidedAt,
      expires_at: expiresAt,
    });

    const data = await server.client(pending(id)).request<{
      portalSecurityException: { status: string; decision_note: string; decided_at: string; expires_at: string };
    }>(`query { portalSecurityException { status decision_note decided_at expires_at } }`);

    expect(data.portalSecurityException).toEqual({
      status: 'APPROVED',
      decision_note: 'Verified by phone',
      decided_at: decidedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    });
  });

  it('names a reviewer with neither a name nor an e-mail as nobody, rather than failing to write the trail', async () => {
    const id = await account('anonymous-reviewer@duncit.com', ['USER', 'TECH_MANAGER'], 'Asha', { named: false, withEmail: false });
    const token = tokenFor(id, ['USER', 'TECH_MANAGER'], undefined, undefined, null);

    await server.client(token).request(`query { portalSecurityLogsTable { total } }`);

    const trail = await PortalSecurityAccessLogModel.findOne({ action: 'LIST' }).lean();
    expect(trail?.actor_name).toBe('');
  });
});
