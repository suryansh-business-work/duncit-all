/**
 * The Pods console (pods.duncit.com) signs in ALL_PODS_ACCESS, so the READS its
 * pages make must answer that role — `consoleReaders('POD')`, the same fix
 * console-access.ts made for the Venues, Hosts and Clubs consoles. Writes stay
 * with the platform admins: a console role reads and does not govern.
 */
const dashboardLoad = jest.fn();
const autoPodTable = jest.fn();
const autoPodCreate = jest.fn();
const autoPodUpdate = jest.fn();
const changeAdminTable = jest.fn();
const changeOffer = jest.fn();
const changeCancelPod = jest.fn();
const planTable = jest.fn();
const planCreate = jest.fn();
const ticketTable = jest.fn();
const ticketCheckIn = jest.fn();
const auditTable = jest.fn();
const auditListForPod = jest.fn();
const podUpdate = jest.fn();
const podTable = jest.fn();
const podGetById = jest.fn();
const riskLoad = jest.fn();
const autoPodGetById = jest.fn();
const autoPodCanRead = jest.fn();
const couponTableForPod = jest.fn();
const couponTable = jest.fn();
const couponListForPod = jest.fn();
const couponCreate = jest.fn();
const couponRemove = jest.fn();

jest.mock('@modules/pods/pod/pod.dashboard', () => ({
  podDashboardService: { load: (...a: unknown[]) => dashboardLoad(...a) },
}));
jest.mock('@modules/pods/pod/pod.cancellationRisk', () => ({
  podCancellationRisk: (...a: unknown[]) => riskLoad(...a),
}));
jest.mock('@modules/pods/pod/pod.loaders', () => ({
  ...jest.requireActual('@modules/pods/pod/pod.loaders'),
  primePodRelations: async () => undefined,
}));
jest.mock('@modules/pods/pod/pod.service', () => ({
  podService: {
    update: (...a: unknown[]) => podUpdate(...a),
    table: (...a: unknown[]) => podTable(...a),
    getById: (...a: unknown[]) => podGetById(...a),
  },
  mapPodToPublic: (d: unknown) => d,
  loadPodClubSlugMap: async () => new Map(),
}));
jest.mock('@modules/finance/coupon/coupon.service', () => ({
  couponService: {
    tableForPod: (...a: unknown[]) => couponTableForPod(...a),
    table: (...a: unknown[]) => couponTable(...a),
    listForPod: (...a: unknown[]) => couponListForPod(...a),
    create: (...a: unknown[]) => couponCreate(...a),
    remove: (...a: unknown[]) => couponRemove(...a),
  },
}));
jest.mock('@modules/pods/autoPod/autoPod.service', () => ({
  autoPodService: {
    table: (...a: unknown[]) => autoPodTable(...a),
    create: (...a: unknown[]) => autoPodCreate(...a),
    update: (...a: unknown[]) => autoPodUpdate(...a),
    getById: (...a: unknown[]) => autoPodGetById(...a),
    canRead: (...a: unknown[]) => autoPodCanRead(...a),
  },
  categoryPathOf: jest.fn(),
}));
jest.mock('@modules/pods/autoPod/autoPod.audience', () => ({ autoPodAudience: jest.fn() }));
jest.mock('@modules/pods/autoPod/autoPod.claims', () => ({}));
jest.mock('@modules/clubs/clubAdmin/clubAdmin.service', () => ({ clubAdminService: {} }));
jest.mock('@modules/pods/podChangeRequest/podChangeRequest.service', () => ({
  podChangeRequestService: {
    adminTable: (...a: unknown[]) => changeAdminTable(...a),
    offer: (...a: unknown[]) => changeOffer(...a),
    cancelPod: (...a: unknown[]) => changeCancelPod(...a),
  },
}));
jest.mock('@modules/pods/pod-plan/pod-plan.service', () => ({
  podPlanService: {
    table: (...a: unknown[]) => planTable(...a),
    create: (...a: unknown[]) => planCreate(...a),
  },
}));
jest.mock('@modules/pods/ticket/ticket.service', () => ({
  ticketService: {
    table: (...a: unknown[]) => ticketTable(...a),
    checkIn: (...a: unknown[]) => ticketCheckIn(...a),
  },
}));
jest.mock('@modules/pods/podAudit/podAudit.service', () => ({
  podAuditService: {
    table: (...a: unknown[]) => auditTable(...a),
    listForPod: (...a: unknown[]) => auditListForPod(...a),
  },
}));

import { podResolvers } from '@modules/pods/pod/pod.resolver';
import { autoPodResolvers } from '@modules/pods/autoPod/autoPod.resolver';
import { podChangeRequestResolvers } from '@modules/pods/podChangeRequest/podChangeRequest.resolver';
import { podPlanResolvers } from '@modules/pods/pod-plan/pod-plan.resolver';
import { eventTicketResolvers } from '@modules/pods/ticket/ticket.resolver';
import { podAuditResolvers } from '@modules/pods/podAudit/podAudit.resolver';
import { couponResolvers } from '@modules/finance/coupon/coupon.resolver';
import { makeContext } from '@test/harness';

