import { afterEach, describe, expect, it, vi } from 'vitest';
import { deviceTimeZone } from '../../../../shared/format';
import { SETTING_BOUNDS } from '../../../../shared/limits';
import {
  emptyQuestion,
  emptyTicket,
  eventDefaults,
  limitsFrom,
  makeEventSchema,
  toEventInput,
  type EventFormValues,
} from '../../../pages/event-form/event.types';
import { eventFixture, meFixture, questionFixture, ticketFixture } from '../../test-utils';
import { LIMITS, t, validValues } from './helpers';

const schema = makeEventSchema(t, LIMITS);

/** Every problem the schema finds, as `path: message`. */
function problems(values: EventFormValues): string[] {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
}

const ticket = (over: Partial<EventFormValues['tickets'][number]> = {}) => ({ ...emptyTicket('General admission'), ...over });

describe('limitsFrom', () => {
  it('takes the console’s capacity and price ceilings', () => {
    expect(limitsFrom({ max_event_capacity: 300, max_ticket_price: 2_500 })).toEqual({ maxCapacity: 300, maxPrice: 2_500 });
  });

  it('falls back to the platform’s own price ceiling when the console sets none (0)', () => {
    expect(limitsFrom({ max_event_capacity: 300, max_ticket_price: 0 }).maxPrice).toBe(SETTING_BOUNDS.ticketPrice.max);
  });
});

