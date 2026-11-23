import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { startTestServer, type TestServer } from '@test/harness';
import { TeamStructureNodeModel } from '@modules/hr/teamStructure/teamStructure.model';
import { setCurrentPolicyVersion } from '../../portalSecurity.claims';
import { hashIp } from '../../portalSecurity.crypto';
import {
  PortalSecurityAccessLogModel,
  PortalSecurityExceptionModel,
  PortalSecurityVerificationModel,
} from '../../portalSecurity.model';
import { computePolicyVersion } from '../../portalSecurity.policy';
import {
  CHALLENGE,
  DECIDE,
  FIX,
  REQUEST_EXCEPTION,
  SUBMIT,
  account,
  consent,
  failure,
  pending,
  secret,
  submitInput,
  tokenFor,
  type Psv,
} from './portalSecurity.helpers';

/**
 * Security Verification against the real schema and a real database: what a
 * not-yet-verified console token can and cannot do, what a verification stores
 * (and what it stores sealed), the alternative-verification path, and who may
 * read the log.
 */

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});
afterEach(() => setCurrentPolicyVersion(null));

describe('a console sign-in that has not completed the screen', () => {
  it('is not a session: every ordinary operation reads it as signed out', async () => {
    const id = await account('pending@duncit.com', ['USER', 'FINANCE_MANAGER']);
    const error = await failure(server.client(pending(id)).request(`query { myLoginActivity { retention_days } }`));
    expect(error.extensions?.code).toBe('UNAUTHENTICATED');
  });

  it('may still ask who it is, so the console does not read it as signed out', async () => {
    const id = await account('me@duncit.com', ['USER', 'FINANCE_MANAGER']);
    const data = await server.client(pending(id)).request<{ me: { user_id: string } | null }>(`query { me { user_id } }`);
    expect(data.me?.user_id).toBe(id);
  });

  it('is shown what to read and what the server already sees, with the place marked approximate', async () => {
    const id = await account('screen@duncit.com', ['USER', 'FINANCE_MANAGER'], 'Meera');
    const data = await server.client(pending(id)).request<{ portalSecurityChallenge: Record<string, any> }>(CHALLENGE);
    const challenge = data.portalSecurityChallenge;
    expect(challenge.portal_key).toBe('finance');
    expect(challenge.reverify).toBe(false);
    expect(challenge.policy_version).toBe(await computePolicyVersion());
    expect(challenge.user_name).toBe('Meera Rao');
    expect(challenge.sections.map((s: { key: string }) => s.key)).toEqual(
      expect.arrayContaining(['security', 'access', 'credentials', 'acceptable_use', 'monitoring', 'location_notice', 'privacy'])
    );
    // Read by the server from the connection, never from the page.
    expect(challenge.detected.ip).toBe('127.0.0.1');
    expect(challenge.detected.ip_location_is_approximate).toBe(true);
  });

  it('is refused by a forged token, which is simply signed out', async () => {
    const id = await account('forged@duncit.com', ['USER', 'FINANCE_MANAGER']);
    const forged = tokenFor(id, ['USER', 'FINANCE_MANAGER'], { portal: 'finance', verified: true, policy: 'x' }, 'not-the-secret');
    const data = await server.client(forged).request<{ me: unknown }>(`query { me { user_id } }`);
    expect(data.me).toBeNull();
  });

  it('cannot open the screen when the session is already verified', async () => {
    const id = await account('done@duncit.com', ['USER', 'FINANCE_MANAGER']);
    const verified = tokenFor(id, ['USER', 'FINANCE_MANAGER'], { portal: 'finance', verified: true, policy: await computePolicyVersion() });
    setCurrentPolicyVersion(await computePolicyVersion());
    const error = await failure(server.client(verified).request(CHALLENGE));
    expect(error.extensions?.code).toBe('BAD_REQUEST');
  });
});

