/**
 * Putting one window on the taskbar for as long as it is open — docked to a
 * real workspace it saves through the registry, undocked (a test, a
 * storybook, no shell around it) it falls back to local state.
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const workspaceState = vi.hoisted(() => ({
  value: null as null | {
    isMinimised: (id: string) => boolean;
    setMinimised: (id: string, value: boolean) => void;
    register: (window: unknown) => void;
    unregister: (id: string) => void;
  },
}));
vi.mock('../src/workspace/context', () => ({
  useWorkspace: () => workspaceState.value,
}));

import { useWorkspaceWindow } from '../src/workspace/useWorkspaceWindow';

describe('useWorkspaceWindow', () => {
  it('saves through the registry when a real workspace is there to save to', () => {
    workspaceState.value = {
      isMinimised: () => false,
      setMinimised: vi.fn(),
      register: vi.fn(),
      unregister: vi.fn(),
    };
    const { result } = renderHook(() => useWorkspaceWindow({ id: 'w1', title: 'Call', icon: 'CALL' }));

    expect(result.current.docked).toBe(true);
    act(() => result.current.minimise());

    expect(workspaceState.value.setMinimised).toHaveBeenCalledWith('w1', true);
  });

  it('falls back to local state with no workspace to save to', () => {
    workspaceState.value = null;
    const { result } = renderHook(() => useWorkspaceWindow({ id: 'w1', title: 'Call', icon: 'CALL' }));

    expect(result.current.docked).toBe(false);
    act(() => result.current.minimise());

    expect(result.current.minimised).toBe(true);
  });
});
