import { describe, expect, it } from 'vitest';
import { parseTicketQr, ticketQrDataUrl, ticketQrPayload, ticketQrPng, upiLink, upiQrDataUrl } from '../../services/qr';
import { badInputError, thrownBy } from '../helpers/expect';

const EVENT_ID = '507f1f77bcf86cd799439011';
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const paramsOf = (link: string) => Object.fromEntries(new URLSearchParams(link.slice(link.indexOf('?') + 1)));

describe('upiLink', () => {
  it('builds the upi://pay link with payee, name, whole-rupee amount and note', () => {
    const link = upiLink(' Hema.S@OKAXIS ', ' Hema Host ', 499.9, 'Sunday Jazz K7M2P9');
    expect(link.startsWith('upi://pay?')).toBe(true);
    expect(paramsOf(link)).toEqual({ pa: 'hema.s@okaxis', cu: 'INR', pn: 'Hema Host', am: '499', tn: 'Sunday Jazz K7M2P9' });
  });

  it('leaves out an empty name, a zero or missing amount and an empty note', () => {
    expect(paramsOf(upiLink('hema@okaxis', '', null, ''))).toEqual({ pa: 'hema@okaxis', cu: 'INR' });
    expect(paramsOf(upiLink('hema@okaxis', '', 0, ''))).toEqual({ pa: 'hema@okaxis', cu: 'INR' });
    expect(paramsOf(upiLink('hema@okaxis', '', -50, ''))).toEqual({ pa: 'hema@okaxis', cu: 'INR' });
  });

  it('refuses an invalid UPI ID and an over-long name or note', () => {
    expect(thrownBy(() => upiLink('hema', 'Hema', 100, ''))).toMatchObject(badInputError('Enter a valid UPI ID, like name@bank'));
    expect(thrownBy(() => upiLink('hema@okaxis', 'x'.repeat(81), 100, ''))).toMatchObject(badInputError('Payee name must be 80 characters or fewer'));
    expect(thrownBy(() => upiLink('hema@okaxis', 'Hema', 100, 'x'.repeat(61)))).toMatchObject(badInputError('Note must be 60 characters or fewer'));
  });
});

describe('upiQrDataUrl', () => {
  it('draws the link as a PNG data URL', async () => {
    const dataUrl = await upiQrDataUrl('upi://pay?pa=hema@okaxis&cu=INR');
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(Buffer.from(dataUrl.split(',')[1], 'base64').subarray(0, 8)).toEqual(PNG_MAGIC);
  });
});

describe('ticket QR', () => {
  it('carries only a fixed prefix, the event and the code', () => {
    expect(ticketQrPayload(EVENT_ID, 'K7M2P9')).toBe(`duncit-lite:${EVENT_ID}:K7M2P9`);
  });

  it('parses its own payload back, tolerating case and surrounding space', () => {
    expect(parseTicketQr(ticketQrPayload(EVENT_ID, 'K7M2P9'))).toEqual({ eventId: EVENT_ID, code: 'K7M2P9' });
    expect(parseTicketQr(`  DUNCIT-LITE:${EVENT_ID.toUpperCase()}:k7m2p9 \n`)).toEqual({ eventId: EVENT_ID, code: 'K7M2P9' });
  });

  it('answers null for anything that is not a Lite ticket', () => {
    for (const value of [
      'K7M2P9',
      `duncit:${EVENT_ID}:K7M2P9`,
      'duncit-lite:not-an-event-id:K7M2P9',
      `duncit-lite:${EVENT_ID}:ABC`,
      `duncit-lite:${EVENT_ID}:ABCDEFGHJKLMN`,
      `duncit-lite:${EVENT_ID}:K7M-P9`,
      `duncit-lite:${EVENT_ID}:K7M2P9:extra`,
      'https://lite.duncit.com/tickets/1',
      '',
    ]) {
      expect(parseTicketQr(value)).toBeNull();
    }
  });

  it('draws the ticket QR as a PNG for the email and as a data URL for the page', async () => {
    const png = await ticketQrPng(EVENT_ID, 'K7M2P9');
    expect(Buffer.isBuffer(png)).toBe(true);
    expect(png.subarray(0, 8)).toEqual(PNG_MAGIC);
    const dataUrl = await ticketQrDataUrl(EVENT_ID, 'K7M2P9');
    expect(Buffer.from(dataUrl.split(',')[1], 'base64')).toEqual(png);
  });
});
