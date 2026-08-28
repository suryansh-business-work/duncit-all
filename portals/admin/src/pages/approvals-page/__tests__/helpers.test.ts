import { describe, expect, it } from 'vitest';
import { humanizeType, STATUS_FILTERS } from '../helpers';

describe('humanizeType', () => {
  it('title-cases each underscore-separated word', () => {
    expect(humanizeType('PENDING_REVIEW')).toBe('Pending Review');
  });

  it('handles a single word', () => {
    expect(humanizeType('WITHDRAWAL')).toBe('Withdrawal');
  });

  it('handles already-lowercase input the same way', () => {
    expect(humanizeType('venue_change')).toBe('Venue Change');
  });

  it('returns an empty string for empty input', () => {
    expect(humanizeType('')).toBe('');
  });
});

describe('STATUS_FILTERS', () => {
  it('offers Pending, Approved, Denied and an All option in that order', () => {
    expect(STATUS_FILTERS).toEqual([
      { value: 'PENDING', label: 'Pending' },
      { value: 'APPROVED', label: 'Approved' },
      { value: 'DENIED', label: 'Denied' },
      { value: '', label: 'All' },
    ]);
  });
});
