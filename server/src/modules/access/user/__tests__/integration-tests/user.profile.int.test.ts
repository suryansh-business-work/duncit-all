// The realtime fan-out and the admin-table mirrors are side channels of a save;
// stubbed so these specs can assert that a session change is announced.
jest.mock('@realtime/user.events', () => ({ emitUserChanged: jest.fn() }));
jest.mock('../../user.mirrors', () => ({ syncUserMirrors: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@modules/access/userAudit/userAudit.service', () => ({
  userAuditService: { record: jest.fn().mockResolvedValue(undefined) },
}));

import { Types } from 'mongoose';
import { emitUserChanged } from '@realtime/user.events';
import { userAuditService } from '@modules/access/userAudit/userAudit.service';
import { CategoryModel } from '@modules/pods/category/category.model';
import { LocaleModel } from '@modules/platform/localization/localization.model';
import { UserModel } from '../../user.model';
import { UserRoleModel } from '../../relations';
import { userProfileMethods as svc } from '../../user.profile';

/**
 * The signed-in user's own profile writes and the public reads. Every write
 * goes through one audited update; contact numbers can never move through the
 * profile form; handles are validated server-side whatever the client checked.
 */

const record = userAuditService.record as jest.Mock;
const emit = emitUserChanged as jest.Mock;
let seq = 0;

beforeAll(async () => {
  await UserModel.init();
});

async function seedUser(over: Record<string, unknown> = {}) {
  seq += 1;
  return UserModel.create({
    auth: { email: `profile${seq}@x.com` },
    profile: { first_name: 'Asha', last_name: 'Rao' },
    metadata: { status: 'ACTIVE' },
    ...over,
  });
}

const reload = (id: unknown) => UserModel.findById(id).lean();

describe('updateMyProfile', () => {
  it('maps fields to their profile paths, blanking empty strings to null, and audits before/after', async () => {
    const user = await seedUser({ profile: { first_name: 'Asha', last_name: 'Rao', bio: 'old bio' } });

    const pub = await svc.updateMyProfile(String(user._id), {
      first_name: 'Asha K',
      bio: '',
      city: 'Pune',
      is_pet_owner: false,
    } as never);

    const row = await reload(user._id);
    expect(row?.profile).toMatchObject({ first_name: 'Asha K', last_name: 'Rao', bio: null, city: 'Pune', is_pet_owner: false });
    expect(pub).toMatchObject({ first_name: 'Asha K', bio: null, city: 'Pune', is_pet_owner: false });
    expect(record).toHaveBeenCalledTimes(1);
    const audit = record.mock.calls[0][0];
    expect(audit.userId).toBe(String(user._id));
    expect(audit.before.profile.bio).toBe('old bio');
    expect(audit.after.profile.bio).toBeNull();
    // A profile save is a session change other devices must hear about.
    expect(emit).toHaveBeenCalledWith(String(user._id), expect.objectContaining({ first_name: 'Asha K' }));
  });

  it('keeps at most five profile links, trimmed, dropping any without both a label and a url', async () => {
    const user = await seedUser();
    const links = [
      { label: ' Site ', url: ' https://a.com ' },
      { label: '', url: 'https://nolabel.com' },
      { label: 'No url', url: '   ' },
      ...Array.from({ length: 6 }, (_v, i) => ({ label: `L${i}`, url: `https://l${i}.com` })),
    ];

    const pub = await svc.updateMyProfile(String(user._id), { profile_links: links } as never);

    expect(pub?.profile_links).toEqual([
      { label: 'Site', url: 'https://a.com' },
      { label: 'L0', url: 'https://l0.com' },
      { label: 'L1', url: 'https://l1.com' },
      { label: 'L2', url: 'https://l2.com' },
      { label: 'L3', url: 'https://l3.com' },
    ]);
  });

  it('parses a date of birth, clears it on empty, and refuses an unparsable one', async () => {
    const user = await seedUser();
    const id = String(user._id);

    const set = await svc.updateMyProfile(id, { dob: '1995-04-12' } as never);
    expect(set?.dob).toBe('1995-04-12T00:00:00.000Z');

    await svc.updateMyProfile(id, { dob: '' } as never);
    expect((await reload(user._id))?.profile?.dob).toBeNull();

    await expect(svc.updateMyProfile(id, { dob: 'not-a-date' } as never)).rejects.toThrow('Invalid date of birth');
  });

  it('normalises a partial address, defaulting the country to India', async () => {
    const user = await seedUser();
    const pub = await svc.updateMyProfile(String(user._id), { address: { line1: ' 12 MG Road ', city: 'Pune' } } as never);
    expect(pub?.address).toEqual({
      line1: '12 MG Road',
      line2: '',
      landmark: '',
      city: 'Pune',
      state: '',
      pincode: '',
      country: 'India',
    });
  });

  it('lets the whole form be re-sent with unchanged contact numbers', async () => {
    const user = await seedUser({
      auth: { email: 'contact-same@x.com', phone: { number: '9876543210', extension: '+91' } },
      communication: { whatsapp: { number: '9123456780', extension: '+91' } },
    });
    const pub = await svc.updateMyProfile(String(user._id), {
      first_name: 'Same',
      phone_number: ' 9876543210 ',
      whatsapp_number: '9123456780',
    } as never);
    expect(pub?.first_name).toBe('Same');
  });

  it('refuses to move the phone or the WhatsApp number through the profile form, writing nothing', async () => {
    const user = await seedUser({
      auth: { email: 'contact-move@x.com', phone: { number: '9876543210', extension: '+91' } },
    });
    const id = String(user._id);

    await expect(svc.updateMyProfile(id, { first_name: 'X', phone_number: '9000000001' } as never)).rejects.toThrow(
      'Change your phone number from Contact details.'
    );
    // No WhatsApp stored yet: any non-blank value is a move.
    await expect(svc.updateMyProfile(id, { whatsapp_number: '9000000002' } as never)).rejects.toThrow(
      'Verify your new WhatsApp number to change it.'
    );
    expect((await reload(user._id))?.profile?.first_name).toBe('Asha');
    expect(record).not.toHaveBeenCalled();
  });

  it('reports a missing user as NOT_FOUND', async () => {
    await expect(svc.updateMyProfile(new Types.ObjectId().toHexString(), { bio: 'x' } as never)).rejects.toThrow(
      'User not found'
    );
  });
});

