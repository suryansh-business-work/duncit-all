import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import {
  clearViewport,
  loadViewport,
  saveViewport,
  useRegionView,
} from '../../../../src/pages/region-structure/useRegionView';

const DIRECTION_KEY = 'regional_canvas_direction';
const VIEWPORT_KEY = 'regional_canvas_viewport';

/** A router opened at `entry`, so the hook reads a real address bar. */
const routerAt = (entry: string) =>
  function RouterAt({ children }: Readonly<{ children: ReactNode }>) {
    return <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>;
  };

const renderView = (entry = '/') =>
  renderHook(() => ({ view: useRegionView(), location: useLocation() }), { wrapper: routerAt(entry) });

/** Storage as a browser set to block site data exposes it: every call throws. */
const blockStorage = () =>
  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw new Error('SecurityError');
    },
    setItem: () => {
      throw new Error('SecurityError');
    },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useRegionView — orientation', () => {
  it('runs left to right when neither the link nor this browser says otherwise', () => {
    const { result } = renderView();
    expect(result.current.view.direction).toBe('LR');
    expect(result.current.view.search).toBe('');
  });

  it('remembers the orientation this browser last chose', () => {
    localStorage.setItem(DIRECTION_KEY, 'TB');
    expect(renderView().result.current.view.direction).toBe('TB');
  });

  it('lets a pasted link win over the remembered orientation', () => {
    localStorage.setItem(DIRECTION_KEY, 'LR');
    expect(renderView('/?dir=TB').result.current.view.direction).toBe('TB');
  });

  it('ignores an orientation it does not know, in the link or in storage', () => {
    localStorage.setItem(DIRECTION_KEY, 'sideways');
    expect(renderView('/?dir=diagonal').result.current.view.direction).toBe('LR');
  });

  it('writes a new orientation to both the address and this browser', () => {
    const { result } = renderView('/?q=asha');
    act(() => result.current.view.setDirection('TB'));

    expect(result.current.view.direction).toBe('TB');
    expect(result.current.location.search).toBe('?q=asha&dir=TB');
    expect(localStorage.getItem(DIRECTION_KEY)).toBe('TB');
  });

  it('still switches orientation when the browser blocks storage', () => {
    blockStorage();
    const { result } = renderView();
    expect(result.current.view.direction).toBe('LR');

    act(() => result.current.view.setDirection('TB'));
    expect(result.current.view.direction).toBe('TB');
  });
});

describe('useRegionView — search', () => {
  it('reads the search from the link', () => {
    expect(renderView('/?q=Koramangala').result.current.view.search).toBe('Koramangala');
  });

  it('puts a search in the address and takes it out again when cleared', () => {
    const { result } = renderView('/?dir=TB');
    act(() => result.current.view.setSearch('rohan'));
    expect(result.current.view.search).toBe('rohan');
    expect(result.current.location.search).toBe('?dir=TB&q=rohan');

    act(() => result.current.view.setSearch(''));
    expect(result.current.view.search).toBe('');
    expect(result.current.location.search).toBe('?dir=TB');
  });
});

describe('saved viewport', () => {
  it('has nothing saved at first', () => {
    expect(loadViewport()).toBeNull();
  });

  it('round-trips the pan and zoom a manager left behind', () => {
    saveViewport({ x: -240, y: 80, zoom: 0.75 });
    expect(localStorage.getItem(VIEWPORT_KEY)).toBe('{"x":-240,"y":80,"zoom":0.75}');
    expect(loadViewport()).toEqual({ x: -240, y: 80, zoom: 0.75 });
  });

  it('forgets the viewport on reset', () => {
    saveViewport({ x: 1, y: 2, zoom: 1 });
    clearViewport();
    expect(loadViewport()).toBeNull();
  });

  it.each([
    ['not JSON at all', '{x:1'],
    ['no x', '{"y":2,"zoom":1}'],
    ['no y', '{"x":1,"zoom":1}'],
    ['no zoom', '{"x":1,"y":2}'],
  ])('reads a damaged saved viewport (%s) as none', (_case, stored) => {
    localStorage.setItem(VIEWPORT_KEY, stored);
    expect(loadViewport()).toBeNull();
  });

  it('reads as no saved view, and saves nothing, when the browser blocks storage', () => {
    blockStorage();
    expect(loadViewport()).toBeNull();
    expect(() => saveViewport({ x: 1, y: 2, zoom: 1 })).not.toThrow();
  });
});
