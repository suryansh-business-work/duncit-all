const loadClub = jest.fn();
const loadUserActors = jest.fn();
const resolvePodPlace = jest.fn();
const reelHasAudio = jest.fn();
const podAttendanceRoster = jest.fn();
const coHost = { invite: jest.fn(), remove: jest.fn(), respond: jest.fn() };
const podService = { hostUpdate: jest.fn(), addStatus: jest.fn(), remove: jest.fn() };
const mapPodToPublic = jest.fn((doc: unknown) => ({ mapped: doc }));
const loadPodClubSlugMap = jest.fn(async () => new Map());

jest.mock('@modules/clubs/club/club.loaders', () => ({ loadClub: (...a: unknown[]) => loadClub(...a) }));
jest.mock('@modules/access/user/user.loaders', () => ({ loadUserActors: (...a: unknown[]) => loadUserActors(...a) }));
jest.mock('../../pod.place', () => ({ resolvePodPlace: (...a: unknown[]) => resolvePodPlace(...a) }));
jest.mock('../../pod.reelAudio', () => ({ reelHasAudio: (...a: unknown[]) => reelHasAudio(...a) }));
jest.mock('@modules/finance/finance/settlement.service', () => ({
  podAttendanceRoster: (...a: unknown[]) => podAttendanceRoster(...a),
}));
jest.mock('@utils/hidden', () => ({
  canSeeHidden: (ctx: { user?: { roles?: string[] } | null }) => !!ctx.user?.roles?.includes('SUPER_ADMIN'),
}));
jest.mock('../../coHost.service', () => ({ coHostService: coHost }));
jest.mock('../../pod.service', () => ({
  podService,
  mapPodToPublic: (...a: unknown[]) => mapPodToPublic(...(a as [unknown])),
  loadPodClubSlugMap: (...a: unknown[]) => loadPodClubSlugMap(...(a as [])),
}));

import { Types } from 'mongoose';
import { podResolvers } from '../../pod.resolver';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { makeContext } from '@test/harness';

const Pod = podResolvers.Pod as Record<string, (...a: any[]) => any>;
const M = podResolvers.Mutation as Record<string, (...a: any[]) => Promise<any>>;
const admin = () => makeContext({ id: 'admin-1', roles: ['SUPER_ADMIN'] });
const user = (id = 'u1') => makeContext({ id, roles: ['USER'] });
const anon = () => makeContext(null);

beforeEach(() => jest.clearAllMocks());

describe('Pod simple fields', () => {
  it('defaults the mode to PHYSICAL and coerces the hidden flags to booleans', () => {
    expect(Pod.pod_mode({})).toBe('PHYSICAL');
    expect(Pod.pod_mode({ pod_mode: 'VIRTUAL' })).toBe('VIRTUAL');
    expect(Pod.is_hidden({})).toBe(false);
    expect(Pod.is_hidden({ is_hidden: true })).toBe(true);
    expect(Pod.hidden_by_club({ hidden_by_club: undefined })).toBe(false);
  });

  it('shows the hidden reason to staff only, and null when blank', () => {
    expect(Pod.hidden_reason({ hidden_reason: 'spam' }, {}, admin())).toBe('spam');
    expect(Pod.hidden_reason({ hidden_reason: '' }, {}, admin())).toBeNull();
    expect(Pod.hidden_reason({ hidden_reason: 'spam' }, {}, user())).toBeNull();
    expect(Pod.hidden_reason({ hidden_reason: 'spam' }, {}, anon())).toBeNull();
  });

  it('club_hidden_reason needs a club-hidden pod, a club id and a staff reader', async () => {
    loadClub.mockResolvedValue({ hidden_reason: 'club closed' });
    const parent = { hidden_by_club: true, club_id: 'c1' };
    expect(await Pod.club_hidden_reason(parent, {}, admin())).toBe('club closed');
    expect(loadClub).toHaveBeenCalledWith(expect.anything(), 'c1');
    expect(await Pod.club_hidden_reason({ ...parent, hidden_by_club: false }, {}, admin())).toBeNull();
    expect(await Pod.club_hidden_reason({ ...parent, club_id: null }, {}, admin())).toBeNull();
    expect(await Pod.club_hidden_reason(parent, {}, user())).toBeNull();
    loadClub.mockResolvedValueOnce({ hidden_reason: '' });
    expect(await Pod.club_hidden_reason(parent, {}, admin())).toBeNull();
    loadClub.mockResolvedValueOnce(null);
    expect(await Pod.club_hidden_reason(parent, {}, admin())).toBeNull();
  });

  it('delegates reel audio detection', async () => {
    reelHasAudio.mockResolvedValue(true);
    expect(await Pod.reel_has_audio({ id: 'p' })).toBe(true);
    expect(reelHasAudio).toHaveBeenCalledWith({ id: 'p' });
  });

  it('liked_by_me needs a signed-in reader whose id is in the list', () => {
    const parent = { liked_user_ids: [new Types.ObjectId(), 'u1'] };
    expect(Pod.liked_by_me(parent, {}, user('u1'))).toBe(true);
    expect(Pod.liked_by_me(parent, {}, user('u2'))).toBe(false);
    expect(Pod.liked_by_me(parent, {}, anon())).toBe(false);
    expect(Pod.liked_by_me({}, {}, user('u1'))).toBe(false);
  });
});

