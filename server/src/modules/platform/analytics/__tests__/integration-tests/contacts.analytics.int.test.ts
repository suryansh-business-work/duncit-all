/**
 * Marketing > Contacts (Analytics `CONTACTS`) against a real database.
 *
 * What matters most here is the data-protection line the page promises:
 *  - every tile is a COUNT — no phone number, contact label or destination of
 *    anybody in a member's phone book leaves the server, member or not;
 *  - a member whose newest privacy choice declined analytics is counted in the
 *    tiles but never named in the table;
 *  - a deleted account is never named;
 *  - the table names members by name or handle only — never email or phone.
 * Alongside it, the numbers themselves: syncs, invites by period, invites that
 * became members (once per number, only when they joined AFTER the invite),
 * and the phone-book bands.
 */
import { Types } from 'mongoose';

import { ContactMatchModel, ContactSyncModel } from '@modules/access/contacts/contacts.model';
import { INVITE_EVENT } from '@modules/access/contacts/contacts.invite';
import { UserModel } from '@modules/access/user/user.model';
import { TrackingConsentEventModel } from '@modules/access/privacy/privacy.model';
import { WaMessageLogModel } from '@modules/platform/whatsapp/waMessageLog.model';
import { contactsAnalytics } from '../../entity/contacts.analytics';
import {
  BOOK_BOUNDS,
  MATCH_BOUNDS,
  analyticsOptOuts,
  joinedAfterInvite,
  memberNames,
} from '../../entity/contacts.data';
import { entityAnalyticsService } from '../../entity/entityAnalytics.service';
import { resolveWindow } from '../../entity/window';
import type { EntityAnalyticsSections } from '../../entity/shapes';

const DAY = 86_400_000;
const NOW = new Date();
/** A moment `days` (and an hour, so whole-day maths is never on the edge) ago. */
const ago = (days: number) => new Date(NOW.getTime() - days * DAY - 3_600_000);
const window = resolveWindow(30, NOW);

/** Third parties' numbers and the labels members saved them under — none may ever be returned. */
const THIRD_PARTY = {
  mom: { phone: '+919800000001', label: 'Mom' },
  plumber: { phone: '+919800000002', label: 'Raju Plumber' },
  aunt: { phone: '+919800000003', label: 'Aunty Neelam' },
  failed: { phone: '+919800000004', label: 'Old Landlord' },
  past: { phone: '+919800000005', label: 'College Friend' },
};

interface Member {
  id: Types.ObjectId;
  hex: string;
}

let memberSeq = 0;

/** A member with their own email and mobile (7xxxxxxxxx) — contact details the page must never hand out. */
async function insertMember(profile: Record<string, string>, extra: Record<string, unknown> = {}): Promise<Member> {
  const id = new Types.ObjectId();
  memberSeq += 1;
  await UserModel.collection.insertOne({
    _id: id,
    profile,
    auth: { email: `${id.toHexString()}@private.example`, phone: { number: `7${String(memberSeq).padStart(9, '0')}` } },
    metadata: { created_at: ago(400) },
    ...extra,
  });
  return { id, hex: id.toHexString() };
}

const invite = (by: Member, to: { phone: string; label: string }, at: Date, status = 'SENT', msgRate = 0.5) => ({
  event_key: INVITE_EVENT,
  entity_id: by.hex,
  destination: to.phone,
  user_name: to.label,
  params: [to.label, 'inviter', '50', 'CODE', 'https://duncit.example/i'],
  status,
  msg_rate: msgRate,
  holds_slot: status === 'SENT',
  created_at: at,
  updated_at: at,
});

const consent = (user: Member, analytics: boolean, at: Date) => ({
  user_id: user.id,
  analytics,
  marketing: analytics,
  surface: 'MWEB',
  created_at: at,
});

const sync = (owner: Member, submitted: number, matched: number, at: Date) => ({
  owner_id: owner.id,
  synced_at: at,
  submitted,
  matched,
  invitable: submitted - matched,
  created_at: at,
  updated_at: at,
});

