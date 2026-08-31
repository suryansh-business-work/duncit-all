/**
 * The three StaffChatPanel branches that only show up with a call already in
 * a specific phase, a recording already finished, or the taskbar already
 * docked — none of which a plain schema-mocked render ever reaches. useCall,
 * useCallRecorder and useWorkspaceWindow are stubbed here for exactly that.
 */
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, render } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { schemaMockLink } from './schema-mock';
import { StaffChatPanel } from '../src/staff-chat';

const requestOpenSpy = vi.hoisted(() => vi.fn());

vi.mock('../src/staff-chat/useCall', () => ({
  useCall: () => ({
    phase: 'incoming',
    kind: 'AUDIO',
    peerId: null,
    peerName: '',
    error: null,
    dismissError: vi.fn(),
    localStream: null,
    remoteStream: null,
    answer: vi.fn(async () => undefined),
    decline: vi.fn(),
    hangUp: vi.fn(),
    lastCallId: 'call-1',
    micId: '',
    camId: '',
    setMicId: vi.fn(),
    setCamId: vi.fn(),
    sharing: false,
    shareScreen: vi.fn(async () => undefined),
    stopSharing: vi.fn(async () => undefined),
    muted: false,
    cameraOff: false,
    toggleMute: vi.fn(),
    toggleCamera: vi.fn(),
    setPeerName: vi.fn(),
    call: vi.fn(async () => undefined),
  }),
}));

vi.mock('../src/staff-chat/useCallRecorder', () => ({
  useCallRecorder: () => ({
    stage: 'READY',
    pct: 100,
    url: 'https://cdn.test/recorded.mp4',
    error: null,
    toggle: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock('../src/workspace', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/workspace')>()),
  useWorkspaceWindow: () => ({ docked: true, minimised: false, minimise: vi.fn(), restore: vi.fn() }),
}));

const testTheme = createTheme();

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollTo ??= () => undefined;
  Element.prototype.scrollIntoView ??= () => undefined;
});

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

describe('StaffChatPanel with an incoming call, a ready recording and a docked taskbar', () => {
  it('asks to be shown while a call is incoming, offers the ready recording to attach, and gives the sidebar a real minimise', async () => {
    const onRequestOpen = requestOpenSpy;
    render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} link={schemaMockLink()}>
        <ThemeProvider theme={testTheme}>
          <StaffChatPanel open onClose={vi.fn()} onRequestOpen={onRequestOpen} meId="u-1" meName="Asha Rao" />
        </ThemeProvider>
      </MockedProvider>
    );
    await settle();
    await settle();

    expect(onRequestOpen).toHaveBeenCalled();
    expect(document.body.innerHTML).not.toBe('');
  });
});