describe('Pod.cancellation_risk', () => {
  const flag = {
    at_risk: true,
    evaluated_at: new Date('2026-05-01T00:00:00Z'),
    shortfall: 2,
    spots_needed: 4,
    alerted_at: new Date('2026-05-02T00:00:00Z'),
    alert_count: 3,
  };

  it('is admin-only and only for an at-risk pod', () => {
    expect(Pod.cancellation_risk({ cancellation_risk: flag }, {}, user())).toBeNull();
    expect(Pod.cancellation_risk({ cancellation_risk: flag }, {}, anon())).toBeNull();
    expect(Pod.cancellation_risk({ cancellation_risk: { ...flag, at_risk: false } }, {}, admin())).toBeNull();
    expect(Pod.cancellation_risk({}, {}, admin())).toBeNull();
    expect(Pod.cancellation_risk(null, {}, admin())).toBeNull();
  });

  it('renders the flag for an admin and defaults the optional parts', () => {
    expect(Pod.cancellation_risk({ cancellation_risk: flag }, {}, admin())).toEqual({
      at_risk: true,
      evaluated_at: '2026-05-01T00:00:00.000Z',
      shortfall: 2,
      spots_needed: 4,
      alerted_at: '2026-05-02T00:00:00.000Z',
      alert_count: 3,
    });
    expect(
      Pod.cancellation_risk({ cancellation_risk: { at_risk: true, evaluated_at: '2026-05-01' } }, {}, admin())
    ).toEqual({ at_risk: true, evaluated_at: '2026-05-01', shortfall: 0, spots_needed: null, alerted_at: null, alert_count: 0 });
    expect(Pod.cancellation_risk({ cancellation_risk: { at_risk: true } }, {}, admin()).evaluated_at).toBe('');
  });
});

describe('Pod.attendance', () => {
  it('reports zeros without an id, and "recorded" only when someone was scanned', async () => {
    expect(await Pod.attendance({})).toEqual({ attended_seats: 0, booked_seats: 0, recorded: false });
    expect(await Pod.attendance(null)).toEqual({ attended_seats: 0, booked_seats: 0, recorded: false });
    expect(podAttendanceRoster).not.toHaveBeenCalled();
    podAttendanceRoster.mockResolvedValueOnce({ attended_seats: 3, booked_seats: 5 });
    expect(await Pod.attendance({ id: 'p1' })).toEqual({ attended_seats: 3, booked_seats: 5, recorded: true });
    podAttendanceRoster.mockResolvedValueOnce({ attended_seats: 0, booked_seats: 5 });
    expect(await Pod.attendance({ _id: 'p2' })).toEqual({ attended_seats: 0, booked_seats: 5, recorded: false });
    expect(podAttendanceRoster).toHaveBeenLastCalledWith('p2');
  });
});

describe('Pod.club', () => {
  it('is null without a club id and when the loader fails', async () => {
    expect(await Pod.club({}, {}, user())).toBeNull();
    loadClub.mockRejectedValueOnce(new Error('gone'));
    expect(await Pod.club({ club_id: 'c1' }, {}, user())).toBeNull();
    loadClub.mockResolvedValueOnce({ id: 'c1' });
    expect(await Pod.club({ club_id: 'c1' }, {}, user())).toEqual({ id: 'c1' });
  });
});

