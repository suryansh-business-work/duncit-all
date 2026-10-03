/**
 * Club Admin onboarding record against a real database: drafting from an
 * approved meeting, the console's Add and Edit, the approval welcome (sent on
 * the transition only), the taxonomy pickers in both directions, and the boot
 * backfill that gives every existing CLUB_ADMIN role-holder a record.
 */
jest.mock('@services/notify/notify.service', () => ({ notifyEvent: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@config/url-configs', () => ({
  ...jest.requireActual('@config/url-configs'),
  getUrlConfigs: jest.fn().mockResolvedValue({ partnersUrl: 'https://partners.example.test' }),
}));

import { Types } from 'mongoose';
import { clubAdminProfileService } from '../../clubAdminProfile.service';
import { ClubAdminProfileModel } from '../../clubAdminProfile.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { UserModel } from '@modules/access/user/user.model';
import { MeetingModel } from '@modules/survey/meeting.model';
import { userService } from '@modules/access/user/user.service';
import { notifyEvent } from '@services/notify/notify.service';
import { logs } from '@observability/log';

const notify = notifyEvent as jest.Mock;

// Spies replace real methods; put them back after each test so one test's
// stub never leaks into the next (clearMocks only clears call history).
const spies: jest.SpyInstance[] = [];
const spy = (obj: any, key: string): jest.SpyInstance => {
  const s = jest.spyOn(obj, key);
  spies.push(s);
  return s;
};
afterEach(() => {
  while (spies.length) spies.pop()?.mockRestore();
});

let seq = 0;
const nextSeq = () => {
  seq += 1;
  return seq;
};

async function makeUser(over: Record<string, unknown> = {}) {
  const n = nextSeq();
  const doc = await UserModel.create({
    auth: { email: `cadm${n}@example.com` },
    profile: { first_name: 'Club', last_name: `Admin${n}` },
    ...over,
  });
  return doc;
}

async function makeCategory(name: string, level: 'SUPER' | 'CATEGORY' | 'SUB', parent: Types.ObjectId | null) {
  return CategoryModel.create({ name, slug: name.toLowerCase(), level, parent_id: parent });
}

async function makeProfile(over: Record<string, unknown> = {}) {
  const user = await makeUser();
  return ClubAdminProfileModel.create({ user_id: user._id, ...over });
}

async function makeClub(name: string, over: Record<string, unknown> = {}) {
  return ClubModel.create({ club_id: name.toLowerCase().replace(/\s+/g, '-'), club_name: name, ...over });
}

describe('createDraftFromApproval', () => {
  it('refuses an id that is not an ObjectId', async () => {
    await expect(clubAdminProfileService.createDraftFromApproval({ userId: 'nope' })).rejects.toThrow(
      'Invalid user'
    );
    expect(await ClubAdminProfileModel.countDocuments()).toBe(0);
  });

  it('drafts a fresh record from the meeting prefill, stripping only whitespace from the phone', async () => {
    const user = await makeUser();
    const superCat = await makeCategory('Sports', 'SUPER', null);
    const cat = await makeCategory('Racquet', 'CATEGORY', superCat._id);
    const sub = await makeCategory('Badminton', 'SUB', cat._id);

    const row = await clubAdminProfileService.createDraftFromApproval({
      userId: String(user._id),
      name: 'Meera N',
      email: 'meera@example.com',
      phone: '+91 00000 00000',
      request_no: 'DUN-CLUB-000007',
      category: {
        super_category_id: String(superCat._id),
        category_id: String(cat._id),
        sub_category_id: String(sub._id),
      },
    });

    expect(row).toMatchObject({
      user_id: String(user._id),
      full_name: 'Meera N',
      email: 'meera@example.com',
      phone: '+910000000000',
      request_no: 'DUN-CLUB-000007',
      status: 'DRAFT',
      super_category: 'Sports',
      category: 'Racquet',
      sub_category: 'Badminton',
      sub_category_id: String(sub._id),
      assigned_clubs: [],
    });
    expect(row?.club_admin_no).toMatch(/^CADM-\d{6}$/);
    expect(row?.joined_at).not.toBeNull();
  });

  it('refreshes the category on re-approval but never overwrites contact details or the joining date', async () => {
    const joined = new Date('2026-01-05T00:00:00.000Z');
    const existing = await makeProfile({
      full_name: 'Original Name',
      email: 'orig@example.com',
      phone: '+911111111111',
      request_no: 'DUN-CLUB-000001',
      joined_at: joined,
      status: 'APPROVED',
    });
    const cat = await makeCategory('Music', 'CATEGORY', null);

    const row = await clubAdminProfileService.createDraftFromApproval({
      userId: String(existing.user_id),
      name: 'New Name',
      email: 'new@example.com',
      phone: '+91 22222 22222',
      request_no: 'DUN-CLUB-000099',
      category: { super_category_id: 'bad', category_id: String(cat._id), sub_category_id: '' },
    });

    expect(row).toMatchObject({
      id: String(existing._id),
      full_name: 'Original Name',
      email: 'orig@example.com',
      phone: '+911111111111',
      request_no: 'DUN-CLUB-000001',
      status: 'APPROVED',
      joined_at: joined.toISOString(),
      super_category_id: null,
      category_id: String(cat._id),
      sub_category_id: null,
      category: 'Music',
    });
    expect(await ClubAdminProfileModel.countDocuments()).toBe(1);
  });

  it('leaves the taxonomy untouched when the prefill carries none', async () => {
    const cat = await makeCategory('Arts', 'CATEGORY', null);
    const existing = await makeProfile({ category_id: cat._id });

    const row = await clubAdminProfileService.createDraftFromApproval({
      userId: String(existing.user_id),
      category: null,
    });

    expect(row?.category_id).toBe(String(cat._id));
    expect(row?.full_name).toBe('');
  });
});

