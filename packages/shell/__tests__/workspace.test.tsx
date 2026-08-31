/**
 * The console taskbar, the desk behind it and the Agent's docked tab.
 *
 * These are chrome every portal gets from mounting the shell, so the things
 * worth proving are the ones a portal cannot see for itself: that a window
 * announces itself to the bar and disappears from it when it closes, that
 * minimising takes it off the page rather than leaving a strip behind, and that
 * dragging the Agent tab commits a position while a plain click does not.
 *
 * Deliberately mounted with NO mocked answers: the arrangement is a preference,
 * and the whole of it has to work before the server has said anything — which is
 * also the state every console is in for the first paint after a reload.
 */
import type { ReactNode } from 'react';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import FloatingWindow from '../src/floating-window';
import { AgentDockTab } from '../src/chrome/agent/AgentDockTab';
import { Taskbar } from '../src/workspace/Taskbar';
import { WorkspaceProvider } from '../src/workspace/WorkspaceProvider';
import { useWorkspace, type WorkspaceWindow } from '../src/workspace/context';
import { deviceTimeZone, supportedTimeZones, withSeconds } from '../src/workspace/clock';

const testTheme = createTheme();

/**
 * jsdom has no PointerEvent, and Testing Library then falls back to a bare
 * Event — which carries no clientX/clientY, so every drag reads NaN and looks
 * like a press that never moved. A MouseEvent with a pointerId on it is the
 * whole of what the dock hook uses.
 */
class TestPointerEvent extends MouseEvent {
  readonly pointerId: number;

  constructor(type: string, init: MouseEventInit & { pointerId?: number } = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
  }
}

beforeAll(() => {
  globalThis.PointerEvent ??= TestPointerEvent as unknown as typeof PointerEvent;
});

vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const wrap = (ui: ReactNode, enabled = true) => (
  <MockedProvider mockLinkDefaultOptions={{ delay: 0 }}>
    <ThemeProvider theme={testTheme}>
      <WorkspaceProvider enabled={enabled}>{ui}</WorkspaceProvider>
    </ThemeProvider>
  </MockedProvider>
);

const mount = (ui: ReactNode, enabled = true) => render(wrap(ui, enabled));

/** Let the workspace query settle before asserting on what it produced. */
const settle = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

/** Registers one window on demand, so a test can drive `register()` directly
 * rather than through a real window's own mount/update cycle. */
function RegisterProbe({ window }: Readonly<{ window: WorkspaceWindow }>) {
  const workspace = useWorkspace();
  return (
    <>
      <button onClick={() => workspace?.register(window)}>register</button>
      <div data-testid="count">{workspace?.windows.length ?? 0}</div>
      <div data-testid="title">{workspace?.windows[0]?.title ?? ''}</div>
    </>
  );
}

describe('the workspace window registry', () => {
  it('leaves the list alone when the same window registers again with identical details, and updates it when details change', async () => {
    mount(<RegisterProbe window={{ id: 'w1', title: 'One', subtitle: 'Sub', icon: 'CALL' }} />);
    await settle();

    fireEvent.click(screen.getByText('register'));
    await settle();
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('title')).toHaveTextContent('One');

    // Registering the exact same details again must not disturb the entry.
    fireEvent.click(screen.getByText('register'));
    await settle();
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('title')).toHaveTextContent('One');
  });

  it('updates an existing entry in place when a re-registration changes its details', async () => {
    const { rerender } = mount(<RegisterProbe window={{ id: 'w1', title: 'One', subtitle: 'Sub', icon: 'CALL' }} />);
    await settle();
    fireEvent.click(screen.getByText('register'));
    await settle();

    rerender(wrap(<RegisterProbe window={{ id: 'w1', title: 'Two', subtitle: 'Sub', icon: 'CALL' }} />));
    fireEvent.click(screen.getByText('register'));
    await settle();

    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('title')).toHaveTextContent('Two');
  });
});

describe('the clock helpers', () => {
  it('puts seconds where the minutes are, not on the end', () => {
    expect(withSeconds('hh:mm a')).toBe('hh:mm:ss a');
    expect(withSeconds('HH:mm')).toBe('HH:mm:ss');
  });

  it('leaves a pattern that already counts seconds alone', () => {
    expect(withSeconds('HH:mm:ss')).toBe('HH:mm:ss');
  });

  it('leaves a pattern with no minutes in it alone', () => {
    expect(withSeconds('h a')).toBe('h a');
  });

  it('answers with the zones the engine knows and the one it is set to', () => {
    expect(Array.isArray(supportedTimeZones())).toBe(true);
    expect(typeof deviceTimeZone()).toBe('string');
  });
});

