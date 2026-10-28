import { afterEach, describe, expect, it, vi } from 'vitest';
import { dayKeyIn, deviceTimeZone, eventWhen, fromPriceLabel, priceLabel } from '../../../shared/format';

const from = (price: string) => `From ${price}`;
const ticket = (price: number, isActive = true) => ({ price, is_active: isActive });

describe('priceLabel', () => {
  it('writes whole rupees with Indian grouping', () => {
    expect(priceLabel(1250, 'Free')).toBe('₹1,250');
    expect(priceLabel(125_000, 'Free')).toBe('₹1,25,000');
  });

  it('uses the free label for zero (and anything not above it)', () => {
    expect(priceLabel(0, 'Free')).toBe('Free');
    expect(priceLabel(-5, 'Free')).toBe('Free');
  });
});

describe('fromPriceLabel', () => {
  it('is free when no ticket is on sale', () => {
    expect(fromPriceLabel([], 'Free', from)).toBe('Free');
    expect(fromPriceLabel([ticket(500, false)], 'Free', from)).toBe('Free');
  });

  it('is free when the cheapest ticket on sale costs nothing', () => {
    expect(fromPriceLabel([ticket(0), ticket(500)], 'Free', from)).toBe('Free');
  });

  it('names the one price when only one ticket is on sale', () => {
    expect(fromPriceLabel([ticket(500), ticket(100, false)], 'Free', from)).toBe('₹500');
  });

  it('says "from" the cheapest active price when there are several, ignoring tickets off sale', () => {
    expect(fromPriceLabel([ticket(1500), ticket(800), ticket(100, false)], 'Free', from)).toBe('From ₹800');
  });
});

describe('eventWhen', () => {
  it("writes an evening in the event's own zone, whatever the reader's clock", () => {
    expect(eventWhen('2026-11-21T13:30:00.000Z', '2026-11-21T16:00:00.000Z', 'Asia/Kolkata')).toEqual({
      date: 'Sat, 21 Nov 2026',
      time: '7:00 PM – 9:30 PM',
      zone: 'Asia/Kolkata',
    });
    expect(eventWhen('2026-11-21T13:30:00.000Z', '2026-11-21T16:00:00.000Z', 'America/New_York')).toEqual({
      date: 'Sat, 21 Nov 2026',
      time: '8:30 AM – 11:00 AM',
      zone: 'America/New_York',
    });
  });

  it('adds the end date when the event runs past midnight in its zone', () => {
    expect(eventWhen('2026-11-21T16:30:00.000Z', '2026-11-21T20:30:00.000Z', 'Asia/Kolkata')).toEqual({
      date: 'Sat, 21 Nov 2026',
      time: '10:00 PM – Sun, 22 Nov 2026 · 2:00 AM',
      zone: 'Asia/Kolkata',
    });
  });

  it('falls back to India time when the event has no zone', () => {
    expect(eventWhen('2026-11-21T13:30:00.000Z', '2026-11-21T16:00:00.000Z', '').zone).toBe('Asia/Kolkata');
    expect(eventWhen('2026-11-21T13:30:00.000Z', '2026-11-21T16:00:00.000Z', '').time).toBe('7:00 PM – 9:30 PM');
  });

  it('takes the date and time patterns it is given', () => {
    expect(eventWhen('2026-11-21T13:30:00.000Z', '2026-11-21T16:00:00.000Z', 'Asia/Kolkata', 'dd/MM/yyyy', 'HH:mm')).toEqual({
      date: '21/11/2026',
      time: '19:00 – 21:30',
      zone: 'Asia/Kolkata',
    });
  });
});

describe('dayKeyIn', () => {
  it("buckets an instant by the calendar day in the event's zone", () => {
    expect(dayKeyIn('2026-11-21T20:00:00.000Z', 'Asia/Kolkata')).toBe('2026-11-22');
    expect(dayKeyIn('2026-11-21T20:00:00.000Z', 'America/New_York')).toBe('2026-11-21');
    expect(dayKeyIn('2026-11-21T20:00:00.000Z', '')).toBe('2026-11-22');
  });
});

describe('deviceTimeZone', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("answers the reader's own IANA zone", () => {
    expect(deviceTimeZone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  it('falls back to India time when the platform cannot say', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new RangeError('Intl unavailable');
    });
    expect(deviceTimeZone()).toBe('Asia/Kolkata');
  });

  it('falls back to India time when the platform answers no zone', () => {
    const real = new Intl.DateTimeFormat();
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() =>
      Object.assign(Object.create(real), { resolvedOptions: () => ({ ...real.resolvedOptions(), timeZone: '' }) }),
    );
    expect(deviceTimeZone()).toBe('Asia/Kolkata');
  });
});