describe('adminCreate', () => {
  it('refuses an id that is not an ObjectId', async () => {
    const addRole = spy(userService, 'addRole');
    await expect(clubAdminProfileService.adminCreate('x', {})).rejects.toThrow('Invalid user');
    expect(addRole).not.toHaveBeenCalled();
  });

  it('refuses an account that is already a Club Admin', async () => {
    const existing = await makeProfile();
    const addRole = spy(userService, 'addRole');

    await expect(clubAdminProfileService.adminCreate(String(existing.user_id), {})).rejects.toThrow(
      'This account is already a Club Admin'
    );
    expect(addRole).not.toHaveBeenCalled();
  });

  it('grants the role (which mints the record) and then writes the details', async () => {
    const user = await makeUser({ profile: { first_name: 'Ravi', last_name: 'K' } });
    const addRole = spy(userService, 'addRole').mockImplementation(async (uid: string) => {
      await clubAdminProfileService.ensureForUser(uid);
      return null as never;
    });

    const row = await clubAdminProfileService.adminCreate(String(user._id), {
      full_name: 'Ravi Kumar',
      commission_pct: 12,
    });

    expect(addRole).toHaveBeenCalledWith(String(user._id), 'CLUB_ADMIN');
    expect(row).toMatchObject({ user_id: String(user._id), full_name: 'Ravi Kumar', commission_pct: 12 });
    expect(await ClubAdminProfileModel.countDocuments({ user_id: user._id })).toBe(1);
  });

  it('fails loudly when granting the role produced no record', async () => {
    const user = await makeUser();
    spy(userService, 'addRole').mockResolvedValue(null as never);

    await expect(clubAdminProfileService.adminCreate(String(user._id), {})).rejects.toThrow(
      'The Club Admin record could not be created'
    );
  });
});

describe('update', () => {
  it('refuses a record that does not exist', async () => {
    await expect(
      clubAdminProfileService.update(String(new Types.ObjectId()), { full_name: 'X' })
    ).rejects.toThrow('Club Admin not found');
  });

  it('writes only the fields that were sent, and an unusable category id clears it', async () => {
    const sub = await makeCategory('Chess', 'SUB', null);
    const doc = await makeProfile({
      full_name: 'Keep Me',
      email: 'keep@example.com',
      phone: '+913333333333',
      commission_pct: 5,
      super_category_id: new Types.ObjectId(),
    });

    const row = await clubAdminProfileService.update(String(doc._id), {
      email: 'Changed@Example.com',
      phone: '+914444444444',
      super_category_id: 'not-an-id',
      category_id: null,
      sub_category_id: String(sub._id),
      commission_pct: null,
    });

    expect(row).toMatchObject({
      full_name: 'Keep Me',
      email: 'changed@example.com',
      phone: '+914444444444',
      super_category_id: null,
      category_id: null,
      sub_category_id: String(sub._id),
      sub_category: 'Chess',
      commission_pct: null,
    });
  });
});

