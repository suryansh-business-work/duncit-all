const podService = {
  revokePreview: jest.fn(),
  list: jest.fn(),
  listJoinedBy: jest.fn(),
  table: jest.fn(),
  listMyHostPods: jest.fn(),
  tableMine: jest.fn(),
  getById: jest.fn(),
  getBySlugs: jest.fn(),
  listComments: jest.fn(),
  activeLocationIds: jest.fn(),
  hostDeleteImpact: jest.fn(),
  spotLimits: jest.fn(),
  create: jest.fn(),
  createForPartner: jest.fn(),
  update: jest.fn(),
  hostResubmit: jest.fn(),
  hostRemove: jest.fn(),
  addStatus: jest.fn(),
  revokeCancellation: jest.fn(),
  setHidden: jest.fn(),
  incrementHits: jest.fn(),
  toggleLike: jest.fn(),
  addComment: jest.fn(),
  toggleCommentLike: jest.fn(),
  deleteComment: jest.fn(),
  generateMeetingLink: jest.fn(),
};
const coHost = { candidates: jest.fn(), myCoHostedPods: jest.fn(), myPodsWithCoHosts: jest.fn() };
const media = { board: jest.fn(), add: jest.fn(), remove: jest.fn() };
const canViewContent = jest.fn();
const primePodRelations = jest.fn(async () => undefined);
const throwIfClientGone = jest.fn();
const podCancellationRisk = jest.fn();
const dashboardLoad = jest.fn();
const seesHidden = jest.fn(() => false);

jest.mock('../../pod.service', () => ({
  podService,
  mapPodToPublic: (d: unknown) => ({ mapped: d }),
  loadPodClubSlugMap: async () => new Map(),
}));
jest.mock('../../coHost.service', () => ({ coHostService: coHost }));
jest.mock('../../podMedia.service', () => ({ podMediaService: media }));
jest.mock('../../pod.cancellationRisk', () => ({ podCancellationRisk: (...a: unknown[]) => podCancellationRisk(...a) }));
jest.mock('../../pod.dashboard', () => ({ podDashboardService: { load: (...a: unknown[]) => dashboardLoad(...a) } }));
jest.mock('../../pod.loaders', () => ({ primePodRelations: (...a: unknown[]) => primePodRelations(...(a as [])) }));
jest.mock('@utils/clientPresence', () => ({ throwIfClientGone: (...a: unknown[]) => throwIfClientGone(...a) }));
jest.mock('@utils/hidden', () => ({ ...jest.requireActual('@utils/hidden'), canSeeHidden: () => seesHidden() }));
jest.mock('@modules/access/user/user.service', () => ({
  userService: { canViewContent: (...a: unknown[]) => canViewContent(...a) },
}));

import { podResolvers } from '../../pod.resolver';
import { makeContext } from '@test/harness';

const Q = podResolvers.Query as Record<string, (...a: any[]) => Promise<any>>;
const M = podResolvers.Mutation as Record<string, (...a: any[]) => Promise<any>>;
const roleCtx = (roles: string[], id = 'u1') => makeContext({ id, roles });
const admin = () => roleCtx(['SUPER_ADMIN'], 'admin-1');
const user = () => roleCtx(['USER']);
const anon = () => makeContext(null);

beforeEach(() => {
  jest.clearAllMocks();
  seesHidden.mockReturnValue(false);
});