describe('a verified session', () => {
  it('works like any other session, and a token with no claim at all is untouched', async () => {
    const id = await account('ok@duncit.com', ['USER', 'FINANCE_MANAGER']);
    const version = await computePolicyVersion();
    setCurrentPolicyVersion(version);
    const verified = tokenFor(id, ['USER', 'FINANCE_MANAGER'], { portal: 'finance', verified: true, policy: version });
    const legacy = tokenFor(id, ['USER', 'FINANCE_MANAGER']);
    for (const token of [verified, legacy]) {
      const data = await server.client(token).request<{ myLoginActivity: { retention_days: number } }>(
        `query { myLoginActivity { retention_days } }`
      );
      expect(data.myLoginActivity.retention_days).toBeGreaterThan(0);
    }
  });

  it('owes the screen again once the terms it consented to have changed', async () => {
    const id = await account('stale@duncit.com', ['USER', 'FINANCE_MANAGER']);
    const oldToken = tokenFor(id, ['USER', 'FINANCE_MANAGER'], { portal: 'finance', verified: true, policy: 'old-terms' });
    setCurrentPolicyVersion(await computePolicyVersion());

    const refused = await failure(server.client(oldToken).request(`query { myLoginActivity { retention_days } }`));
    expect(refused.extensions?.code).toBe('UNAUTHENTICATED');
    const data = await server.client(oldToken).request<{ portalSecurityChallenge: { reverify: boolean } }>(CHALLENGE);
    expect(data.portalSecurityChallenge.reverify).toBe(true);
  });
});

describe('submitPortalSecurityVerification', () => {
  it('stores the verification, seals the address and the coordinates, and hands back a working session', async () => {
    const id = await account('asha@duncit.com', ['USER', 'FINANCE_MANAGER']);
    const input = await submitInput();
    const { submitPortalSecurityVerification: result } = await server
      .client(pending(id))
      .request<{ submitPortalSecurityVerification: { token: string; policy_version: string; record_id: string } }>(SUBMIT, { input });

    const claims = jwt.verify(result.token, secret()) as { id: string; psv: Psv };
    expect(claims).toMatchObject({ id, psv: { portal: 'finance', verified: true, policy: input.policy_version } });
    setCurrentPolicyVersion(input.policy_version);
    const session = await server.client(result.token).request<{ myLoginActivity: { retention_days: number } }>(
      `query { myLoginActivity { retention_days } }`
    );
    expect(session.myLoginActivity.retention_days).toBeGreaterThan(0);

    const row = await PortalSecurityVerificationModel.findById(result.record_id).lean();
    expect(row).toMatchObject({
      portal_key: 'finance',
      result: 'VERIFIED',
      method: 'GPS',
      user_name: 'Asha Rao',
      has_location: true,
      accuracy_m: 18.5,
      ip_masked: '127.0.x.x',
      policy_version: input.policy_version,
      consent: { authorized_person: true, credentials_not_shared: true, policies_acknowledged: true, location_consent: true },
      employee: { is_employee: false },
    });
    // The two fields a database read must not hand out are not readable in storage.
    expect(row?.ip_sealed).toMatch(/^enc:v1:/);
    expect(row?.ip_sealed).not.toContain('127.0.0.1');
    expect(row?.location_sealed).toMatch(/^enc:v1:/);
    expect(row?.location_sealed).not.toContain('12.9716');
    expect(row?.ip_hash).toBe(hashIp('127.0.0.1'));
  });

  it('records, as the HR portal sees it, that this person holds a seat on the team', async () => {
    const id = await account('seat@duncit.com', ['USER', 'FINANCE_MANAGER']);
    await TeamStructureNodeModel.create({
      structure_id: new Types.ObjectId(),
      kind: 'ROLE',
      title: 'Payments Engineer',
      department: 'Engineering',
      employment_type: 'FULL_TIME',
      status: 'FILLED',
      user_id: new Types.ObjectId(id),
    });
    const { submitPortalSecurityVerification: result } = await server
      .client(pending(id))
      .request<{ submitPortalSecurityVerification: { record_id: string } }>(SUBMIT, { input: await submitInput() });
    const row = await PortalSecurityVerificationModel.findById(result.record_id).lean();
    expect(row?.employee).toMatchObject({ is_employee: true, title: 'Payments Engineer', department: 'Engineering', employment_type: 'FULL_TIME' });
  });

  it.each([
    ['an unticked acknowledgement', { consent: { ...consent, credentials_not_shared: false } }, 'credentials'],
    ['no location', { location: null }, 'location'],
    ['no location consent', { consent: { ...consent, location_consent: false } }, 'location'],
    ['an impossible latitude', { location: { ...FIX, latitude: 91 } }, 'latitude'],
    ['a negative accuracy', { location: { ...FIX, accuracy_meters: -1 } }, 'accuracy'],
  ])('refuses %s and stores nothing', async (_name, over, mention) => {
    const id = await account(`bad-${mention}@duncit.com`, ['USER', 'FINANCE_MANAGER']);
    const error = await failure(server.client(pending(id)).request(SUBMIT, { input: await submitInput(over) }));
    expect(error.extensions?.code).toBe('BAD_USER_INPUT');
    expect((error.extensions?.errors ?? []).join(' ').toLowerCase()).toContain(mention);
    expect(await PortalSecurityVerificationModel.countDocuments()).toBe(0);
  });

  it('refuses consent given to wording that has since changed, and says which version is current', async () => {
    const id = await account('changed@duncit.com', ['USER', 'FINANCE_MANAGER']);
    const error = await failure(
      server.client(pending(id)).request(SUBMIT, { input: await submitInput({ policy_version: 'an-older-version' }) })
    );
    expect(error.extensions?.code).toBe('POLICY_CHANGED');
    expect(await PortalSecurityVerificationModel.countDocuments()).toBe(0);
  });

  it('refuses an account that lost access to the console while the screen was open', async () => {
    const id = await account('revoked@duncit.com', ['USER']);
    const error = await failure(server.client(pending(id)).request(SUBMIT, { input: await submitInput() }));
    expect(error.extensions?.code).toBe('FORBIDDEN');
    expect(await PortalSecurityVerificationModel.countDocuments()).toBe(0);
  });

  it('is not available to a caller with no pending sign-in', async () => {
    const anonymous = await failure(server.client().request(SUBMIT, { input: await submitInput() }));
    expect(anonymous.extensions?.code).toBe('UNAUTHENTICATED');
  });
});