interface World {
  asha: Member;
  bina: Member;
  chandu: Member;
  deep: Member;
  joiner: Member;
}

/**
 * Asha  — synced, sent two invites (one became a member), one failed; named.
 * Bina  — synced, sent one invite, newest privacy choice declined analytics.
 * Chandu — synced, invited last period, account since deleted.
 * Deep  — synced the biggest phone book, no name: only a handle.
 * Esha  — the person Asha invited, who signed up after the invite.
 */
async function seedWorld(): Promise<World> {
  const asha = await insertMember({ first_name: 'Asha', last_name: 'Rao' });
  const bina = await insertMember({ first_name: 'Bina', last_name: 'Private' });
  const chandu = await insertMember({ first_name: 'Chandu', last_name: 'Gone' }, { metadata: { deleted_at: ago(1), created_at: ago(400) } });
  const deep = await insertMember({ username: 'deepsync' });
  const joinerId = new Types.ObjectId();
  await UserModel.collection.insertOne({
    _id: joinerId,
    profile: { first_name: 'Esha', last_name: 'Joined' },
    auth: { phone: { number: '9800000001' } },
    metadata: { created_at: ago(5) },
  });
  // Raju had an account long before anyone invited him — not an invite that converted.
  await UserModel.collection.insertOne({
    profile: { first_name: 'Raju' },
    communication: { whatsapp: { number: '9800000002' } },
    metadata: { created_at: ago(100) },
  });

  await ContactSyncModel.collection.insertMany([
    sync(asha, 300, 12, ago(2)),
    sync(bina, 40, 1, ago(3)),
    sync(chandu, 10, 0, ago(1)),
    sync(deep, 600, 60, ago(5)),
  ]);
  await ContactMatchModel.collection.insertMany([
    { owner_id: asha.id, contact_id: joinerId, contact_label: 'Mom', created_at: ago(4), updated_at: ago(4) },
    { owner_id: deep.id, contact_id: asha.id, contact_label: 'Asha college', created_at: ago(45), updated_at: ago(45) },
  ]);
  await WaMessageLogModel.collection.insertMany([
    invite(asha, THIRD_PARTY.mom, ago(10)),
    invite(asha, THIRD_PARTY.plumber, ago(9)),
    invite(asha, THIRD_PARTY.failed, ago(7), 'FAILED'),
    invite(bina, THIRD_PARTY.aunt, ago(8), 'SENT', 0.25),
    invite(chandu, THIRD_PARTY.past, ago(40)),
    // Not an invite: the page must not read other WhatsApp traffic.
    { ...invite(deep, THIRD_PARTY.aunt, ago(6)), event_key: 'POD_REMINDER' },
  ]);
  await TrackingConsentEventModel.collection.insertMany([
    // Asha once declined, then agreed — her newest choice wins.
    consent(asha, false, ago(20)),
    consent(asha, true, ago(3)),
    // Bina agreed, then declined.
    consent(bina, true, ago(20)),
    consent(bina, false, ago(2)),
  ]);
  return { asha, bina, chandu, deep, joiner: { id: joinerId, hex: joinerId.toHexString() } };
}

afterEach(() => {
  jest.restoreAllMocks();
});

const kpiOf = (page: EntityAnalyticsSections, key: string) => {
  const found = page.kpis.find((k) => k.key === key);
  if (!found) throw new Error(`no ${key} tile`);
  return found;
};

const slicesOf = (page: EntityAnalyticsSections, key: string) =>
  Object.fromEntries((page.breakdowns.find((b) => b.key === key)?.slices ?? []).map((s) => [s.key, s.value]));

