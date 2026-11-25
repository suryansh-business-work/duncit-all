/**
 * Token renewal against a real database — what the daily account doctor
 * relies on: a Threads (or Instagram Login) token is renewed from itself a
 * week before it lapses and stored sealed, one with weeks left is not touched,
 * and a Facebook Login token, which cannot be renewed without a person, asks
 * for a reconnect. The network's refresh call is faked.
 */
import { Types } from 'mongoose';
import { SocialApiError } from '../../providers/http';
import { SocialAccountModel } from '../../social.model';
import { freshHandle, type AccountWithTokens } from '../../social.sync';
import { openToken, sealToken } from '../../social.tokens';

const DAY = 86_400_000;
const CREDS = { clientId: 'app-1', clientSecret: 'app-secret', redirectUri: 'https://api/cb', version: 'v23.0', configId: '' };

async function stored(over: Record<string, unknown>) {
  const doc = await SocialAccountModel.create({
    provider: 'THREADS',
    platform: 'THREADS',
    external_id: `th-${new Types.ObjectId().toHexString()}`,
    name: 'Duncit Threads',
    access_token: sealToken('old-token'),
    refresh_token: sealToken(''),
    ...over,
  });
  return SocialAccountModel.findById(doc._id).select('+access_token +refresh_token').lean<AccountWithTokens>();
}

const reader = (refresh?: jest.Mock) => ({ profile: jest.fn(), posts: jest.fn(), comments: jest.fn(), ...(refresh ? { refresh } : {}) });

describe('freshHandle renewing long-lived tokens', () => {
  it('renews a Threads token a week before it lapses, from the token itself, and stores the new one sealed', async () => {
    const doc = await stored({ token_expires_at: new Date(Date.now() + 3 * DAY) });
    if (!doc) throw new Error('the account was not stored');
    const renewedUntil = new Date(Date.now() + 60 * DAY);
    const refresh = jest.fn(async () => ({ access_token: 'new-token', refresh_token: '', expires_at: renewedUntil, scopes: [] }));

    const handle = await freshHandle(doc, reader(refresh), CREDS);

    expect(refresh).toHaveBeenCalledWith(expect.objectContaining({ access_token: 'old-token' }), CREDS);
    expect(handle.access_token).toBe('new-token');
    const after = await SocialAccountModel.findById(doc._id).select('+access_token').lean<AccountWithTokens>();
    expect(after?.access_token).toMatch(/^enc:v1:/);
    expect(openToken(after?.access_token)).toBe('new-token');
    expect(after?.token_expires_at).toEqual(renewedUntil);
  });

  it('leaves a token with weeks left alone', async () => {
    const doc = await stored({ token_expires_at: new Date(Date.now() + 30 * DAY) });
    if (!doc) throw new Error('the account was not stored');
    const refresh = jest.fn();
    await expect(freshHandle(doc, reader(refresh), CREDS)).resolves.toMatchObject({ access_token: 'old-token' });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('asks for a reconnect when a Facebook Login token is about to lapse, since it cannot be renewed without a person', async () => {
    const doc = await stored({
      provider: 'INSTAGRAM',
      platform: 'INSTAGRAM',
      meta: { login: 'FACEBOOK', page_id: 'p1' },
      token_expires_at: new Date(Date.now() + 60_000),
    });
    if (!doc) throw new Error('the account was not stored');
    const refresh = jest.fn();
    const attempt = freshHandle(doc, reader(refresh), CREDS);
    await expect(attempt).rejects.toBeInstanceOf(SocialApiError);
    await expect(attempt).rejects.toThrow('reconnect this account');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('lets a failed renewal surface, leaving the stored token as it was', async () => {
    const doc = await stored({ token_expires_at: new Date(Date.now() + DAY) });
    if (!doc) throw new Error('the account was not stored');
    const refresh = jest.fn(async () => {
      throw new SocialApiError('Threads', 400, 'Session has expired', true);
    });
    await expect(freshHandle(doc, reader(refresh), CREDS)).rejects.toThrow('Session has expired');
    const after = await SocialAccountModel.findById(doc._id).select('+access_token').lean<AccountWithTokens>();
    expect(openToken(after?.access_token)).toBe('old-token');
  });
});