describe('interests', () => {
  const seedCategory = (over: Record<string, unknown> = {}) => {
    seq += 1;
    return CategoryModel.create({ name: `Cat ${seq}`, slug: `cat-${seq}`, level: 'CATEGORY', is_active: true, ...over });
  };

  it('updateMyInterests refuses malformed ids and inactive or missing categories', async () => {
    const user = await seedUser();
    const inactive = await seedCategory({ is_active: false });

    await expect(svc.updateMyInterests(String(user._id), ['bad-id'])).rejects.toThrow('Invalid category selection');
    await expect(svc.updateMyInterests(String(user._id), [String(inactive._id)])).rejects.toThrow(
      'One or more selected categories are unavailable'
    );
    await expect(svc.updateMyInterests(String(user._id), [new Types.ObjectId().toHexString()])).rejects.toThrow(
      'One or more selected categories are unavailable'
    );
  });

  it('getInterestCategories returns categories in the order asked, skipping invalid and unknown ids', async () => {
    const a = await seedCategory({ icon: 'paw', media: [{ url: 'https://img/a.png' }] });
    const b = await seedCategory({ is_active: false, sort_order: 4 });

    const rows = await svc.getInterestCategories([String(b._id), 'junk', new Types.ObjectId().toHexString(), String(a._id)]);

    expect(rows.map((r) => r.id)).toEqual([String(b._id), String(a._id)]);
    expect(rows[1]).toMatchObject({
      name: a.name,
      slug: a.slug,
      icon: 'paw',
      level: 'CATEGORY',
      parent_id: null,
      is_active: true,
      media: [{ url: 'https://img/a.png', type: 'IMAGE' }],
    });
    expect(rows[0]).toMatchObject({ is_active: false, sort_order: 4, icon: '' });
    expect(await svc.getInterestCategories(['nope'])).toEqual([]);
  });
});

describe('handles', () => {
  it('getByHandle finds by username (case-insensitively), falls back to an id, else null', async () => {
    const named = await seedUser({ profile: { first_name: 'Named', username: 'asha-rao' } });
    const unnamed = await seedUser();

    expect((await svc.getByHandle('  ASHA-Rao '))?.user_id).toBe(String(named._id));
    expect((await svc.getByHandle(String(unnamed._id)))?.user_id).toBe(String(unnamed._id));
    expect(await svc.getByHandle('nobody-here')).toBeNull();
    expect(await svc.getByHandle('   ')).toBeNull();
  });

  it('usernameAvailability gives a reason, and reads the viewer’s own handle as available', async () => {
    const owner = await seedUser({ profile: { first_name: 'O', username: 'taken-one' } });

    expect(await svc.usernameAvailability('ab', null)).toEqual({ username: 'ab', available: false, reason: 'FORMAT' });
    expect(await svc.usernameAvailability('Admin', null)).toEqual({ username: 'admin', available: false, reason: 'RESERVED' });
    expect(await svc.usernameAvailability('taken-one', null)).toEqual({ username: 'taken-one', available: false, reason: 'TAKEN' });
    expect(await svc.usernameAvailability('taken-one', String(owner._id))).toEqual({
      username: 'taken-one',
      available: true,
      reason: null,
    });
    expect(await svc.usernameAvailability('free-handle', null)).toEqual({ username: 'free-handle', available: true, reason: null });
  });

  it('setMyUsername validates format and reserved words, saves a free handle, and maps a taken one to CONFLICT', async () => {
    const other = await seedUser({ profile: { first_name: 'Other', username: 'already-mine' } });
    const me = await seedUser();
    const id = String(me._id);

    await expect(svc.setMyUsername(id, 'a--b')).rejects.toMatchObject({
      message: 'A username is 3-30 characters: lowercase letters, numbers and single hyphens.',
      extensions: { code: 'BAD_USER_INPUT', reason: 'FORMAT' },
    });
    await expect(svc.setMyUsername(id, 'support')).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT', reason: 'RESERVED' },
    });

    const pub = await svc.setMyUsername(id, ' New-Handle ');
    expect(pub?.username).toBe('new-handle');
    expect(emit).toHaveBeenCalledWith(id, expect.anything());

    await expect(svc.setMyUsername(id, 'already-mine')).rejects.toMatchObject({
      message: 'That username is already taken.',
      extensions: { code: 'CONFLICT', reason: 'TAKEN' },
    });
    expect((await reload(me._id))?.profile?.username).toBe('new-handle');
    expect((await reload(other._id))?.profile?.username).toBe('already-mine');
  });
});

