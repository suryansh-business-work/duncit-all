import { describe, expect, it } from 'vitest';
import {
  EMPTY_GRIEVANCE_DRAFT,
  GRIEVANCE_FIELDS,
  GRIEVANCE_MAX_LENGTH,
  GRIEVANCE_OPTIONAL_FIELDS,
  GRIEVANCE_STATUSES,
  grievanceFieldLabelKey,
  grievanceSupportTicketOptions,
  isGrievanceFieldRequired,
  isGrievanceOpen,
  type GrievanceField,
} from '../src/grievance';

/** The limits the server's ticket schema enforces — the spec this module mirrors. */
const SERVER_MAX_LENGTH: Record<GrievanceField, number> = {
  support_ticket_ref: 60,
  name: 120,
  email: 200,
  phone: 30,
  address: 500,
  subject: 200,
  description: 5000,
};

describe('GRIEVANCE_FIELDS', () => {
  it('renders identity, then contact, then the complaint — the order every surface shows', () => {
    expect(GRIEVANCE_FIELDS).toEqual([
      'support_ticket_ref',
      'name',
      'email',
      'phone',
      'address',
      'subject',
      'description',
    ]);
  });
});

describe('GRIEVANCE_MAX_LENGTH', () => {
  // A limit that disagrees with the server is a field one surface accepts and
  // the server then rejects — so the numbers are asserted, not just their shape.
  it('mirrors the server ticket schema exactly', () => {
    expect(GRIEVANCE_MAX_LENGTH).toEqual(SERVER_MAX_LENGTH);
  });

  it('caps every form field with a positive whole number, and nothing off the form', () => {
    expect(new Set(Object.keys(GRIEVANCE_MAX_LENGTH))).toEqual(new Set(GRIEVANCE_FIELDS));
    for (const field of GRIEVANCE_FIELDS) {
      const max = GRIEVANCE_MAX_LENGTH[field];
      expect(Number.isInteger(max)).toBe(true);
      expect(max).toBeGreaterThan(0);
    }
  });

  it('gives the description the most room, since that is where the complaint goes', () => {
    const widest = Math.max(...Object.values(GRIEVANCE_MAX_LENGTH));
    expect(GRIEVANCE_MAX_LENGTH.description).toBe(widest);
  });
});

describe('GRIEVANCE_OPTIONAL_FIELDS', () => {
  // A grievance is answerable by email and phone; demanding a postal address
  // would turn a legally-required channel into an obstacle.
  it('makes address — itself a field on the form — the only optional one', () => {
    expect(GRIEVANCE_OPTIONAL_FIELDS).toEqual(['address']);
    expect(GRIEVANCE_FIELDS).toContain('address');
  });
});

describe('isGrievanceFieldRequired', () => {
  it('lets the address be left blank', () => {
    expect(isGrievanceFieldRequired('address')).toBe(false);
  });

  it('requires every other field', () => {
    expect(GRIEVANCE_FIELDS.filter(isGrievanceFieldRequired)).toEqual([
      'support_ticket_ref',
      'name',
      'email',
      'phone',
      'subject',
      'description',
    ]);
  });

  // The predicate and the published list are two views of ONE split: a surface
  // that reads the list and one that calls the predicate must never disagree.
  it('marks optional exactly the fields the published optional list names', () => {
    const optional = GRIEVANCE_FIELDS.filter((field) => !isGrievanceFieldRequired(field));
    expect(optional).toEqual(GRIEVANCE_OPTIONAL_FIELDS);
    expect(optional).toEqual(['address']);
  });
});

describe('grievanceFieldLabelKey', () => {
  // These are the keys GRIEVANCE_BUNDLE ships under `grievance.field` in
  // @duncit/i18n; a key that drifts renders the raw key as the field's label.
  it('names each label by the key the shared grievance bundle ships, one per field', () => {
    expect(GRIEVANCE_FIELDS.map(grievanceFieldLabelKey)).toEqual([
      'grievance.field.support_ticket_ref',
      'grievance.field.name',
      'grievance.field.email',
      'grievance.field.phone',
      'grievance.field.address',
      'grievance.field.subject',
      'grievance.field.description',
    ]);
  });
});

describe('EMPTY_GRIEVANCE_DRAFT', () => {
  it('starts every field blank', () => {
    for (const field of GRIEVANCE_FIELDS) {
      expect(EMPTY_GRIEVANCE_DRAFT[field]).toBe('');
    }
  });

  it('carries exactly the form fields and nothing else', () => {
    expect(new Set(Object.keys(EMPTY_GRIEVANCE_DRAFT))).toEqual(new Set(GRIEVANCE_FIELDS));
  });
});

describe('GRIEVANCE_STATUSES', () => {
  // The same four states the server stores, in redressal order, so a client
  // never invents a fifth.
  it('lists the four server states in redressal order', () => {
    expect(GRIEVANCE_STATUSES).toEqual(['RECEIVED', 'IN_REVIEW', 'RESOLVED', 'REJECTED']);
  });
});

describe('isGrievanceOpen', () => {
  it('keeps the redressal clock running while a grievance is received or in review', () => {
    expect(isGrievanceOpen('RECEIVED')).toBe(true);
    expect(isGrievanceOpen('IN_REVIEW')).toBe(true);
  });

  it('stops the clock once a grievance is resolved or rejected', () => {
    expect(isGrievanceOpen('RESOLVED')).toBe(false);
    expect(isGrievanceOpen('REJECTED')).toBe(false);
  });
});

describe('grievanceSupportTicketOptions', () => {
  it('labels each ticket with its number and title, which is how the officer finds it', () => {
    const rows = [
      { ticket_no: 'ST-A1B2C3', title: 'Refund not received' },
      { ticket_no: 'ST-D4E5F6', title: 'Host did not mark attendance' },
    ];

    expect(grievanceSupportTicketOptions(rows)).toEqual([
      { value: 'ST-A1B2C3', label: 'ST-A1B2C3 · Refund not received' },
      { value: 'ST-D4E5F6', label: 'ST-D4E5F6 · Host did not mark attendance' },
    ]);
  });

  it('falls back to the number alone for a ticket with no title', () => {
    expect(grievanceSupportTicketOptions([{ ticket_no: 'ST-A1B2C3', title: '   ' }])).toEqual([
      { value: 'ST-A1B2C3', label: 'ST-A1B2C3' },
    ]);
  });

  // An option storing an empty reference is the same as not choosing one, and
  // the whole point of the field is the ticket behind it.
  it('drops a row with no ticket number rather than offering a blank option', () => {
    const rows = [
      { ticket_no: '', title: 'Refund not received' },
      { ticket_no: '   ', title: 'Another' },
      { ticket_no: 'ST-A1B2C3', title: 'Kept' },
    ];

    expect(grievanceSupportTicketOptions(rows)).toEqual([
      { value: 'ST-A1B2C3', label: 'ST-A1B2C3 · Kept' },
    ]);
  });

  it('trims the stored reference, so a pasted number still matches the ticket', () => {
    expect(grievanceSupportTicketOptions([{ ticket_no: '  ST-A1B2C3  ', title: '  Refund  ' }])).toEqual([
      { value: 'ST-A1B2C3', label: 'ST-A1B2C3 · Refund' },
    ]);
  });

  it('offers nothing to a user with no support history', () => {
    expect(grievanceSupportTicketOptions([])).toEqual([]);
  });
});
