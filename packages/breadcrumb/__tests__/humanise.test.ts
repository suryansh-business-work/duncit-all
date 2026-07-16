import { describe, it, expect } from 'vitest';
import { humanise } from '../src/humanise';

describe('humanise', () => {
  it('prefers an explicit labelMap override', () => {
    expect(humanise('billing', { billing: 'Billing & Invoices' })).toBe('Billing & Invoices');
  });

  it('collapses a 24-char Mongo hex id to "Detail"', () => {
    expect(humanise('507f1f77bcf86cd799439011')).toBe('Detail');
  });

  it('collapses a uuid-like segment to "Detail"', () => {
    expect(humanise('0a1b2c3d-4e5f-6789-abcd-ef0123456789')).toBe('Detail');
  });

  it('title-cases and de-slugs an ordinary segment', () => {
    expect(humanise('annual-report_v2')).toBe('Annual Report V2');
  });

  it('falls through to title-casing when the labelMap has no entry', () => {
    expect(humanise('venue-leads', { other: 'X' })).toBe('Venue Leads');
  });
});