describe('approve — the welcome goes out on the transition only', () => {
  it('sends the onboarding-approved message once, then a re-approval only edits the note', async () => {
    const doc = await makeProfile({ full_name: 'Asha', email: 'asha@example.com', status: 'DRAFT' });

    const first = await clubAdminProfileService.approve(String(doc._id), 'Looks good');
    expect(first).toMatchObject({ status: 'APPROVED', is_active: true, reviewer_notes: 'Looks good' });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'CLUB_ADMIN_ONBOARDING_APPROVED',
        name: 'Asha',
        params: ['Asha', 'asha@example.com'],
        email: 'asha@example.com',
        vars: { portal_url: 'https://partners.example.test' },
      })
    );

    const second = await clubAdminProfileService.approve(String(doc._id), 'Edited note');
    expect(second?.reviewer_notes).toBe('Edited note');
    expect(notify).toHaveBeenCalledTimes(1);
  });
});

describe('candidatesForClub', () => {
  let superCat: Types.ObjectId;
  let cat: Types.ObjectId;
  let subX: Types.ObjectId;
  let lonelyCat: Types.ObjectId;

  beforeEach(async () => {
    superCat = (await makeCategory('Sports', 'SUPER', null))._id;
    cat = (await makeCategory('Racquet', 'CATEGORY', superCat))._id;
    subX = (await makeCategory('Badminton', 'SUB', cat))._id;
    await makeCategory('Tennis', 'SUB', cat);
    lonelyCat = (await makeCategory('Lonely', 'CATEGORY', superCat))._id;

    const live = { status: 'APPROVED', is_active: true };
    await makeProfile({ ...live, full_name: 'Asha', email: 'asha@example.com', super_category_id: superCat, category_id: cat, sub_category_id: subX });
    await makeProfile({ ...live, full_name: 'Bala', email: 'bala@example.com', super_category_id: superCat, category_id: cat });
    await makeProfile({ ...live, full_name: 'Chitra', email: 'chitra@example.com', super_category_id: superCat });
    await makeProfile({ status: 'DRAFT', is_active: true, full_name: 'Draft Dev', sub_category_id: subX });
    await makeProfile({ status: 'APPROVED', is_active: false, full_name: 'Paused Pia', sub_category_id: subX });
  });

  const names = (rows: { full_name: string }[]) => rows.map((r) => r.full_name);

  it('a Sub matches only admins on that Sub, and only live ones', async () => {
    const rows = await clubAdminProfileService.candidatesForClub({ sub_category_id: String(subX) });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ full_name: 'Asha', email: 'asha@example.com' });
  });

  it('a Category widens to its Subs and to admins who chose the Category outright', async () => {
    const rows = await clubAdminProfileService.candidatesForClub({ category_id: String(cat) });
    expect(names(rows)).toEqual(['Asha', 'Bala']);
  });

  it('an unusable Sub id falls back to the Category', async () => {
    const rows = await clubAdminProfileService.candidatesForClub({
      sub_category_id: 'nope',
      category_id: String(cat),
    });
    expect(names(rows)).toEqual(['Asha', 'Bala']);
  });

  it('a Category with no Subs matches only admins on that Category', async () => {
    await expect(
      clubAdminProfileService.candidatesForClub({ category_id: String(lonelyCat) })
    ).resolves.toEqual([]);
  });

  it('a Super is the broadest match', async () => {
    const rows = await clubAdminProfileService.candidatesForClub({ super_category_id: String(superCat) });
    expect(names(rows)).toEqual(['Asha', 'Bala', 'Chitra']);
  });

  it('no taxonomy returns every live admin', async () => {
    const rows = await clubAdminProfileService.candidatesForClub({});
    expect(names(rows)).toEqual(['Asha', 'Bala', 'Chitra']);
  });

  it('a search ANDs with the Category instead of replacing it', async () => {
    const rows = await clubAdminProfileService.candidatesForClub({ category_id: String(cat), search: ' BAL ' });
    expect(names(rows)).toEqual(['Bala']);
    const outside = await clubAdminProfileService.candidatesForClub({ category_id: String(cat), search: 'chitra' });
    expect(outside).toEqual([]);
  });

  it('a search alone matches name or email, and regex characters are literal', async () => {
    expect(names(await clubAdminProfileService.candidatesForClub({ search: 'chitra@' }))).toEqual(['Chitra']);
    await expect(clubAdminProfileService.candidatesForClub({ search: 'a.+' })).resolves.toEqual([]);
  });

  it('a legacy record with no name or email answers empty strings', async () => {
    const legacySuper = new Types.ObjectId();
    await ClubAdminProfileModel.collection.insertOne({
      user_id: new Types.ObjectId(),
      status: 'APPROVED',
      is_active: true,
      super_category_id: legacySuper,
    });
    const rows = await clubAdminProfileService.candidatesForClub({ super_category_id: String(legacySuper) });
    expect(rows).toEqual([{ user_id: expect.any(String), full_name: '', email: '' }]);
  });
});

