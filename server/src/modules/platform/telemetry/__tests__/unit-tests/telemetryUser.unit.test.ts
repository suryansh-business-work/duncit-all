import { Types } from 'mongoose';
import { clearLogUserCache, describeLogUser, resolveLogUser } from '../../telemetryUser';
import { UserModel } from '@modules/access/user/user.model';

jest.mock('@modules/access/user/user.model', () => ({ UserModel: { findById: jest.fn() } }));

const findById = UserModel.findById as jest.Mock;
const row = (value: unknown) => findById.mockReturnValue({ select: () => ({ lean: () => Promise.resolve(value) }) });
const id = () => new Types.ObjectId().toHexString();

beforeEach(() => clearLogUserCache());
afterEach(() => jest.useRealTimers());

describe('describeLogUser', () => {
  it('names the person behind an id: name, email, phone with its extension and roles', async () => {
    const who = id();
    row({
      profile: { first_name: 'Priya', last_name: 'Sharma' },
      auth: { email: 'priya@duncit.com', phone: { extension: '+91', number: '9812345678' } },
      metadata: { role_keys: ['SUPPORT_MANAGER'] },
    });
    await expect(describeLogUser(who)).resolves.toEqual({
      id: who, name: 'Priya Sharma', email: 'priya@duncit.com', phone: '+919812345678', roles: ['SUPPORT_MANAGER'],
    });
  });

  it('copes with a sparse account: first name only, a phone without an extension, no roles', async () => {
    const who = id();
    row({ profile: { first_name: 'Priya' }, auth: { phone: { number: '9812345678' } }, metadata: { role_keys: [] } });
    await expect(describeLogUser(who)).resolves.toEqual({ id: who, name: 'Priya', email: undefined, phone: '9812345678', roles: undefined });
  });

  it('leaves out what the account does not have', async () => {
    const who = id();
    row({ profile: null, auth: { email: null, phone: { extension: '+91' } }, metadata: null });
    await expect(describeLogUser(who)).resolves.toEqual({ id: who, name: undefined, email: undefined, phone: undefined, roles: undefined });
    const other = id();
    row({});
    await expect(describeLogUser(other)).resolves.toEqual({ id: other, name: undefined, email: undefined, phone: undefined, roles: undefined });
    const third = id();
    row({ auth: { phone: null }, metadata: { role_keys: null } });
    await expect(describeLogUser(third)).resolves.toMatchObject({ phone: undefined, roles: undefined });
  });

  it('gives just the id for something that is not an id, an account that is gone, or a lookup that fails', async () => {
    await expect(describeLogUser('nope')).resolves.toEqual({ id: 'nope' });
    expect(findById).not.toHaveBeenCalled();
    const gone = id();
    row(null);
    await expect(describeLogUser(gone)).resolves.toEqual({ id: gone });
    const broken = id();
    findById.mockImplementation(() => {
      throw new Error('mongo down');
    });
    await expect(describeLogUser(broken)).resolves.toEqual({ id: broken });
  });

  it('remembers an account for ten minutes, then looks again', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const who = id();
    row({ profile: { first_name: 'A' } });
    await describeLogUser(who);
    await describeLogUser(who);
    expect(findById).toHaveBeenCalledTimes(1);
    jest.setSystemTime(new Date('2026-01-01T00:09:59Z'));
    await describeLogUser(who);
    expect(findById).toHaveBeenCalledTimes(1);
    jest.setSystemTime(new Date('2026-01-01T00:10:01Z'));
    row({ profile: { first_name: 'Renamed' } });
    await expect(describeLogUser(who)).resolves.toMatchObject({ name: 'Renamed' });
    expect(findById).toHaveBeenCalledTimes(2);
  });

  it('keeps at most 500 accounts, forgetting the oldest first', async () => {
    row({ profile: { first_name: 'A' } });
    const first = id();
    await describeLogUser(first);
    for (let i = 0; i < 499; i += 1) await describeLogUser(id());
    expect(findById).toHaveBeenCalledTimes(500);
    await describeLogUser(first);
    expect(findById).toHaveBeenCalledTimes(500);
    await describeLogUser(id());
    expect(findById).toHaveBeenCalledTimes(501);
    await describeLogUser(first);
    expect(findById).toHaveBeenCalledTimes(502);
  });
});

describe('resolveLogUser', () => {
  it('stores only the id and the roles, preferring the database’s roles over the token’s', async () => {
    const who = id();
    row({ profile: { first_name: 'Priya' }, auth: { email: 'p@d.com' }, metadata: { role_keys: ['ADMIN'] } });
    await expect(resolveLogUser({ id: who, roles: ['USER'] })).resolves.toEqual({ id: who, roles: ['ADMIN'] });
  });

  it('falls back to the token’s roles when the account cannot be found or has none', async () => {
    const who = id();
    row(null);
    await expect(resolveLogUser({ id: who, roles: ['USER'] })).resolves.toEqual({ id: who, roles: ['USER'] });
    const other = id();
    row({ metadata: { role_keys: [] } });
    await expect(resolveLogUser({ id: other, roles: ['USER'] })).resolves.toEqual({ id: other, roles: ['USER'] });
  });

  it('has no roles when neither side knows any', async () => {
    const who = id();
    row(null);
    await expect(resolveLogUser({ id: who })).resolves.toEqual({ id: who, roles: undefined });
    await expect(resolveLogUser({ id: id(), roles: [] })).resolves.toMatchObject({ roles: undefined });
  });
});
