/**
 * Venue review and admin lifecycle against a real database: approval (role
 * grant + onboarding welcome on the transition only), admin create/update
 * on behalf of an owner, deductions, the Onboarding cancellation trigger and
 * refund ladder, activation notices, hard delete with the last-venue role
 * drop, and revocation.
 *
 * Role writes go through `userService.assignRoles`, whose transaction a
 * standalone mongod cannot host — it is stubbed and asserted on instead.
 */
jest.mock('@services/email/email.service', () => {
  const actual = jest.requireActual('@services/email/email.service');
  return Object.fromEntries(
    Object.entries(actual).map(([key, value]) => [
      key,
      typeof value === 'function' ? jest.fn().mockResolvedValue(undefined) : value,
    ])
  );
});
jest.mock('@services/notify/notify.service', () => ({
  ...jest.requireActual('@services/notify/notify.service'),
  notifyEach: jest.fn().mockResolvedValue([]),
}));
jest.mock('@config/url-configs', () => ({
  ...jest.requireActual('@config/url-configs'),
  getUrlConfigs: jest.fn().mockResolvedValue({ partnersUrl: 'https://partners.example.test' }),
}));

import { Types } from 'mongoose';
import { venueService } from '../../venue.service';
import { VenueModel } from '../../venue.model';
import { UserModel } from '@modules/access/user/user.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { userService } from '@modules/access/user/user.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { sendEmail } from '@services/email/email.service';
import { notifyEach } from '@services/notify/notify.service';
import { logs } from '@observability/log';

const mail = sendEmail as jest.Mock;
const notifyMany = notifyEach as jest.Mock;

const spies: jest.SpyInstance[] = [];
const spy = (obj: any, key: string): jest.SpyInstance => {
  const s = jest.spyOn(obj, key);
  spies.push(s);
  return s;
};
let assignRoles: jest.SpyInstance;
let waSend: jest.SpyInstance;

beforeEach(() => {
  assignRoles = spy(userService, 'assignRoles').mockResolvedValue(null as never);
  waSend = spy(whatsappService, 'send').mockResolvedValue({ status: 'SENT' } as never);
});
afterEach(() => {
  while (spies.length) spies.pop()?.mockRestore();
});

let seq = 0;
async function makeOwner(roleKeys: string[] = ['USER']) {
  seq += 1;
  return UserModel.create({
    auth: { email: `venue-owner${seq}@example.com` },
    profile: { first_name: 'Venue', last_name: `Owner${seq}` },
    metadata: { role_keys: roleKeys },
  });
}

async function seedLocation() {
  return LocationModel.create({
    location_id: 'pune',
    location_name: 'Pune',
    country: 'India',
    country_code: 'IN',
    state: 'Maharashtra',
    state_code: 'MH',
    city: 'Pune',
    location_image: 'https://img.example.test/pune.jpg',
    location_pincode: '411001',
    location_zones: [],
  });
}

const missingId = () => String(new Types.ObjectId());

describe('approve', () => {
  it('refuses a venue that does not exist', async () => {
    await expect(venueService.approve(missingId())).rejects.toThrow('Venue not found');
  });

  it('approves, grants VENUE_OWNER on top of the existing roles, and sends both onboarding messages', async () => {
    const owner = await makeOwner(['USER', 'HOST']);
    const v = await VenueModel.create({
      owner_user_id: owner._id,
      status: 'SUBMITTED',
      venue_name: 'Rooftop Hall',
      owner_name: 'Olu',
      owner_email: 'olu@example.com',
      venue_category: { sub_category_name: 'Box Cricket' },
    });

    const out = await venueService.approve(String(v._id), 'Docs verified', ['  wifi ', '', 'parking']);

    expect(out).toMatchObject({ status: 'APPROVED', reviewer_notes: 'Docs verified', tags: ['wifi', 'parking'] });
    expect(out.approved_at).not.toBeNull();
    expect(assignRoles).toHaveBeenCalledWith(String(owner._id), ['USER', 'HOST', 'VENUE_OWNER']);
    expect(notifyMany).toHaveBeenCalledTimes(1);
    const [messages] = notifyMany.mock.calls[0];
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      event: 'VENUE_ONBOARDING_APPROVED',
      name: 'Olu',
      params: ['Olu', 'olu@example.com'],
      email: 'olu@example.com',
      vars: { portal_url: 'https://partners.example.test' },
    });
    expect(messages[1]).toMatchObject({
      event: 'VENUE_NEW_REQUESTED',
      name: 'Olu',
      params: ['Olu', 'Rooftop Hall', 'Box Cricket'],
      email: 'olu@example.com',
    });
    // Both carry the owner's ACCOUNT as the WhatsApp recipient.
    expect(String(messages[0].user._id)).toBe(String(owner._id));
  });

  it('re-approving keeps notes and tags it was not given, and sends no second welcome', async () => {
    const owner = await makeOwner();
    const v = await VenueModel.create({
      owner_user_id: owner._id,
      status: 'APPROVED',
      reviewer_notes: 'First pass',
      tags: ['quiet'],
    });

    const out = await venueService.approve(String(v._id));

    expect(out).toMatchObject({ status: 'APPROVED', reviewer_notes: 'First pass', tags: ['quiet'] });
    expect(notifyMany).not.toHaveBeenCalled();
    expect(assignRoles).toHaveBeenCalledWith(String(owner._id), ['USER', 'VENUE_OWNER']);
  });

  it('an owner whose account is gone is still granted USER + VENUE_OWNER', async () => {
    const ghost = new Types.ObjectId();
    const v = await VenueModel.create({ owner_user_id: ghost, status: 'APPROVED' });

    await venueService.approve(String(v._id), 'note');

    expect(assignRoles).toHaveBeenCalledWith(String(ghost), ['USER', 'VENUE_OWNER']);
  });
});

