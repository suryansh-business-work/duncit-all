import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { MailPreferenceModel } from '@modules/content/mailPreference/mailPreference.model';
import { AppEventModel } from '@modules/platform/analytics/appEvent.model';
import { ActiveUserPingModel } from '@modules/platform/analytics/activeUser.model';
import { analyticsResolvers } from '@modules/platform/analytics/analytics.resolver';
import { purgeExpiredAnalytics } from '@modules/platform/analytics/analytics.retention';
import { ContactInviteModel } from '@modules/access/contacts/contacts.model';
import { purgeStaleContactInvites } from '@modules/access/contacts/contacts.retention';
import { NO_CONSENT } from '@utils/consent';
import type { GraphQLContext } from '@context';
import { privacyResolvers } from '../../privacy.resolver';
import { applySignupMarketingChoice } from '../../privacy.service';
import { EXPORT_LIMIT_PER_GROUP, exportUserData, withoutSecrets } from '../../privacy.export';

async function makeUser(over: Record<string, unknown> = {}) {
  return UserModel.create({
    auth: { email: `privacy-${Date.now()}-${Math.random()}@duncit.com` },
    profile: { first_name: 'Priya', last_name: 'Sharma' },
    ...over,
  });
}

const ctxFor = (userId: string | null, consent = NO_CONSENT) =>
  ({
    user: userId ? { id: userId, roles: [] } : null,
    device_id: 'duid-1',
    consent,
  }) as unknown as GraphQLContext;

describe('tracking consent', () => {
  it('is null until the member answers, then the newest answer wins', async () => {
    const user = await makeUser();
    const ctx = ctxFor(String(user._id));
    expect(await privacyResolvers.Query.myTrackingConsent(null, {}, ctx)).toBeNull();

    await privacyResolvers.Mutation.setMyTrackingConsent(
      null,
      { input: { analytics: true, marketing: true, surface: 'MWEB' } },
      ctx
    );
    const latest = await privacyResolvers.Mutation.setMyTrackingConsent(
      null,
      { input: { analytics: false, marketing: true, surface: 'NATIVE' } },
      ctx
    );
    expect(latest).toMatchObject({ analytics: false, marketing: true });
    expect(await privacyResolvers.Query.myTrackingConsent(null, {}, ctx)).toMatchObject({
      analytics: false,
      marketing: true,
    });
  });

  it('refuses a signed-out caller', async () => {
    await expect(
      Promise.resolve().then(() => privacyResolvers.Query.myTrackingConsent(null, {}, ctxFor(null)))
    ).rejects.toThrow(/authenticated/i);
  });
});

describe('analytics writes need analytics consent', () => {
  it('stores nothing without it', async () => {
    const user = await makeUser();
    const ctx = ctxFor(String(user._id));
    expect(await analyticsResolvers.Mutation.recordActivePing(null, {}, ctx)).toBe(false);
    expect(
      await analyticsResolvers.Mutation.recordAppEvent(
        null,
        { input: { event_type: 'PAGE_VIEW', path: '/home' } },
        ctx
      )
    ).toBe(false);
    expect(await AppEventModel.countDocuments({ user_id: user._id })).toBe(0);
    expect(await ActiveUserPingModel.countDocuments({ user_id: user._id })).toBe(0);
  });

  it('stores the event once the caller allows analytics', async () => {
    const user = await makeUser();
    const ctx = ctxFor(String(user._id), { analytics: true, marketing: false });
    await analyticsResolvers.Mutation.recordAppEvent(
      null,
      { input: { event_type: 'PAGE_VIEW', path: '/home' } },
      ctx
    );
    expect(await AppEventModel.countDocuments({ user_id: user._id })).toBe(1);
  });
});