describe('admin-only pod operations', () => {
  const adminOps: [string, 'Q' | 'M', unknown, jest.Mock][] = [
    ['podRevokePreview', 'Q', { pod_doc_id: 'p' }, podService.revokePreview],
    ['podCancellationRisk', 'Q', { pod_doc_id: 'p' }, podCancellationRisk],
    ['podDashboard', 'Q', { days: 7 }, dashboardLoad],
    ['createPod', 'M', { input: {} }, podService.create],
    ['updatePod', 'M', { pod_doc_id: 'p', input: {} }, podService.update],
    ['revokePodCancellation', 'M', { pod_doc_id: 'p' }, podService.revokeCancellation],
    ['setPodHidden', 'M', { pod_doc_id: 'p', hidden: true, reason: 'r' }, podService.setHidden],
    ['generateMeetingLink', 'M', { platform: 'MEET', title: 't', start: 's' }, podService.generateMeetingLink],
  ];

  it.each(adminOps)('%s refuses anonymous and non-admin callers', async (name, kind, args, fn) => {
    const target = kind === 'Q' ? Q : M;
    await expect((async () => target[name]({}, args, anon()))()).rejects.toThrow();
    await expect((async () => target[name]({}, args, user()))()).rejects.toThrow();
    expect(fn).not.toHaveBeenCalled();
  });

  it('delegates for an admin, defaulting the dashboard window to 30 days', async () => {
    await Q.podRevokePreview({}, { pod_doc_id: 'p' }, admin());
    expect(podService.revokePreview).toHaveBeenCalledWith('p');
    await Q.podCancellationRisk({}, { pod_doc_id: 'p' }, admin());
    expect(podCancellationRisk).toHaveBeenCalledWith('p');
    await Q.podDashboard({}, {}, admin());
    expect(dashboardLoad).toHaveBeenLastCalledWith(30);
    await Q.podDashboard({}, { days: 7 }, admin());
    expect(dashboardLoad).toHaveBeenLastCalledWith(7);
    await M.createPod({}, { input: { a: 1 } }, admin());
    expect(podService.create).toHaveBeenCalledWith({ a: 1 }, { actorUserId: 'admin-1', source: 'ADMIN' });
    await M.updatePod({}, { pod_doc_id: 'p', input: { b: 2 } }, admin());
    expect(podService.update).toHaveBeenCalledWith('p', { b: 2 }, { actorUserId: 'admin-1', source: 'ADMIN', includeDeleted: true });
    await M.revokePodCancellation({}, { pod_doc_id: 'p' }, admin());
    expect(podService.revokeCancellation).toHaveBeenCalledWith('p', 'admin-1');
    await M.setPodHidden({}, { pod_doc_id: 'p', hidden: true, reason: 'spam' }, admin());
    expect(podService.setHidden).toHaveBeenCalledWith('p', true, 'spam', 'admin-1');
    await M.generateMeetingLink({}, { platform: 'MEET', title: 't', start: 's' }, admin());
    expect(podService.generateMeetingLink).toHaveBeenCalledWith({ platform: 'MEET', title: 't', start: 's' });
  });

  it('a zonal admin counts as an admin', async () => {
    await M.createPod({}, { input: {} }, roleCtx(['ZONAL_ADMIN'], 'z1'));
    expect(podService.create).toHaveBeenCalledWith({}, { actorUserId: 'z1', source: 'ADMIN' });
  });
});