describe('contactsAnalytics — data protection', () => {
  it('returns no third-party number, saved label or member contact detail anywhere on the page', async () => {
    await seedWorld();
    const page = await contactsAnalytics(window);
    const json = JSON.stringify(page);

    for (const { phone, label } of Object.values(THIRD_PARTY)) {
      expect(json).not.toContain(phone.slice(-10));
      expect(json).not.toContain(label);
    }
    // Nor the saved labels on matches, nor any member's own email or phone.
    expect(json).not.toContain('Asha college');
    expect(json).not.toContain('@private.example');
    expect(json).not.toMatch(/\b7\d{9}\b/);
  });

  it('names only live, consenting members who synced or invited — opted-out and deleted are counted but not named', async () => {
    const { asha, bina, chandu, deep, joiner } = await seedWorld();
    const page = await contactsAnalytics(window);

    const rows = page.leaderboard?.rows ?? [];
    expect(rows.map((r) => [r.id, r.name])).toEqual([
      [asha.hex, 'Asha Rao'],
      [deep.hex, '@deepsync'],
    ]);
    const ids = rows.map((r) => r.id);
    expect(ids).not.toContain(bina.hex);
    expect(ids).not.toContain(chandu.hex);
    // Somebody who was only invited is never a row, even after joining.
    expect(ids).not.toContain(joiner.hex);
    expect(JSON.stringify(page)).not.toMatch(/Bina|Private|Chandu|Gone|Esha/);

    // ...while every tile still counts them.
    expect(kpiOf(page, 'ctc_syncing_members').value).toBe(4);
    expect(kpiOf(page, 'ctc_inviters')).toMatchObject({ value: 2, previous: 1 });
  });

  it('a member whose newest choice is to allow analytics is named again', async () => {
    const { bina } = await seedWorld();
    await TrackingConsentEventModel.collection.insertOne(consent(bina, true, ago(1)));

    const page = await contactsAnalytics(window);

    expect(page.leaderboard?.rows.map((r) => r.name)).toContain('Bina Private');
  });
});

describe('contactsAnalytics — the numbers', () => {
  it('counts syncs, invites by period, conversions after the invite and the cost of what was sent', async () => {
    await seedWorld();
    const page = await contactsAnalytics(window);

    expect(kpiOf(page, 'ctc_synced_contacts').value).toBe(950);
    expect(kpiOf(page, 'ctc_matched_contacts').value).toBe(73);
    expect(kpiOf(page, 'ctc_match_rate').value).toBe(7.7);
    expect(kpiOf(page, 'ctc_recent_syncs').value).toBe(4);
    expect(kpiOf(page, 'ctc_new_connections')).toMatchObject({ value: 1, previous: 1 });
    expect(kpiOf(page, 'ctc_invites_sent')).toMatchObject({ value: 3, previous: 1 });
    expect(kpiOf(page, 'ctc_invites_failed')).toMatchObject({ value: 1, previous: 0, higher_is_better: false });
    // Esha joined after Asha's invite; Raju was a member long before his.
    expect(kpiOf(page, 'ctc_invites_joined')).toMatchObject({ value: 1, previous: 0 });
    expect(kpiOf(page, 'ctc_invite_conversion').value).toBe(33.3);
    expect(kpiOf(page, 'ctc_invite_cost')).toMatchObject({ value: 1.25, format: 'CURRENCY' });
  });

  it("credits joins to the inviter and ranks the table by invites sent, then phone-book size", async () => {
    const { asha, deep } = await seedWorld();
    const page = await contactsAnalytics(window);

    expect(page.leaderboard?.columns.map((c) => c.key)).toEqual([
      'ctc_invites_sent',
      'ctc_invites_joined',
      'ctc_synced_contacts',
      'ctc_matched_contacts',
      'ctc_days_since_sync',
    ]);
    const byId = new Map(page.leaderboard?.rows.map((r) => [r.id, r.values]));
    expect(byId.get(asha.hex)).toEqual([2, 1, 300, 12, 2]);
    expect(byId.get(deep.hex)).toEqual([0, 0, 600, 60, 5]);
  });

  it('bands every phone book and match count, empty bands kept', async () => {
    await seedWorld();
    const page = await contactsAnalytics(window);

    expect(slicesOf(page, 'ctc_invite_outcomes')).toEqual({ SENT: 3, FAILED: 1, SKIPPED: 0 });
    const books = slicesOf(page, 'ctc_phone_book_size');
    expect(Object.keys(books)).toHaveLength(BOOK_BOUNDS.length);
    expect(books).toEqual({ book_0: 0, book_1_49: 2, book_50_199: 0, book_200_499: 1, book_500_999: 1, book_1000_plus: 0 });
    const found = slicesOf(page, 'ctc_found_per_member');
    expect(Object.keys(found)).toHaveLength(MATCH_BOUNDS.length);
    expect(found).toEqual({ found_0: 1, found_1_4: 1, found_5_19: 1, found_20_49: 0, found_50_plus: 1 });
  });

  it('reads an empty database as zeros and an empty table', async () => {
    const page = await contactsAnalytics(window);

    expect(page.kpis.every((k) => k.value === 0)).toBe(true);
    expect(page.leaderboard?.rows).toEqual([]);
    expect(slicesOf(page, 'ctc_phone_book_size').book_0).toBe(0);
  });

  it('is served as the CONTACTS page by the entity service', async () => {
    await seedWorld();
    const loaded = await entityAnalyticsService.load('CONTACTS', { days: 30 });

    expect(loaded.entity).toBe('CONTACTS');
    expect(loaded.kpis.map((k) => k.key)).toContain('ctc_invites_sent');
    expect(JSON.stringify(loaded)).not.toContain('9800000001');
  });
});

