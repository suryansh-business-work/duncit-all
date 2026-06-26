import { hostRequestResolvers } from '../../hostRequest.resolver';
import { hostRequestService } from '../../hostRequest.service';
import { makeContext } from '@test/harness';

jest.mock('../../hostRequest.service', () => ({
  hostRequestService: {
    myActive: jest.fn().mockResolvedValue({ id: 'active' }),
    listMine: jest.fn().mockResolvedValue([]),
    takenCategoryIds: jest.fn().mockResolvedValue(['leaf-1']),
    list: jest.fn().mockResolvedValue([]),
    getById: jest.fn().mockResolvedValue(null),
    submit: jest.fn().mockResolvedValue({ id: 'new' }),
    acknowledge: jest.fn().mockResolvedValue({ id: 'ack' }),
    approve: jest.fn().mockResolvedValue({ id: 'app' }),
    reject: jest.fn().mockResolvedValue({ id: 'rej' }),
  },
}));

const svc = hostRequestService as jest.Mocked<typeof hostRequestService>;
const Q = hostRequestResolvers.Query as any;
const M = hostRequestResolvers.Mutation as any;

const host = makeContext({ id: 'host-1', email: 'host@example.com', roles: ['USER'] });
const hostRole = makeContext({ id: 'host-2', email: 'host2@example.com', roles: ['USER', 'HOST'] });
const staff = makeContext({ id: 'staff-1', email: 'ops@example.com', roles: ['ONBOARDING_MANAGER'] });
const anon = makeContext(null);

describe('hostRequest resolver — auth gates', () => {
  it('host queries require auth', () => {
    expect(() => Q.myHostRequest({}, {}, anon)).toThrow(/not authenticated/i);
    expect(() => Q.myHostRequests({}, {}, anon)).toThrow(/not authenticated/i);
    expect(() => Q.myHostTakenCategoryIds({}, {}, anon)).toThrow(/not authenticated/i);
    expect(() => M.submitHostRequest({}, { input: {} }, anon)).toThrow(/not authenticated/i);
  });

  it('portal queries/mutations require the onboarding role', () => {
    expect(() => Q.hostRequests({}, {}, host)).toThrow(/access denied/i);
    expect(() => Q.hostRequest({}, { id: 'x' }, host)).toThrow(/access denied/i);
    expect(() => M.acknowledgeHostRequest({}, { id: 'x' }, host)).toThrow(/access denied/i);
    expect(() => M.approveHostRequest({}, { id: 'x' }, host)).toThrow(/access denied/i);
    expect(() => M.rejectHostRequest({}, { id: 'x', notes: 'n' }, host)).toThrow(/access denied/i);
  });
});

describe('hostRequest resolver — delegation', () => {
  it('host queries delegate to the service with the caller id', async () => {
    await Q.myHostRequest({}, {}, host);
    expect(svc.myActive).toHaveBeenCalledWith('host-1');
    await Q.myHostRequests({}, {}, host);
    expect(svc.listMine).toHaveBeenCalledWith('host-1');
    await Q.myHostTakenCategoryIds({}, {}, host);
    expect(svc.takenCategoryIds).toHaveBeenCalledWith('host-1');
  });

  it('submit passes isHost=false for a plain user and isHost=true for a HOST role', async () => {
    await M.submitHostRequest({}, { input: { survey_id: 's' } }, host);
    expect(svc.submit).toHaveBeenLastCalledWith('host-1', { survey_id: 's' }, { isHost: false });
    await M.submitHostRequest({}, { input: { survey_id: 's' } }, hostRole);
    expect(svc.submit).toHaveBeenLastCalledWith('host-2', { survey_id: 's' }, { isHost: true });
  });

  it('portal queries delegate with status filter (and null when omitted)', async () => {
    await Q.hostRequests({}, { status: 'REQUESTED' }, staff);
    expect(svc.list).toHaveBeenCalledWith({ status: 'REQUESTED' });
    await Q.hostRequests({}, {}, staff);
    expect(svc.list).toHaveBeenLastCalledWith({ status: null });
    await Q.hostRequest({}, { id: 'r1' }, staff);
    expect(svc.getById).toHaveBeenCalledWith('r1');
  });

  it('portal mutations pass the reviewer derived from the caller', async () => {
    const reviewer = { id: 'staff-1', name: 'ops@example.com' };
    await M.acknowledgeHostRequest({}, { id: 'r1' }, staff);
    expect(svc.acknowledge).toHaveBeenCalledWith('r1', reviewer);
    await M.approveHostRequest({}, { id: 'r1', notes: 'ok' }, staff);
    expect(svc.approve).toHaveBeenCalledWith('r1', reviewer, 'ok');
    await M.rejectHostRequest({}, { id: 'r1', notes: 'no' }, staff);
    expect(svc.reject).toHaveBeenCalledWith('r1', reviewer, 'no');
  });

  it('reviewer name falls back to empty when the caller has no email', async () => {
    const noEmail = makeContext({ id: 'staff-2', roles: ['SUPER_ADMIN'] });
    await M.acknowledgeHostRequest({}, { id: 'r2' }, noEmail);
    expect(svc.acknowledge).toHaveBeenCalledWith('r2', { id: 'staff-2', name: '' });
  });
});
