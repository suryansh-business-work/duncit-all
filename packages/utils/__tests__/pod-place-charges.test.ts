import { describe, expect, it } from 'vitest';
import { placeChargesTicketDraft, placeChargesTotal } from '../src/pod-place-charges';

describe('placeChargesTotal', () => {
  it('adds every listed amount', () => {
    expect(
      placeChargesTotal([
        { label: 'Entry', amount: 200 },
        { label: 'Table', amount: 350, note: 'Per table of 4' },
      ]),
    ).toBe(550);
  });

  it('is 0 for no charges at all', () => {
    expect(placeChargesTotal([])).toBe(0);
    expect(placeChargesTotal(null)).toBe(0);
    expect(placeChargesTotal(undefined)).toBe(0);
  });

  it('counts a non-numeric amount as 0 instead of turning the total into NaN', () => {
    expect(
      placeChargesTotal([
        { label: 'Entry', amount: Number.NaN },
        { label: 'Cover', amount: 100 },
      ]),
    ).toBe(100);
  });
});

describe('placeChargesTicketDraft', () => {
  const draft = placeChargesTicketDraft({
    podId: 'pod-1',
    podTitle: 'Sunday Board Games',
    currencySymbol: '₹',
    charges: [
      { label: 'Entry', amount: 200, note: '  Includes one drink ' },
      { label: 'Table', amount: 300, note: '   ' },
    ],
  });

  it('files a BOOKING ticket linked to the pod', () => {
    expect(draft.category).toBe('BOOKING');
    expect(draft.pod_id).toBe('pod-1');
    expect(draft.pod_title).toBe('Sunday Board Games');
    expect(draft.subject).toBe('Place charges look wrong — Sunday Board Games');
  });

  it('lists every charge as the member saw it, with the total', () => {
    const lines = draft.body_text.split('\n');
    expect(lines).toContain('Pod id: pod-1');
    expect(lines).toContain('- Entry: ₹200 (Includes one drink)');
    // A blank note adds nothing rather than an empty "()".
    expect(lines).toContain('- Table: ₹300');
    expect(lines).toContain('Total: ₹500');
  });

  it('writes a charge with no note and an unreadable amount as ₹0, without parentheses', () => {
    const lines = placeChargesTicketDraft({
      podId: 'pod-2',
      podTitle: 'Open Mic',
      currencySymbol: '₹',
      charges: [
        { label: 'Cover', amount: Number.NaN },
        { label: 'Entry', amount: 150, note: null },
      ],
    }).body_text.split('\n');
    expect(lines).toContain('- Cover: ₹0');
    expect(lines).toContain('- Entry: ₹150');
    expect(lines).toContain('Total: ₹150');
  });
});
