import { formatDate, formatDateTime } from '@/utils/date-format';

// `toDate` wraps `parseISO` in a try/catch as a defensive guard. For string
// input parseISO returns an Invalid Date rather than throwing, so the catch is
// unreachable in practice — we force a throw here to lock in the "→ empty
// string" contract and keep the fallback covered.
jest.mock('date-fns', () => {
  const actual = jest.requireActual('date-fns');
  return {
    ...actual,
    parseISO: (value: string) => {
      if (value === '__throw__') throw new Error('boom');
      return actual.parseISO(value);
    },
  };
});

describe('date-format defensive parse', () => {
  it('returns an empty string when parsing throws', () => {
    expect(formatDate('__throw__')).toBe('');
    expect(formatDateTime('__throw__')).toBe('');
  });
});
