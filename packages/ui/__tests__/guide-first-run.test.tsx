import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useFirstRunTour } from '../src/guide/useFirstRunTour';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useFirstRunTour', () => {
  it('opens for a user who has never seen the tour, and marks it shown when closed as completed', () => {
    const { result } = renderHook(() => useFirstRunTour('finance.payouts', 'u-ravi'));
    expect(result.current.open).toBe(true);
    act(() => result.current.close(true));
    expect(result.current.open).toBe(false);
    expect(localStorage.getItem('duncit.tours.completed.u-ravi')).toBe('["finance.payouts"]');
  });

  it('does not open again for that user, and start() opens it on demand', () => {
    localStorage.setItem('duncit.tours.completed.u-ravi', '["finance.payouts"]');
    const { result } = renderHook(() => useFirstRunTour('finance.payouts', 'u-ravi'));
    expect(result.current.open).toBe(false);
    act(() => result.current.start());
    expect(result.current.open).toBe(true);
  });

  it('counts a skipped tour as shown, so it does not nag, and keeps the other tours in the list', () => {
    localStorage.setItem('duncit.tours.completed.u-ravi', '["home"]');
    const { result } = renderHook(() => useFirstRunTour('crm.leads', 'u-ravi'));
    expect(result.current.open).toBe(true);
    act(() => result.current.close(false));
    expect(result.current.open).toBe(false);
    expect(localStorage.getItem('duncit.tours.completed.u-ravi')).toBe('["home","crm.leads"]');
  });

  it('keeps one user from inheriting another: the key is per user, with a bucket for no user yet', () => {
    localStorage.setItem('duncit.tours.completed.u-ravi', '["finance.payouts"]');
    expect(renderHook(() => useFirstRunTour('finance.payouts', 'u-meera')).result.current.open).toBe(true);
    expect(renderHook(() => useFirstRunTour('finance.payouts', 'u-ravi')).result.current.open).toBe(false);

    const anonymous = renderHook(() => useFirstRunTour('finance.payouts', null));
    expect(anonymous.result.current.open).toBe(true);
    act(() => anonymous.result.current.close(true));
    expect(localStorage.getItem('duncit.tours.completed.anonymous')).toBe('["finance.payouts"]');
    expect(renderHook(() => useFirstRunTour('finance.payouts')).result.current.open).toBe(false);
  });

  it('treats unreadable storage as a first visit and a failed write as this visit only, without throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const { result } = renderHook(() => useFirstRunTour('finance.payouts', 'u-ravi'));
    expect(result.current.open).toBe(true);
    act(() => result.current.close(true));
    expect(result.current.open).toBe(false);
  });
});