describe('adminCreate', () => {
  const step3 = {
    owner_name: 'Asha',
    owner_email: 'asha@example.com',
    owner_phone: '+910000000000',
    bank_account: { payout_method: 'upi', upi_id: ' asha@upi ', ifsc_code: 'sbin0001' },
  };

  it.each([[''], ['not-an-id']])('refuses owner id %p', async (ownerUserId) => {
    await expect(
      venueService.adminCreate({ ownerUserId, step1: {}, step2: {}, step3: {} })
    ).rejects.toMatchObject({ message: 'Valid owner_user_id is required', extensions: { code: 'BAD_USER_INPUT' } });
    expect(await VenueModel.countDocuments()).toBe(0);
  });

  it('creates a submitted venue with clean documents and a normalised bank account', async () => {
    await seedLocation();
    const owner = missingId();

    const out = await venueService.adminCreate({
      ownerUserId: owner,
      step1: { city: 'Pune', venue_name: 'Cafe One', venue_type: 'Cafe', capacity: 30, tags: ['wifi'] },
      step2: {
        documents: [
          { type: ' GST Certificate ', url: ' https://doc.example.test/gst.pdf ' },
          { type: 'PAN', url: '' },
          null,
        ],
        gstin: '22AAAAA0000A1Z5',
        pan: 'AAAAA0000A',
      },
      step3: { ...step3, owner_dob: '1990-02-03', owner_address: '1 Main Rd' },
      submit: true,
    });

    expect(out).toMatchObject({
      owner_user_id: owner,
      venue_name: 'Cafe One',
      city: 'Pune',
      state: 'Maharashtra',
      locality: 'Pune',
      postal_code: '411001',
      gstin: '22AAAAA0000A1Z5',
      pan: 'AAAAA0000A',
      owner_name: 'Asha',
      owner_address: '1 Main Rd',
      owner_dob: new Date('1990-02-03').toISOString(),
      tags: ['wifi'],
      step_completed: 4,
      status: 'SUBMITTED',
      bank_account: { payout_method: 'UPI', upi_id: 'asha@upi', ifsc_code: 'SBIN0001', account_number: '' },
    });
    expect(out.documents).toEqual([
      { type: 'GST Certificate', url: 'https://doc.example.test/gst.pdf', uploaded_at: expect.any(String) },
    ]);
    expect(out.submitted_at).not.toBeNull();
    expect(out.venue_no).toMatch(/^VEN-\d{6}$/);
  });

  it('a non-submitted create is a step-3 DRAFT with blank optional fields, and never overwrites the owner other venues', async () => {
    await seedLocation();
    const owner = missingId();
    const first = await venueService.adminCreate({
      ownerUserId: owner,
      step1: { city: 'Pune', venue_name: 'First', tags: 'not-a-list' },
      step2: {},
      step3,
    });
    const second = await venueService.adminCreate({
      ownerUserId: owner,
      step1: { city: 'Pune', venue_name: 'Second' },
      step2: {},
      step3,
    });

    expect(first).toMatchObject({
      status: 'DRAFT',
      step_completed: 3,
      submitted_at: null,
      gstin: '',
      pan: '',
      tags: [],
      owner_dob: null,
      owner_address: '',
      documents: [],
    });
    expect(second.id).not.toBe(first.id);
    expect(await VenueModel.countDocuments({ owner_user_id: owner })).toBe(2);
  });
});

