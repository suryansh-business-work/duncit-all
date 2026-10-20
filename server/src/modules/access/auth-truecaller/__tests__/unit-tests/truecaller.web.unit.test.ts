import express from 'express';
import request from 'supertest';
import {
  buildTruecallerCallbackRouter,
  claimWebRequest,
  startWebRequest,
  webRequestState,
} from '../../truecaller.web';
import { TruecallerRequestModel } from '../../truecaller.model';
import { truecallerConfig } from '../../truecaller.config';
import { logs } from '@observability/log';

jest.mock('../../truecaller.model', () => ({
  TRUECALLER_REQUEST_TTL_MS: 600_000,
  TruecallerRequestModel: {
    create: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
  },
}));
jest.mock('../../truecaller.config', () => ({
  ...jest.requireActual('../../truecaller.config'),
  truecallerConfig: jest.fn(),
}));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn() } } }));

const model = TruecallerRequestModel as unknown as Record<string, jest.Mock>;
const config = truecallerConfig as jest.Mock;
const configured = { appKey: 'KEY', partnerName: 'Duncit', androidClientId: '', region: 'noneu' };

/** A Mongoose query chain ending in `.lean()`. */
const lean = (value: unknown) => ({ lean: jest.fn().mockResolvedValue(value) });

beforeEach(() => jest.clearAllMocks());

describe('startWebRequest', () => {
  it('mints an unguessable nonce, records it, and builds the deep link Truecaller opens', async () => {
    config.mockResolvedValue(configured);
    const started = await startWebRequest('SIGNUP', 'hi');

    expect(started.request_nonce.length).toBeGreaterThanOrEqual(32);
    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({ key: started.request_nonce, kind: 'WEB', expires_at: expect.any(Date) })
    );
    const link = new URL(started.deep_link.replace('truecallersdk://', 'https://'));
    expect(started.deep_link.startsWith('truecallersdk://truesdk/web_verify?')).toBe(true);
    expect(Object.fromEntries(link.searchParams)).toMatchObject({
      requestNonce: started.request_nonce,
      partnerKey: 'KEY',
      partnerName: 'Duncit',
      lang: 'hi',
      loginSuffix: 'signup',
    });
  });

  it('falls back to English for a language Truecaller would not understand', async () => {
    config.mockResolvedValue(configured);
    const { deep_link } = await startWebRequest('LOGIN', 'en-IN');
    expect(deep_link).toContain('lang=en');
    expect(deep_link).toContain('loginSuffix=login');
  });

  it('is not configured without the app key or partner name, and records nothing', async () => {
    config.mockResolvedValue({ ...configured, partnerName: '' });
    await expect(startWebRequest('LOGIN', 'en')).rejects.toMatchObject({
      extensions: { code: 'NOT_CONFIGURED' },
    });
    expect(model.create).not.toHaveBeenCalled();
  });
});

describe('webRequestState', () => {
  it('reads EXPIRED for an unknown or lapsed nonce, and the state otherwise', async () => {
    model.findOne.mockReturnValueOnce(lean(null));
    expect(await webRequestState('n')).toBe('EXPIRED');
    model.findOne.mockReturnValueOnce(lean({ state: 'READY', expires_at: new Date(Date.now() - 1) }));
    expect(await webRequestState('n')).toBe('EXPIRED');
    model.findOne.mockReturnValueOnce(lean({ state: 'READY', expires_at: new Date(Date.now() + 60_000) }));
    expect(await webRequestState('n')).toBe('READY');
    expect(model.findOne).toHaveBeenCalledWith({ key: 'n', kind: 'WEB' });
  });
});

describe('claimWebRequest', () => {
  it('spends only a READY, unexpired nonce, in one conditional write that carries the token', async () => {
    const select = jest.fn().mockReturnValue(lean({ access_token: 'at' }));
    model.findOneAndUpdate.mockReturnValue({ select });
    expect(await claimWebRequest('n')).toEqual({ access_token: 'at' });
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { key: 'n', kind: 'WEB', state: 'READY', expires_at: { $gt: expect.any(Date) } },
      { $set: { state: 'USED' } },
      { new: true }
    );
    expect(select).toHaveBeenCalledWith('+access_token');
  });
});

describe('POST /truecaller/callback', () => {
  const app = express().use('/truecaller', buildTruecallerCallbackRouter());

  it('fills a PENDING nonce with the token and the endpoint Truecaller posted', async () => {
    model.updateOne.mockResolvedValue({ modifiedCount: 1 });
    const res = await request(app)
      .post('/truecaller/callback')
      .send({ requestId: 'n', accessToken: 'at', endpoint: 'https://profile4.truecaller.com/v1/default' });

    expect(res.status).toBe(200);
    expect(model.updateOne).toHaveBeenCalledWith(
      { key: 'n', kind: 'WEB', state: 'PENDING', expires_at: { $gt: expect.any(Date) } },
      { $set: { state: 'READY', access_token: 'at', endpoint: 'https://profile4.truecaller.com/v1/default' } }
    );
    expect(logs.server.warn).not.toHaveBeenCalled();
  });

  it('marks the request REJECTED when the person said no (no token)', async () => {
    model.updateOne.mockResolvedValue({ modifiedCount: 1 });
    await request(app).post('/truecaller/callback').send({ requestId: 'n', status: 'user_rejected' });
    expect(model.updateOne).toHaveBeenCalledWith(expect.anything(), { $set: { state: 'REJECTED' } });
  });

  it('answers 200 to a nonce it never minted, without saying so, and logs it', async () => {
    model.updateOne.mockResolvedValue({ modifiedCount: 0 });
    const res = await request(app).post('/truecaller/callback').send({ requestId: 42 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(model.updateOne.mock.calls[0][0].key).toBe('');
    expect(logs.server.warn).toHaveBeenCalledWith('auth-truecaller', 'callback-unmatched', { has_token: false });
  });

  it('still answers 200 when the write fails, and logs the failure', async () => {
    model.updateOne.mockRejectedValue(new Error('db down'));
    const res = await request(app).post('/truecaller/callback').send({ requestId: 'n', accessToken: 'at' });
    expect(res.status).toBe(200);
    expect(logs.server.error).toHaveBeenCalledWith('auth-truecaller', 'callback-failed', {
      reason: 'Error: db down',
    });
  });

  it('treats a body that is not JSON as an empty callback', async () => {
    model.updateOne.mockResolvedValue({ modifiedCount: 0 });
    const res = await request(app).post('/truecaller/callback').type('text/plain').send('hello');
    expect(res.status).toBe(200);
    expect(model.updateOne).toHaveBeenCalledWith(expect.objectContaining({ key: '' }), {
      $set: { state: 'REJECTED' },
    });
  });
});
