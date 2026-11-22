/**
 * The Venue Kit interest form and its tracking list, against a real database:
 * the offer every surface reads, the email-then-phone codes through the shared
 * otpService, the submit that spends them exactly once, the de-duplication by
 * mailbox, and the console's table, counts and follow-up status. Only the
 * transports, the e2e hold, the channel preference and MSG91 are faked.
 */
jest.mock('@observability/log', () => ({ logs: { server: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } } }));
jest.mock('@modules/platform/otp/otp.delivery', () => ({ deliverOtp: jest.fn() }));
jest.mock('@modules/platform/e2eRun/e2eRun.codes', () => ({ E2E_HELD_REASON: 'held', holdRunAccountCode: jest.fn() }));
jest.mock('@modules/access/commPreference/commPreference.service', () => ({ commPreferenceService: { allowedPhoneMediums: jest.fn() } }));
jest.mock('@modules/platform/msg91/msg91.gateway', () => ({ msg91VerifyOtp: jest.fn(), runtimeMsg91Credentials: jest.fn() }));
jest.mock('@modules/platform/captcha/captcha.service', () => ({ assertCaptcha: jest.fn() }));

import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { commPreferenceService } from '@modules/access/commPreference/commPreference.service';
import { assertCaptcha } from '@modules/platform/captcha/captcha.service';
import { holdRunAccountCode } from '@modules/platform/e2eRun/e2eRun.codes';
import { runtimeMsg91Credentials } from '@modules/platform/msg91/msg91.gateway';
import { deliverOtp } from '@modules/platform/otp/otp.delivery';
import { OtpChallengeModel } from '@modules/platform/otp/otp.model';
import { VENUE_KIT_OFFER_DEFAULTS, VenueKitInterestModel, VenueKitOfferModel } from '../../venueKit.model';
import { venueKitOtp } from '../../venueKit.otp';
import { venueKitResolvers } from '../../venueKit.resolver';
import { venueKitService } from '../../venueKit.service';

const deliver = deliverOtp as jest.Mock;
const captcha = assertCaptcha as jest.Mock;
const PHONE = { phone_extension: '+91', phone_number: '9876543210' };
const OTHER_PHONE = { phone_extension: '+91', phone_number: '9123456780' };
const lastCode = () => deliver.mock.calls.at(-1)?.[0].code as string;
const sent = (medium: string) => ({ medium, status: 'SENT', reason: '' });

const ctxAs = (roles: string[] | null): GraphQLContext =>
  ({ user: roles ? { id: new Types.ObjectId().toHexString(), email: 's@duncit.test', roles } : null }) as unknown as GraphQLContext;

/** Mails a code to `email`, types it, and returns the email grant. */
async function proveEmail(email = 'owner@cafe.in', name = 'Cafe Owner') {
  await venueKitOtp.requestEmail({ name, email }, null);
  return (await venueKitOtp.verifyEmail({ email, code: lastCode() })).token;
}

/** Texts a code to `phone` (needs an email grant), types it, returns the phone grant. */
async function provePhone(emailToken: string, phone = PHONE) {
  await venueKitOtp.requestPhone({ email_token: emailToken, ...phone }, null);
  return (await venueKitOtp.verifyPhone({ ...phone, code: lastCode() })).token;
}

beforeEach(async () => {
  jest.clearAllMocks();
  (holdRunAccountCode as jest.Mock).mockResolvedValue(false);
  deliver.mockImplementation(async ({ medium }: { medium: string }) => sent(medium));
  (commPreferenceService.allowedPhoneMediums as jest.Mock).mockImplementation(async (_n: string, m: string[]) => m);
  (runtimeMsg91Credentials as jest.Mock).mockResolvedValue(null);
  await Promise.all([VenueKitInterestModel.deleteMany({}), VenueKitOfferModel.deleteMany({}), OtpChallengeModel.deleteMany({})]);
});

