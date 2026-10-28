import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiteOtpModel } from '../../models/otp.model';
import { LiteUserModel, type LiteUserDoc } from '../../models/user.model';
import { contactService } from '../../services/contact.service';
import { envEntryService } from '../../services/envEntry.service';
import { log } from '../../utils/log';
import { apiError, badInputError } from '../helpers/expect';
import { makeUser } from '../helpers/fixtures';
import { withTestDatabase } from '../helpers/mongo';

vi.mock('../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/env')>();
  return { ...actual, env: { ...actual.env, otpTestCode: '424242' } };
});

withTestDatabase();

let asha: LiteUserDoc;

beforeEach(async () => {
  asha = await makeUser({ email: 'asha@lite.test', name: 'Asha' });
  // No mailbox is configured, so email codes are the stub code; that path logs a warning.
  vi.spyOn(log, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const enablePhone = () =>
  envEntryService.create({
    name: 'MSG91',
    category: 'MSG91',
    config: [
      { key: 'widget_id', value: 'widget-1' },
      { key: 'auth_key', value: 'auth-1' },
    ],
  });

function msg91Wire(verdict: 'success' | 'error' = 'success') {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    if (String(input).endsWith('/sendOtp')) return json({ type: 'success', message: 'req-link-1' });
    return json(verdict === 'success' ? { type: 'success', message: 'OTP verified success' } : { type: 'error', message: 'OTP not match' });
  });
}

describe('contactService.requestCode', () => {
  it('refuses the contact already on the account', async () => {
    await expect(contactService.requestCode(asha, 'EMAIL', ' ASHA@lite.test ')).rejects.toMatchObject(badInputError('That is already on your account'));
  });

  it('refuses an email another account uses', async () => {
    await makeUser({ email: 'ravi@lite.test' });
    await expect(contactService.requestCode(asha, 'EMAIL', 'ravi@lite.test')).rejects.toMatchObject(badInputError('Another account already uses that email'));
  });

  it('sends a LINK code bound to the account that asked for it', async () => {
    const result = await contactService.requestCode(asha, 'EMAIL', 'asha.work@lite.test');
    expect(result).toMatchObject({ ok: true, via: 'LITE', test_code: '424242' });
    const challenge = await LiteOtpModel.findOne({ email: 'asha.work@lite.test' }).lean();
    expect(challenge).toMatchObject({ purpose: 'LINK', via: 'LITE' });
    expect(String(challenge?.user_id)).toBe(String(asha._id));
  });

  it('refuses a second email code inside the resend window', async () => {
    await contactService.requestCode(asha, 'EMAIL', 'asha.work@lite.test');
    await expect(contactService.requestCode(asha, 'EMAIL', 'asha.work@lite.test')).rejects.toMatchObject(badInputError(/^Please wait/));
  });

  it('needs the SMS carrier to add a phone', async () => {
    await expect(contactService.requestCode(asha, 'PHONE', '9876543210')).rejects.toMatchObject(apiError('CONFIG_ERROR', /Phone sign-in is not available/));
  });

  it('texts a LINK code to a free phone number', async () => {
    await enablePhone();
    const wire = msg91Wire();
    const result = await contactService.requestCode(asha, 'PHONE', '98765 43210');
    expect(result).toMatchObject({ via: 'SMS', test_code: null });
    expect(JSON.parse(String(wire.mock.calls[0][1]?.body))).toMatchObject({ identifier: '919876543210' });
    const challenge = await LiteOtpModel.findOne({ phone: '+919876543210' }).lean();
    expect(challenge).toMatchObject({ purpose: 'LINK', via: 'SMS', req_id: 'req-link-1' });
    expect(String(challenge?.user_id)).toBe(String(asha._id));
  });

  it('refuses a phone already on the account, or on another one', async () => {
    await enablePhone();
    await LiteUserModel.updateOne({ _id: asha._id }, { $set: { phone: '+919876543210' } });
    const reloaded = await LiteUserModel.findById(asha._id);
    if (!reloaded) throw new Error('missing user');
    await expect(contactService.requestCode(reloaded, 'PHONE', '9876543210')).rejects.toMatchObject(badInputError('That is already on your account'));

    await makeUser({ phone: '+919812345678' });
    await expect(contactService.requestCode(reloaded, 'PHONE', '9812345678')).rejects.toMatchObject(badInputError('Another account already uses that phone number'));
  });
});

describe('contactService.verify', () => {
  it('adds the proven email to the account', async () => {
    const phoneOnly = await makeUser({ phone: '+919876543210', name: 'Ravi' });
    await contactService.requestCode(phoneOnly, 'EMAIL', 'ravi@lite.test');

    const me = await contactService.verify(phoneOnly, 'EMAIL', 'Ravi@Lite.test', '424242');

    expect(me).toMatchObject({ email: 'ravi@lite.test', phone: '+919876543210' });
    expect((await LiteUserModel.findById(phoneOnly._id).lean())?.email).toBe('ravi@lite.test');
  });

  it('will not let another account spend a code it did not ask for', async () => {
    await contactService.requestCode(asha, 'EMAIL', 'asha.work@lite.test');
    const ravi = await makeUser({ email: 'ravi@lite.test' });
    await expect(contactService.verify(ravi, 'EMAIL', 'asha.work@lite.test', '424242')).rejects.toMatchObject(badInputError('Ask for a new code first'));
    expect((await LiteUserModel.findById(ravi._id).lean())?.email).toBe('ravi@lite.test');
  });

  it('refuses a wrong code', async () => {
    await contactService.requestCode(asha, 'EMAIL', 'asha.work@lite.test');
    await expect(contactService.verify(asha, 'EMAIL', 'asha.work@lite.test', '000000')).rejects.toMatchObject(badInputError('That code is not right'));
  });

  it('refuses the email when another account claimed it after the code was sent', async () => {
    await contactService.requestCode(asha, 'EMAIL', 'asha.work@lite.test');
    await makeUser({ email: 'asha.work@lite.test' });
    await expect(contactService.verify(asha, 'EMAIL', 'asha.work@lite.test', '424242')).rejects.toMatchObject(badInputError('Another account already uses that email'));
    expect((await LiteUserModel.findById(asha._id).lean())?.email).toBe('asha@lite.test');
  });

  it("maps the unique index's duplicate-key error from a racing save to the friendly message", async () => {
    await contactService.requestCode(asha, 'EMAIL', 'asha.work@lite.test');
    vi.spyOn(asha, 'save').mockRejectedValueOnce(Object.assign(new Error('E11000 duplicate key error'), { code: 11000 }));
    await expect(contactService.verify(asha, 'EMAIL', 'asha.work@lite.test', '424242')).rejects.toMatchObject(badInputError('Another account already uses that email'));
  });

  it('passes any other save failure through unchanged', async () => {
    await contactService.requestCode(asha, 'EMAIL', 'asha.work@lite.test');
    const failure = new Error('connection reset');
    vi.spyOn(asha, 'save').mockRejectedValueOnce(failure);
    await expect(contactService.verify(asha, 'EMAIL', 'asha.work@lite.test', '424242')).rejects.toBe(failure);
  });

  it('adds a phone MSG91 proves', async () => {
    await enablePhone();
    const wire = msg91Wire();
    await contactService.requestCode(asha, 'PHONE', '9876543210');

    const me = await contactService.verify(asha, 'PHONE', '+91 98765 43210', '123456');

    expect(me).toMatchObject({ email: 'asha@lite.test', phone: '+919876543210' });
    expect(JSON.parse(String(wire.mock.calls[1][1]?.body))).toMatchObject({ reqId: 'req-link-1', otp: '123456' });
  });

  it('refuses a phone code MSG91 says is wrong', async () => {
    await enablePhone();
    msg91Wire('error');
    await contactService.requestCode(asha, 'PHONE', '9876543210');
    await expect(contactService.verify(asha, 'PHONE', '9876543210', '000000')).rejects.toMatchObject(badInputError('That code is not right'));
    expect((await LiteUserModel.findById(asha._id).lean())?.phone).toBeUndefined();
  });
});
