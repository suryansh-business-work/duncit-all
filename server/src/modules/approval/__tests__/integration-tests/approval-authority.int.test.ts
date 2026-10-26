jest.mock('@services/email/email.service', () => ({
  ...jest.requireActual('@services/email/email.service'),
  sendPortalAccessApprovedEmail: jest.fn().mockResolvedValue(undefined),
  sendPortalAccessDeclinedEmail: jest.fn().mockResolvedValue(undefined),
}));

import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { makeContext } from '@test/harness';
import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { effectiveRoleKeys } from '@modules/access/user/effective-roles';
import { sessionsWithoutTransactions } from '@modules/access/user/__tests__/integration-tests/standaloneSessions.fixture';
import { portalAccessService } from '@modules/portals/portalAccess.service';
import { approvalResolvers } from '../../approval.resolver';
import { ApprovalRequestModel } from '../../approval.model';

/**
 * Who may decide an approval request, through the resolvers against a real
 * database. Approving a Portal Access request grants that console's role, so
 * two rules hold: nobody decides their own request, and only someone who may
 * grant a role directly (SUPER_ADMIN, like assignUserRoles) may approve a
 * request that grants one.
 */

const { Mutation } = approvalResolvers;

async function makeStaff(roles: string[]) {
  const doc = await UserModel.create({
    auth: { email: `approval-${new Types.ObjectId().toHexString()}@duncit.com` },
    // The city is stored too: a granted role rewrites every role row, and a
    // CITY_ADMIN row is refused without the city it administers.
    profile: { first_name: 'Ira', last_name: 'Sen', assigned_city: 'Pune' },
    metadata: { role_keys: roles },
  });
  const ctx = makeContext({ id: String(doc._id), roles, assigned_city: 'Pune' });
  return { ctx, user: ctx.user as AuthUser };
}

async function requestFor(user: AuthUser, portalKey: string) {
  await portalAccessService.requestAccess(user, portalKey);
  const row = await ApprovalRequestModel.findOne({ subject_user_id: user.id, target_id: portalKey }).lean();
  return String(row?._id);
}

const FORBIDDEN_SELF = {
  message: 'You cannot approve your own request. Another admin has to review it',
  extensions: { code: 'FORBIDDEN' },
};

describe('approval inbox — who may decide', () => {
  let sessions: jest.SpyInstance;
  beforeAll(() => {
    sessions = sessionsWithoutTransactions();
  });
  afterAll(() => sessions.mockRestore());

  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => warn.mockRestore());

  it('refuses a City Admin approving its own Portal Access request, and grants nothing', async () => {
    const cityAdmin = await makeStaff(['USER', 'CITY_ADMIN']);
    const id = await requestFor(cityAdmin.user, 'tech');

    await expect(Mutation.approveRequest(null, { id }, cityAdmin.ctx)).rejects.toMatchObject(FORBIDDEN_SELF);

    const stored = await ApprovalRequestModel.findById(id).lean();
    expect(stored).toMatchObject({ status: 'PENDING', reviewed_by: null });
    expect(await effectiveRoleKeys(cityAdmin.user.id)).not.toContain('TECH_MANAGER');
    expect(warn).toHaveBeenCalledWith(
      'approval',
      'decide',
      expect.objectContaining({ msg: 'self-review refused', requestId: id, reviewerId: cityAdmin.user.id, decision: 'APPROVED' })
    );
  });

  it('lets a requester deny (withdraw) its own request, which grants nothing', async () => {
    const cityAdmin = await makeStaff(['USER', 'CITY_ADMIN']);
    const id = await requestFor(cityAdmin.user, 'tech');

    const denied = await Mutation.denyRequest(null, { id }, cityAdmin.ctx);

    expect(denied).toMatchObject({ status: 'DENIED' });
    expect(await effectiveRoleKeys(cityAdmin.user.id)).not.toContain('TECH_MANAGER');
  });

  it.each([
    ['tech', 'TECH_MANAGER'],
    ['finance', 'FINANCE_MANAGER'],
  ])('refuses another City Admin approving a %s request (grants %s), but lets it deny', async (portal, role) => {
    const requester = await makeStaff(['USER', 'CITY_ADMIN']);
    const reviewer = await makeStaff(['USER', 'CITY_ADMIN']);
    const id = await requestFor(requester.user, portal);

    await expect(Mutation.approveRequest(null, { id }, reviewer.ctx)).rejects.toMatchObject({
      message: `Only a Super Admin can approve access that grants the ${role} role`,
      extensions: { code: 'FORBIDDEN' },
    });
    expect(await ApprovalRequestModel.findById(id).lean()).toMatchObject({ status: 'PENDING' });
    expect(await effectiveRoleKeys(requester.user.id)).not.toContain(role);
    expect(warn).toHaveBeenCalledWith(
      'approval',
      'decide',
      expect.objectContaining({ msg: 'role grant refused', requestId: id, reviewerId: reviewer.user.id, role })
    );

    const denied = await Mutation.denyRequest(null, { id, notes: 'Ask your lead' }, reviewer.ctx);
    expect(denied).toMatchObject({ status: 'DENIED', reviewed_by: reviewer.user.id, review_notes: 'Ask your lead' });
    expect(await effectiveRoleKeys(requester.user.id)).not.toContain(role);
  });

  it('refuses a City Admin approving a row that would grant SUPER_ADMIN', async () => {
    const reviewer = await makeStaff(['USER', 'CITY_ADMIN']);
    const subject = new Types.ObjectId();
    const row = await ApprovalRequestModel.create({
      type: 'PORTAL_ACCESS',
      target_id: 'admin',
      subject_user_id: subject,
      requested_by: String(subject),
    });
    await expect(Mutation.approveRequest(null, { id: String(row._id) }, reviewer.ctx)).rejects.toMatchObject({
      message: 'Only a Super Admin can approve access that grants the SUPER_ADMIN role',
      extensions: { code: 'FORBIDDEN' },
    });
    expect(await ApprovalRequestModel.findById(row._id).lean()).toMatchObject({ status: 'PENDING' });
  });

  it.each([
    ['tech', 'TECH_MANAGER'],
    ['finance', 'FINANCE_MANAGER'],
  ])("lets a Super Admin approve someone else's %s request, granting %s", async (portal, role) => {
    const requester = await makeStaff(['USER', 'CITY_ADMIN']);
    const superAdmin = await makeStaff(['USER', 'SUPER_ADMIN']);
    const id = await requestFor(requester.user, portal);

    const approved = await Mutation.approveRequest(null, { id, notes: 'Welcome' }, superAdmin.ctx);
    expect(approved).toMatchObject({ status: 'APPROVED', reviewed_by: superAdmin.user.id, review_notes: 'Welcome' });
    expect(await effectiveRoleKeys(requester.user.id)).toContain(role);
  });

  it('records one decision when two reviewers decide the same request at once', async () => {
    const requester = await makeStaff(['USER', 'CITY_ADMIN']);
    const first = await makeStaff(['USER', 'SUPER_ADMIN']);
    const second = await makeStaff(['USER', 'SUPER_ADMIN']);
    const id = await requestFor(requester.user, 'tech');

    const results = await Promise.allSettled([
      Mutation.approveRequest(null, { id }, first.ctx),
      Mutation.denyRequest(null, { id }, second.ctx),
    ]);
    const won = results.filter((r) => r.status === 'fulfilled');
    const lost = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(1);
    expect(lost[0].reason).toMatchObject({ message: 'This request has already been reviewed' });
  });
});