describe('settings writes', () => {
  it('updateMyProfileVisibility accepts only PUBLIC or PRIVATE', async () => {
    const user = await seedUser();
    await expect(svc.updateMyProfileVisibility(String(user._id), 'HIDDEN' as never)).rejects.toThrow('Invalid visibility');
    const pub = await svc.updateMyProfileVisibility(String(user._id), 'PRIVATE');
    expect(pub?.profile_visibility).toBe('PRIVATE');
  });

  it('setMyLocale requires an active locale and announces the change', async () => {
    const user = await seedUser();
    const id = String(user._id);
    await LocaleModel.create({ code: 'hi-IN', label: 'हिन्दी', is_active: true });
    await LocaleModel.create({ code: 'fr-FR', label: 'Français', is_active: false });

    await expect(svc.setMyLocale(id, '  ')).rejects.toThrow('A locale is required');
    await expect(svc.setMyLocale(id, 'fr-FR')).rejects.toThrow('Unsupported locale');
    await expect(svc.setMyLocale(id, 'xx-XX')).rejects.toThrow('Unsupported locale');

    const pub = await svc.setMyLocale(id, ' hi-IN ');
    expect(pub?.locale).toBe('hi-IN');
    expect(emit).toHaveBeenCalledWith(id, expect.objectContaining({ locale: 'hi-IN' }));
  });

  it('updateMyPetProfile stores the pet card', async () => {
    const user = await seedUser();
    const pub = await svc.updateMyPetProfile(String(user._id), { name: 'Bruno', species: 'Dog', breed: 'Indie' } as never);
    expect(pub?.pet_profile).toMatchObject({ name: 'Bruno', species: 'Dog', breed: 'Indie', age: null });
  });
});

describe('public reads', () => {
  it('getById and getPublicByIds return the public shape; invalid and unknown ids are absent', async () => {
    const a = await seedUser();
    const b = await seedUser({ profile: { first_name: 'Bee' } });

    expect((await svc.getById(String(a._id)))?.first_name).toBe('Asha');

    const map = await svc.getPublicByIds([String(a._id), 'junk', new Types.ObjectId().toHexString(), String(b._id)]);
    expect([...map.keys()].sort()).toEqual([String(a._id), String(b._id)].sort());
    expect(map.get(String(b._id))?.first_name).toBe('Bee');
    expect((await svc.getPublicByIds(['junk'])).size).toBe(0);
  });

  it('listPublicCardSources loads the card fields and de-duplicates each user’s roles', async () => {
    const a = await seedUser();
    const b = await seedUser();
    await UserRoleModel.create({ user_id: a._id, role: 'HOST', scope: { city: 'Pune' } });
    await UserRoleModel.create({ user_id: a._id, role: 'HOST', scope: { city: 'Mumbai' } });
    await UserRoleModel.create({ user_id: a._id, role: 'VENUE_OWNER' });

    const { docs, rolesByUser } = await svc.listPublicCardSources([String(a._id), String(b._id), 'junk']);

    expect(docs).toHaveLength(2);
    const card = docs.find((d: { _id: unknown }) => String(d._id) === String(a._id));
    expect(card.profile.first_name).toBe('Asha');
    expect(card.auth).toBeUndefined();
    expect(rolesByUser.get(String(a._id))?.sort()).toEqual(['HOST', 'VENUE_OWNER']);
    expect(rolesByUser.has(String(b._id))).toBe(false);

    const empty = await svc.listPublicCardSources(['junk']);
    expect(empty.docs).toEqual([]);
    expect(empty.rolesByUser.size).toBe(0);
  });
});
