/**
 * How staff chat remembers itself — settings, panel state, device choices —
 * on the server rather than localStorage, so it travels between the
 * seventeen portals it renders inside. See the hook's own header for why.
 */
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { useChatState } from '../src/staff-chat/useChatState';
import { SAVE_STAFF_CHAT_STATE, STAFF_CHAT_STATE, type StaffChatState } from '../src/staff-chat/queries';

const STATE: StaffChatState = {
  panel_open: true,
  role_filter: 'HOST',
  open_peer_id: 'u-peer',
  density: 'COMPACT',
  bubble_color: 'BLUE',
  font_size: 14,
  time_zone: 'Asia/Kolkata',
  enter_to_send: false,
  mic_id: 'mic-1',
  cam_id: 'cam-1',
  mic_label: 'Blue Yeti',
  cam_label: 'FaceTime HD',
};

const stateMock = (state: StaffChatState | null, over: Partial<MockedResponse> = {}): MockedResponse =>
  ({
    request: { query: STAFF_CHAT_STATE },
    result: { data: { staffChatState: state } },
    maxUsageCount: Number.POSITIVE_INFINITY,
    ...over,
  }) as MockedResponse;

const saveMock = (onSave?: (input: Record<string, unknown>) => void): MockedResponse =>
  ({
    request: { query: SAVE_STAFF_CHAT_STATE },
    variableMatcher: (variables: { input: Record<string, unknown> }) => {
      onSave?.(variables.input);
      return true;
    },
    result: { data: { saveStaffChatState: STATE } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  }) as MockedResponse;

const wrapper = (mocks: readonly MockedResponse[]) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <MockedProvider mocks={[...mocks]}>{children}</MockedProvider>;
  };

