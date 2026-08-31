import { MockedProvider } from '@apollo/client/testing/react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { TourProvider, useTours } from '../TourContext';

/** In-memory stand-in for localStorage, so a test never touches the real one. */
function makeStore(seed: Record<string, string> = {}) {
  const data = { ...seed };
  return {
    getItem: vi.fn((k: string) => data[k] ?? null),
    setItem: vi.fn((k: string, v: string) => {
      data[k] = v;
    }),
    data,
  };
}

const wrapper =
  (store: ReturnType<typeof makeStore>, userId = 'u1') =>
  ({ children }: { children: ReactNode }) => (
    <MockedProvider mocks={[]}>
      <TourProvider userId={userId} storage={store}>
        {children}
      </TourProvider>
    </MockedProvider>
  );

describe('TourProvider', () => {
  it('loads this user’s completions from storage', () => {
    const store = makeStore({ 'duncit.tours.completed.u1': JSON.stringify(['home']) });
    const { result } = renderHook(() => useTours(), { wrapper: wrapper(store) });
    expect(result.current.completed).toEqual(['home']);
  });

  it('reads another user’s bucket separately on the same device', () => {
    const store = makeStore({ 'duncit.tours.completed.u1': JSON.stringify(['home']) });
    const { result } = renderHook(() => useTours(), { wrapper: wrapper(store, 'u2') });
    expect(result.current.completed).toEqual([]);
  });

  it('survives storage that throws on read', () => {
    const store = {
      getItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      setItem: vi.fn(),
    };
    const { result } = renderHook(() => useTours(), { wrapper: wrapper(store as never) });
    expect(result.current.completed).toEqual([]);
  });

  it('starts a tour and finishing records + persists it under the user key', () => {
    const store = makeStore();
    const { result } = renderHook(() => useTours(), { wrapper: wrapper(store) });

    act(() => result.current.startTour('club'));
    expect(result.current.activeTourId).toBe('club');

    act(() => result.current.finishTour('club'));
    expect(result.current.activeTourId).toBeNull();
    expect(result.current.completed).toEqual(['club']);
    expect(store.setItem).toHaveBeenCalledWith(
      'duncit.tours.completed.u1',
      JSON.stringify(['club']),
    );
  });

  it('keeps the tour completed even when the write throws', () => {
    const store = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new Error('quota');
      }),
    };
    const { result } = renderHook(() => useTours(), { wrapper: wrapper(store as never) });
    act(() => result.current.finishTour('home'));
    expect(result.current.completed).toEqual(['home']);
  });

  it('auto-starts Home only for a first signup that has not seen it', () => {
    const store = makeStore();
    const { result } = renderHook(() => useTours(), { wrapper: wrapper(store) });
    act(() => result.current.maybeAutoStartHomeTour(false));
    expect(result.current.activeTourId).toBeNull();
    act(() => result.current.maybeAutoStartHomeTour(true));
    expect(result.current.activeTourId).toBe('home');
  });

  it('does not auto-start once Home is done', () => {
    const store = makeStore({ 'duncit.tours.completed.u1': JSON.stringify(['home']) });
    const { result } = renderHook(() => useTours(), { wrapper: wrapper(store) });
    act(() => result.current.maybeAutoStartHomeTour(true));
    expect(result.current.activeTourId).toBeNull();
  });

  it('refuses to work outside the provider rather than silently doing nothing', () => {
    // A no-op here would look like a content bug, not a wiring bug.
    expect(() => renderHook(() => useTours())).toThrow(/TourProvider/);
  });
});

describe('useTours consumer', () => {
  it('drives a tour from a component', () => {
    const store = makeStore();
    function Probe() {
      const { activeTourId, startTour } = useTours();
      return (
        <button type="button" onClick={() => startTour('profile')}>
          {activeTourId ?? 'idle'}
        </button>
      );
    }
    render(<Probe />, { wrapper: wrapper(store) });
    expect(screen.getByRole('button')).toHaveTextContent('idle');
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('profile');
  });
});