describe('the alternative to sharing a location', () => {
  const REASON = 'My laptop has no location service';

  it('is recorded, waits for an administrator, and is only ever asked once at a time', async () => {
    const id = await account('denied@duncit.com', ['USER', 'FINANCE_MANAGER']);
    const input = { reason: REASON, location_error: 'PERMISSION_DENIED' };
    const first = await server.client(pending(id)).request<{ requestPortalSecurityException: { id: string; status: string } }>(REQUEST_EXCEPTION, { input });
    const again = await server.client(pending(id)).request<{ requestPortalSecurityException: { id: string } }>(REQUEST_EXCEPTION, { input });

    expect(first.requestPortalSecurityException.status).toBe('PENDING');
    expect(again.requestPortalSecurityException.id).toBe(first.requestPortalSecurityException.id);
    expect(await PortalSecurityExceptionModel.countDocuments()).toBe(1);
    // The refusal is in the log as a refusal, with no location and no way in.
    const logged = await PortalSecurityVerificationModel.findOne().lean();
    expect(logged).toMatchObject({ result: 'LOCATION_DENIED', has_location: false, location_error: 'PERMISSION_DENIED', method: null });
  });

  it('needs a real reason', async () => {
    const id = await account('short@duncit.com', ['USER', 'FINANCE_MANAGER']);
    const error = await failure(server.client(pending(id)).request(REQUEST_EXCEPTION, { input: { reason: 'no' } }));
    expect(error.extensions?.code).toBe('BAD_USER_INPUT');
  });

  it('opens the console only after a different administrator approves, and only once', async () => {
    const id = await account('wait@duncit.com', ['USER', 'FINANCE_MANAGER']);
    const reviewer = await account('reviewer@duncit.com', ['USER', 'TECH_MANAGER'], 'Rohan');
    const reviewerToken = tokenFor(reviewer, ['USER', 'TECH_MANAGER']);
    const { requestPortalSecurityException: request } = await server
      .client(pending(id))
      .request<{ requestPortalSecurityException: { id: string } }>(REQUEST_EXCEPTION, { input: { reason: REASON } });

    // Not yet approved: the alternative cannot be used.
    const early = await failure(
      server.client(pending(id)).request(SUBMIT, { input: await submitInput({ location: null, exception_id: request.id }) })
    );
    expect(early.extensions?.code).toBe('FORBIDDEN');

    const decided = await server.client(reviewerToken).request<{ decidePortalSecurityException: { status: string; decided_by_name: string; expires_at: string } }>(
      DECIDE,
      { input: { id: request.id, approve: true, note: 'Verified by phone' } }
    );
    expect(decided.decidePortalSecurityException).toMatchObject({ status: 'APPROVED', decided_by_name: 'Rohan Rao' });
    expect(new Date(decided.decidePortalSecurityException.expires_at).getTime()).toBeGreaterThan(Date.now());

    const used = await server.client(pending(id)).request<{ submitPortalSecurityVerification: { record_id: string } }>(SUBMIT, {
      input: await submitInput({ consent: { ...consent, location_consent: false }, location: null, exception_id: request.id }),
    });
    const row = await PortalSecurityVerificationModel.findById(used.submitPortalSecurityVerification.record_id).lean();
    expect(row).toMatchObject({ result: 'EXCEPTION_APPROVED', method: 'ADMIN_EXCEPTION', has_location: false });
    expect((await PortalSecurityExceptionModel.findById(request.id).lean())?.status).toBe('USED');

    // An approval is spent by one verification.
    const reused = await failure(
      server.client(pending(id)).request(SUBMIT, { input: await submitInput({ location: null, exception_id: request.id }) })
    );
    expect(reused.extensions?.code).toBe('FORBIDDEN');
  });

  it("will not let someone use another person's approval", async () => {
    const owner = await account('owner@duncit.com', ['USER', 'FINANCE_MANAGER']);
    const other = await account('other@duncit.com', ['USER', 'FINANCE_MANAGER']);
    const reviewer = await account('boss@duncit.com', ['USER', 'SUPER_ADMIN']);
    const { requestPortalSecurityException: request } = await server
      .client(pending(owner))
      .request<{ requestPortalSecurityException: { id: string } }>(REQUEST_EXCEPTION, { input: { reason: REASON } });
    await server.client(tokenFor(reviewer, ['USER', 'SUPER_ADMIN'])).request(DECIDE, { input: { id: request.id, approve: true } });

    const error = await failure(
      server.client(pending(other)).request(SUBMIT, { input: await submitInput({ location: null, exception_id: request.id }) })
    );
    expect(error.extensions?.code).toBe('FORBIDDEN');
  });

  it('refuses an approval that has run out', async () => {
    const id = await account('late@duncit.com', ['USER', 'FINANCE_MANAGER']);
    const created = await PortalSecurityExceptionModel.create({
      user_id: new Types.ObjectId(id),
      portal_key: 'finance',
      reason: REASON,
      status: 'APPROVED',
      expires_at: new Date(Date.now() - 60_000),
    });
    const error = await failure(
      server.client(pending(id)).request(SUBMIT, { input: await submitInput({ location: null, exception_id: String(created._id) }) })
    );
    expect(error.extensions?.code).toBe('FORBIDDEN');
  });

  it('cannot be decided by the person who asked, by a plain member, or twice', async () => {
    const asker = await account('asker@duncit.com', ['USER', 'TECH_MANAGER']);
    const member = await account('member@duncit.com', ['USER']);
    const reviewer = await account('judge@duncit.com', ['USER', 'TECH_MANAGER']);
    const created = await PortalSecurityExceptionModel.create({ user_id: new Types.ObjectId(asker), portal_key: 'tech', reason: REASON });
    const id = String(created._id);
    const decide = (who: string, roles: string[]) =>
      server.client(tokenFor(who, roles)).request(DECIDE, { input: { id, approve: false, note: 'No' } });

    expect((await failure(decide(asker, ['USER', 'TECH_MANAGER']))).message).toMatch(/your own request/i);
    expect((await failure(decide(member, ['USER']))).extensions?.code).toBe('FORBIDDEN');
    await decide(reviewer, ['USER', 'TECH_MANAGER']);
    expect((await failure(decide(reviewer, ['USER', 'TECH_MANAGER']))).extensions?.code).toBe('CONFLICT');
  });
});

