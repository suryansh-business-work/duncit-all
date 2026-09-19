import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDrillStack } from '../../../../src/pages/drill/useDrillStack';
import type { DrillLevel } from '../../../../src/pages/drill/levels';

const CLUBS: DrillLevel = { kind: 'CLUBS', id: 'u-admin-asha', label: 'Asha Rao' };
const CLUB_PODS: DrillLevel = { kind: 'CLUB_PODS', id: 'club-doc-1', label: 'Koramangala Runners' };
const HOST_PODS: DrillLevel = { kind: 'HOST_PODS', id: 'u-host-rohan', label: 'Rohan Mehta' };

describe('useDrillStack', () => {
  it('starts closed', () => {
    const { result } = renderHook(() => useDrillStack());
    expect(result.current.stack).toEqual([]);
  });

  it('goes a level deeper on push and back up on pop', () => {
    const { result } = renderHook(() => useDrillStack());
    act(() => result.current.open(CLUBS));
    act(() => result.current.push(CLUB_PODS));
    expect(result.current.stack).toEqual([CLUBS, CLUB_PODS]);

    act(() => result.current.pop());
    expect(result.current.stack).toEqual([CLUBS]);
  });

  it('starts a fresh stack on open, whatever was showing', () => {
    const { result } = renderHook(() => useDrillStack());
    act(() => result.current.open(CLUBS));
    act(() => result.current.push(CLUB_PODS));
    act(() => result.current.open(HOST_PODS));
    expect(result.current.stack).toEqual([HOST_PODS]);
  });

  it('empties the stack on close', () => {
    const { result } = renderHook(() => useDrillStack());
    act(() => result.current.open(HOST_PODS));
    act(() => result.current.close());
    expect(result.current.stack).toEqual([]);
  });
});
