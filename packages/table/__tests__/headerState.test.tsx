import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TableHeaderContext, useTableHeaderState, type TableHeaderState } from '../src/header/headerState';

describe('useTableHeaderState', () => {
  it('reads the sort and filters DuncitTable provides to its headers', () => {
    const state: TableHeaderState = {
      sortBy: 'pod_date_time',
      sortDir: 'desc',
      filters: [{ field: 'status', op: 'in', values: ['LIVE'] }],
      setFilters: vi.fn(),
    };
    const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
      <TableHeaderContext.Provider value={state}>{children}</TableHeaderContext.Provider>
    );
    const { result } = renderHook(() => useTableHeaderState(), { wrapper });
    expect(result.current).toBe(state);
  });

  it('fails loudly for a header rendered outside DuncitTable', () => {
    // React reports the render error to the console before rethrowing it.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(() => renderHook(() => useTableHeaderState())).toThrow(
        'useTableHeaderState: a column header rendered outside DuncitTable',
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