describe('virtual meeting fields', () => {
  const virtual = { pod_mode: 'VIRTUAL', id: 'p1', meeting_url: 'https://meet/x', meeting_notes: 'bring ID', pod_hosts_id: ['h1'], pod_attendees: ['a1'] };

  it('never exposes a meeting on a physical pod', async () => {
    expect(await Pod.meeting_url({ ...virtual, pod_mode: undefined }, {}, admin())).toBeNull();
  });

  it('shows it to admins, hosts and listed attendees', async () => {
    expect(await Pod.meeting_url(virtual, {}, admin())).toBe('https://meet/x');
    expect(await Pod.meeting_url(virtual, {}, user('h1'))).toBe('https://meet/x');
    expect(await Pod.meeting_notes(virtual, {}, user('a1'))).toBe('bring ID');
  });

  it('falls back to a JOINED membership, and hides it from everyone else', async () => {
    const exists = jest.spyOn(PodMemberModel, 'exists');
    exists.mockResolvedValueOnce({ _id: 'm' } as never);
    expect(await Pod.meeting_url({ ...virtual, id: undefined, _id: 'p9' }, {}, user('u7'))).toBe('https://meet/x');
    expect(exists).toHaveBeenCalledWith({ pod_id: 'p9', user_id: 'u7', status: 'JOINED' });
    exists.mockResolvedValueOnce(null);
    expect(await Pod.meeting_url(virtual, {}, user('u7'))).toBeNull();
    expect(await Pod.meeting_url(virtual, {}, anon())).toBeNull();
    expect(await Pod.meeting_url({ ...virtual, meeting_url: undefined, pod_hosts_id: undefined, pod_attendees: undefined }, {}, admin())).toBeNull();
    exists.mockRestore();
  });
});

describe('place and people fields', () => {
  it('maps the memoised place to label, detail and locality, with null for blanks', async () => {
    resolvePodPlace.mockResolvedValue({ label: 'Cafe', detail: '', locality: 'Baner' });
    expect(await Pod.place_label({}, {}, user())).toBe('Cafe');
    expect(await Pod.place_detail({}, {}, user())).toBeNull();
    expect(await Pod.locality({}, {}, user())).toBe('Baner');
    resolvePodPlace.mockResolvedValue({ label: '', detail: 'Lane 3', locality: null });
    expect(await Pod.place_label({}, {}, user())).toBeNull();
    expect(await Pod.place_detail({}, {}, user())).toBe('Lane 3');
  });

  it('host_names resolves the whole page in one batch and drops unknown hosts', async () => {
    expect(await Pod.host_names({}, {}, user())).toEqual([]);
    expect(await Pod.host_names({ pod_hosts_id: [null, ''] }, {}, user())).toEqual([]);
    expect(loadUserActors).not.toHaveBeenCalled();
    loadUserActors.mockResolvedValue(new Map([['h1', { name: 'Asha' }], ['h3', {}]]));
    const names = await Pod.host_names({ pod_hosts_id: ['h1', 'h2', 'h3'] }, {}, user());
    expect(names).toEqual(['Asha']);
    expect(loadUserActors).toHaveBeenCalledWith(expect.anything(), ['h1', 'h2', 'h3']);
  });

  it('co_hosts joins names and photos and defaults missing parts', async () => {
    expect(await Pod.co_hosts({}, {}, user())).toEqual([]);
    expect(await Pod.co_hosts({ co_hosts: [] }, {}, user())).toEqual([]);
    loadUserActors.mockResolvedValue(new Map([['c1', { name: 'Ravi', avatar_url: 'r.jpg' }]]));
    const out = await Pod.co_hosts(
      { co_hosts: [{ user_id: 'c1', status: 'ACCEPTED', invited_at: 'i', responded_at: 'r' }, { user_id: 'c2' }] },
      {},
      user()
    );
    expect(out).toEqual([
      { user_id: 'c1', name: 'Ravi', profile_photo: 'r.jpg', status: 'ACCEPTED', invited_at: 'i', responded_at: 'r' },
      { user_id: 'c2', name: '', profile_photo: null, status: 'PENDING', invited_at: '', responded_at: null },
    ]);
  });
});