describe('adminUpdate', () => {
  const step3 = { owner_name: 'Ravi', owner_email: 'ravi@example.com', owner_phone: '+911111111111' };

  it('refuses a venue that does not exist', async () => {
    await expect(
      venueService.adminUpdate(missingId(), { step1: {}, step2: {}, step3 })
    ).rejects.toThrow('Venue not found');
  });

  it('approving through an edit stamps approval, clears a rejection and grants the role', async () => {
    await seedLocation();
    const owner = await makeOwner(['USER']);
    const rejectedAt = new Date('2026-05-01T00:00:00.000Z');
    const v = await VenueModel.create({
      owner_user_id: owner._id,
      status: 'REJECTED',
      rejected_at: rejectedAt,
      step_completed: 1,
      gstin: 'KEEP',
      tags: ['keep'],
    });

    const out = await venueService.adminUpdate(String(v._id), {
      step1: { city: 'Pune', venue_name: 'Renamed' },
      step2: { documents: [{ type: 'GST', url: 'https://doc.example.test/g.pdf' }] },
      step3: { ...step3, bank_account: { payout_method: 'NEFT', account_number: ' 123 ' } },
      status: 'APPROVED',
    });

    expect(out).toMatchObject({
      venue_name: 'Renamed',
      status: 'APPROVED',
      rejected_at: null,
      step_completed: 3,
      gstin: 'KEEP',
      tags: ['keep'],
      owner_name: 'Ravi',
      owner_dob: null,
      bank_account: { payout_method: 'NEFT', account_number: '123' },
    });
    expect(out.approved_at).not.toBeNull();
    expect(out.documents).toHaveLength(1);
    expect(assignRoles).toHaveBeenCalledWith(String(owner._id), ['USER', 'VENUE_OWNER']);
  });

  it('SUBMITTED stamps a submission date once; REJECTED keeps its date; no status leaves it alone', async () => {
    await seedLocation();
    const v = await VenueModel.create({ owner_user_id: new Types.ObjectId(), status: 'DRAFT', step_completed: 4 });
    const id = String(v._id);
    const base = { step1: { city: 'Pune' }, step2: {}, step3 };

    const submitted = await venueService.adminUpdate(id, { ...base, status: 'SUBMITTED' });
    expect(submitted.status).toBe('SUBMITTED');
    expect(submitted.submitted_at).not.toBeNull();
    expect(submitted.step_completed).toBe(4);
    const firstSubmittedAt = submitted.submitted_at;

    const again = await venueService.adminUpdate(id, { ...base, status: 'SUBMITTED' });
    expect(again.submitted_at).toBe(firstSubmittedAt);

    const rejectedAt = new Date('2026-06-01T00:00:00.000Z');
    await VenueModel.updateOne({ _id: v._id }, { $set: { rejected_at: rejectedAt } });
    const rejected = await venueService.adminUpdate(id, {
      ...base,
      step1: { city: 'Pune', tags: ['new'] },
      step2: { gstin: 'G2', pan: 'P2' },
      step3: { ...step3, owner_dob: '1985-01-01', owner_address: 'Addr' },
      status: 'REJECTED',
    });
    expect(rejected).toMatchObject({
      status: 'REJECTED',
      rejected_at: rejectedAt.toISOString(),
      tags: ['new'],
      gstin: 'G2',
      pan: 'P2',
      owner_address: 'Addr',
      owner_dob: new Date('1985-01-01').toISOString(),
    });

    const untouched = await venueService.adminUpdate(id, base);
    expect(untouched.status).toBe('REJECTED');
    expect(assignRoles).not.toHaveBeenCalled();
  });
});

describe('setDeductions', () => {
  it.each([
    [-1, 10],
    [10, 101],
    [Number.NaN, 0],
  ])('refuses share %p / commission %p', async (share, commission) => {
    await expect(venueService.setDeductions(missingId(), share, commission)).rejects.toThrow(
      'Venue share and commission must be between 0 and 100'
    );
  });

  it('refuses a venue that does not exist', async () => {
    await expect(venueService.setDeductions(missingId(), 10, 5)).rejects.toThrow('Venue not found');
  });

  it('writes both percentages, including the 0 and 100 bounds', async () => {
    const v = await VenueModel.create({ owner_user_id: new Types.ObjectId() });
    const out = await venueService.setDeductions(String(v._id), 100, 0);
    expect(out).toMatchObject({ venue_share_pct: 100, venue_commission_pct: 0 });
    const stored = await VenueModel.findById(v._id).lean();
    expect(stored).toMatchObject({ venue_share_pct: 100, venue_commission_pct: 0 });
  });
});

