import { Types } from 'mongoose';
import { AppSessionModel } from '@modules/platform/analytics/appSession.model';
import { LoginActivityModel } from '@modules/access/auth/login-activity/loginActivity.model';
import { UserModel } from '../../user.model';
import { backfillUserActivity, loginPlatform } from '../../user.activity.backfill';

/**
 * The one-off seed for Admin > Users "Last Activity" and "Platforms Used":
 * which history it trusts, that a dry run writes nothing, that a re-run changes
 * nothing, and that it never undoes a newer live write.
 */

async function account(email: string, extra: Record<string, unknown> = {}) {
  const _id = new Types.ObjectId();
  await UserModel.collection.insertOne({
    _id,
    auth: { email },
    profile: { first_name: 'Member' },
    metadata: { status: 'ACTIVE', role_keys: ['USER'] },
    ...extra,
  } as never);
  return _id;
}

let sessionNo = 0;
const session = (user_id: Types.ObjectId | null, platform: string, ended_at?: Date) => {
  sessionNo += 1;
  return AppSessionModel.collection.insertOne({
    session_id: `s-${sessionNo}`,
    device_id: 'device-1',
    user_id,
    platform,
    started_at: new Date('2026-01-01T00:00:00.000Z'),
    ...(ended_at ? { ended_at } : {}),
  } as never);
};

const login = (user_id: Types.ObjectId | null, signed_in_at: Date, surface: string | null, os: string | null) =>
  LoginActivityModel.collection.insertOne({ user_id, signed_in_at, surface, os } as never);

async function activityOf(id: Types.ObjectId) {
  const doc = await UserModel.collection.findOne<{ activity?: { last_at: Date; platforms?: string[] } }>({ _id: id });
  if (!doc) throw new Error(`account ${id.toHexString()} is missing`);
  return doc.activity;
}

const sorted = (values: string[] = []) => [...values].sort((a, b) => a.localeCompare(b));

describe('loginPlatform', () => {
  it('reads the browser surfaces as WEB and the app by its device OS', () => {
    expect(loginPlatform('MWEB', 'Android')).toBe('WEB');
    expect(loginPlatform('admin_portal', null)).toBe('WEB');
    expect(loginPlatform('NATIVE', 'Android')).toBe('ANDROID');
    expect(loginPlatform('NATIVE', 'iOS')).toBe('IOS');
  });

  it('names nothing it cannot tell', () => {
    expect(loginPlatform('NATIVE', 'Unknown')).toBeNull();
    expect(loginPlatform(null, 'Android')).toBeNull();
    expect(loginPlatform(undefined, undefined)).toBeNull();
  });
});

describe('backfillUserActivity', () => {
  it('seeds each account from its sessions, sign-ins and last login, latest time winning', async () => {
    const asha = await account('asha@example.com');
    await session(asha, 'android', new Date('2026-11-01T10:00:00.000Z'));
    await session(asha, 'mweb', new Date('2026-11-03T10:00:00.000Z'));
    await login(asha, new Date('2026-11-02T10:00:00.000Z'), 'NATIVE', 'iOS');

    // Only a last sign-in on record: a time, but no platform to name.
    const bilal = await account('bilal@example.com', { auth: { email: 'bilal@example.com', last_login_at: new Date('2026-09-09T09:00:00.000Z') } });

    // A newer sign-in than any session, from a console, plus a session on a platform nobody knows.
    const chitra = await account('chitra@example.com');
    await session(chitra, '', new Date('2026-10-01T00:00:00.000Z'));
    await login(chitra, new Date('2026-10-05T00:00:00.000Z'), 'PORTAL', null);
    await login(chitra, new Date('2026-10-02T00:00:00.000Z'), 'NATIVE', 'Unknown');

    const result = await backfillUserActivity({ dryRun: false });

    expect(result).toEqual({ accounts: 3, with_platforms: 2, written: 3 });
    const ashaActivity = await activityOf(asha);
    expect(ashaActivity?.last_at).toEqual(new Date('2026-11-03T10:00:00.000Z'));
    expect(sorted(ashaActivity?.platforms)).toEqual(['ANDROID', 'IOS', 'WEB']);
    expect(await activityOf(bilal)).toEqual({ last_at: new Date('2026-09-09T09:00:00.000Z') });
    expect(await activityOf(chitra)).toEqual({ last_at: new Date('2026-10-05T00:00:00.000Z'), platforms: ['WEB'] });
  });

  it('skips records with no account or no time, which old rows can lack', async () => {
    const dana = await account('dana@example.com');
    await session(dana, 'ios'); // never ended
    await login(null, new Date('2026-11-01T00:00:00.000Z'), 'MWEB', null);

    expect(await backfillUserActivity({ dryRun: false })).toEqual({ accounts: 0, with_platforms: 0, written: 0 });
    expect(await activityOf(dana)).toBeUndefined();
  });

  it('reports what it would do on a dry run and writes nothing', async () => {
    const eli = await account('eli@example.com');
    await session(eli, 'ios', new Date('2026-11-01T00:00:00.000Z'));

    expect(await backfillUserActivity({ dryRun: true })).toEqual({ accounts: 1, with_platforms: 1, written: 0 });
    expect(await activityOf(eli)).toBeUndefined();
  });

  it('changes nothing on a second run, and never undoes newer live activity', async () => {
    const farah = await account('farah@example.com', {
      activity: { last_at: new Date('2026-11-22T05:00:00.000Z'), platforms: ['IOS'] },
    });
    await session(farah, 'android', new Date('2026-11-01T00:00:00.000Z'));

    expect((await backfillUserActivity({ dryRun: false })).written).toBe(1); // ANDROID added
    expect((await backfillUserActivity({ dryRun: false })).written).toBe(0);

    const activity = await activityOf(farah);
    expect(activity?.last_at).toEqual(new Date('2026-11-22T05:00:00.000Z'));
    expect(sorted(activity?.platforms)).toEqual(['ANDROID', 'IOS']);
  });
});