describe('retention sweeps', () => {
  it('deletes analytics older than 13 months and keeps the rest', async () => {
    const userId = new Types.ObjectId();
    const now = new Date('2026-10-02T00:00:00Z');
    const old = new Date('2025-08-01T00:00:00Z');
    await AppEventModel.create([
      { user_id: userId, device_id: 'd', event_type: 'CLICK', occurred_at: old },
      { user_id: userId, device_id: 'd', event_type: 'CLICK', occurred_at: now },
    ]);
    await ActiveUserPingModel.create([
      { device_id: 'retention-d', date_ymd: '2025-08-01' },
      { device_id: 'retention-d', date_ymd: '2026-10-01' },
    ]);
    expect(await purgeExpiredAnalytics(now)).toBeGreaterThanOrEqual(2);
    expect(await AppEventModel.countDocuments({ user_id: userId })).toBe(1);
    expect(await ActiveUserPingModel.countDocuments({ device_id: 'retention-d' })).toBe(1);
  });

  it('deletes contact invites nobody has synced for 90 days', async () => {
    const owner = new Types.ObjectId();
    await ContactInviteModel.collection.insertMany([
      { owner_id: owner, phone_key: '9800000001', updated_at: new Date('2026-01-01') },
      { owner_id: owner, phone_key: '9800000002', updated_at: new Date('2026-09-30') },
    ]);
    await purgeStaleContactInvites(new Date('2026-10-02'));
    expect(await ContactInviteModel.countDocuments({ owner_id: owner })).toBe(1);
  });
});

describe('signup marketing choice', () => {
  it('starts marketing email OFF when the box was left unticked', async () => {
    const user = await makeUser();
    await applySignupMarketingChoice(user, false);
    const pref = await MailPreferenceModel.findOne({ email: user.auth?.email }).lean();
    expect(pref?.opted_out).toContain('marketing');
  });

  it('records the opt-in when the box was ticked', async () => {
    const user = await makeUser();
    await applySignupMarketingChoice(user, true);
    const pref = await MailPreferenceModel.findOne({ email: user.auth?.email }).lean();
    expect(pref?.opted_out ?? []).not.toContain('marketing');
  });

  it('never throws for an account with no email or WhatsApp number', async () => {
    await expect(
      applySignupMarketingChoice({ _id: new Types.ObjectId(), auth: null }, false)
    ).resolves.toBeUndefined();
  });
});

describe('data export', () => {
  it('exports the account and the member’s own records, without credentials', async () => {
    const user = await makeUser();
    await AppEventModel.create({
      user_id: user._id,
      device_id: 'd',
      event_type: 'PAGE_VIEW',
      path: '/pods',
    });
    const json = await privacyResolvers.Query.myDataExport(null, {}, ctxFor(String(user._id)));
    const parsed = JSON.parse(json);
    expect(parsed.account.profile.first_name).toBe('Priya');
    const events = parsed.records.find(
      (group: { collection: string }) => group.collection === 'AppEvent'
    );
    expect(events.records[0].path).toBe('/pods');
    expect(events.truncated).toBe(false);
    expect(json).not.toMatch(/"password"/);
  });

  it('marks a group cut at the per-group limit', async () => {
    const user = await makeUser();
    await AppEventModel.insertMany(
      Array.from({ length: EXPORT_LIMIT_PER_GROUP + 1 }, () => ({
        user_id: user._id,
        device_id: 'd',
        event_type: 'CLICK',
      }))
    );
    const parsed = JSON.parse(await exportUserData(String(user._id)));
    const events = parsed.records.find(
      (group: { collection: string }) => group.collection === 'AppEvent'
    );
    expect(events.truncated).toBe(true);
    expect(events.records).toHaveLength(EXPORT_LIMIT_PER_GROUP);
  });

  it('drops secret-looking keys at any depth and leaves scalars alone', () => {
    const at = new Date('2026-10-02T00:00:00Z');
    expect(
      withoutSecrets({ a: 1, password: 'x', nested: [{ otp_hash: 'h', ok: at }], none: null })
    ).toEqual({ a: 1, nested: [{ ok: at }], none: null });
    expect(withoutSecrets('plain')).toBe('plain');
  });
});