describe('setHostRequestLimit', () => {
  it.each([[-1], [1001], [2.5]])('refuses an override of %p', async (limit) => {
    await expect(venueService.setHostRequestLimit(missingId(), limit)).rejects.toThrow(
      'The limit must be a whole number from 0 to 1000'
    );
  });

  it('refuses a venue that does not exist', async () => {
    await expect(venueService.setHostRequestLimit(missingId(), 5)).rejects.toThrow('Venue not found');
  });

  it("sets the override at both bounds and clears it back to the owner's rule", async () => {
    const v = await VenueModel.create({ owner_user_id: new Types.ObjectId() });
    const id = String(v._id);
    expect(await venueService.setHostRequestLimit(id, 0)).toMatchObject({ host_requests_limit_override: 0 });
    expect(await venueService.setHostRequestLimit(id, 1000)).toMatchObject({ host_requests_limit_override: 1000 });
    const cleared = await venueService.setHostRequestLimit(id, null);
    expect(cleared.host_requests_limit_override).toBeNull();
    expect(cleared.settings.rules.max_host_requests_per_month).toBe(10);
    expect((await VenueModel.findById(id).lean())?.host_requests_limit_override).toBeNull();
  });
});

describe('setCancellationTrigger', () => {
  it('refuses a malformed venue id', async () => {
    await expect(venueService.setCancellationTrigger('nope', 6, [])).rejects.toThrow('Invalid venue id');
  });

  it.each([[-1], [1.5], [8761], [Number.NaN]])('refuses a trigger of %p hours', async (hours) => {
    await expect(venueService.setCancellationTrigger(missingId(), hours, [])).rejects.toThrow(
      'Cancellation trigger must be a whole number of hours between 0 and 8760'
    );
  });

  it('refuses a refund percent outside 0-100, and two bands on one window', async () => {
    await expect(
      venueService.setCancellationTrigger(missingId(), 6, [{ hours_before: 24, refund_pct: 101 }])
    ).rejects.toThrow('refund percent must be between 0 and 100');
    await expect(
      venueService.setCancellationTrigger(missingId(), 6, [{ hours_before: 24, refund_pct: 'x' }])
    ).rejects.toThrow('refund percent must be between 0 and 100');
    await expect(
      venueService.setCancellationTrigger(missingId(), 6, [
        { hours_before: 24, refund_pct: 50 },
        { hours_before: 24.4, refund_pct: 20 },
      ])
    ).rejects.toThrow('each refund band needs its own "hours before" window');
  });

  it('refuses a venue that does not exist', async () => {
    await expect(venueService.setCancellationTrigger(missingId(), 6, [])).rejects.toThrow('Venue not found');
  });

  it('stores the trigger and the ladder widest-first, leaving the owner charge bands alone', async () => {
    const v = await VenueModel.create({
      owner_user_id: new Types.ObjectId(),
      settings: {
        cancellation: {
          reschedule_only: true,
          tiers: [{ hours_before: 12, charge_type: 'AMOUNT', value: 500 }],
        },
      },
    });

    const out = await venueService.setCancellationTrigger(String(v._id), 0, [
      { hours_before: 6, refund_pct: 25 },
      { hours_before: 99999, refund_pct: 100 },
      { hours_before: 48, refund_pct: 50 },
    ]);

    expect(out.settings.cancellation).toEqual({
      reschedule_only: true,
      tiers: [{ hours_before: 12, charge_type: 'AMOUNT', value: 500 }],
      trigger_hours: 0,
      refund_tiers: [
        { hours_before: 8760, refund_pct: 100 },
        { hours_before: 48, refund_pct: 50 },
        { hours_before: 6, refund_pct: 25 },
      ],
    });
  });

  it('a missing ladder clears it', async () => {
    const v = await VenueModel.create({
      owner_user_id: new Types.ObjectId(),
      settings: { cancellation: { refund_tiers: [{ hours_before: 24, refund_pct: 50 }] } },
    });
    const out = await venueService.setCancellationTrigger(String(v._id), 12, null as never);
    expect(out.settings.cancellation.trigger_hours).toBe(12);
    expect(out.settings.cancellation.refund_tiers).toEqual([]);
  });
});