describe('makeEventSchema', () => {
  it('accepts a complete free in-person event', () => {
    expect(problems(validValues())).toEqual([]);
  });

  it('requires a title and keeps it to 120 characters', () => {
    expect(problems(validValues({ title: '   ' }))).toEqual(['title: This is required']);
    expect(problems(validValues({ title: 'x'.repeat(121) }))).toEqual(['title: Keep this to 120 characters or fewer']);
    expect(problems(validValues({ title: 'x'.repeat(120) }))).toEqual([]);
  });

  it('requires a description', () => {
    expect(problems(validValues({ description: '' }))).toEqual(['description: This is required']);
  });

  it('refuses a cover that is not a full http(s) link, and allows none', () => {
    expect(problems(validValues({ cover_url: 'ftp://pictures.example/cover.png' }))).toEqual(['cover_url: Enter a full link starting with http:// or https://']);
    expect(problems(validValues({ cover_url: '' }))).toEqual([]);
    expect(problems(validValues({ cover_url: 'https://pictures.example/cover.png' }))).toEqual([]);
  });

  describe('capacity', () => {
    it.each([
      ['-5', 'This cannot be negative'],
      ['0', 'Enter 1 or more'],
      ['2.5', 'Enter a whole number'],
      ['ten', 'Enter a whole number'],
      ['5001', 'Enter 5000 or less'],
    ])('refuses %s with “%s”', (capacity, message) => {
      expect(problems(validValues({ capacity }))).toEqual([`capacity: ${message}`]);
    });

    it.each(['', '1', '5000', ' 40 '])('accepts %j (blank is unlimited)', (capacity) => {
      expect(problems(validValues({ capacity }))).toEqual([]);
    });
  });

  describe('tickets', () => {
    it('needs at least one ticket type', () => {
      expect(problems(validValues({ tickets: [] }))).toEqual(['tickets: Add at least one ticket type']);
    });

    it('refuses a price above the console’s ceiling and a negative price', () => {
      expect(problems(validValues({ tickets: [ticket({ price: '50001' })], upi_id: 'asha@okbank' }))).toEqual(['tickets.0.price: Enter 50000 or less']);
      expect(problems(validValues({ tickets: [ticket({ price: '-1' })] }))).toEqual(['tickets.0.price: This cannot be negative']);
    });

    it('accepts a price exactly at the ceiling', () => {
      expect(problems(validValues({ tickets: [ticket({ price: '50000' })], upi_id: 'asha@okbank' }))).toEqual([]);
    });

    it('refuses a quantity below 1 or above the capacity ceiling', () => {
      expect(problems(validValues({ tickets: [ticket({ quantity: '0' })] }))).toEqual(['tickets.0.quantity: Enter 1 or more']);
      expect(problems(validValues({ tickets: [ticket({ quantity: '5001' })] }))).toEqual(['tickets.0.quantity: Enter 5000 or less']);
    });

    it('never lets a quantity drop below the seats already sold', () => {
      expect(problems(validValues({ tickets: [ticket({ quantity: '9', sold: 10 })] }))).toEqual([
        'tickets.0.quantity: 10 seats are already taken, so this cannot be lower than 10',
      ]);
      expect(problems(validValues({ tickets: [ticket({ quantity: '10', sold: 10 })] }))).toEqual([]);
      expect(problems(validValues({ tickets: [ticket({ quantity: '', sold: 10 })] }))).toEqual([]);
    });

    it('points the below-sold message at the right ticket', () => {
      const tickets = [ticket({ name: 'Early bird' }), ticket({ name: 'VIP', quantity: '2', sold: 4 })];
      expect(problems(validValues({ tickets }))).toEqual(['tickets.1.quantity: 4 seats are already taken, so this cannot be lower than 4']);
    });

    it('needs a ticket name', () => {
      expect(problems(validValues({ tickets: [ticket({ name: '' })] }))).toEqual(['tickets.0.name: This is required']);
    });
  });

  describe('a paid ticket', () => {
    it('needs the host’s UPI ID', () => {
      expect(problems(validValues({ tickets: [ticket({ price: '499' })], upi_id: '' }))).toEqual(['upi_id: Add your UPI ID so guests can pay you for a paid ticket']);
    });

    it('is fine once a valid UPI ID is given, in any case', () => {
      expect(problems(validValues({ tickets: [ticket({ price: '499' })], upi_id: 'Asha@OKBank' }))).toEqual([]);
    });

    it('refuses a UPI ID that is not one', () => {
      expect(problems(validValues({ upi_id: 'not a upi id' }))).toEqual(['upi_id: Enter a valid UPI ID, like name@bank']);
    });

    it('does not ask for UPI when every ticket is free', () => {
      expect(problems(validValues({ tickets: [ticket({ price: '0' }), ticket({ price: '0' })], upi_id: '' }))).toEqual([]);
    });
  });

  describe('time', () => {
    it('refuses an end before the start', () => {
      expect(problems(validValues({ start_at: new Date('2026-12-05T16:00:00.000Z'), end_at: new Date('2026-12-05T13:30:00.000Z') }))).toEqual([
        'end_at: The event must end after it starts',
      ]);
    });

    it('refuses an end equal to the start', () => {
      const at = new Date('2026-12-05T13:30:00.000Z');
      expect(problems(validValues({ start_at: at, end_at: new Date(at) }))).toEqual(['end_at: The event must end after it starts']);
    });

    it('needs a time zone', () => {
      expect(problems(validValues({ timezone: '' }))).toEqual(['timezone: This is required']);
    });
  });

  describe('place', () => {
    it('needs the join link for an online event', () => {
      expect(problems(validValues({ location_type: 'VIRTUAL', virtual_link: '' }))).toEqual(['virtual_link: Add the join link for an online event']);
    });

    it('refuses a join link that is not a web address', () => {
      expect(problems(validValues({ location_type: 'VIRTUAL', virtual_link: 'zoom meeting 123' }))).toEqual(['virtual_link: Enter a full link starting with http:// or https://']);
    });

    it('does not need a venue for an online event', () => {
      expect(problems(validValues({ location_type: 'VIRTUAL', virtual_link: 'https://meet.example/abc', venue_name: '', address: '' }))).toEqual([]);
    });

    it('needs a venue or an address in person', () => {
      expect(problems(validValues({ venue_name: '', address: '' }))).toEqual(['venue_name: Add a venue or an address']);
    });

    it('is satisfied by an address alone', () => {
      expect(problems(validValues({ venue_name: '', address: 'Lodhi Road, New Delhi' }))).toEqual([]);
    });

    it('keeps a pin inside the globe', () => {
      expect(problems(validValues({ lat: 91, lng: 0 }))).toHaveLength(1);
      expect(problems(validValues({ lat: 0, lng: -181 }))).toHaveLength(1);
      expect(problems(validValues({ lat: -90, lng: 180 }))).toEqual([]);
    });
  });

  describe('questions', () => {
    const question = (over: Partial<EventFormValues['questions'][number]> = {}) => ({ ...emptyQuestion(), label: 'T-shirt size', ...over });

    it('needs at least two options on a choice question', () => {
      expect(problems(validValues({ questions: [question({ type: 'SELECT', options: 'Medium' })] }))).toEqual([
        'questions.0.options: A choice question needs at least two options, one per line',
      ]);
    });

    it('counts options typed one per line or separated by commas, ignoring blanks', () => {
      expect(problems(validValues({ questions: [question({ type: 'SELECT', options: 'Small\n\nMedium' })] }))).toEqual([]);
      expect(problems(validValues({ questions: [question({ type: 'SELECT', options: 'Small, Medium' })] }))).toEqual([]);
      expect(problems(validValues({ questions: [question({ type: 'SELECT', options: ' , \n' })] }))).toHaveLength(1);
    });

    it('does not ask for options on other answer types', () => {
      expect(problems(validValues({ questions: [question({ type: 'TEXT' }), question({ type: 'CHECKBOX' })] }))).toEqual([]);
    });

    it('needs the question itself', () => {
      expect(problems(validValues({ questions: [question({ label: '' })] }))).toEqual(['questions.0.label: This is required']);
    });
  });
});

