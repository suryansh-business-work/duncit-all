import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearColumnVisibility,
  loadColumnVisibility,
  loadDensity,
  saveColumnVisibility,
  saveDensity,
} from '../src/persistence';
import { useTablePrefs } from '../src/useTablePrefs';

describe('persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('round-trips column visibility', () => {
    saveColumnVisibility('t1', { name: true, email: false });
    expect(loadColumnVisibility('t1')).toEqual({ name: true, email: false });
    expect(loadColumnVisibility('other')).toBeNull();
  });

  it('returns null for corrupt JSON and drops non-boolean entries', () => {
    window.localStorage.setItem('duncit-table-cols:t1', '{not json');
    expect(loadColumnVisibility('t1')).toBeNull();
    window.localStorage.setItem('duncit-table-cols:t2', '[true]');
    expect(loadColumnVisibility('t2')).toBeNull();
    window.localStorage.setItem('duncit-table-cols:t3', '{"a":true,"b":"yes"}');
    expect(loadColumnVisibility('t3')).toEqual({ a: true });
  });

  it('clearColumnVisibility removes the saved entry', () => {
    saveColumnVisibility('t1', { name: true });
    clearColumnVisibility('t1');
    expect(loadColumnVisibility('t1')).toBeNull();
  });

  it('round-trips density and rejects unknown values', () => {
    saveDensity('t1', 'compact');
    expect(loadDensity('t1')).toBe('compact');
    window.localStorage.setItem('duncit-table-density:t2', 'huge');
    expect(loadDensity('t2')).toBeNull();
  });
});

describe('useTablePrefs', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('toggles + persists column overrides and resets them', () => {
    const { result } = renderHook(() => useTablePrefs('t1'));
    expect(result.current.hiddenOverrides).toEqual({});

    act(() => {
      result.current.toggleColumn('email', false);
    });
    expect(result.current.hiddenOverrides).toEqual({ email: true });
    expect(loadColumnVisibility('t1')).toEqual({ email: true });

    act(() => {
      result.current.resetColumns();
    });
    expect(result.current.hiddenOverrides).toEqual({});
    expect(loadColumnVisibility('t1')).toBeNull();
  });

  it('loads saved overrides on mount', () => {
    saveColumnVisibility('t1', { name: true });
    const { result } = renderHook(() => useTablePrefs('t1'));
    expect(result.current.hiddenOverrides).toEqual({ name: true });
  });

  it('toggles + persists density', () => {
    const { result } = renderHook(() => useTablePrefs('t1'));
    expect(result.current.density).toBe('standard');
    act(() => {
      result.current.toggleDensity();
    });
    expect(result.current.density).toBe('compact');
    expect(loadDensity('t1')).toBe('compact');
    act(() => {
      result.current.toggleDensity();
    });
    expect(result.current.density).toBe('standard');
  });
});