describe('setActive', () => {
  it('refuses a venue that does not exist', async () => {
    await expect(venueService.setActive(missingId(), true)).rejects.toThrow('Venue not found');
  });

  it('says nothing when nothing changed', async () => {
    const v = await VenueModel.create({ owner_user_id: new Types.ObjectId(), is_active: true });
    const out = await venueService.setActive(String(v._id), true);
    expect(out.is_active).toBe(true);
    expect(mail).not.toHaveBeenCalled();
    expect(waSend).not.toHaveBeenCalled();
  });

  it('reactivation emails the venue contact and WhatsApps the owner account', async () => {
    const owner = await makeOwner();
    const v = await VenueModel.create({
      owner_user_id: owner._id,
      is_active: false,
      owner_name: 'Olu',
      owner_email: 'olu@example.com',
      venue_name: 'Hall',
    });

    const out = await venueService.setActive(String(v._id), true);

    expect(out.is_active).toBe(true);
    expect(mail).toHaveBeenCalledWith({
      to: 'olu@example.com',
      subject: 'Your venue is now active',
      template: 'venue-activated',
      category: 'notification',
      vars: { owner_name: 'Olu', venue_name: 'Hall', status: 'active' },
    });
    expect(waSend).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'VENUE_ACCOUNT_REACTIVATED', name: 'Olu', params: ['Olu'] })
    );
  });

  it('a failed deactivation email is logged and the WhatsApp still goes', async () => {
    const v = await VenueModel.create({ owner_user_id: new Types.ObjectId(), is_active: true, owner_name: 'Olu' });
    const err = new Error('smtp down');
    mail.mockRejectedValueOnce(err);
    const warn = spy(logs.server, 'warn').mockImplementation(() => undefined as never);

    const out = await venueService.setActive(String(v._id), false);

    expect(out.is_active).toBe(false);
    expect(mail).toHaveBeenCalledWith(
      expect.objectContaining({ template: 'venue-deactivated', subject: 'Your venue has been deactivated' })
    );
    expect(warn).toHaveBeenCalledWith('venue', 'setActive', {
      error: err,
      slug: 'venue-deactivated',
      venue_id: String(v._id),
      msg: 'venue status-change email failed',
    });
    expect(waSend).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'VENUE_ACCOUNT_SUSPENDED', user: null })
    );
  });
});

describe('deleteVenue — role housekeeping', () => {
  it('refuses a malformed id and a venue that does not exist', async () => {
    await expect(venueService.deleteVenue('nope')).rejects.toThrow('Invalid venue id');
    await expect(venueService.deleteVenue(missingId())).rejects.toThrow('Venue not found');
  });

  it("drops VENUE_OWNER when the owner's last venue goes", async () => {
    const owner = await makeOwner(['USER', 'VENUE_OWNER', 'HOST']);
    const v = await VenueModel.create({ owner_user_id: owner._id });

    await expect(venueService.deleteVenue(String(v._id))).resolves.toBe(true);

    expect(assignRoles).toHaveBeenCalledWith(String(owner._id), ['USER', 'HOST']);
  });

  it('keeps the role while another venue remains, and skips an owner who never held it', async () => {
    const owner = await makeOwner(['USER', 'VENUE_OWNER']);
    const a = await VenueModel.create({ owner_user_id: owner._id });
    await VenueModel.create({ owner_user_id: owner._id });
    await venueService.deleteVenue(String(a._id));
    expect(assignRoles).not.toHaveBeenCalled();

    const plain = await makeOwner(['USER']);
    const b = await VenueModel.create({ owner_user_id: plain._id });
    await venueService.deleteVenue(String(b._id));
    const ghost = await VenueModel.create({ owner_user_id: new Types.ObjectId() });
    await venueService.deleteVenue(String(ghost._id));
    expect(assignRoles).not.toHaveBeenCalled();
  });
});

describe('revokeApprovalForUser', () => {
  it('un-approves every approved venue of the user and nothing else', async () => {
    const owner = new Types.ObjectId();
    const approved = await VenueModel.create({ owner_user_id: owner, status: 'APPROVED' });
    const draft = await VenueModel.create({ owner_user_id: owner, status: 'DRAFT' });
    const someoneElse = await VenueModel.create({ owner_user_id: new Types.ObjectId(), status: 'APPROVED' });

    await expect(venueService.revokeApprovalForUser(String(owner))).resolves.toBe(true);

    const revoked = await VenueModel.findById(approved._id).lean();
    expect(revoked).toMatchObject({
      status: 'REJECTED',
      reviewer_notes: 'Approval revoked — venue access was removed.',
    });
    expect(revoked?.rejected_at).toBeInstanceOf(Date);
    expect((await VenueModel.findById(draft._id).lean())?.status).toBe('DRAFT');
    expect((await VenueModel.findById(someoneElse._id).lean())?.status).toBe('APPROVED');
  });
});