describe('PodProductRequest.free_delivery_above', () => {
  const field = (podResolvers.PodProductRequest as { free_delivery_above: (...a: any[]) => Promise<number | null> })
    .free_delivery_above;

  it('is null for a malformed id and reads each live product once per request', async () => {
    const ctx = user();
    expect(await field({ product_id: 'nope' }, {}, ctx)).toBeNull();
    expect(await field({}, {}, ctx)).toBeNull();
    const id = String(new Types.ObjectId());
    const lean = jest.fn().mockReturnValue({ exec: () => Promise.resolve({ free_delivery_above: 499 }) });
    const select = jest.fn().mockReturnValue({ lean });
    const find = jest.spyOn(InventoryProductModel, 'findById').mockReturnValue({ select } as never);
    expect(await field({ product_id: id }, {}, ctx)).toBe(499);
    expect(await field({ product_id: id }, {}, ctx)).toBe(499);
    expect(find).toHaveBeenCalledTimes(1);
    find.mockReturnValue({ select: () => ({ lean: () => ({ exec: () => Promise.resolve(null) }) }) } as never);
    expect(await field({ product_id: String(new Types.ObjectId()) }, {}, ctx)).toBeNull();
    find.mockRestore();
  });
});

describe('co-host and host mutations', () => {
  it('require a signed-in caller', async () => {
    for (const [name, args] of [
      ['inviteCoHost', { pod_doc_id: 'p', user_id: 'u' }],
      ['removeCoHost', { pod_doc_id: 'p', user_id: 'u' }],
      ['respondToCoHostInvite', { pod_doc_id: 'p', accept: true }],
      ['hostUpdatePod', { pod_doc_id: 'p', input: {} }],
      ['addPodStatus', { pod_doc_id: 'p', media: {} }],
    ] as const) {
      if (!M[name]) continue;
      await expect(M[name]({}, args, anon())).rejects.toThrow();
    }
    expect(coHost.invite).not.toHaveBeenCalled();
    expect(podService.hostUpdate).not.toHaveBeenCalled();
  });

  it('invite, remove and respond act as the caller and return the mapped pod', async () => {
    coHost.invite.mockResolvedValue({ id: 'doc-i' });
    coHost.remove.mockResolvedValue({ id: 'doc-r' });
    coHost.respond.mockResolvedValue({ id: 'doc-a' });
    expect(await M.inviteCoHost({}, { pod_doc_id: 'p', user_id: 'x' }, user('host'))).toEqual({ mapped: { id: 'doc-i' } });
    expect(coHost.invite).toHaveBeenCalledWith('p', 'host', 'x');
    expect(await M.removeCoHost({}, { pod_doc_id: 'p', user_id: 'x' }, user('host'))).toEqual({ mapped: { id: 'doc-r' } });
    expect(coHost.remove).toHaveBeenCalledWith('p', 'host', 'x');
    expect(await M.respondToCoHostInvite({}, { pod_doc_id: 'p', accept: false }, user('x'))).toEqual({ mapped: { id: 'doc-a' } });
    expect(coHost.respond).toHaveBeenCalledWith('p', 'x', false);
    expect(loadPodClubSlugMap).toHaveBeenCalledTimes(3);
  });

  it('hostUpdatePod acts as the caller', async () => {
    podService.hostUpdate.mockResolvedValue({ ok: true });
    await M.hostUpdatePod({}, { pod_doc_id: 'p', input: { a: 1 } }, user('host'));
    expect(podService.hostUpdate).toHaveBeenCalledWith('p', 'host', { a: 1 });
  });

  it('deletePod is admin-only and records the actor', async () => {
    await expect(M.deletePod({}, { pod_doc_id: 'p' }, user())).rejects.toThrow();
    expect(podService.remove).not.toHaveBeenCalled();
    expect(await M.deletePod({}, { pod_doc_id: 'p' }, admin())).toBe(true);
    expect(podService.remove).toHaveBeenCalledWith('p', { actorUserId: 'admin-1', source: 'ADMIN' });
  });
});