describe('matchingClubs', () => {
  it('refuses a record that does not exist', async () => {
    await expect(clubAdminProfileService.matchingClubs(String(new Types.ObjectId()))).rejects.toThrow(
      'Club Admin not found'
    );
  });

  it('a Sub admin sees clubs on that Sub plus the ones they already run, flagged', async () => {
    const subX = new Types.ObjectId();
    const subY = new Types.ObjectId();
    const doc = await makeProfile({ sub_category_id: subX });
    await makeClub('Alpha', { category_id: subX });
    await makeClub('Beta', { category_id: subY, admin_user_ids: [doc.user_id] });
    await makeClub('Gamma', { category_id: subY });

    const rows = await clubAdminProfileService.matchingClubs(String(doc._id));

    expect(rows.map(({ club_name, assigned, matches_category }) => ({ club_name, assigned, matches_category }))).toEqual([
      { club_name: 'Alpha', assigned: false, matches_category: true },
      { club_name: 'Beta', assigned: true, matches_category: false },
    ]);
  });

  it('a Category admin matches clubs on any of its Subs', async () => {
    const cat = await makeCategory('Racquet', 'CATEGORY', null);
    const subA = await makeCategory('Squash', 'SUB', cat._id);
    const subB = await makeCategory('Padel', 'SUB', cat._id);
    const doc = await makeProfile({ category_id: cat._id });
    await makeClub('Padel Pals', { category_id: subB._id });
    await makeClub('Squash Squad', { category_id: subA._id });
    await makeClub('Unrelated', { category_id: new Types.ObjectId() });

    const rows = await clubAdminProfileService.matchingClubs(String(doc._id));

    expect(rows.map((r) => [r.club_name, r.matches_category])).toEqual([
      ['Padel Pals', true],
      ['Squash Squad', true],
    ]);
  });

  it('a Super admin matches on the club Super, and a club with no Super does not match', async () => {
    const superCat = new Types.ObjectId();
    const doc = await makeProfile({ super_category_id: superCat });
    await makeClub('Inside', { super_category_id: superCat });
    await makeClub('Held', { admin_user_ids: [doc.user_id] });

    const rows = await clubAdminProfileService.matchingClubs(String(doc._id));

    expect(rows.map((r) => [r.club_name, r.assigned, r.matches_category])).toEqual([
      ['Held', true, false],
      ['Inside', false, true],
    ]);
  });

  it('an admin with no taxonomy sees every club as matching, narrowed by a literal search', async () => {
    const doc = await makeProfile();
    await makeClub('Book Nook');
    await makeClub('Run Club');
    await makeClub('Book (Rare)');

    const all = await clubAdminProfileService.matchingClubs(String(doc._id), '   ');
    expect(all.map((r) => r.club_name)).toEqual(['Book (Rare)', 'Book Nook', 'Run Club']);
    expect(all.every((r) => r.matches_category)).toBe(true);

    const searched = await clubAdminProfileService.matchingClubs(String(doc._id), ' book (');
    expect(searched.map((r) => r.club_name)).toEqual(['Book (Rare)']);
  });
});

