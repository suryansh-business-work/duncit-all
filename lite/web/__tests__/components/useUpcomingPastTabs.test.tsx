import { act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useUpcomingPastTabs } from '../../components/useUpcomingPastTabs';
import { renderHookWithProviders } from '../test-utils';

describe('useUpcomingPastTabs', () => {
  it('offers Upcoming then Past, each with its test id', () => {
    const { result } = renderHookWithProviders(() => useUpcomingPastTabs());
    expect(result.current.items.map((item) => [item.value, item.label, item.testId])).toEqual([
      ['upcoming', 'Upcoming', 'tab-upcoming'],
      ['past', 'Past', 'tab-past'],
    ]);
  });

  it('opens on Upcoming', () => {
    const { result } = renderHookWithProviders(() => useUpcomingPastTabs());
    expect(result.current.value).toBe('upcoming');
    expect(result.current.past).toBe(false);
  });

  it('opens on Past when the link says so', () => {
    const { result } = renderHookWithProviders(() => useUpcomingPastTabs(), { route: '/tickets?selectedtab=past' });
    expect(result.current.value).toBe('past');
    expect(result.current.past).toBe(true);
  });

  it('falls back to Upcoming for a tab it does not offer', () => {
    const { result } = renderHookWithProviders(() => useUpcomingPastTabs(), { route: '/tickets?selectedtab=archived' });
    expect(result.current.value).toBe('upcoming');
  });

  it('switches period when a tab is chosen', () => {
    const { result } = renderHookWithProviders(() => useUpcomingPastTabs());
    act(() => {
      result.current.onChange('past');
    });
    expect(result.current.past).toBe(true);
    act(() => {
      result.current.onChange('upcoming');
    });
    expect(result.current.past).toBe(false);
  });
});
