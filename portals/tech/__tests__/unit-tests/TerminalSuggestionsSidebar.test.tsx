import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { TerminalContext } from 'react-terminal';
import TerminalSuggestions from '../../src/pages/server/TerminalSuggestions/TerminalSuggestions';
import TerminalSuggestionRow from '../../src/pages/server/TerminalSuggestionRow';
import { TERMINAL_COMMAND_GROUPS } from '../../src/pages/server/terminal-commands';

const FIRST = TERMINAL_COMMAND_GROUPS[0].commands[0].command;
const ALL = TERMINAL_COMMAND_GROUPS.flatMap((g) => g.commands.map((c) => c.command));
// a command that FIRST is not a substring of, so a search for FIRST must hide it
const SECOND = ALL.find((c) => c !== FIRST && !c.includes(FIRST)) as string;

type Updater = (previous: ReactNode) => ReactNode;

const ctx = {
  appendCommandToHistory: vi.fn(),
  buffered: null as ReactNode,
  setBufferedContent: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  ctx.buffered = null;
  ctx.setBufferedContent.mockImplementation((next: Updater | ReactNode) => {
    ctx.buffered = typeof next === 'function' ? (next as Updater)(ctx.buffered) : next;
  });
});

afterEach(() => {
  vi.useRealTimers();
});

const mount = (onExec: (c: string) => Promise<string>) =>
  render(
    <TerminalContext.Provider
      value={
        {
          setBufferedContent: ctx.setBufferedContent,
          appendCommandToHistory: ctx.appendCommandToHistory,
        } as never
      }
    >
      <TerminalSuggestions onExec={onExec} />
    </TerminalContext.Provider>,
  );

const rowButton = (command: string) => screen.getByText(command).closest('[role="button"]') as HTMLElement;
const copyButton = (command: string) =>
  screen.getByText(command).closest('li')!.querySelector('button[aria-label]') as HTMLButtonElement;

describe('TerminalSuggestions', () => {
  it('lists every command group with its commands', () => {
    mount(vi.fn());
    expect(screen.getByText(FIRST)).toBeInTheDocument();
    expect(screen.getAllByRole('list').length).toBe(TERMINAL_COMMAND_GROUPS.length);
  });

  it('narrows the list by the search text, matching the command itself', () => {
    mount(vi.fn());
    fireEvent.change(screen.getByRole('textbox'), { target: { value: `  ${FIRST.toUpperCase()}  ` } });
    expect(screen.getByText(FIRST)).toBeInTheDocument();
    expect(screen.queryByText(SECOND)).toBeNull();
  });

  it('says nothing matched instead of an empty panel', () => {
    mount(vi.fn());
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'zzzz-no-such-command' } });
    expect(screen.queryByText(FIRST)).toBeNull();
    expect(screen.queryAllByRole('list')).toHaveLength(0);
  });

  it('runs a picked command, writing prompt and output into the terminal buffer and history', async () => {
    let finish: (text: string) => void = () => undefined;
    const onExec = vi.fn(() => new Promise<string>((resolve) => (finish = resolve)));
    mount(onExec);
    fireEvent.click(rowButton(FIRST));

    expect(ctx.appendCommandToHistory).toHaveBeenCalledWith(FIRST);
    expect(onExec).toHaveBeenCalledWith(FIRST);
    // while it runs, no other row may be started
    expect(rowButton(SECOND)).toHaveAttribute('aria-disabled', 'true');
    expect(rowButton(FIRST).querySelector('.MuiCircularProgress-root')).toBeInTheDocument();

    await act(async () => {
      finish('uid=0(root)');
    });
    expect(rowButton(SECOND)).not.toHaveAttribute('aria-disabled', 'true');
    expect(rowButton(FIRST).querySelector('.MuiCircularProgress-root')).toBeNull();
    const { container } = render(<>{ctx.buffered}</>);
    expect(container.textContent).toContain(`$ ${FIRST}`);
    expect(container.textContent).toContain('uid=0(root)');
  });

  it('frees the rows again when the executor itself rejects', async () => {
    const onExec = vi.fn().mockRejectedValue(new Error('socket closed'));
    mount(onExec);
    await act(async () => {
      fireEvent.click(rowButton(FIRST));
    });
    expect(rowButton(SECOND)).not.toHaveAttribute('aria-disabled', 'true');
  });

  describe('copy', () => {
    const writeText = vi.fn();
    beforeEach(() => {
      writeText.mockReset();
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    });

    it('copies the exact command, shows it as copied, then goes back', async () => {
      vi.useFakeTimers();
      writeText.mockResolvedValue(undefined);
      mount(vi.fn());
      const before = copyButton(FIRST).getAttribute('aria-label');
      await act(async () => {
        fireEvent.click(copyButton(FIRST));
      });
      expect(writeText).toHaveBeenCalledWith(FIRST);
      const during = copyButton(FIRST).getAttribute('aria-label');
      expect(during).not.toBe(before);
      expect(screen.getByTestId('DoneIcon')).toBeInTheDocument();
      await act(async () => {
        vi.advanceTimersByTime(1500);
      });
      expect(copyButton(FIRST).getAttribute('aria-label')).toBe(before);
      expect(screen.queryByTestId('DoneIcon')).toBeNull();
    });

    it('does not claim it copied when the clipboard refuses', async () => {
      writeText.mockRejectedValue(new Error('denied'));
      mount(vi.fn());
      await act(async () => {
        fireEvent.click(copyButton(FIRST));
      });
      expect(screen.queryByTestId('DoneIcon')).toBeNull();
    });
  });
});

describe('TerminalSuggestionRow', () => {
  const base = {
    command: 'ls /app',
    label: 'List app',
    description: 'Shows the app folder',
    running: false,
    disabled: false,
    copied: false,
    copyLabel: 'Copy command',
    copiedLabel: 'Copied!',
    onRun: vi.fn(),
    onCopy: vi.fn(),
  };

  it('shows the label, description and exact command, and runs or copies it on click', () => {
    const onRun = vi.fn();
    const onCopy = vi.fn();
    render(<TerminalSuggestionRow {...base} onRun={onRun} onCopy={onCopy} />);
    expect(screen.getByText('List app')).toBeInTheDocument();
    expect(screen.getByText('Shows the app folder')).toBeInTheDocument();
    fireEvent.click(screen.getByText('ls /app'));
    expect(onRun).toHaveBeenCalledWith('ls /app');
    fireEvent.click(screen.getByRole('button', { name: 'Copy command' }));
    expect(onCopy).toHaveBeenCalledWith('ls /app');
    expect(screen.getByTestId('ContentCopyIcon')).toBeInTheDocument();
  });

  it('shows the copied state with its own label', () => {
    render(<TerminalSuggestionRow {...base} copied />);
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument();
    expect(screen.getByTestId('DoneIcon')).toBeInTheDocument();
  });

  it('shows a spinner on the running row and disables the row when something else runs', () => {
    const { container, rerender } = render(<TerminalSuggestionRow {...base} running disabled />);
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
    expect(container.querySelector('[role="button"]')).toHaveAttribute('aria-disabled', 'true');
    rerender(<TerminalSuggestionRow {...base} />);
    expect(container.querySelector('.MuiCircularProgress-root')).toBeNull();
  });
});
