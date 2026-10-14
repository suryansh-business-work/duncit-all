/**
 * The AiSensy inbound WhatsApp webhook. The app has no global body parser, so
 * the router must parse AiSensy's JSON itself — and only after the shared
 * secret matched, so an unauthenticated post never gets as far as the body.
 */
import express from 'express';
import request from 'supertest';

jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn() } } }));
// The real payload parser runs; the flow engine behind it is replaced.
jest.mock('./../../automation.engine', () => ({ resumeWithReply: jest.fn(), startRun: jest.fn() }));
jest.mock('./../../automation.model', () => ({ AutomationFlowModel: {}, AutomationRunModel: {} }));
jest.mock('@modules/access/user/user.model', () => ({ UserModel: {} }));
jest.mock('@modules/crm/marketing/waCampaign.recipients', () => ({ WA_VARIABLES: [] }));
jest.mock('./../../automation.inbound', () => ({
  ...jest.requireActual('./../../automation.inbound'),
  inboundWhatsapp: jest.fn(),
}));

import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { logs } from '@observability/log';
import { inboundWhatsapp } from '../../automation.inbound';
import { buildAutomationRouter } from '../../automation.router';

const SECRET = 'aisensy-test-secret';
const PATH = '/automation/whatsapp/inbound';

const mockEnv = getRuntimeEnvValue as jest.Mock;
const mockInbound = inboundWhatsapp as jest.Mock;
const mockError = logs.server.error as jest.Mock;

const app = express().use('/automation', buildAutomationRouter());

/** Meta's Cloud API message object, as AiSensy forwards it. */
const META_MESSAGE = {
  entry: [
    {
      changes: [
        {
          value: {
            contacts: [{ profile: { name: 'Asha' } }],
            messages: [{ from: '919800000000', text: { body: 'Hi, is the pod on?' } }],
          },
        },
      ],
    },
  ],
};

beforeEach(() => {
  mockEnv.mockImplementation(async (key: string) => (key === 'AISENSY_WEBHOOK_SECRET' ? SECRET : ''));
  mockInbound.mockResolvedValue({ resumed: 0, started: 1 });
});

describe('POST /automation/whatsapp/inbound', () => {
  it('reads the JSON body of a message posted with the secret in the query and hands it on', async () => {
    const res = await request(app).post(`${PATH}?secret=${SECRET}`).send(META_MESSAGE);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockInbound).toHaveBeenCalledWith({ from: '919800000000', name: 'Asha', text: 'Hi, is the pod on?' });
  });

  it('accepts the secret from the x-webhook-secret header too', async () => {
    const res = await request(app).post(PATH).set('x-webhook-secret', SECRET).send({ from: '+91 98000 00000', text: 'hello' });

    expect(res.body).toEqual({ ok: true });
    expect(mockInbound).toHaveBeenCalledWith({ from: '919800000000', name: '', text: 'hello' });
  });

  it('acknowledges a text-less event (a delivery receipt) as ignored without starting anything', async () => {
    const res = await request(app)
      .post(`${PATH}?secret=${SECRET}`)
      .send({ entry: [{ changes: [{ value: { statuses: [{ status: 'delivered' }] } }] }] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, ignored: true });
    expect(mockInbound).not.toHaveBeenCalled();
  });

  it('refuses a wrong secret with 403 and never processes the message', async () => {
    const res = await request(app).post(`${PATH}?secret=not-the-secret`).send(META_MESSAGE);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ ok: false, error: 'Webhook secret missing or wrong' });
    expect(mockInbound).not.toHaveBeenCalled();
  });

  it('refuses a missing secret, and refuses everything while no secret is configured', async () => {
    const missing = await request(app).post(PATH).send(META_MESSAGE);
    mockEnv.mockResolvedValue('');
    const unconfigured = await request(app).post(PATH).set('x-webhook-secret', '').send(META_MESSAGE);

    expect(missing.status).toBe(403);
    expect(unconfigured.status).toBe(403);
    expect(mockInbound).not.toHaveBeenCalled();
  });

  it('checks the secret before reading the body: a wrong secret with malformed JSON is a 403, not a parse error', async () => {
    const res = await request(app)
      .post(`${PATH}?secret=not-the-secret`)
      .set('Content-Type', 'application/json')
      .send('{not json');

    expect(res.status).toBe(403);
    expect(mockInbound).not.toHaveBeenCalled();
  });

  it('logs a failure of the flow work after the 200 instead of swallowing it', async () => {
    const failure = new Error('engine down');
    mockInbound.mockRejectedValueOnce(failure);
    const res = await request(app).post(`${PATH}?secret=${SECRET}`).send(META_MESSAGE);
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.body).toEqual({ ok: true });
    expect(mockError).toHaveBeenCalledWith('automation', 'inbound', { error: failure, from: '919800000000' });
  });
});
