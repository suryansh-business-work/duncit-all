/**
 * Putting the docked chat panel back the way it was left: reopening the
 * sidebar, reopening the conversation that was on screen, and saving whether
 * it is showing — each exactly once per arrival.
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePanelRestore } from '../src/staff-chat/usePanelRestore';
import type { Coworker, StaffThread } from '../src/staff-chat/queries';

const PEER: Coworker = { id: 'u-peer', name: 'Vikram N', email: '', photo: '', roles: [], phone: '', city: '' };

const baseOptions = () => ({
  ready: false,
  wasOpen: false,
  savedPeerId: null as string | null,
  open: false,
  peer: null as Coworker | null,
  threads: [] as StaffThread[],
  coworkers: [] as Coworker[],
  onRequestOpen: vi.fn(),
  onPeer: vi.fn(),
  onPanelOpen: vi.fn(),
});

describe('usePanelRestore — reopening the sidebar', () => {
  it('does nothing before the saved state is ready', () => {
    const options = { ...baseOptions(), wasOpen: true };
    renderHook((props) => usePanelRestore(props), { initialProps: options });

    expect(options.onRequestOpen).not.toHaveBeenCalled();
  });

  it('leaves it be when it was already open by the time the state arrived', () => {
    const options = { ...baseOptions(), ready: true, wasOpen: true, open: true };
    renderHook((props) => usePanelRestore(props), { initialProps: options });

    expect(options.onRequestOpen).not.toHaveBeenCalled();
  });

  it('reopens it once, and never again on a later render', () => {
    const options = { ...baseOptions(), ready: true, wasOpen: true, open: false };
    const { rerender } = renderHook((props) => usePanelRestore(props), { initialProps: options });
    expect(options.onRequestOpen).toHaveBeenCalledTimes(1);

    rerender({ ...options });
    expect(options.onRequestOpen).toHaveBeenCalledTimes(1);
  });
});

describe('usePanelRestore — reopening the conversation', () => {
  it('finds the saved peer in the open threads and reopens them', () => {
    const thread: StaffThread = { peer: PEER, last_text: 'hi', last_from_me: false, unread: 0 };
    const options = { ...baseOptions(), ready: true, savedPeerId: 'u-peer', threads: [thread] };
    renderHook((props) => usePanelRestore(props), { initialProps: options });

    expect(options.onPeer).toHaveBeenCalledWith(PEER);
  });

  it('falls back to the coworker directory when no thread has them yet', () => {
    const options = { ...baseOptions(), ready: true, savedPeerId: 'u-peer', coworkers: [PEER] };
    renderHook((props) => usePanelRestore(props), { initialProps: options });

    expect(options.onPeer).toHaveBeenCalledWith(PEER);
  });

  it('waits rather than giving up when the saved peer is nowhere yet', () => {
    const options = { ...baseOptions(), ready: true, savedPeerId: 'u-peer' };
    renderHook((props) => usePanelRestore(props), { initialProps: options });

    expect(options.onPeer).not.toHaveBeenCalled();
  });

  it('only spends its one attempt once the peer is actually found', () => {
    const options = { ...baseOptions(), ready: true, savedPeerId: 'u-peer' };
    const { rerender } = renderHook((props) => usePanelRestore(props), { initialProps: options });
    expect(options.onPeer).not.toHaveBeenCalled();

    rerender({ ...options, coworkers: [PEER] });
    expect(options.onPeer).toHaveBeenCalledTimes(1);

    rerender({ ...options, coworkers: [PEER], peer: PEER });
    expect(options.onPeer).toHaveBeenCalledTimes(1);
  });
});

describe('usePanelRestore — saving whether it is showing', () => {
  it('adopts the saved value on arrival without saving it straight back', () => {
    const options = { ...baseOptions(), ready: true, wasOpen: true, open: true };
    renderHook((props) => usePanelRestore(props), { initialProps: options });

    expect(options.onPanelOpen).not.toHaveBeenCalled();
  });

  it('saves only once the open state actually changes after arrival', () => {
    const options = { ...baseOptions(), ready: true, wasOpen: true, open: true };
    const { rerender } = renderHook((props) => usePanelRestore(props), { initialProps: options });
    expect(options.onPanelOpen).not.toHaveBeenCalled();

    rerender({ ...options, open: false });
    expect(options.onPanelOpen).toHaveBeenCalledWith(false);

    rerender({ ...options, open: false });
    expect(options.onPanelOpen).toHaveBeenCalledTimes(1);
  });

  it('re-checking on an unrelated prop change still saves nothing when open has not actually moved', () => {
    const options = { ...baseOptions(), ready: true, wasOpen: true, open: true };
    const { rerender } = renderHook((props) => usePanelRestore(props), { initialProps: options });
    expect(options.onPanelOpen).not.toHaveBeenCalled();

    // `wasOpen` flipping forces the effect to re-run even though `open` itself
    // has not changed — it must still find nothing worth saving.
    rerender({ ...options, wasOpen: false });
    expect(options.onPanelOpen).not.toHaveBeenCalled();
  });
});