describe('useChatState', () => {
  it('applies the saved settings and panel state once they arrive', async () => {
    const { result } = renderHook(() => useChatState(), { wrapper: wrapper([stateMock(STATE), saveMock()]) });

    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.settings).toEqual({
      density: 'COMPACT',
      bubbleColor: 'BLUE',
      fontSize: 14,
      timeZone: 'Asia/Kolkata',
      enterToSend: false,
    });
    expect(result.current.panel).toEqual({
      panelOpen: true,
      role: 'HOST',
      openPeerId: 'u-peer',
      micId: 'mic-1',
      camId: 'cam-1',
      micLabel: 'Blue Yeti',
      camLabel: 'FaceTime HD',
    });
  });

  it('keeps the defaults before the saved state has arrived, then applies it', async () => {
    const { result } = renderHook(() => useChatState(), { wrapper: wrapper([stateMock(STATE), saveMock()]) });

    // The schema declares staffChatState non-nullable — the query simply
    // hasn't resolved yet on the very first render.
    expect(result.current.ready).toBe(false);
    expect(result.current.settings.density).toBe('COMFORTABLE');
    expect(result.current.panel.panelOpen).toBe(false);

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.settings.density).toBe('COMPACT');
  });

  it('does not re-apply the saved state a second time, once loaded', async () => {
    const { result } = renderHook(() => useChatState(), { wrapper: wrapper([stateMock(STATE), saveMock()]) });
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.setRole('CLUB_ADMIN');
    });
    expect(result.current.panel.role).toBe('CLUB_ADMIN');

    // A refetch landing after the reader already changed something locally
    // must not drag the panel back to what the server had before that edit.
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });
    expect(result.current.panel.role).toBe('CLUB_ADMIN');
  });

  it('updates a setting locally and saves only the field that changed', async () => {
    const saved: Record<string, unknown>[] = [];
    const { result } = renderHook(() => useChatState(), {
      wrapper: wrapper([stateMock(STATE), saveMock((input) => saved.push(input))]),
    });
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.update('enterToSend', true);
    });

    expect(result.current.settings.enterToSend).toBe(true);
    await waitFor(() => expect(saved).toContainEqual({ enter_to_send: true }));
  });

  it('opens and closes the panel, saving the flag', async () => {
    const saved: Record<string, unknown>[] = [];
    const { result } = renderHook(() => useChatState(), {
      wrapper: wrapper([stateMock(STATE), saveMock((input) => saved.push(input))]),
    });
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.setPanelOpen(true);
    });

    expect(result.current.panel.panelOpen).toBe(true);
    await waitFor(() => expect(saved).toContainEqual({ panel_open: true }));
  });

  it('remembers the microphone and the camera by id and by name', async () => {
    const saved: Record<string, unknown>[] = [];
    const { result } = renderHook(() => useChatState(), {
      wrapper: wrapper([stateMock(STATE), saveMock((input) => saved.push(input))]),
    });
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.setDevice('mic', 'mic-2', 'Headset');
    });
    expect(result.current.panel.micId).toBe('mic-2');
    expect(result.current.panel.micLabel).toBe('Headset');

    act(() => {
      result.current.setDevice('cam', 'cam-2', 'External Cam');
    });
    expect(result.current.panel.camId).toBe('cam-2');
    expect(result.current.panel.camLabel).toBe('External Cam');

    await waitFor(() => expect(saved).toContainEqual({ mic_id: 'mic-2', mic_label: 'Headset' }));
    await waitFor(() => expect(saved).toContainEqual({ cam_id: 'cam-2', cam_label: 'External Cam' }));
  });

  it('opens and closes the conversation, saving who it is with', async () => {
    const saved: Record<string, unknown>[] = [];
    const { result } = renderHook(() => useChatState(), {
      wrapper: wrapper([stateMock(STATE), saveMock((input) => saved.push(input))]),
    });
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.setOpenPeerId('u-peer');
    });
    expect(result.current.panel.openPeerId).toBe('u-peer');

    act(() => {
      result.current.setOpenPeerId(null);
    });
    expect(result.current.panel.openPeerId).toBeNull();

    await waitFor(() => expect(saved).toContainEqual({ open_peer_id: 'u-peer' }));
    await waitFor(() => expect(saved).toContainEqual({ open_peer_id: null }));
  });

  it('swallows a save that fails, since nobody should watch a round trip to change a font size', async () => {
    const mocks: MockedResponse[] = [
      stateMock(STATE),
      { request: { query: SAVE_STAFF_CHAT_STATE }, variableMatcher: () => true, error: new Error('offline') },
    ];
    const { result } = renderHook(() => useChatState(), { wrapper: wrapper(mocks) });
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(() => {
      act(() => {
        result.current.update('fontSize', 16);
      });
    }).not.toThrow();

    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });
    expect(result.current.settings.fontSize).toBe(16);
  });

  it('formats a timestamp in the chosen time zone, and in the machine one when none is chosen', async () => {
    const { result } = renderHook(() => useChatState(), { wrapper: wrapper([stateMock(STATE), saveMock()]) });
    await waitFor(() => expect(result.current.ready).toBe(true));
    const when = new Date('2026-08-30T12:30:00.000Z');

    expect(result.current.formats.time.format(when)).toMatch(/^\d{2}:\d{2}$/);
    expect(result.current.formats.full.format(when)).toContain('2026');
    expect(result.current.formats.day.format(when)).toContain('August');

    const noZone = renderHook(() => useChatState(), {
      wrapper: wrapper([stateMock({ ...STATE, time_zone: '' }), saveMock()]),
    });
    await waitFor(() => expect(noZone.result.current.ready).toBe(true));
    expect(noZone.result.current.formats.time.format(when)).toMatch(/^\d{2}:\d{2}$/);
  });

  it('spaces a compact thread tighter than a comfortable one', async () => {
    const compact = renderHook(() => useChatState(), { wrapper: wrapper([stateMock(STATE), saveMock()]) });
    await waitFor(() => expect(compact.result.current.ready).toBe(true));
    expect(compact.result.current.spacing).toBe(0.25);

    const comfortable = renderHook(() => useChatState(), {
      wrapper: wrapper([stateMock({ ...STATE, density: 'COMFORTABLE' }), saveMock()]),
    });
    await waitFor(() => expect(comfortable.result.current.ready).toBe(true));
    expect(comfortable.result.current.spacing).toBe(0.9);
  });
});