type Op = (...a: any[]) => unknown;
const op = (resolvers: { Query?: unknown; Mutation?: unknown }, kind: 'Query' | 'Mutation', name: string): Op =>
  (resolvers[kind] as Record<string, Op>)[name];
const call = (fn: Op, args: unknown, roles: string[]) =>
  (async () => fn({}, args, makeContext({ id: 'staff-1', roles })))();

const PODS_STAFF = ['USER', 'ALL_PODS_ACCESS'];
const MEMBER = ['USER'];
const VENUES_STAFF = ['USER', 'ALL_VENUES_ACCESS'];

const READS: [string, Op, unknown, jest.Mock, unknown[]][] = [
  ['podDashboard', op(podResolvers, 'Query', 'podDashboard'), { days: 7 }, dashboardLoad, [7]],
  ['adminAutoPodsTable', op(autoPodResolvers, 'Query', 'adminAutoPodsTable'), { query: { page: 2 } }, autoPodTable, [{ page: 2 }]],
  [
    'podChangeRequests',
    op(podChangeRequestResolvers, 'Query', 'podChangeRequests'),
    { role: 'HOST', query: { page: 1 } },
    changeAdminTable,
    ['HOST', { page: 1 }],
  ],
  ['podPlansTable', op(podPlanResolvers, 'Query', 'podPlansTable'), { query: { page: 3 } }, planTable, [{ page: 3 }]],
  ['eventTicketsTable', op(eventTicketResolvers, 'Query', 'eventTicketsTable'), { query: { page: 4 } }, ticketTable, [{ page: 4 }]],
  ['podAuditLogsTable', op(podAuditResolvers, 'Query', 'podAuditLogsTable'), { query: { page: 5 } }, auditTable, [{ page: 5 }]],
  ['podAuditLogs', op(podAuditResolvers, 'Query', 'podAuditLogs'), { pod_doc_id: 'pod-1' }, auditListForPod, ['pod-1']],
  ['podCancellationRisk', op(podResolvers, 'Query', 'podCancellationRisk'), { pod_doc_id: 'pod-1' }, riskLoad, ['pod-1']],
  [
    'couponsForPodTable',
    op(couponResolvers, 'Query', 'couponsForPodTable'),
    { pod_id: 'pod-1', query: { page: 6 } },
    couponTableForPod,
    ['pod-1', { page: 6 }],
  ],
];

const WRITES: [string, Op, unknown, jest.Mock][] = [
  ['updatePod', op(podResolvers, 'Mutation', 'updatePod'), { pod_doc_id: 'p', input: {} }, podUpdate],
  ['createAutoPod', op(autoPodResolvers, 'Mutation', 'createAutoPod'), { input: {} }, autoPodCreate],
  ['updateAutoPod', op(autoPodResolvers, 'Mutation', 'updateAutoPod'), { auto_pod_doc_id: 'a', input: {} }, autoPodUpdate],
  ['offerPodChange', op(podChangeRequestResolvers, 'Mutation', 'offerPodChange'), { input: { request_id: 'r', user_id: 'u' } }, changeOffer],
  ['cancelPodForChange', op(podChangeRequestResolvers, 'Mutation', 'cancelPodForChange'), { request_id: 'r', reason: 'x' }, changeCancelPod],
  ['createPodPlan', op(podPlanResolvers, 'Mutation', 'createPodPlan'), { input: {} }, planCreate],
  ['checkInEventTicket', op(eventTicketResolvers, 'Mutation', 'checkInEventTicket'), { input: {} }, ticketCheckIn],
  ['createCoupon', op(couponResolvers, 'Mutation', 'createCoupon'), { input: {} }, couponCreate],
  ['deleteCoupon', op(couponResolvers, 'Mutation', 'deleteCoupon'), { id: 'c-1' }, couponRemove],
  // The coupon console's own reads are Marketing's and Finance's, not the pod page's.
  ['couponsTable', op(couponResolvers, 'Query', 'couponsTable'), { query: {} }, couponTable],
  ['couponsForPod', op(couponResolvers, 'Query', 'couponsForPod'), { pod_id: 'pod-1' }, couponListForPod],
];

beforeEach(() => jest.clearAllMocks());

describe('Pods console reads answer the console role', () => {
  it.each(READS)('%s reads for ALL_PODS_ACCESS and delegates its arguments', async (_name, fn, args, service, expected) => {
    service.mockResolvedValueOnce({ ok: true });
    await expect(call(fn, args, PODS_STAFF)).resolves.toEqual({ ok: true });
    expect(service).toHaveBeenCalledTimes(1);
    expect(service).toHaveBeenCalledWith(...expected);
  });

  it.each(READS)('%s still refuses a member and another console\'s staff', async (_name, fn, args, service) => {
    await expect(call(fn, args, MEMBER)).rejects.toThrow('Access Denied');
    await expect(call(fn, args, VENUES_STAFF)).rejects.toThrow('Access Denied');
    expect(service).not.toHaveBeenCalled();
  });

  it.each(READS)('%s refuses a signed-out caller', async (_name, fn, args, service) => {
    await expect((async () => fn({}, args, makeContext(null)))()).rejects.toThrow(/not authenticated/i);
    expect(service).not.toHaveBeenCalled();
  });

  it('keeps the gates that already admitted Finance and the Logs console', async () => {
    ticketTable.mockResolvedValueOnce({ rows: [] });
    auditTable.mockResolvedValueOnce({ rows: [] });
    await expect(call(op(eventTicketResolvers, 'Query', 'eventTicketsTable'), {}, ['FINANCE_MANAGER'])).resolves.toEqual({ rows: [] });
    await expect(call(op(podAuditResolvers, 'Query', 'podAuditLogsTable'), {}, ['LOGS_MANAGER'])).resolves.toEqual({ rows: [] });
  });
});

