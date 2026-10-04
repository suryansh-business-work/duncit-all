import { describe, expect, it } from 'vitest';
import { makeConnectionSchema } from './connection.form';
import { CONNECTION_LABEL_MAX, connectionToValues, toSaveConnectionVariables, type ConnectionFormValues } from './connection.types';
import type { PartnerIntegration } from '../integrations.queries';

// The key comes back as the message, so a test reads which rule refused.
const t = (key: string) => key;

const blank: ConnectionFormValues = {
  label: '',
  email: '',
  password: '',
  pickup_location: '',
  webhook_secret: '',
  key_id: '',
  key_secret: '',
};

const razorpay = { ...blank, label: 'Main Razorpay', key_id: 'rzp_test_abc', key_secret: 'secret' };
const shiprocket = { ...blank, label: 'Warehouse SR', email: 'api@brand.example.com', password: 'pw', pickup_location: 'Delhi' };

const messages = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? [] : (result.error?.issues ?? []).map((issue) => issue.message);

describe('makeConnectionSchema', () => {
  it('accepts a named Razorpay connection with both keys', () => {
    expect(makeConnectionSchema(t, 'RAZORPAY', false).safeParse(razorpay).success).toBe(true);
  });

  it('accepts a named ShipRocket connection with the API user and password', () => {
    expect(makeConnectionSchema(t, 'SHIPROCKET', false).safeParse(shiprocket).success).toBe(true);
  });

  it('refuses a connection without a name, even when the credential is complete', () => {
    const result = makeConnectionSchema(t, 'RAZORPAY', false).safeParse({ ...razorpay, label: '   ' });
    expect(messages(result)).toContain('partners.integrations.labelRequired');
  });

  it('refuses a name longer than the server keeps', () => {
    const long = 'x'.repeat(CONNECTION_LABEL_MAX + 1);
    const result = makeConnectionSchema(t, 'RAZORPAY', false).safeParse({ ...razorpay, label: long });
    expect(messages(result)).toContain('partners.integrations.labelTooLong');
    const exact = 'x'.repeat(CONNECTION_LABEL_MAX);
    expect(makeConnectionSchema(t, 'RAZORPAY', false).safeParse({ ...razorpay, label: exact }).success).toBe(true);
  });

  it('needs the secret on a new connection but lets an edit keep the saved one', () => {
    const noSecret = { ...razorpay, key_secret: '' };
    expect(messages(makeConnectionSchema(t, 'RAZORPAY', false).safeParse(noSecret))).toContain(
      'partners.brandWizard.validation.required',
    );
    expect(makeConnectionSchema(t, 'RAZORPAY', true).safeParse(noSecret).success).toBe(true);
  });

  it('checks the ShipRocket API user is an email address', () => {
    const result = makeConnectionSchema(t, 'SHIPROCKET', false).safeParse({ ...shiprocket, email: 'not-an-email' });
    expect(messages(result)).toContain('partners.brandWizard.validation.email');
  });
});

describe('toSaveConnectionVariables', () => {
  it('sends only the Razorpay half, with the name trimmed', () => {
    expect(toSaveConnectionVariables('RAZORPAY', null, { ...razorpay, label: '  Main Razorpay ' })).toEqual({
      id: null,
      provider: 'RAZORPAY',
      input: { label: 'Main Razorpay', razorpay: { key_id: 'rzp_test_abc', key_secret: 'secret', webhook_secret: undefined } },
    });
  });

  it('sends only the ShipRocket half and omits a blank password so the server keeps the saved one', () => {
    expect(toSaveConnectionVariables('SHIPROCKET', 'c1', { ...shiprocket, password: '' })).toEqual({
      id: 'c1',
      provider: 'SHIPROCKET',
      input: {
        label: 'Warehouse SR',
        shiprocket: { email: 'api@brand.example.com', password: undefined, pickup_location: 'Delhi', webhook_secret: undefined },
      },
    });
  });
});

describe('connectionToValues', () => {
  it('opens a new connection empty', () => {
    expect(connectionToValues(null)).toEqual(blank);
  });

  it('prefills the name and public half of a saved connection, never a secret', () => {
    const saved: PartnerIntegration = {
      id: 'c1',
      provider: 'RAZORPAY',
      label: 'Main Razorpay',
      brands: [],
      status: {
        provider: 'RAZORPAY',
        configured: true,
        connected: true,
        checked_at: null,
        message: '',
        details: [],
        identifier: 'rzp_live_abc',
        has_secret: true,
        pickup_location: '',
        live_mode: true,
        has_webhook_secret: true,
      },
    };
    expect(connectionToValues(saved)).toEqual({ ...blank, label: 'Main Razorpay', key_id: 'rzp_live_abc' });
  });
});