describe('signed-in pod operations', () => {
  const authOps: [string, 'Q' | 'M', unknown, jest.Mock, unknown[]][] = [
    ['myHostPods', 'Q', { from: 'a', to: 'b' }, podService.listMyHostPods, ['u1', { from: 'a', to: 'b' }]],
    ['myHostPodsTable', 'Q', { query: { page: 1 } }, podService.tableMine, ['u1', { page: 1 }]],
    ['coHostCandidates', 'Q', { sub_category_id: 's' }, coHost.candidates, ['u1', { sub_category_id: 's' }]],
    ['hostPodDeleteImpact', 'Q', { pod_doc_id: 'p' }, podService.hostDeleteImpact, ['p', 'u1']],
    ['createPartnerPod', 'M', { input: { x: 1 } }, podService.createForPartner, ['u1', { x: 1 }]],
    ['hostResubmitPod', 'M', { pod_doc_id: 'p', input: {} }, podService.hostResubmit, ['p', 'u1', {}]],
    ['hostDeletePod', 'M', { pod_doc_id: 'p', reason_subject: 's', reason_note: 'n' }, podService.hostRemove, ['p', 'u1', 's', 'n']],
    ['togglePodLike', 'M', { pod_doc_id: 'p' }, podService.toggleLike, ['p', 'u1']],
    ['addPodComment', 'M', { pod_doc_id: 'p', text: 'hi' }, podService.addComment, ['p', 'u1', 'hi']],
    ['togglePodCommentLike', 'M', { pod_doc_id: 'p', comment_id: 'c' }, podService.toggleCommentLike, ['p', 'c', 'u1']],
    ['podMediaBoard', 'Q', { pod_doc_id: 'p' }, media.board, ['p', { id: 'u1', isAdmin: false }]],
    ['addPodPartyMedia', 'M', { pod_doc_id: 'p', media: [] }, media.add, ['p', { id: 'u1', isAdmin: false }, []]],
    ['removePodPartyMedia', 'M', { pod_doc_id: 'p', url: 'u' }, media.remove, ['p', { id: 'u1', isAdmin: false }, 'u']],
    ['addPodStatus', 'M', { pod_doc_id: 'p', media: { k: 1 } }, podService.addStatus, ['p', 'u1', { k: 1 }, false]],
    ['deletePodComment', 'M', { pod_doc_id: 'p', comment_id: 'c' }, podService.deleteComment, ['p', 'c', 'u1', false]],
  ];

  it.each(authOps)('%s requires sign-in and acts as the caller', async (name, kind, args, fn, expected) => {
    const target = kind === 'Q' ? Q : M;
    await expect((async () => target[name]({}, args, anon()))()).rejects.toThrow();
    expect(fn).not.toHaveBeenCalled();
    fn.mockResolvedValue([]);
    await target[name]({}, args, user());
    expect(fn).toHaveBeenCalledWith(...expected);
  });

  it('passes the admin flag through for status and comment writes', async () => {
    podService.addStatus.mockResolvedValue({});
    await M.addPodStatus({}, { pod_doc_id: 'p', media: {} }, admin());
    expect(podService.addStatus).toHaveBeenCalledWith('p', 'admin-1', {}, true);
    podService.deleteComment.mockResolvedValue({});
    await M.deletePodComment({}, { pod_doc_id: 'p', comment_id: 'c' }, admin());
    expect(podService.deleteComment).toHaveBeenCalledWith('p', 'c', 'admin-1', true);
  });

  it('podSpotLimits passes roles and the admin flag', async () => {
    await expect(Q.podSpotLimits({}, { pod_doc_id: 'p' }, anon())).rejects.toThrow();
    await Q.podSpotLimits({}, { pod_doc_id: 'p' }, roleCtx(['USER', 'HOST']));
    expect(podService.spotLimits).toHaveBeenCalledWith('p', { id: 'u1', roles: ['USER', 'HOST'], isAdmin: false });
  });

  it('myCoHostedPods defaults to ACCEPTED and maps the result; myPodsWithCoHosts maps too', async () => {
    coHost.myCoHostedPods.mockResolvedValue([{ id: 'a' }]);
    coHost.myPodsWithCoHosts.mockResolvedValue([{ id: 'b' }]);
    expect(await Q.myCoHostedPods({}, {}, user())).toEqual([{ mapped: { id: 'a' } }]);
    expect(coHost.myCoHostedPods).toHaveBeenLastCalledWith('u1', 'ACCEPTED');
    await Q.myCoHostedPods({}, { status: 'PENDING' }, user());
    expect(coHost.myCoHostedPods).toHaveBeenLastCalledWith('u1', 'PENDING');
    expect(await Q.myPodsWithCoHosts({}, {}, user())).toEqual([{ mapped: { id: 'b' } }]);
    await expect(Q.myCoHostedPods({}, {}, anon())).rejects.toThrow();
    await expect(Q.myPodsWithCoHosts({}, {}, anon())).rejects.toThrow();
  });
});