describe('Pods console writes, and reads beyond the pod page, stay with their owners', () => {
  it.each(WRITES)('%s refuses ALL_PODS_ACCESS', async (_name, fn, args, service) => {
    await expect(call(fn, args, PODS_STAFF)).rejects.toThrow('Access Denied');
    expect(service).not.toHaveBeenCalled();
  });
});

describe('Cancelled pods are a read the Pods console may include', () => {
  const podsTable = op(podResolvers, 'Query', 'podsTable');
  const pod = op(podResolvers, 'Query', 'pod');
  const tableOptions = () => podTable.mock.calls.at(-1)?.[1];

  beforeEach(() => podTable.mockResolvedValue({ rows: [], total: 0 }));

  it('podsTable includes cancelled pods for ALL_PODS_ACCESS, by the switch or the Cancelled stage', async () => {
    await call(podsTable, { query: {}, include_deleted: true }, PODS_STAFF);
    expect(tableOptions()).toMatchObject({ includeDeleted: true, lifecycle: null });
    await call(podsTable, { query: {}, lifecycle: 'CANCELLED' }, PODS_STAFF);
    expect(tableOptions()).toMatchObject({ includeDeleted: true, lifecycle: 'CANCELLED' });
    await call(podsTable, { query: {} }, PODS_STAFF);
    expect(tableOptions()).toMatchObject({ includeDeleted: false });
  });

  it('podsTable reading cancelled pods does not make the console a reviewer of pending ones', async () => {
    await call(podsTable, { query: {}, include_deleted: true }, PODS_STAFF);
    expect(tableOptions()).toMatchObject({ includePendingApproval: false });
  });

  it.each([
    ['a member', MEMBER],
    ["another console's staff", VENUES_STAFF],
  ])('podsTable keeps cancelled pods from %s', async (_who, roles) => {
    await call(podsTable, { query: {}, include_deleted: true }, roles);
    expect(tableOptions()).toMatchObject({ includeDeleted: false });
  });

  it("pod opens a cancelled pod's record for ALL_PODS_ACCESS and not for a member", async () => {
    podGetById.mockResolvedValue({ id: 'pod-1', is_hidden: false, club_id: 'club-1' });
    await expect(call(pod, { pod_doc_id: 'pod-1', include_deleted: true }, PODS_STAFF)).resolves.toMatchObject({ id: 'pod-1' });
    expect(podGetById).toHaveBeenLastCalledWith('pod-1', { includeDeleted: true });
    await call(pod, { pod_doc_id: 'pod-1', include_deleted: true }, MEMBER);
    expect(podGetById).toHaveBeenLastCalledWith('pod-1', { includeDeleted: false });
  });
});

describe('An Auto Pod record reads for the Pods console', () => {
  const autoPod = op(autoPodResolvers, 'Query', 'autoPod');

  it('answers ALL_PODS_ACCESS without asking whether they have standing in the offer', async () => {
    autoPodGetById.mockResolvedValueOnce({ id: 'auto-1' });
    await expect(call(autoPod, { auto_pod_doc_id: 'auto-1' }, PODS_STAFF)).resolves.toEqual({ id: 'auto-1' });
    expect(autoPodCanRead).not.toHaveBeenCalled();
    expect(autoPodGetById).toHaveBeenCalledWith('auto-1');
  });

  it('answers NOT_FOUND to a member or another console with no standing in the offer', async () => {
    autoPodCanRead.mockResolvedValue(false);
    await expect(call(autoPod, { auto_pod_doc_id: 'auto-1' }, MEMBER)).rejects.toThrow('Auto Pod not found');
    await expect(call(autoPod, { auto_pod_doc_id: 'auto-1' }, VENUES_STAFF)).rejects.toThrow('Auto Pod not found');
    expect(autoPodCanRead).toHaveBeenCalledWith('staff-1', 'auto-1');
    expect(autoPodGetById).not.toHaveBeenCalled();
  });

  it('still lets a partner with standing in the offer read it', async () => {
    autoPodCanRead.mockResolvedValueOnce(true);
    autoPodGetById.mockResolvedValueOnce({ id: 'auto-1' });
    await expect(call(autoPod, { auto_pod_doc_id: 'auto-1' }, MEMBER)).resolves.toEqual({ id: 'auto-1' });
  });
});