describe('contacts.data helpers', () => {
  it('joinedAfterInvite asks nothing when no invite has a usable number', async () => {
    const find = jest.spyOn(UserModel, 'find');
    expect((await joinedAfterInvite([])).size).toBe(0);
    expect((await joinedAfterInvite([{ _id: 'no digits', first: ago(3), inviters: ['x'] }])).size).toBe(0);
    expect(find).not.toHaveBeenCalled();
  });

  it('joinedAfterInvite measures from the earliest invite of a number however it was written', async () => {
    await UserModel.collection.insertMany([
      // Joined between the first invite (10 days ago) and the second (4 days ago).
      { profile: {}, communication: { whatsapp: { number: '9811111111' } }, metadata: { created_at: ago(6) } },
      // Joined before anybody invited them.
      { profile: {}, auth: { phone: { number: '9822222222' } }, metadata: { created_at: ago(30) } },
    ]);

    const joined = await joinedAfterInvite([
      { _id: '919811111111', first: ago(4), inviters: ['a'] },
      { _id: '+91 98111 11111', first: ago(10), inviters: ['b'] },
      { _id: '+919822222222', first: ago(20), inviters: ['a'] },
    ]);

    expect([...joined.keys()]).toEqual(['9811111111']);
  });

  it('analyticsOptOuts reads each member’s newest choice only', async () => {
    const yes: Member = { id: new Types.ObjectId(), hex: '' };
    const no: Member = { id: new Types.ObjectId(), hex: '' };
    const never: Member = { id: new Types.ObjectId(), hex: '' };
    await TrackingConsentEventModel.collection.insertMany([
      consent(yes, false, ago(9)),
      consent(yes, true, ago(1)),
      consent(no, true, ago(9)),
      consent(no, false, ago(1)),
    ]);

    expect(await analyticsOptOuts([])).toEqual(new Set());
    expect(await analyticsOptOuts([yes.id, no.id, never.id])).toEqual(new Set([no.id.toHexString()]));
  });

  it('memberNames falls back from name to handle to id, and leaves deleted accounts out', async () => {
    const named = await insertMember({ first_name: 'Ira', last_name: '' });
    const handled = await insertMember({ username: 'handle_only' });
    const bare = await insertMember({});
    const gone = await insertMember({ first_name: 'Gone' }, { metadata: { deleted_at: ago(1) } });

    const names = await memberNames([named.id, handled.id, bare.id, gone.id]);

    expect(Object.fromEntries(names)).toEqual({
      [named.hex]: 'Ira',
      [handled.hex]: '@handle_only',
      [bare.hex]: bare.hex,
    });
  });
});
