/**
 * How a reader has their console chrome arranged, kept on the server rather
 * than localStorage — the shell renders inside all seventeen portals, and
 * per-browser storage would mean per-origin, so a launcher dragged in admin
 * would still show up in the corner in finance.
 */
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import {
  DEFAULT_WORKSPACE,
  useWorkspaceState,
  type WorkspaceState,
} from '../src/workspace/useWorkspaceState';
import {
  SAVE_SHELL_WORKSPACE_STATE,
  SHELL_WORKSPACE_STATE,
  type ShellWorkspaceStateDto,
} from '../src/workspace/queries';

const DTO: ShellWorkspaceStateDto = {
  agent_edge: 'LEFT',
  agent_offset: 0.7,
  clock_zone: 'Asia/Kolkata',
  clock_seconds: true,
  minimised: ['staff-chat'],
  sidebar_collapsed: true,
};

const stateMock = (dto: ShellWorkspaceStateDto): MockedResponse =>
  ({
    request: { query: SHELL_WORKSPACE_STATE },
    result: { data: { shellWorkspaceState: dto } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  }) as MockedResponse;

const saveMock = (onSave?: (input: Record<string, unknown>) => void): MockedResponse =>
  ({
    request: { query: SAVE_SHELL_WORKSPACE_STATE },
    variableMatcher: (variables: { input: Record<string, unknown> }) => {
      onSave?.(variables.input);
      return true;
    },
    result: { data: { saveShellWorkspaceState: DTO } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  }) as MockedResponse;

const wrapper = (mocks: readonly MockedResponse[]) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <MockedProvider mocks={[...mocks]}>{children}</MockedProvider>;
  };

describe('useWorkspaceState', () => {
  it('applies the saved arrangement once it arrives, reading LEFT as LEFT', async () => {
    const { result } = renderHook(() => useWorkspaceState(true), {
      wrapper: wrapper([stateMock(DTO), saveMock()]),
    });

    expect(result.current.state).toEqual(DEFAULT_WORKSPACE);

    await waitFor(() =>
      expect(result.current.state).toEqual({
        agentEdge: 'LEFT',
        agentOffset: 0.7,
        clockZone: 'Asia/Kolkata',
        clockSeconds: true,
        minimised: ['staff-chat'],
        sidebarCollapsed: true,
      } satisfies WorkspaceState)
    );
  });

  it('reads anything other than LEFT as RIGHT', async () => {
    const { result } = renderHook(() => useWorkspaceState(true), {
      wrapper: wrapper([stateMock({ ...DTO, agent_edge: 'SOMETHING_ELSE' }), saveMock()]),
    });

    await waitFor(() => expect(result.current.state.agentEdge).toBe('RIGHT'));
  });

  it('does not re-apply the saved arrangement a second time, once loaded', async () => {
    const { result } = renderHook(() => useWorkspaceState(true), {
      wrapper: wrapper([stateMock(DTO), saveMock()]),
    });
    await waitFor(() => expect(result.current.state.agentEdge).toBe('LEFT'));

    act(() => {
      result.current.update({ agentEdge: 'RIGHT' });
    });
    expect(result.current.state.agentEdge).toBe('RIGHT');

    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });
    expect(result.current.state.agentEdge).toBe('RIGHT');
  });

  it('updates locally and saves only the changed field', async () => {
    const saved: Record<string, unknown>[] = [];
    const { result } = renderHook(() => useWorkspaceState(true), {
      wrapper: wrapper([stateMock(DTO), saveMock((input) => saved.push(input))]),
    });
    await waitFor(() => expect(result.current.state.agentEdge).toBe('LEFT'));

    act(() => {
      result.current.update({ agentOffset: 0.3 });
    });

    expect(result.current.state.agentOffset).toBe(0.3);
    await waitFor(() => expect(saved).toContainEqual({ agent_offset: 0.3 }));
  });

  it('updates local state without saving anything while saving is disabled', async () => {
    const saveFn = vi.fn();
    const { result } = renderHook(() => useWorkspaceState(false), {
      wrapper: wrapper([{ request: { query: SAVE_SHELL_WORKSPACE_STATE }, variableMatcher: () => { saveFn(); return true; }, result: { data: { saveShellWorkspaceState: DTO } } }]),
    });

    act(() => {
      result.current.update({ sidebarCollapsed: true });
    });

    expect(result.current.state.sidebarCollapsed).toBe(true);
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });
    expect(saveFn).not.toHaveBeenCalled();
  });

  it('swallows a save that fails, since nobody should watch a round trip to move a launcher', async () => {
    const mocks: MockedResponse[] = [
      stateMock(DTO),
      { request: { query: SAVE_SHELL_WORKSPACE_STATE }, variableMatcher: () => true, error: new Error('offline') },
    ];
    const { result } = renderHook(() => useWorkspaceState(true), { wrapper: wrapper(mocks) });
    await waitFor(() => expect(result.current.state.agentEdge).toBe('LEFT'));

    expect(() => {
      act(() => {
        result.current.update({ clockSeconds: false });
      });
    }).not.toThrow();

    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });
    expect(result.current.state.clockSeconds).toBe(false);
  });
});
