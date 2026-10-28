import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiteEventModel } from '../../models/event.model';
import { LiteUserModel, type LiteUserDoc } from '../../models/user.model';
import { notifications } from '../../services/notifications';
import { freeHandle, toPublicUser, userService } from '../../services/user.service';
import { apiError, badInputError } from '../helpers/expect';
import { DAY, hostedEvent, makeUser, seedRegistration } from '../helpers/fixtures';
import { withTestDatabase } from '../helpers/mongo';

withTestDatabase();

let priya: LiteUserDoc;

beforeEach(async () => {
  vi.spyOn(notifications, 'calendarPublished').mockImplementation(() => undefined);
  priya = await makeUser({ email: 'priya@lite.test', phone: '+919876543210', name: 'Priya', handle: 'priya_s', upi_id: 'priya@okaxis', upi_name: 'Priya S' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('toPublicUser', () => {
  it('shows the owner their email, phone and UPI details', () => {
    expect(toPublicUser(priya, { withEmail: true, eventsHosted: 2, eventsAttended: 5 })).toMatchObject({
      id: String(priya._id),
      email: 'priya@lite.test',
      phone: '+919876543210',
      upi_id: 'priya@okaxis',
      upi_name: 'Priya S',
      events_hosted: 2,
      events_attended: 5,
    });
  });

  it('hides email, phone and UPI from everyone else', () => {
    expect(toPublicUser(priya)).toMatchObject({ email: '', phone: null, upi_id: null, upi_name: null, events_hosted: 0, events_attended: 0 });
  });

  it('fills every social key and the display defaults', () => {
    const view = toPublicUser(priya);
    expect(view.social).toEqual({ instagram: '', x: '', youtube: '', tiktok: '', linkedin: '', website: '' });
    expect(view).toMatchObject({ display_mode: 'SYSTEM', avatar_url: null, bio: null, locale: null, is_admin: false, is_blocked: false, duncit_linked: false });
    expect(Number.isNaN(Date.parse(view.created_at))).toBe(false);
  });
});

describe('freeHandle', () => {
  it('builds a handle from the name and numbers it when taken', async () => {
    await expect(freeHandle('Meera Iyer')).resolves.toBe('meera_iyer');
    await makeUser({ handle: 'meera_iyer' });
    await expect(freeHandle('Meera Iyer')).resolves.toBe('meera_iyer2');
    await makeUser({ handle: 'meera_iyer2' });
    await expect(freeHandle('Meera Iyer')).resolves.toBe('meera_iyer3');
  });

  it("prefixes a name too short to be a handle, and uses 'guest' for none", async () => {
    await expect(freeHandle('A')).resolves.toBe('guest_a');
    await expect(freeHandle('Al')).resolves.toBe('guest_al');
    await expect(freeHandle('!!!')).resolves.toBe('guest');
  });

  it('keeps a handle within 24 characters', async () => {
    await expect(freeHandle('a'.repeat(40))).resolves.toBe('a'.repeat(24));
  });
});

describe('counts', () => {
  it('counts published, visible events the person hosts', async () => {
    await hostedEvent(priya);
    await hostedEvent(priya, { title: 'Draft' }, false);
    const hidden = await hostedEvent(priya, { title: 'Hidden' });
    await LiteEventModel.updateOne({ _id: hidden._id }, { $set: { hidden: true } });
    await expect(userService.hostedCount(priya._id)).resolves.toBe(1);
  });

  it('counts only confirmed seats at events that have started', async () => {
    const host = await makeUser();
    const event = await hostedEvent(host);
    const past = new Date(Date.now() - DAY);
    await seedRegistration(event, priya, { event_start_at: past });
    const other = await hostedEvent(host, { title: 'Other' });
    await seedRegistration(other, priya, { status: 'CANCELLED', event_start_at: past });
    const upcoming = await hostedEvent(host, { title: 'Upcoming' });
    await seedRegistration(upcoming, priya);
    await expect(userService.attendedCount(priya._id)).resolves.toBe(1);
  });

  it('puts both counts on the owner view', async () => {
    await hostedEvent(priya);
    await expect(userService.me(priya)).resolves.toMatchObject({ email: 'priya@lite.test', events_hosted: 1, events_attended: 0 });
  });
});

describe('userService.byHandle', () => {
  it('finds a public profile by handle in any case, without contact details', async () => {
    await expect(userService.byHandle('PRIYA_S')).resolves.toMatchObject({ name: 'Priya', email: '', phone: null });
  });

  it('answers null for an unknown or blocked person', async () => {
    await expect(userService.byHandle('nobody')).resolves.toBeNull();
    await LiteUserModel.updateOne({ _id: priya._id }, { $set: { is_blocked: true } });
    await expect(userService.byHandle('priya_s')).resolves.toBeNull();
  });
});

describe('userService.updateProfile', () => {
  it('saves a cleaned profile and answers the owner view', async () => {
    const me = await userService.updateProfile(priya, {
      name: '  Priya Sharma ',
      handle: ' Priya_Sharma ',
      bio: ' Jazz, chai and long walks. ',
      avatar_url: 'https://ik.imagekit.io/duncit/avatar.png',
      upi_id: 'PRIYA@OKICICI',
      upi_name: 'Priya Sharma',
      display_mode: 'DARK',
    });
    expect(me).toMatchObject({
      name: 'Priya Sharma',
      handle: 'priya_sharma',
      bio: 'Jazz, chai and long walks.',
      avatar_url: 'https://ik.imagekit.io/duncit/avatar.png',
      upi_id: 'priya@okicici',
      display_mode: 'DARK',
    });
  });

  it('refuses a malformed or taken handle, but allows keeping your own', async () => {
    await makeUser({ handle: 'taken_one' });
    await expect(userService.updateProfile(priya, { handle: 'ab' })).rejects.toMatchObject(badInputError('A handle is 3 to 30 letters, numbers or underscores'));
    await expect(userService.updateProfile(priya, { handle: 'priya-s' })).rejects.toMatchObject(badInputError('A handle is 3 to 30 letters, numbers or underscores'));
    await expect(userService.updateProfile(priya, { handle: 'taken_one' })).rejects.toMatchObject(badInputError('That handle is already taken'));
    await expect(userService.updateProfile(priya, { handle: 'priya_s' })).resolves.toMatchObject({ handle: 'priya_s' });
  });

  it('stores social handles without a leading @ and refuses full links', async () => {
    const me = await userService.updateProfile(priya, { social: { instagram: '@priya.sings', x: 'priya_s', website: 'https://priya.dev' } });
    expect(me.social).toMatchObject({ instagram: 'priya.sings', x: 'priya_s', website: 'https://priya.dev', youtube: '' });

    await expect(userService.updateProfile(priya, { social: { instagram: 'https://instagram.com/priya' } })).rejects.toMatchObject(
      badInputError('Enter just your Instagram handle, without the full link'),
    );
    await expect(userService.updateProfile(priya, { social: { linkedin: 'in/priya sharma' } })).rejects.toMatchObject(
      badInputError('Enter just your LinkedIn handle, without the full link'),
    );
    await expect(userService.updateProfile(priya, { social: { website: 'priya.dev' } })).rejects.toMatchObject(badInputError('Website must be a full http(s) link'));
  });

  it('changes only the social links sent, and clears one sent blank', async () => {
    await userService.updateProfile(priya, { social: { instagram: 'priya.sings', youtube: 'priyasings' } });
    const me = await userService.updateProfile(priya, { social: { youtube: '', tiktok: '@priya' } });
    expect(me.social).toMatchObject({ instagram: 'priya.sings', youtube: '', tiktok: 'priya' });
  });

  it('validates the display mode and the other fields', async () => {
    await expect(userService.updateProfile(priya, { display_mode: 'NEON' })).rejects.toMatchObject(badInputError('Pick System, Light or Dark'));
    await expect(userService.updateProfile(priya, { name: '  ' })).rejects.toMatchObject(badInputError('Name is required'));
    await expect(userService.updateProfile(priya, { bio: 'x'.repeat(501) })).rejects.toMatchObject(badInputError('Bio must be 500 characters or fewer'));
    await expect(userService.updateProfile(priya, { avatar_url: 'avatar.png' })).rejects.toMatchObject(badInputError('Avatar must be a full http(s) link'));
    await expect(userService.updateProfile(priya, { upi_id: 'priya' })).rejects.toMatchObject(badInputError('Enter a valid UPI ID, like name@bank'));
  });

  it('leaves fields that are not sent unchanged', async () => {
    await expect(userService.updateProfile(priya, {})).resolves.toMatchObject({ name: 'Priya', handle: 'priya_s', upi_id: 'priya@okaxis' });
  });
});

describe('userService.setLocale', () => {
  it('saves the reading language and refuses a blank one', async () => {
    await expect(userService.setLocale(priya, ' hi-IN ')).resolves.toMatchObject({ locale: 'hi-IN' });
    await expect(userService.setLocale(priya, '')).rejects.toMatchObject(badInputError('Locale is required'));
  });
});

describe('lookups', () => {
  it('finds accounts by email, phone and id', async () => {
    expect((await userService.byEmail('priya@lite.test'))?.handle).toBe('priya_s');
    expect((await userService.byPhone('+919876543210'))?.handle).toBe('priya_s');
    await expect(userService.byEmail('nobody@lite.test')).resolves.toBeNull();
    await expect(userService.requireByIdLean(String(priya._id))).resolves.toMatchObject({ name: 'Priya' });
    await expect(userService.requireByIdLean('507f1f77bcf86cd799439011')).rejects.toMatchObject(apiError('NOT_FOUND', 'Account could not be found'));
  });
});
