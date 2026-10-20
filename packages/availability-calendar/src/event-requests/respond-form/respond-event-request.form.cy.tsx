import { describe, expect, it } from 'vitest';
import { buildRespondSchema } from './respond-event-request.form';
import { offerInput, respondDefaults, type RespondEventRequestValues } from './respond-event-request.types';

const t = (key: string) => key;
const paths = (choice: 'ACCEPT' | 'REJECT' | 'COUNTER', values: RespondEventRequestValues) => {
  const result = buildRespondSchema(t, choice).safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`);
};

const counter: RespondEventRequestValues = { note: '', date: '2026-12-05', start: '18:00', end: '21:00', pax: 20 };

describe('buildRespondSchema', () => {
  it('lets accept and reject go with no window at all', () => {
    const blank = { note: '', date: '', start: '', end: '', pax: Number.NaN };
    expect(paths('ACCEPT', blank)).toEqual([]);
    expect(paths('REJECT', { ...blank, note: 'Fully booked that week' })).toEqual([]);
  });

  it('caps the note at 280 characters', () => {
    expect(paths('REJECT', { ...counter, note: 'x'.repeat(281) })).toContain('note:venuePricing.respond.noteTooLong');
  });

  it('needs a whole counter-offer window that ends after it starts', () => {
    expect(paths('COUNTER', counter)).toEqual([]);
    expect(paths('COUNTER', { ...counter, end: '17:00' })).toContain('end:venuePricing.validation.endAfterStart');
    expect(paths('COUNTER', { ...counter, date: '' })).toContain('date:venuePricing.validation.pickDate');
    expect(paths('COUNTER', { ...counter, pax: 2.5 })).toContain('pax:venuePricing.validation.wholeNumber');
    expect(paths('COUNTER', { ...counter, pax: Number.NaN })).toContain('pax:venuePricing.validation.wholeNumber');
  });
});

describe('respond values', () => {
  it('reopens on the current offer’s own window', () => {
    const start = new Date(2026, 11, 5, 18, 30);
    const end = new Date(2026, 11, 5, 20, 0);
    const values = respondDefaults({ start_at: start.toISOString(), end_at: end.toISOString(), pax: 12, quote: null });
    expect(values).toEqual({ note: '', date: '2026-12-05', start: '18:30', end: '20:00', pax: 12 });
  });

  it('sends the window as instants on the same day', () => {
    const offer = offerInput(counter);
    expect(offer).toEqual({
      start_at: new Date(2026, 11, 5, 18, 0).toISOString(),
      end_at: new Date(2026, 11, 5, 21, 0).toISOString(),
      pax: 20,
    });
    expect(offerInput({ ...counter, date: 'soon' })).toBeNull();
  });
});