describe('the taskbar', () => {
  it('shows the clock, and nothing on the left until something is running', async () => {
    mount(<Taskbar />);
    await settle();

    expect(screen.getByLabelText('Taskbar')).toBeInTheDocument();
    expect(screen.getByLabelText('Date and time')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Minimise / })).not.toBeInTheDocument();
  });

  it('opens the tray, where the zone and the seconds are set', async () => {
    mount(<Taskbar />);
    await settle();

    fireEvent.click(screen.getByLabelText('Date and time'));
    await settle();

    expect(screen.getByLabelText('Time zone')).toBeInTheDocument();
    const seconds = screen.getByLabelText('Count seconds');
    fireEvent.click(seconds);
    await settle();
    expect(seconds).toBeChecked();
  });
});

describe('a window on the taskbar', () => {
  const openWindow = (onClose = vi.fn()) => (
    <>
      <FloatingWindow
        id="demo"
        open
        title="Call with Asha Rao"
        subtitle="On a call"
        icon="CALL"
        initial={{ x: 40, y: 40, width: 400, height: 300 }}
        onClose={onClose}
      >
        <div>the call</div>
      </FloatingWindow>
      <Taskbar />
    </>
  );

  it('names itself on the bar by title alone, for a window with no subtitle', async () => {
    mount(
      <>
        <FloatingWindow
          id="demo-plain"
          open
          title="A window with no subtitle"
          icon="WINDOW"
          initial={{ x: 40, y: 40, width: 400, height: 300 }}
          onClose={vi.fn()}
        >
          <div>plain content</div>
        </FloatingWindow>
        <Taskbar />
      </>,
    );
    await settle();

    expect(screen.getByRole('button', { name: /Minimise A window with no subtitle/ })).toBeInTheDocument();
  });

  it('announces itself to the bar while it is open', async () => {
    mount(openWindow());
    await settle();

    expect(screen.getByRole('button', { name: 'Minimise Call with Asha Rao' })).toBeInTheDocument();
    expect(screen.getByText('the call')).toBeInTheDocument();
  });

  it('leaves the page entirely when minimised, and comes back from the bar', async () => {
    mount(openWindow());
    await settle();

    fireEvent.click(screen.getByRole('button', { name: 'Minimise Call with Asha Rao' }));
    await settle();
    // Not rolled up to a strip — off the page, with only the bar button left.
    expect(screen.queryByText('the call')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restore Call with Asha Rao' }));
    await settle();
    expect(screen.getByText('the call')).toBeInTheDocument();
  });

  it('rolls up to its own title bar when there is no taskbar to go to', async () => {
    render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }}>
        <ThemeProvider theme={testTheme}>
          <FloatingWindow
            id="loose"
            open
            title="A window with no desk"
            initial={{ x: 10, y: 10, width: 380, height: 260 }}
            onClose={vi.fn()}
          >
            <div>the body</div>
          </FloatingWindow>
        </ThemeProvider>
      </MockedProvider>
    );
    await settle();

    fireEvent.click(screen.getByLabelText('Minimise this window'));
    await settle();
    expect(screen.queryByText('the body')).not.toBeInTheDocument();
    expect(screen.getByText('Still running — this window is minimised.')).toBeInTheDocument();
  });

  it('drops off the bar when it closes', async () => {
    const { rerender } = mount(openWindow());
    await settle();
    expect(screen.getByRole('button', { name: 'Minimise Call with Asha Rao' })).toBeInTheDocument();

    rerender(wrap(<Taskbar />));
    await settle();
    expect(screen.queryByRole('button', { name: /Call with Asha Rao/ })).not.toBeInTheDocument();
  });
});

describe('the Agent tab', () => {
  const at = (x: number, y: number) => ({ clientX: x, clientY: y, pointerId: 1 });
  /** `sx` compiles to a class, so the position is only readable computed. */
  const box = (el: Element) => {
    const style = globalThis.getComputedStyle(el);
    return { top: style.top, left: style.left, right: style.right };
  };

  it('opens the Agent on a press that never moved', async () => {
    const onOpen = vi.fn();
    mount(<AgentDockTab onOpen={onOpen} />);
    await settle();

    const tab = screen.getByRole('button', { name: 'Open Agent' });
    fireEvent.pointerDown(tab, at(1000, 300));
    fireEvent.pointerUp(tab, at(1000, 300));
    fireEvent.click(tab);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('moves down its edge, and crosses to the other one', async () => {
    mount(<AgentDockTab onOpen={vi.fn()} />);
    await settle();

    const tab = screen.getByRole('button', { name: 'Open Agent' });
    const before = box(tab).top;
    fireEvent.pointerDown(tab, at(1000, 100));
    fireEvent.pointerMove(tab, at(1000, 600));
    fireEvent.pointerUp(tab, at(1000, 600));
    await settle();
    expect(box(tab).top).not.toBe(before);
    expect(box(tab).right).toBe('0px');

    fireEvent.pointerDown(tab, at(1000, 600));
    fireEvent.pointerMove(tab, at(20, 200));
    fireEvent.pointerUp(tab, at(20, 200));
    await settle();
    expect(box(tab).left).toBe('0px');
  });
});