describe('emptyTicket and emptyQuestion', () => {
  it('start a free, unlimited ticket on sale and a short-text question', () => {
    expect(emptyTicket('Standard')).toEqual({ id: '', name: 'Standard', description: '', price: '0', quantity: '', sold: 0, is_active: true });
    expect(emptyQuestion()).toEqual({ id: '', label: '', type: 'TEXT', required: false, options: '' });
  });
});

describe('eventDefaults', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts a new event at the next full hour, one hour long, in the device’s zone, with one free ticket', () => {
    vi.useFakeTimers();
    const now = new Date('2026-10-27T10:25:30.000Z');
    vi.setSystemTime(now);
    const values = eventDefaults(null, null, 'General admission');

    expect(values.start_at.getMinutes()).toBe(0);
    expect(values.start_at.getSeconds()).toBe(0);
    expect(values.start_at.getTime()).toBeGreaterThan(now.getTime());
    expect(values.start_at.getTime() - now.getTime()).toBeLessThanOrEqual(60 * 60 * 1000);
    expect(values.end_at.getTime() - values.start_at.getTime()).toBe(60 * 60 * 1000);
    expect(values.timezone).toBe(deviceTimeZone());
    expect(values.tickets).toEqual([emptyTicket('General admission')]);
    expect(values).toMatchObject({
      title: '',
      location_type: 'IN_PERSON',
      visibility: 'PUBLIC',
      capacity: '',
      require_approval: false,
      theme_key: 'MINIMAL',
      theme_accent: 'DEFAULT',
      questions: [],
      lat: null,
      lng: null,
      upi_id: '',
      upi_name: '',
    });
  });

  it('offers the host’s saved UPI details on a new event', () => {
    const values = eventDefaults(null, meFixture({ upi_id: 'asha@okbank', upi_name: 'Asha Rao' }), 'General admission');
    expect(values.upi_id).toBe('asha@okbank');
    expect(values.upi_name).toBe('Asha Rao');
  });

  it('loads an existing event as the form edits it', () => {
    const event = eventFixture({
      capacity: 120,
      require_approval: true,
      category: { id: 'cat-1', name: 'Music', slug: 'music', icon: null },
      theme: { key: 'CONFETTI', accent: 'TEAL' },
      tickets: [ticketFixture({ id: 'tk-1', name: 'Early bird', description: null, price: 250, quantity: null, sold: 3 }), ticketFixture({ id: 'tk-2', name: 'VIP', description: 'Front row', price: 900, quantity: 20, is_active: false })],
      questions: [questionFixture({ id: 'q-1', label: 'Size', type: 'SELECT', required: true, options: ['S', 'M', 'L'] })],
      upi_id: 'garden@okbank',
      upi_name: 'Garden Club',
      lat: 28.59,
      lng: 77.21,
      place_id: 'place-1',
    });
    const values = eventDefaults(event, meFixture({ upi_id: 'asha@okbank' }), 'General admission');

    expect(values.start_at.toISOString()).toBe('2026-11-21T13:30:00.000Z');
    expect(values.end_at.toISOString()).toBe('2026-11-21T16:00:00.000Z');
    expect(values).toMatchObject({
      title: 'Garden Party',
      description: 'Bring a picnic blanket.',
      cover_url: '',
      timezone: 'Asia/Kolkata',
      venue_name: 'Lodhi Garden',
      address: 'Lodhi Road, New Delhi',
      city_slug: 'delhi',
      category_id: 'cat-1',
      calendar_id: '',
      capacity: '120',
      require_approval: true,
      theme_key: 'CONFETTI',
      theme_accent: 'TEAL',
      place_id: 'place-1',
      lat: 28.59,
      lng: 77.21,
      upi_id: 'garden@okbank',
      upi_name: 'Garden Club',
    });
    expect(values.tickets).toEqual([
      { id: 'tk-1', name: 'Early bird', description: '', price: '250', quantity: '', sold: 3, is_active: true },
      { id: 'tk-2', name: 'VIP', description: 'Front row', price: '900', quantity: '20', sold: 0, is_active: false },
    ]);
    expect(values.questions).toEqual([{ id: 'q-1', label: 'Size', type: 'SELECT', required: true, options: 'S\nM\nL' }]);
  });

  it('falls back to the host’s UPI details when the event has none', () => {
    const values = eventDefaults(eventFixture({ upi_id: null, upi_name: null }), meFixture({ upi_id: 'asha@okbank', upi_name: 'Asha' }), 'General admission');
    expect(values.upi_id).toBe('asha@okbank');
    expect(values.upi_name).toBe('Asha');
  });
});

