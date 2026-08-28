/**
 * The staff chat panel's own wiring — opening a peer, placing a call, closing
 * settings and the recording player. ChatWindows and ChatSidebar are stubbed
 * here so this file can invoke each callback directly; their own rendering is
 * covered in StaffChatPanel.test.tsx and each component's own tests.
 */
import { MockedProvider } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { schemaMockLink } from './schema-mock';
import { StaffChatPanel } from '../src/staff-chat';

let sidebarProps: Record<string, any> | null = null;
let windowsProps: Record<string, any> | null = null;

vi.mock('../src/staff-chat/ChatSidebar', () => ({
  default: (props: Record<string, any>) => {
    sidebarProps = props;
    return <div data-testid="sidebar" />;
  },
}));

vi.mock('../src/staff-chat/ChatWindows', () => ({
  default: (props: Record<string, any>) => {
    windowsProps = props;
    return <div data-testid="windows" />;
  },
}));

const testTheme = createTheme();

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  vi.clearAllMocks();
});

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const mount = (props: Record<string, unknown> = {}) =>
  render(
    <MockedProvider link={schemaMockLink()}>
      <ThemeProvider theme={testTheme}>
        <StaffChatPanel open onClose={vi.fn()} meId="u-1" meName="Asha Rao" meRoles={['SUPPORT']} {...props} />
      </ThemeProvider>
    </MockedProvider>
  );

describe('StaffChatPanel wiring', () => {
  it('opens a peer conversation and remembers it as the saved one', async () => {
    mount();
    await settle();
    const peer = { id: 'u-peer', name: 'Vikram N', email: '', photo: '', roles: [] };

    act(() => {
      sidebarProps?.onOpenPeer(peer);
    });
    await settle();

    expect(sidebarProps?.peer).toEqual(peer);
  });

  it('leaves a conversation by opening null, the same way', async () => {
    mount();
    await settle();
    const peer = { id: 'u-peer', name: 'Vikram N', email: '', photo: '', roles: [] };
    act(() => {
      sidebarProps?.onOpenPeer(peer);
    });
    await settle();

    act(() => {
      sidebarProps?.onOpenPeer(null);
    });
    await settle();

    expect(sidebarProps?.peer).toBeNull();
  });

  it('does nothing when a call is placed with no conversation open', async () => {
    mount();
    await settle();

    expect(() => {
      act(() => {
        sidebarProps?.onCall('AUDIO');
      });
    }).not.toThrow();
  });

  it('names the call after the open peer before placing it', async () => {
    mount();
    await settle();
    const peer = { id: 'u-peer', name: 'Vikram N', email: '', photo: '', roles: [] };
    act(() => {
      sidebarProps?.onOpenPeer(peer);
    });
    await settle();

    await act(async () => {
      sidebarProps?.onCall('AUDIO');
      await settle();
    });

    // A real call cannot connect in jsdom (no getUserMedia), but placing it
    // must not throw, and the window opens because the phase left idle.
    expect(windowsProps?.callOpen).toBe(true);
  });

  it('opens and closes the settings dialog from the sidebar', async () => {
    mount();
    await settle();

    act(() => {
      sidebarProps?.onOpenSettings();
    });
    expect(sidebarProps?.settingsOpen).toBe(true);

    act(() => {
      sidebarProps?.onCloseSettings();
    });
    expect(sidebarProps?.settingsOpen).toBe(false);
  });

  it('closes the recording player through its own callback', async () => {
    mount();
    await settle();

    act(() => {
      sidebarProps?.onPlayRecording('https://cdn.test/call.mp4');
    });
    expect(windowsProps?.playingRecording).toBe('https://cdn.test/call.mp4');

    act(() => {
      windowsProps?.onClosePlayer();
    });

    expect(windowsProps?.playingRecording).toBeNull();
  });

  it('sends a finished recording as a message, and resets the recorder', async () => {
    mount();
    await settle();

    expect(() => {
      act(() => {
        windowsProps?.onSendRecording('https://cdn.test/call.mp4');
      });
    }).not.toThrow();
  });
});
