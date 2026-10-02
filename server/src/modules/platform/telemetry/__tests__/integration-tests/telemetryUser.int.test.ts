import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { clearLogUserCache, describeLogUser, resolveLogUser } from '../../telemetryUser';
import { telemetryResolvers } from '../../telemetry.resolver';

beforeEach(() => clearLogUserCache());

const makeUser = () =>
  UserModel.create({
    auth: { email: `telemetry-${Date.now()}-${Math.random()}@duncit.com` },
    profile: { first_name: 'Priya', last_name: 'Sharma' },
    metadata: { role_keys: ['HOST'] },
  });

describe('telemetry keeps the account id, not the person', () => {
  it('stores only the id and the roles', async () => {
    const user = await makeUser();
    const stored = await resolveLogUser({ id: String(user._id), roles: ['USER'] });
    expect(stored).toEqual({ id: String(user._id), roles: ['HOST'] });
  });

  it('falls back to the token roles for an account it cannot find', async () => {
    const id = new Types.ObjectId().toString();
    expect(await resolveLogUser({ id, roles: ['USER'] })).toEqual({ id, roles: ['USER'] });
    expect(await resolveLogUser({ id: 'not-an-id' })).toEqual({ id: 'not-an-id', roles: undefined });
  });

  it('names the person only when a triager reads the log', async () => {
    const user = await makeUser();
    const id = String(user._id);
    expect((await describeLogUser(id)).name).toBe('Priya Sharma');
    expect(await telemetryResolvers.TelemetryUser.email({ id })).toBe(user.auth?.email);
    expect(await telemetryResolvers.TelemetryUser.phone({ id })).toBeNull();
    expect(await telemetryResolvers.TelemetryUser.name({ id: 'gone' })).toBeNull();
  });
});