describe('ensureForUser', () => {
  it('is false for an id that is not an ObjectId, and for an account that does not exist', async () => {
    await expect(clubAdminProfileService.ensureForUser('nope')).resolves.toBe(false);
    await expect(clubAdminProfileService.ensureForUser(String(new Types.ObjectId()))).resolves.toBe(false);
    expect(await ClubAdminProfileModel.countDocuments()).toBe(0);
  });

  it('is false and mints nothing when the record already exists', async () => {
    const doc = await makeProfile();
    await expect(clubAdminProfileService.ensureForUser(String(doc.user_id))).resolves.toBe(false);
    expect(await ClubAdminProfileModel.countDocuments()).toBe(1);
  });

  it('seeds an APPROVED record from the account and its approved CLUB_ADMIN meeting', async () => {
    const user = await makeUser({
      profile: { first_name: 'Nila', last_name: 'V' },
      auth: { email: 'nila@example.com', phone: { extension: '+91', number: '0000000000' } },
    });
    const superCat = new Types.ObjectId();
    const cat = new Types.ObjectId();
    const sub = new Types.ObjectId();
    const feedbackAt = new Date('2026-03-04T05:06:07.000Z');
    await MeetingModel.create({
      user_id: user._id,
      kind: 'CLUB_ADMIN',
      approval_status: 'APPROVED',
      requested_at: new Date('2026-03-01T00:00:00.000Z'),
      feedback_sent_at: feedbackAt,
      request_no: 'DUN-CLUB-000042',
      super_category_id: superCat,
      category_id: cat,
      sub_category_id: sub,
    });

    await expect(clubAdminProfileService.ensureForUser(String(user._id))).resolves.toBe(true);

    const rec = await ClubAdminProfileModel.findOne({ user_id: user._id }).lean();
    expect(rec).toMatchObject({
      full_name: 'Nila V',
      email: 'nila@example.com',
      phone: '+910000000000',
      status: 'APPROVED',
      is_active: true,
      request_no: 'DUN-CLUB-000042',
      approved_at: feedbackAt,
      joined_at: feedbackAt,
    });
    expect(String(rec?.super_category_id)).toBe(String(superCat));
    expect(String(rec?.sub_category_id)).toBe(String(sub));
  });

  it('a directly-assigned admin with no meeting falls back to the account creation date', async () => {
    const user = await makeUser({ profile: { first_name: 'Solo' } });

    await expect(clubAdminProfileService.ensureForUser(String(user._id))).resolves.toBe(true);

    const rec = await ClubAdminProfileModel.findOne({ user_id: user._id }).lean();
    expect(rec).toMatchObject({ full_name: 'Solo', phone: '', request_no: null, category_id: null });
    const accountCreated = (user as any).metadata.created_at as Date;
    expect(rec?.joined_at?.toISOString()).toBe(accountCreated.toISOString());
    expect(rec?.approved_at?.toISOString()).toBe(accountCreated.toISOString());
  });

  it('a legacy account with no creation date is dated now', async () => {
    const { insertedId } = await UserModel.collection.insertOne({
      auth: { email: 'legacy-cadm@example.com' },
      profile: {},
      metadata: { role_keys: ['CLUB_ADMIN'] },
    });
    const before = Date.now();

    await expect(clubAdminProfileService.ensureForUser(String(insertedId))).resolves.toBe(true);

    const rec = await ClubAdminProfileModel.findOne({ user_id: insertedId }).lean();
    expect(rec?.full_name).toBe('');
    expect(rec?.email).toBe('legacy-cadm@example.com');
    expect(rec?.joined_at?.getTime()).toBeGreaterThanOrEqual(before);
    expect(rec?.joined_at?.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('a racing duplicate insert is logged and answers false rather than throwing', async () => {
    const user = await makeUser();
    const err = new Error('E11000 duplicate key');
    spy(ClubAdminProfileModel, 'create').mockRejectedValueOnce(err);
    const warn = spy(logs.server, 'warn').mockImplementation(() => undefined as never);

    await expect(clubAdminProfileService.ensureForUser(String(user._id))).resolves.toBe(false);
    expect(warn).toHaveBeenCalledWith('clubAdminProfile', 'ensureForUser', {
      error: err,
      userId: String(user._id),
    });
  });
});

describe('backfill', () => {
  it('ids the id-less records, creates the missing ones, and counts the rest as skipped', async () => {
    // A legacy record written before the id existed.
    const legacyUser = await makeUser({ metadata: { role_keys: ['USER', 'CLUB_ADMIN'] } });
    const { insertedId } = await ClubAdminProfileModel.collection.insertOne({
      user_id: legacyUser._id,
      club_admin_no: null,
      status: 'APPROVED',
      is_active: true,
    });
    // A role-holder with no record at all.
    const missing = await makeUser({ metadata: { role_keys: ['CLUB_ADMIN'] } });
    // Not a Club Admin: never touched.
    await makeUser({ metadata: { role_keys: ['USER'] } });

    const result = await clubAdminProfileService.backfill();

    expect(result).toEqual({ created: 1, skipped: 1 });
    const legacy = await ClubAdminProfileModel.findById(insertedId).lean();
    expect(legacy?.club_admin_no).toMatch(/^CADM-\d{6}$/);
    expect(await ClubAdminProfileModel.countDocuments({ user_id: missing._id })).toBe(1);
    expect(await ClubAdminProfileModel.countDocuments()).toBe(2);
  });

  it('is a no-op on a second run', async () => {
    await makeUser({ metadata: { role_keys: ['CLUB_ADMIN'] } });
    await clubAdminProfileService.backfill();

    await expect(clubAdminProfileService.backfill()).resolves.toEqual({ created: 0, skipped: 1 });
    expect(await ClubAdminProfileModel.countDocuments()).toBe(1);
  });
});
