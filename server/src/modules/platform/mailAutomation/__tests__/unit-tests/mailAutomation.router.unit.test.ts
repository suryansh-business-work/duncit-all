import express from 'express';
import request from 'supertest';
import { logs } from '@observability/log';
import { getUrlConfigs } from '@config/url-configs';
import { mailAutomationService } from '../../mailAutomation.service';
import { buildGmailOAuthRouter } from '../../mailAutomation.router';

jest.mock('@config/url-configs', () => ({ getUrlConfigs: jest.fn() }));
jest.mock('../../mailAutomation.service', () => ({ mailAutomationService: { completeConnect: jest.fn() } }));
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn() } } }));

const app = express().use('/gmail', buildGmailOAuthRouter());
const complete = mailAutomationService.completeConnect as jest.Mock;
const land = async (query: string) => {
  const res = await request(app).get(`/gmail/oauth/callback${query}`);
  expect(res.status).toBe(302);
  return new URL(res.headers.location);
};

beforeEach(() => {
  jest.resetAllMocks();
  (getUrlConfigs as jest.Mock).mockResolvedValue({ techUrl: 'https://tech.duncit.test//' });
});

describe('the Gmail OAuth callback', () => {
  it('sends the operator back to the configured portal, never to an address from the request', async () => {
    complete.mockResolvedValue({ account: { email: 'help@duncit.com' }, alreadyConnected: false });
    const url = await land('?code=c&state=s&redirect=https://evil.test');
    expect(url.origin + url.pathname).toBe('https://tech.duncit.test/mail-automation');
    expect(url.searchParams.get('connected')).toBe('help@duncit.com');
    expect(url.searchParams.has('reconnected')).toBe(false);
    expect(complete).toHaveBeenCalledWith('c', 's');
  });

  it('flags a mailbox that was already connected', async () => {
    complete.mockResolvedValue({ account: { email: 'help@duncit.com' }, alreadyConnected: true });
    expect((await land('?code=c&state=s')).searchParams.get('reconnected')).toBe('1');
  });

  it('reports the consent being cancelled as it was, without trying to connect', async () => {
    expect((await land('?error=access_denied')).searchParams.get('error')).toBe('access_denied');
    expect(complete).not.toHaveBeenCalled();
  });

  it.each(['', '?code=c', '?state=s', '?code[]=a&state=s'])('treats %s as a missing code', async (query) => {
    expect((await land(query)).searchParams.get('error')).toBe('missing_code');
    expect(complete).not.toHaveBeenCalled();
  });

  it('reads a repeated parameter as absent rather than as whatever came first', async () => {
    expect((await land('?error=a&error=b')).searchParams.get('error')).toBe('missing_code');
  });

  it('reports a failed connection with the reason cut at 700 characters, and logs it', async () => {
    complete.mockRejectedValue(new Error('x'.repeat(900)));
    const url = await land('?code=c&state=s');
    expect(url.searchParams.get('error')).toHaveLength(700);
    expect(logs.server.error).toHaveBeenCalledWith('mail-automation', 'oauthCallback', expect.objectContaining({ error: expect.any(Error) }));
  });

  it('reports a failure that was not an Error by its text', async () => {
    complete.mockRejectedValue('plain failure');
    expect((await land('?code=c&state=s')).searchParams.get('error')).toBe('plain failure');
  });
});