describe('toEventInput', () => {
  it('sends blanks as null, times as ISO strings and the theme as one object', () => {
    const input = toEventInput(validValues({ cover_url: ' ', address: '', map_url: '', city_slug: '', category_id: '', calendar_id: '', theme_key: 'AMBIENT', theme_accent: 'PURPLE' }));
    expect(input).toMatchObject({
      title: 'Rooftop Jam',
      description: 'Live music on the roof.',
      cover_url: null,
      start_at: '2026-12-05T13:30:00.000Z',
      end_at: '2026-12-05T16:00:00.000Z',
      timezone: 'Asia/Kolkata',
      location_type: 'IN_PERSON',
      venue_name: 'Skyline Terrace',
      address: null,
      map_url: null,
      city_slug: null,
      category_id: null,
      calendar_id: null,
      virtual_link: null,
      capacity: null,
      theme: { key: 'AMBIENT', accent: 'PURPLE' },
      upi_id: null,
      upi_name: null,
    });
  });

  it('keeps a verified pin for an in-person event', () => {
    const input = toEventInput(validValues({ place_id: 'place-1', lat: 28.59, lng: 77.21 }));
    expect(input).toMatchObject({ place_id: 'place-1', lat: 28.59, lng: 77.21 });
  });

  it('drops the pin when the event is online', () => {
    const input = toEventInput(validValues({ location_type: 'VIRTUAL', virtual_link: 'https://meet.example/abc', place_id: 'place-1', lat: 28.59, lng: 77.21 }));
    expect(input).toMatchObject({ place_id: null, lat: null, lng: null, virtual_link: 'https://meet.example/abc' });
  });

  it('drops a half pin (no longitude) rather than sending a wrong point', () => {
    const input = toEventInput(validValues({ place_id: 'place-1', lat: 28.59, lng: null }));
    expect(input).toMatchObject({ place_id: null, lat: null, lng: null });
  });

  it('sends a pin without a place id as coordinates only', () => {
    const input = toEventInput(validValues({ place_id: '', lat: 0, lng: 0 }));
    expect(input).toMatchObject({ place_id: null, lat: 0, lng: 0 });
  });

  it('turns ticket boxes into numbers and leaves new tickets without an id', () => {
    const input = toEventInput(
      validValues({
        capacity: '80',
        tickets: [ticket({ id: 'tk-1', name: 'Early bird', price: '250', quantity: '40', description: 'Before Friday' }), ticket({ name: 'Door', price: '0', quantity: '', is_active: false })],
      }),
    );
    expect(input.capacity).toBe(80);
    expect(input.tickets).toEqual([
      { id: 'tk-1', name: 'Early bird', description: 'Before Friday', price: 250, quantity: 40, is_active: true },
      { id: undefined, name: 'Door', description: undefined, price: 0, quantity: null, is_active: false },
    ]);
  });

  it('sends options only for a choice question, split by line or comma', () => {
    const input = toEventInput(
      validValues({
        questions: [
          { id: 'q-1', label: 'Size', type: 'SELECT', required: true, options: 'S\nM, L' },
          { id: '', label: 'Anything else?', type: 'LONG_TEXT', required: false, options: 'ignored' },
        ],
      }),
    );
    expect(input.questions).toEqual([
      { id: 'q-1', label: 'Size', type: 'SELECT', required: true, options: ['S', 'M', 'L'] },
      { id: undefined, label: 'Anything else?', type: 'LONG_TEXT', required: false, options: [] },
    ]);
  });
});