describe('reading the log', () => {
  const TABLE = `query($query: TableQueryInput) { portalSecurityLogsTable(query: $query) { total rows {
    id user_name portal_key result ip_masked has_location is_employee ip_city } } }`;
  const DETAIL = `query($id: ID!) { portalSecurityLog(id: $id) {
    id ip ip_location_is_approximate latitude longitude accuracy_m is_employee current_is_employee
    consent { authorized_person location_consent } related { id } access_history { actor_name action } } }`;

  async function verifiedRecord() {
    const id = await account('logged@duncit.com', ['USER', 'FINANCE_MANAGER']);
    const { submitPortalSecurityVerification } = await server
      .client(pending(id))
      .request<{ submitPortalSecurityVerification: { record_id: string } }>(SUBMIT, { input: await submitInput() });
    return submitPortalSecurityVerification.record_id;
  }

  const reviewerToken = async (roles = ['USER', 'TECH_MANAGER']) => tokenFor(await account(`rev-${roles.join('')}@duncit.com`, roles), roles);

  it('shows a reviewer the rows without the address or the coordinates, and records that it was read', async () => {
    await verifiedRecord();
    const reviewer = await reviewerToken();
    const data = await server.client(reviewer).request<{ portalSecurityLogsTable: { total: number; rows: Array<Record<string, unknown>> } }>(TABLE);
    expect(data.portalSecurityLogsTable.total).toBe(1);
    expect(data.portalSecurityLogsTable.rows[0]).toMatchObject({ portal_key: 'finance', result: 'VERIFIED', ip_masked: '127.0.x.x', has_location: true, is_employee: false });
    expect(await PortalSecurityAccessLogModel.countDocuments({ action: 'LIST' })).toBe(1);
  });

  it('finds a row by its exact address even though the address is stored sealed', async () => {
    await verifiedRecord();
    const reviewer = await reviewerToken(['USER', 'SUPER_ADMIN']);
    const hit = await server.client(reviewer).request<{ portalSecurityLogsTable: { total: number } }>(TABLE, { query: { search: '127.0.0.1' } });
    const miss = await server.client(reviewer).request<{ portalSecurityLogsTable: { total: number } }>(TABLE, { query: { search: '10.9.8.7' } });
    expect(hit.portalSecurityLogsTable.total).toBe(1);
    expect(miss.portalSecurityLogsTable.total).toBe(0);
  });

  it('opens one row in full, and writes the access entry before it shows anything', async () => {
    const recordId = await verifiedRecord();
    const reviewer = await reviewerToken();
    const data = await server.client(reviewer).request<{ portalSecurityLog: Record<string, any> }>(DETAIL, { id: recordId });
    const detail = data.portalSecurityLog;
    expect(detail).toMatchObject({
      ip: '127.0.0.1',
      ip_location_is_approximate: true,
      latitude: 12.9716,
      longitude: 77.5946,
      accuracy_m: 18.5,
      is_employee: false,
      current_is_employee: false,
      consent: { authorized_person: true, location_consent: true },
    });
    // The entry for THIS read is already part of what the reviewer sees.
    expect(detail.access_history).toEqual([expect.objectContaining({ action: 'VIEW' })]);
    expect(await PortalSecurityAccessLogModel.countDocuments({ action: 'VIEW', record_id: new Types.ObjectId(recordId) })).toBe(1);
  });

  it.each([
    ['a plain member', ['USER']],
    ['the Logs console seat', ['USER', 'LOGS_MANAGER']],
    ['a finance manager', ['USER', 'FINANCE_MANAGER']],
  ])('keeps the log, its detail and its requests from %s', async (_name, roles) => {
    const recordId = await verifiedRecord();
    const token = await reviewerToken(roles);
    for (const call of [
      server.client(token).request(TABLE),
      server.client(token).request(DETAIL, { id: recordId }),
      server.client(token).request(`query { portalSecurityExceptionsTable { total } }`),
    ]) {
      expect((await failure(call)).extensions?.code).toBe('FORBIDDEN');
    }
    expect(await PortalSecurityAccessLogModel.countDocuments()).toBe(0);
  });

  it('is closed to a caller who is not signed in', async () => {
    const error = await failure(server.client().request(TABLE));
    expect(error.extensions?.code).toBe('UNAUTHENTICATED');
  });

  it('answers NOT_FOUND for an id that is not a record, without writing an access entry', async () => {
    const reviewer = await reviewerToken();
    const bad = await failure(server.client(reviewer).request(DETAIL, { id: 'nope' }));
    const missing = await failure(server.client(reviewer).request(DETAIL, { id: new Types.ObjectId().toString() }));
    expect([bad.extensions?.code, missing.extensions?.code]).toEqual(['NOT_FOUND', 'NOT_FOUND']);
    expect(await PortalSecurityAccessLogModel.countDocuments()).toBe(0);
  });
});
