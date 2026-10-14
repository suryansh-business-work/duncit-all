// The welcome mail is fire-and-forget; stub every sender so it never outlives the suite.
jest.mock('@services/email/email.service', () => {
  const actual = jest.requireActual('@services/email/email.service');
  return Object.fromEntries(
    Object.entries(actual).map(([key, value]) => [
      key,
      typeof value === 'function' ? jest.fn().mockResolvedValue(undefined) : value,
    ])
  );
});

import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { supportChatResolvers } from '../../supportChat.resolver';
import { UserModel } from '@modules/access/user/user.model';
import { UserRoleModel } from '@modules/access/user/relations';
import { UserChangeLogModel } from '@modules/access/userAudit/userAudit.model';
import { requestIdentity } from '@observability/requestIdentity';
import { makeContext } from '@test/harness';

/**
 * Support › Chat with Us › Create user account. The dialog collects a name, an
 * email, a temporary password and an optional phone — no WhatsApp proof and no
 * birthday — so the mutation is judged by its own rules, not the public signup's.
 */
const agentId = new Types.ObjectId().toString();
const AGENT_ROLES = ['SUPPORT_USER'];

type Input = Record<string, string | null>;
const createUser = supportChatResolvers.Mutation.supportCreateUser as (
  p: unknown,
  a: { input: Input },
  ctx: ReturnType<typeof makeContext>
) => Promise<{ user_id: string; email: string }>;

/** Runs as the agent's request would: the change log reads its actor from here. */
const asAgent = (input: Input, roles = AGENT_ROLES) =>
  requestIdentity.run({ user: { id: agentId, roles } }, () =>
    createUser({}, { input }, makeContext({ id: agentId, roles }))
  );

const valid = (over: Input = {}): Input => ({
  first_name: 'Asha',
  last_name: null,
  email: `asha.${new Types.ObjectId().toString()}@duncit.com`,
  phone_extension: null,
  phone_number: null,
  password: 'Temp-pass-1',
  ...over,
});

describe('supportCreateUser', () => {
  it('creates a member account from exactly what the dialog collects, recording the agent', async () => {
    const input = valid();
    const created = await asAgent(input);

    expect(created.email).toBe(input.email);
    const doc = await UserModel.findById(created.user_id).select('+auth.password').lean();
    expect(doc?.profile?.first_name).toBe('Asha');
    expect(doc?.metadata?.role_keys).toEqual(['USER']);
    expect(doc?.auth?.is_email_verified).toBe(false);
    expect(doc?.auth?.password).not.toBe('Temp-pass-1');
    await expect(bcrypt.compare('Temp-pass-1', String(doc?.auth?.password))).resolves.toBe(true);

    const roles = await UserRoleModel.find({ user_id: new Types.ObjectId(created.user_id) }).lean();
    expect(roles.map((r) => r.role)).toEqual(['USER']);
    expect(String(roles[0].assigned_by)).toBe(agentId);

    const log = await UserChangeLogModel.find({ user_id: new Types.ObjectId(created.user_id), action: 'CREATE' }).lean();
    expect(log.length).toBeGreaterThan(0);
    expect(log.every((entry) => String(entry.actor_user_id) === agentId)).toBe(true);
  });

  it('stores an optional phone on the account, unverified', async () => {
    const created = await asAgent(valid({ phone_extension: '+91', phone_number: '9811100001' }));
    const doc = await UserModel.findById(created.user_id).lean();
    expect(doc?.auth?.phone?.number).toBe('9811100001');
    expect(doc?.auth?.phone?.extension).toBe('+91');
    expect(doc?.auth?.phone?.is_verified).toBeFalsy();
  });

  it('refuses an email another account already holds, whatever its case', async () => {
    const input = valid();
    await asAgent(input);
    await expect(asAgent(valid({ email: input.email?.toUpperCase() ?? null }))).rejects.toThrow('Email already in use');
    expect(await UserModel.countDocuments({ 'auth.email': input.email })).toBe(1);
  });

  it('refuses a phone that is already another account’s WhatsApp number', async () => {
    await UserModel.create({
      auth: { email: `held.${new Types.ObjectId().toString()}@duncit.com` },
      profile: { first_name: 'Held' },
      communication: { whatsapp: { extension: '+91', number: '9811100002' } },
    });
    const input = valid({ phone_extension: '+91', phone_number: '9811100002' });
    await expect(asAgent(input)).rejects.toThrow('This phone number is already registered');
    expect(await UserModel.exists({ 'auth.email': input.email })).toBeNull();
  });

  it('refuses half a phone number instead of storing it', async () => {
    const input = valid({ phone_extension: '+91' });
    await expect(asAgent(input)).rejects.toThrow('Validation failed');
    expect(await UserModel.exists({ 'auth.email': input.email })).toBeNull();
  });

  it('keeps the signup rules it shares: a short password and a malformed name are refused', async () => {
    await expect(asAgent(valid({ password: 'short' }))).rejects.toThrow('Validation failed');
    await expect(asAgent(valid({ first_name: 'Asha_123' }))).rejects.toThrow('Validation failed');
  });

  it('refuses a caller who is not a support agent, and creates nothing', async () => {
    const input = valid();
    await expect(asAgent(input, ['USER'])).rejects.toThrow('Access Denied');
    expect(await UserModel.exists({ 'auth.email': input.email })).toBeNull();
  });
});