describe('pod reads', () => {
  it('pods lists with review and hidden visibility from the reader, primes relations and checks the client', async () => {
    podService.list.mockResolvedValue([{ id: 'p' }]);
    expect(await Q.pods({}, { filter: { a: 1 } }, user())).toEqual([{ id: 'p' }]);
    const opts = podService.list.mock.calls[0][1];
    expect(opts).toMatchObject({ includePendingApproval: false, includeHidden: false });
    await opts.prime([{ id: 'p' }]);
    expect(primePodRelations).toHaveBeenCalled();
    expect(throwIfClientGone).toHaveBeenCalled();
    seesHidden.mockReturnValue(true);
    await Q.pods({}, {}, roleCtx(['ONBOARDING_MANAGER']));
    expect(podService.list.mock.calls[1][1]).toMatchObject({ includePendingApproval: true, includeHidden: true });
  });

  it('userJoinedPods is empty when the viewer may not see the profile content', async () => {
    canViewContent.mockResolvedValueOnce(false);
    expect(await Q.userJoinedPods({}, { user_id: 'owner' }, anon())).toEqual([]);
    expect(podService.listJoinedBy).not.toHaveBeenCalled();
    canViewContent.mockResolvedValueOnce(true);
    podService.listJoinedBy.mockResolvedValue([{ id: 'x' }]);
    expect(await Q.userJoinedPods({}, { user_id: 'owner' }, user())).toEqual([{ id: 'x' }]);
    expect(canViewContent).toHaveBeenLastCalledWith('owner', 'u1');
    expect(primePodRelations).toHaveBeenCalled();
  });

  it('podsTable only lets reviewers include cancelled pods', async () => {
    podService.table.mockResolvedValue({ rows: [{ id: 'r' }] });
    await Q.podsTable({}, { query: {}, include_deleted: true }, user());
    expect(podService.table.mock.calls[0][1]).toMatchObject({ includeDeleted: false, lifecycle: null });
    await Q.podsTable({}, { query: {}, include_deleted: true }, admin());
    expect(podService.table.mock.calls[1][1]).toMatchObject({ includeDeleted: true });
    await Q.podsTable({}, { query: {}, lifecycle: 'CANCELLED' }, admin());
    expect(podService.table.mock.calls[2][1]).toMatchObject({ includeDeleted: true, lifecycle: 'CANCELLED' });
    await Q.podsTable({}, { query: {} }, admin());
    expect(podService.table.mock.calls[3][1]).toMatchObject({ includeDeleted: false });
  });

  it('pod and podBySlugs hide a hidden pod from ordinary readers; deleted ones need review rights', async () => {
    podService.getById.mockResolvedValue({ id: 'p', is_hidden: false, club_id: 'c' });
    podService.getBySlugs.mockResolvedValue({ id: 'p', is_hidden: false, club_id: 'c' });
    expect(await Q.pod({}, { pod_doc_id: 'p' }, user())).toMatchObject({ id: 'p' });
    expect(podService.getById).toHaveBeenLastCalledWith('p', { includeDeleted: false });
    await Q.pod({}, { pod_doc_id: 'p', include_deleted: true }, user());
    expect(podService.getById).toHaveBeenLastCalledWith('p', { includeDeleted: false });
    await Q.pod({}, { pod_doc_id: 'p', include_deleted: true }, admin());
    expect(podService.getById).toHaveBeenLastCalledWith('p', { includeDeleted: true });
    expect(await Q.podBySlugs({}, { club_slug: 'c', pod_slug: 's' }, anon())).toMatchObject({ id: 'p' });
    expect(podService.getBySlugs).toHaveBeenCalledWith('c', 's');
    podService.getById.mockResolvedValue({ id: 'h', is_hidden: true, club_id: 'c', pod_hosts_id: [] });
    expect(await Q.pod({}, { pod_doc_id: 'h' }, user())).toBeNull();
  });

  it('simple reads delegate', async () => {
    podService.listComments.mockResolvedValue([1]);
    podService.activeLocationIds.mockResolvedValue(['l']);
    expect(await Q.podComments({}, { pod_doc_id: 'p' })).toEqual([1]);
    expect(await Q.activePodLocationIds()).toEqual(['l']);
    podService.incrementHits.mockResolvedValue(4);
    expect(await M.incrementPodHits({}, { pod_doc_id: 'p' })).toBe(4);
  });
});

describe('PodComment fields', () => {
  const C = podResolvers.PodComment as Record<string, (...a: any[]) => any>;
  it('counts likes and answers liked_by_me only for a signed-in liker', () => {
    expect(C.like_count({ likes: ['a', 'b'] })).toBe(2);
    expect(C.like_count({})).toBe(0);
    expect(C.liked_by_me({ likes: ['u1'] }, {}, user())).toBe(true);
    expect(C.liked_by_me({ likes: ['u9'] }, {}, user())).toBe(false);
    expect(C.liked_by_me({}, {}, user())).toBe(false);
    expect(C.liked_by_me({ likes: ['u1'] }, {}, anon())).toBe(false);
  });
});
