import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiteEmailLogModel } from '../../models/emailLog.model';
import { LiteEmailTemplateModel } from '../../models/emailTemplate.model';
import { emailService, interpolate, renderHtml, smtpFromConfig, type SmtpConfig } from '../../services/email.service';
import { DEFAULT_TEMPLATES } from '../../services/email.templates';
import { envEntryService } from '../../services/envEntry.service';
import { settingsService } from '../../services/settings.service';
import { log } from '../../utils/log';
import { withTestDatabase } from '../helpers/mongo';

const mailer = vi.hoisted(() => ({ createTransport: vi.fn(), sendMail: vi.fn(), close: vi.fn() }));

vi.mock('nodemailer', () => ({ default: { createTransport: mailer.createTransport } }));

vi.mock('../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/env')>();
  return { ...actual, env: { ...actual.env, siteUrl: 'https://lite.duncit.test' } };
});

withTestDatabase();

beforeEach(() => {
  mailer.createTransport.mockReset().mockImplementation(() => ({ sendMail: mailer.sendMail, close: mailer.close }));
  mailer.sendMail.mockReset().mockResolvedValue({ messageId: '<m-1@smtp.duncit.com>' });
  mailer.close.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const SMTP: SmtpConfig = { host: 'smtp.duncit.com', port: 465, user: 'mailer@duncit.com', pass: 'pw', secure: true, from: 'no-reply@duncit.com', replyTo: 'help@duncit.com' };
const QR = { cid: 'ticket-qr', png: Buffer.from([0x89, 0x50, 0x4e, 0x47]), alt: 'Check-in QR for code K7M2P9' };

const configureMailbox = () =>
  envEntryService.create({
    name: 'Mailbox',
    category: 'EMAIL',
    config: [
      { key: 'host', value: 'smtp.duncit.com' },
      { key: 'port', value: '465' },
      { key: 'user', value: 'mailer@duncit.com' },
      { key: 'password', value: 'pw' },
      { key: 'secure', value: 'true' },
      { key: 'from_address', value: 'no-reply@duncit.com' },
      { key: 'from_name', value: 'Duncit "Lite"' },
    ],
  });

describe('interpolate', () => {
  it('fills known placeholders and leaves unknown ones visible', () => {
    expect(interpolate('Hi {name}, code {code} for {name}. {unknown}', { name: 'Gita', code: 424242 })).toBe('Hi Gita, code 424242 for Gita. {unknown}');
  });
});

describe('renderHtml', () => {
  it('escapes the text, keeps paragraphs and line breaks, and links URLs', () => {
    const html = renderHtml('Hi <b>Gita</b> & "friends",\nsee https://lite.duncit.test/e/jazz\n\nSecond paragraph', 'Duncit <Lite>');
    expect(html).toContain('Hi &lt;b&gt;Gita&lt;/b&gt; &amp; &quot;friends&quot;,<br />see <a href="https://lite.duncit.test/e/jazz" style="color:#D92D2D">https://lite.duncit.test/e/jazz</a>');
    expect(html).toContain('>Second paragraph</p>');
    expect(html).toContain('Duncit &lt;Lite&gt; · https://lite.duncit.test');
    expect(html).not.toContain('<b>');
  });

  it('adds the inline image tag only when one is given, escaped', () => {
    expect(renderHtml('Hello', 'Duncit Lite')).not.toContain('cid:');
    const html = renderHtml('Hello', 'Duncit Lite', { ...QR, alt: 'QR "door"' });
    expect(html).toContain('<img src="cid:ticket-qr" alt="QR &quot;door&quot;" width="220" height="220"');
  });
});

describe('smtpFromConfig', () => {
  it('needs a host', () => {
    expect(smtpFromConfig(null)).toBeNull();
    expect(smtpFromConfig({ user: 'mailer@duncit.com' })).toBeNull();
  });

  it('reads the entry, defaulting the port and building the From header', () => {
    expect(smtpFromConfig({ host: 'smtp.duncit.com', user: 'mailer@duncit.com', password: 'pw', from_name: 'Duncit "Lite"', from_address: 'no-reply@duncit.com', secure: true, reply_to: 'help@duncit.com' })).toEqual({
      host: 'smtp.duncit.com',
      port: 587,
      user: 'mailer@duncit.com',
      pass: 'pw',
      secure: true,
      from: '"Duncit Lite" <no-reply@duncit.com>',
      replyTo: 'help@duncit.com',
    });
  });

  it('sends from the login when no From address is set, and is secure only for a real true', () => {
    expect(smtpFromConfig({ host: 'smtp.duncit.com', port: 25, user: 'mailer@duncit.com', secure: 'true' })).toMatchObject({ port: 25, from: 'mailer@duncit.com', secure: false });
  });
});

describe('emailService.seedTemplates', () => {
  it('seeds every default once and never overwrites the words an admin edited', async () => {
    await emailService.seedTemplates();
    expect(await LiteEmailTemplateModel.countDocuments({})).toBe(DEFAULT_TEMPLATES.length);
    await LiteEmailTemplateModel.updateOne({ key: 'sign_in_code' }, { $set: { subject: 'Edited subject', enabled: false, name: 'Old name' } });

    await emailService.seedTemplates();

    const template = await LiteEmailTemplateModel.findOne({ key: 'sign_in_code' }).lean();
    expect(template).toMatchObject({ subject: 'Edited subject', enabled: false, name: 'Sign-in code' });
    expect(await LiteEmailTemplateModel.countDocuments({})).toBe(DEFAULT_TEMPLATES.length);
  });
});

describe('emailService.smtp', () => {
  it('reads the active EMAIL entry, or answers null', async () => {
    await expect(emailService.smtp()).resolves.toBeNull();
    await configureMailbox();
    await expect(emailService.smtp()).resolves.toMatchObject({ host: 'smtp.duncit.com', port: 465, secure: true, from: '"Duncit Lite" <no-reply@duncit.com>' });
  });
});

describe('emailService.sendRaw', () => {
  it('records a skip while no mailbox is configured', async () => {
    await expect(emailService.sendRaw('gita@lite.test', 'Hi', 'Body', 'Duncit Lite')).resolves.toEqual({
      status: 'SKIPPED',
      message: 'No mailbox configured (Console → Environment → Email)',
    });
    expect(mailer.createTransport).not.toHaveBeenCalled();
  });

  it('sends text and HTML, attaching an inline image when given', async () => {
    const outcome = await emailService.sendRaw('gita@lite.test', 'Your ticket', 'See you there', 'Duncit Lite', SMTP, QR);

    expect(outcome).toEqual({ status: 'SENT', message: 'Sent to gita@lite.test', messageId: '<m-1@smtp.duncit.com>' });
    expect(mailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.duncit.com',
      port: 465,
      secure: true,
      auth: { user: 'mailer@duncit.com', pass: 'pw' },
      pool: true,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });
    const mail = mailer.sendMail.mock.calls[0][0];
    expect(mail).toMatchObject({ from: 'no-reply@duncit.com', to: 'gita@lite.test', replyTo: 'help@duncit.com', subject: 'Your ticket', text: 'See you there' });
    expect(mail.html).toContain('cid:ticket-qr');
    expect(mail.attachments).toEqual([{ filename: 'ticket-qr.png', content: QR.png, cid: 'ticket-qr', contentType: 'image/png' }]);
  });

  it('reuses one pooled transport per mailbox and replaces it when the credentials change', async () => {
    // A mailbox no earlier test used, so the transport cache starts cold for it.
    const pool: SmtpConfig = { ...SMTP, host: 'pool.duncit.com' };
    await emailService.sendRaw('a@lite.test', 'One', 'Body', 'Duncit Lite', pool);
    await emailService.sendRaw('b@lite.test', 'Two', 'Body', 'Duncit Lite', pool);
    expect(mailer.createTransport).toHaveBeenCalledTimes(1);
    const closedBefore = mailer.close.mock.calls.length;

    await emailService.sendRaw('c@lite.test', 'Three', 'Body', 'Duncit Lite', { ...pool, pass: 'rotated', user: '', replyTo: '' });
    expect(mailer.createTransport).toHaveBeenCalledTimes(2);
    expect(mailer.close).toHaveBeenCalledTimes(closedBefore + 1);
    expect(mailer.createTransport.mock.calls[1][0]).toMatchObject({ auth: undefined });
    expect(mailer.sendMail.mock.calls[2][0]).toMatchObject({ replyTo: undefined });
    expect(mailer.sendMail.mock.calls[2][0]).not.toHaveProperty('attachments');
  });

  it('reports a failed send without throwing, and logs it', async () => {
    const error = vi.spyOn(log, 'error').mockImplementation(() => undefined);
    mailer.sendMail.mockRejectedValueOnce(new Error('Connection refused')).mockRejectedValueOnce('boom');
    await expect(emailService.sendRaw('gita@lite.test', 'Hi', 'Body', 'Duncit Lite', SMTP)).resolves.toEqual({ status: 'FAILED', message: 'Connection refused' });
    await expect(emailService.sendRaw('gita@lite.test', 'Hi', 'Body', 'Duncit Lite', SMTP)).resolves.toEqual({ status: 'FAILED', message: 'Send failed' });
    expect(error).toHaveBeenCalledWith('email', 'sendRaw', expect.objectContaining({ to: 'gita@lite.test', subject: 'Hi' }));
  });
});

describe('emailService.send', () => {
  beforeEach(async () => {
    await emailService.seedTemplates();
  });

  it('fails without logging a row for a template that does not exist', async () => {
    vi.spyOn(log, 'error').mockImplementation(() => undefined);
    await expect(emailService.send({ to: 'gita@lite.test', templateKey: 'nope', vars: {} })).resolves.toEqual({ status: 'FAILED', message: 'No template named nope' });
    expect(await LiteEmailLogModel.countDocuments({})).toBe(0);
  });

  it('skips and logs a template the console switched off', async () => {
    await LiteEmailTemplateModel.updateOne({ key: 'sign_in_code' }, { $set: { enabled: false } });
    await expect(emailService.send({ to: 'gita@lite.test', templateKey: 'sign_in_code', vars: { code: '424242', minutes: 10 } })).resolves.toEqual({
      status: 'SKIPPED',
      message: 'Template switched off',
    });
    const row = await LiteEmailLogModel.findOne({}).lean();
    expect(row).toMatchObject({ status: 'SKIPPED', error: 'Template switched off', subject: 'Your Duncit Lite sign-in code: 424242' });
  });

  it('logs a skip when no mailbox is configured', async () => {
    await emailService.send({ to: 'gita@lite.test', templateKey: 'sign_in_code', vars: { code: '424242', minutes: 10 } });
    const row = await LiteEmailLogModel.findOne({}).lean();
    expect(row).toMatchObject({ status: 'SKIPPED', error: 'No mailbox configured (Console → Environment → Email)', template_key: 'sign_in_code' });
  });

  it('sends with the site name filled in, logs the send and counts it on the template', async () => {
    await configureMailbox();
    await settingsService.update({ site_name: 'Duncit Events' });

    const outcome = await emailService.send({ to: 'gita@lite.test', templateKey: 'sign_in_code', vars: { code: '424242', minutes: 10 }, eventId: '507f1f77bcf86cd799439011' });

    expect(outcome.status).toBe('SENT');
    const mail = mailer.sendMail.mock.calls[0][0];
    expect(mail.subject).toBe('Your Duncit Events sign-in code: 424242');
    expect(mail.text).toContain('Your sign-in code is 424242. It works for 10 minutes.');
    expect(mail.from).toBe('"Duncit Lite" <no-reply@duncit.com>');
    const row = await LiteEmailLogModel.findOne({}).lean();
    expect(row).toMatchObject({ status: 'SENT', error: '', message_id: '<m-1@smtp.duncit.com>', to: 'gita@lite.test' });
    expect(String(row?.event_id)).toBe('507f1f77bcf86cd799439011');
    expect((await LiteEmailTemplateModel.findOne({ key: 'sign_in_code' }).lean())?.sent_count).toBe(1);
  });

  it('logs a failed send with its error and does not count it', async () => {
    await configureMailbox();
    vi.spyOn(log, 'error').mockImplementation(() => undefined);
    mailer.sendMail.mockRejectedValueOnce(new Error('Mailbox full'));
    await expect(emailService.send({ to: 'gita@lite.test', templateKey: 'sign_in_code', vars: { code: '1', minutes: 10 } })).resolves.toMatchObject({ status: 'FAILED' });
    expect(await LiteEmailLogModel.findOne({}).lean()).toMatchObject({ status: 'FAILED', error: 'Mailbox full' });
    expect((await LiteEmailTemplateModel.findOne({ key: 'sign_in_code' }).lean())?.sent_count).toBe(0);
  });
});