describe('the offer', () => {
  it('serves the shipped defaults until an admin saves one', async () => {
    await expect(venueKitService.offer()).resolves.toEqual({ ...VENUE_KIT_OFFER_DEFAULTS, updated_at: null });
  });

  it('saves a new plan as the one singleton and serves it from then on', async () => {
    const next = { ...VENUE_KIT_OFFER_DEFAULTS, annual_price_paise: 1_199_900, included_table_labels: 30 };
    const saved = await venueKitService.updateOffer(next);
    expect(saved).toMatchObject({ annual_price_paise: 1_199_900, included_table_labels: 30 });
    expect(saved.updated_at).toEqual(expect.any(String));
    await venueKitService.updateOffer({ ...next, order_benefit_pct: 1.5 });
    expect(await VenueKitOfferModel.countDocuments()).toBe(1);
    await expect(venueKitService.offer()).resolves.toMatchObject({ order_benefit_pct: 1.5, annual_price_paise: 1_199_900 });
  });

  it('refuses fractional paise, negatives, a percentage over 100 and a missing field', async () => {
    const bad = [
      { ...VENUE_KIT_OFFER_DEFAULTS, annual_price_paise: 99.5 },
      { ...VENUE_KIT_OFFER_DEFAULTS, gift_card_count: -1 },
      { ...VENUE_KIT_OFFER_DEFAULTS, collab_gift_card_discount_pct: 101 },
      { ...VENUE_KIT_OFFER_DEFAULTS, annual_price_paise: 100_000_001 },
      { annual_price_paise: 999_900 },
    ];
    for (const input of bad) {
      await expect(venueKitService.updateOffer(input)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    }
    expect(await VenueKitOfferModel.countDocuments()).toBe(0);
  });
});

describe('the email code', () => {
  it('mails a code addressed to the lower-cased mailbox and says it was sent', async () => {
    const result = await venueKitOtp.requestEmail({ name: ' Cafe Owner ', email: ' Owner@Cafe.IN ' }, null);
    expect(result).toMatchObject({ sent: true, test_code: null, expires_in_minutes: 10 });
    expect(deliver).toHaveBeenCalledWith(expect.objectContaining({ medium: 'EMAIL', email: 'owner@cafe.in', recipient_name: 'Cafe Owner', purpose: 'VENUE_KIT_EMAIL' }));
  });

  it('echoes the test code only while no provider could carry it', async () => {
    deliver.mockResolvedValue({ medium: 'EMAIL', status: 'STUBBED', reason: 'no mailer' });
    const result = await venueKitOtp.requestEmail({ name: 'Cafe', email: 'a@cafe.in' }, null);
    expect(result).toMatchObject({ sent: false, test_code: '123456' });
  });

  it('reports a configured mailer that refused instead of pretending the code is on its way', async () => {
    deliver.mockResolvedValue({ medium: 'EMAIL', status: 'FAILED', reason: 'Mailbox rejected' });
    await expect(venueKitOtp.requestEmail({ name: 'Cafe', email: 'a@cafe.in' }, null)).rejects.toMatchObject({
      message: expect.stringContaining('Mailbox rejected'),
      extensions: { code: 'SERVICE_UNAVAILABLE' },
    });
  });

  it('refuses a bad name or address before anything is sent', async () => {
    await expect(venueKitOtp.requestEmail({ name: 'A', email: 'a@cafe.in' }, null)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    await expect(venueKitOtp.requestEmail({ name: 'Cafe', email: 'not-an-email' }, null)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    expect(deliver).not.toHaveBeenCalled();
  });

  it('turns a right code into a grant and a wrong one into a counted attempt', async () => {
    await venueKitOtp.requestEmail({ name: 'Cafe', email: 'a@cafe.in' }, null);
    const wrong = lastCode() === '000000' ? '111111' : '000000';
    await expect(venueKitOtp.verifyEmail({ email: 'a@cafe.in', code: wrong })).rejects.toThrow('Incorrect code — 4 attempts left');
    await expect(venueKitOtp.verifyEmail({ email: 'a@cafe.in', code: lastCode() })).resolves.toEqual({ token: expect.stringMatching(/^[a-f\d]{24}\.[a-f\d]{64}$/) });
    await expect(venueKitOtp.verifyEmail({ email: 'a@cafe.in', code: '12' })).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });
});

describe('the optional phone code', () => {
  it('texts a +91 mobile over SMS only, once the email is proved', async () => {
    const emailToken = await proveEmail();
    await venueKitOtp.requestPhone({ email_token: emailToken, ...PHONE }, null);
    expect(deliver).toHaveBeenLastCalledWith(expect.objectContaining({ medium: 'SMS', purpose: 'VENUE_KIT_PHONE', ...PHONE, recipient_name: 'Cafe Owner' }));
    await expect(venueKitOtp.verifyPhone({ ...PHONE, code: lastCode() })).resolves.toEqual({ token: expect.any(String) });
  });

  it('refuses to text anyone without a live email proof', async () => {
    await expect(venueKitOtp.requestPhone({ email_token: 'forged.token', ...PHONE }, null)).rejects.toThrow('That verification has expired — start again');
    await expect(venueKitOtp.requestPhone({ email_token: '', ...PHONE }, null)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    expect(deliver).not.toHaveBeenCalled();
  });

  it('refuses a non-Indian dial code and a number that is not an Indian mobile', async () => {
    const emailToken = await proveEmail();
    deliver.mockClear();
    for (const phone of [
      { phone_extension: '+1', phone_number: '9876543210' },
      { phone_extension: '+91', phone_number: '5876543210' },
      { phone_extension: '+91', phone_number: '98765' },
    ]) {
      await expect(venueKitOtp.requestPhone({ email_token: emailToken, ...phone }, null)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    }
    expect(deliver).not.toHaveBeenCalled();
  });

  it('caps how many different numbers one proved email may text in an hour, never a resend to the same one', async () => {
    const emailToken = await proveEmail();
    const numbers = ['9876543210', '9123456780', '9988776655'];
    for (const phone_number of numbers) {
      await venueKitOtp.requestPhone({ email_token: emailToken, phone_extension: '+91', phone_number }, null);
    }
    await expect(
      venueKitOtp.requestPhone({ email_token: emailToken, phone_extension: '+91', phone_number: '9000000001' }, null)
    ).rejects.toMatchObject({ extensions: { code: 'TOO_MANY_REQUESTS' } });
    // A number already texted is a resend (its own 30 s cooldown applies), not a new number.
    await OtpChallengeModel.updateMany({}, { $set: { last_sent_at: new Date(0) } }, { timestamps: false });
    await expect(
      venueKitOtp.requestPhone({ email_token: emailToken, phone_extension: '+91', phone_number: numbers[1] }, null)
    ).resolves.toMatchObject({ sent: true });
    // A send older than the hour stops counting.
    await OtpChallengeModel.collection.updateOne({ phone_number: numbers[0] }, { $set: { created_at: new Date(Date.now() - 2 * 60 * 60 * 1000) } });
    await expect(
      venueKitOtp.requestPhone({ email_token: emailToken, phone_extension: '+91', phone_number: '9000000001' }, null)
    ).resolves.toMatchObject({ sent: true });
  });

  it('never lets a phone code stand in for the email proof', async () => {
    const emailToken = await proveEmail();
    const phoneToken = await provePhone(emailToken);
    await expect(venueKitService.submit({ name: 'Cafe', email_token: phoneToken, ...PHONE }, { source: 'WEBSITE' })).rejects.toThrow(
      'That verification has expired — start again'
    );
  });
});

describe('submitting interest', () => {
  it('stores a verified email with an unverified phone when the phone code was skipped', async () => {
    const emailToken = await proveEmail();
    const result = await venueKitService.submit({ name: 'Cafe Owner', email_token: emailToken, ...PHONE }, { source: 'WEBSITE' });
    expect(result).toMatchObject({
      ok: true,
      already_registered: false,
      interest: { email: 'owner@cafe.in', phone_number: '9876543210', phone_verified: false, phone_verified_at: null, source: 'WEBSITE', status: 'NEW', submission_count: 1 },
    });
  });

  it('marks the phone verified when its code was proved for that very number', async () => {
    const emailToken = await proveEmail();
    const phoneToken = await provePhone(emailToken);
    const { interest } = await venueKitService.submit({ name: 'Cafe', email_token: emailToken, phone_token: phoneToken, ...PHONE }, { source: 'VENUES_PORTAL' });
    expect(interest).toMatchObject({ phone_verified: true, phone_verified_at: expect.any(String), source: 'VENUES_PORTAL' });
  });

  it('refuses a phone proof for a different number and leaves the email proof usable', async () => {
    const emailToken = await proveEmail();
    const phoneToken = await provePhone(emailToken);
    await expect(
      venueKitService.submit({ name: 'Cafe', email_token: emailToken, phone_token: phoneToken, ...OTHER_PHONE }, { source: 'WEBSITE' })
    ).rejects.toThrow('That phone code was for a different number');
    const retry = await venueKitService.submit({ name: 'Cafe', email_token: emailToken, ...OTHER_PHONE }, { source: 'WEBSITE' });
    expect(retry.interest).toMatchObject({ phone_number: '9123456780', phone_verified: false });
  });

  it('spends the proof once: replaying the same submit is refused', async () => {
    const emailToken = await proveEmail();
    await venueKitService.submit({ name: 'Cafe', email_token: emailToken, ...PHONE }, { source: 'WEBSITE' });
    await expect(venueKitService.submit({ name: 'Cafe', email_token: emailToken, ...PHONE }, { source: 'WEBSITE' })).rejects.toThrow(
      'That verification has expired — start again'
    );
    expect(await VenueKitInterestModel.countDocuments()).toBe(1);
  });

  it('refreshes the row for a mailbox that registered before, keeping its source and follow-up status', async () => {
    const first = await venueKitService.submit({ name: 'Cafe', email_token: await proveEmail(), ...PHONE }, { source: 'WEBSITE' });
    await venueKitService.setStatus({ id: first.interest.id, status: 'CONTACTED', note: 'Called once' });
    const phoneEmail = await proveEmail();
    const phoneToken = await provePhone(phoneEmail);
    const again = await venueKitService.submit({ name: 'Cafe Renamed', email_token: phoneEmail, phone_token: phoneToken, ...PHONE }, { source: 'VENUES_PORTAL' });
    expect(again).toMatchObject({
      already_registered: true,
      interest: { id: first.interest.id, name: 'Cafe Renamed', source: 'WEBSITE', status: 'CONTACTED', note: 'Called once', submission_count: 2, phone_verified: true },
    });
    // A later submit with an unproved number un-proves the row.
    const third = await venueKitService.submit({ name: 'Cafe', email_token: await proveEmail(), ...OTHER_PHONE }, { source: 'WEBSITE' });
    expect(third.interest).toMatchObject({ phone_verified: false, phone_number: '9123456780', submission_count: 3 });
    expect(await VenueKitInterestModel.countDocuments()).toBe(1);
  });

  it('requires a phone number even though its code is optional', async () => {
    const emailToken = await proveEmail();
    await expect(
      venueKitService.submit({ name: 'Cafe', email_token: emailToken, phone_extension: '+91', phone_number: '' }, { source: 'WEBSITE' })
    ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });
});

describe('tracking in the Venues console', () => {
  async function seed() {
    const now = new Date();
    await VenueKitInterestModel.create([
      { name: 'Blue Tokai', email: 'blue@tokai.in', email_verified_at: now, phone_number: '9876543210', phone_verified_at: now, source: 'WEBSITE' },
      { name: 'Third Wave', email: 'hello@thirdwave.in', email_verified_at: now, phone_number: '9123456780', source: 'VENUES_PORTAL', status: 'CONTACTED' },
      { name: 'Social', email: 'team@social.in', email_verified_at: now, phone_number: '9988776655', source: 'WEBSITE', status: 'CONVERTED' },
    ]);
  }

  it('pages every interested venue, searchable by name, email or number and filterable by status', async () => {
    await seed();
    expect((await venueKitService.table({})).total).toBe(3);
    expect((await venueKitService.table({ search: 'tokai' })).rows.map((r) => r.name)).toEqual(['Blue Tokai']);
    expect((await venueKitService.table({ search: '91234' })).rows.map((r) => r.name)).toEqual(['Third Wave']);
    const contacted = await venueKitService.table({ filters: [{ field: 'status', op: 'in', values: ['CONTACTED'] }] });
    expect(contacted.rows.map((r) => r.name)).toEqual(['Third Wave']);
  });

  it('counts the list by status and phone proof', async () => {
    await expect(venueKitService.summary()).resolves.toEqual({
      total: 0,
      phone_verified: 0,
      by_status: [
        { status: 'NEW', count: 0 },
        { status: 'CONTACTED', count: 0 },
        { status: 'CONVERTED', count: 0 },
        { status: 'NOT_INTERESTED', count: 0 },
      ],
    });
    await seed();
    const summary = await venueKitService.summary();
    expect(summary).toMatchObject({ total: 3, phone_verified: 1 });
    expect(summary.by_status).toEqual(expect.arrayContaining([{ status: 'NEW', count: 1 }, { status: 'CONTACTED', count: 1 }, { status: 'CONVERTED', count: 1 }]));
  });

  it('moves a venue along, keeps the note when none is sent, and says NOT_FOUND for a missing one', async () => {
    await seed();
    const row = await VenueKitInterestModel.findOne({ email: 'blue@tokai.in' });
    const id = String(row?._id);
    await expect(venueKitService.setStatus({ id, status: 'CONTACTED', note: 'Demo booked' })).resolves.toMatchObject({ status: 'CONTACTED', note: 'Demo booked' });
    await expect(venueKitService.setStatus({ id, status: 'CONVERTED' })).resolves.toMatchObject({ status: 'CONVERTED', note: 'Demo booked' });
    await expect(venueKitService.setStatus({ id, status: 'SOLD' })).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    await expect(venueKitService.setStatus({ id: 'nope', status: 'NEW' })).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    await expect(venueKitService.setStatus({ id: new Types.ObjectId().toHexString(), status: 'NEW' })).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });
});

describe('who may do what', () => {
  const { Query, Mutation } = venueKitResolvers;

  it('serves the offer to anybody', async () => {
    await expect(Query.venueKitOffer()).resolves.toMatchObject({ annual_price_paise: 999_900 });
  });

  it('keeps the list and its counts to the venues team', () => {
    for (const ctx of [ctxAs(null), ctxAs(['USER']), ctxAs(['ALL_HOSTS_ACCESS'])]) {
      expect(() => Query.venueKitInterestsTable(null, {}, ctx)).toThrow();
      expect(() => Query.venueKitInterestSummary(null, null, ctx)).toThrow();
      expect(() => Mutation.setVenueKitInterestStatus(null, { input: {} }, ctx)).toThrow();
    }
    expect(() => Query.venueKitInterestsTable(null, {}, ctxAs(['ALL_VENUES_ACCESS']))).not.toThrow();
    expect(() => Query.venueKitInterestSummary(null, null, ctxAs(['ONBOARDING_MANAGER']))).not.toThrow();
  });

  it('keeps the plan to Super Admin', async () => {
    expect(() => Mutation.updateVenueKitOffer(null, { input: VENUE_KIT_OFFER_DEFAULTS }, ctxAs(['ALL_VENUES_ACCESS']))).toThrow();
    expect(() => Mutation.updateVenueKitOffer(null, { input: VENUE_KIT_OFFER_DEFAULTS }, ctxAs(['CITY_ADMIN']))).toThrow();
    await expect(Mutation.updateVenueKitOffer(null, { input: VENUE_KIT_OFFER_DEFAULTS }, ctxAs(['SUPER_ADMIN']))).resolves.toMatchObject({ annual_price_paise: 999_900 });
  });

  it('asks an anonymous visitor for the captcha before mailing a code, and skips it for a signed-in caller', async () => {
    expect(() => Mutation.requestVenueKitEmailOtp(null, { input: { name: 'Cafe', email: 'a@cafe.in' } }, ctxAs(null))).toThrow('Please complete the verification below.');
    await Mutation.requestVenueKitEmailOtp(null, { input: { name: 'Cafe', email: 'a@cafe.in', captcha_token: 't', captcha_answer: 'x' } as never }, ctxAs(null));
    expect(captcha).toHaveBeenCalledWith('t', 'x');
    captcha.mockClear();
    await Mutation.requestVenueKitEmailOtp(null, { input: { name: 'Cafe', email: 'b@cafe.in' } as never }, ctxAs(['ALL_VENUES_ACCESS']));
    expect(captcha).not.toHaveBeenCalled();
  });

  it('files a console submit as VENUES_PORTAL and everybody else as WEBSITE', async () => {
    await Mutation.requestVenueKitEmailOtp(null, { input: { name: 'Cafe', email: 'c@cafe.in' } as never }, ctxAs(['ALL_VENUES_ACCESS']));
    const token = (await Mutation.verifyVenueKitEmailOtp(null, { input: { email: 'c@cafe.in', code: lastCode() } })).token;
    const staff = await Mutation.submitVenueKitInterest(null, { input: { name: 'Cafe', email_token: token, ...PHONE } }, ctxAs(['ALL_VENUES_ACCESS']));
    expect(staff.interest.source).toBe('VENUES_PORTAL');

    await Mutation.requestVenueKitEmailOtp(null, { input: { name: 'Cafe', email: 'd@cafe.in' } as never }, ctxAs(['USER']));
    const memberToken = (await Mutation.verifyVenueKitEmailOtp(null, { input: { email: 'd@cafe.in', code: lastCode() } })).token;
    await Mutation.requestVenueKitPhoneOtp(null, { input: { email_token: memberToken, ...PHONE } }, ctxAs(['USER']));
    const phoneToken = (await Mutation.verifyVenueKitPhoneOtp(null, { input: { ...PHONE, code: lastCode() } })).token;
    const member = await Mutation.submitVenueKitInterest(null, { input: { name: 'Cafe', email_token: memberToken, phone_token: phoneToken, ...PHONE } }, ctxAs(['USER']));
    expect(member.interest).toMatchObject({ source: 'WEBSITE', phone_verified: true });
  });
});
