import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const m = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('@apollo/client', async (io) => {
  const actual = await io<typeof import('@apollo/client')>();
  return { ...actual, useMutation: () => [m.mutate, { loading: false }] };
});
// react-terminal drives its `defaultHandler`; expose it via buttons so we can
// run commands (with and without args) and render the returned output node.
vi.mock('react-terminal', async () => {
  const React = await import('react');
  return {
    TerminalContextProvider: ({ children }: { children: unknown }) => children,
    ReactTerminal: ({
      defaultHandler,
    }: {
      defaultHandler: (c: string, a: string) => Promise<unknown>;
    }) => {
      const [out, setOut] = React.useState<unknown>(null);
      return React.createElement(
        'div',
        null,
        React.createElement(
          'button',
          { onClick: async () => setOut(await defaultHandler('ls', '-la')) },
          'run-with-args',
        ),
        React.createElement(
          'button',
          { onClick: async () => setOut(await defaultHandler('whoami', '')) },
          'run-no-args',
        ),
        React.createElement('div', { 'data-testid': 'term-out' }, out as never),
      );
    },
  };
});

import TerminalPage, { formatExecResult } from '../../src/pages/server/TerminalPage';

beforeEach(() => {
  m.mutate.mockReset();
});

describe('formatExecResult', () => {
  it('joins stdout, stderr and a non-zero exit marker', () => {
    expect(formatExecResult({ stdout: 'hi', stderr: 'warn', exitCode: 2 })).toBe(
      'hi\nwarn\n[exit 2]',
    );
  });

  it('shows only stdout for a clean success', () => {
    expect(formatExecResult({ stdout: 'ok', stderr: '', exitCode: 0 })).toBe('ok');
  });

  it('returns a placeholder for a missing result and for empty output', () => {
    expect(formatExecResult(undefined)).toBe('(no output)');
    expect(formatExecResult({ stdout: '', stderr: '', exitCode: 0 })).toBe('(no output)');
  });
});

describe('TerminalPage', () => {
  it('runs a command with arguments and shows the output', async () => {
    m.mutate.mockResolvedValue({
      data: { techExec: { stdout: 'file1\nfile2', stderr: '', exitCode: 0 } },
    });
    render(<TerminalPage />);
    fireEvent.click(screen.getByText('run-with-args'));
    await waitFor(() => expect(screen.getByTestId('term-out')).toHaveTextContent('file1'));
    expect(m.mutate).toHaveBeenCalledWith({ variables: { command: 'ls -la' } });
  });

  it('runs a command without arguments', async () => {
    m.mutate.mockResolvedValue({ data: { techExec: { stdout: 'root', stderr: '', exitCode: 0 } } });
    render(<TerminalPage />);
    fireEvent.click(screen.getByText('run-no-args'));
    await waitFor(() =>
      expect(m.mutate).toHaveBeenCalledWith({ variables: { command: 'whoami' } }),
    );
  });

  it('shows a placeholder when the mutation returns no data', async () => {
    m.mutate.mockResolvedValue({});
    render(<TerminalPage />);
    fireEvent.click(screen.getByText('run-with-args'));
    await waitFor(() => expect(screen.getByTestId('term-out')).toHaveTextContent('(no output)'));
  });

  it('shows the error message when the command throws', async () => {
    m.mutate.mockRejectedValue(new Error('exec failed'));
    render(<TerminalPage />);
    fireEvent.click(screen.getByText('run-with-args'));
    await waitFor(() => expect(screen.getByTestId('term-out')).toHaveTextContent('exec failed'));
  });

  it('shows a default message for a non-Error throw', async () => {
    m.mutate.mockRejectedValue('nope');
    render(<TerminalPage />);
    fireEvent.click(screen.getByText('run-no-args'));
    await waitFor(() => expect(screen.getByTestId('term-out')).toHaveTextContent('Command failed'));
  });
});
