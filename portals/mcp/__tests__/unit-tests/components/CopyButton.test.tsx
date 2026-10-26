import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { stubClipboard } from '../../testkit';

const m = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notifySuccess: m.success,
  notifyError: m.error,
}));

import CopyButton from '../../../src/components/CopyButton';
import CodeBlock from '../../../src/components/CodeBlock';

afterEach(() => {
  m.success.mockReset();
  m.error.mockReset();
});

describe('CopyButton', () => {
  it('copies its text and says so with the message it was given', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    render(<CopyButton text="https://mcp.example.test/mcp" label="Copy the gateway URL" doneMessage="URL copied" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy the gateway URL' }));
    await waitFor(() => expect(m.success).toHaveBeenCalledWith('URL copied'));
    expect(writeText).toHaveBeenCalledWith('https://mcp.example.test/mcp');
    expect(m.error).not.toHaveBeenCalled();
  });

  it('falls back to the generic "Copied" when no message is given', async () => {
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    render(<CopyButton text="duncit" label="Copy the name" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy the name' }));
    await waitFor(() => expect(m.success).toHaveBeenCalledWith('Copied'));
  });

  it('tells the person to copy it themselves when the browser refuses', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('Document is not focused')));
    render(<CopyButton text="duncit" label="Copy the name" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy the name' }));
    await waitFor(() => expect(m.error).toHaveBeenCalledWith('Could not copy. Select the text and copy it yourself.'));
    expect(m.success).not.toHaveBeenCalled();
  });

  it('cannot be pressed while disabled', () => {
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    render(<CopyButton text="duncit" label="Copy the name" disabled />);
    expect(screen.getByRole('button', { name: 'Copy the name' })).toBeDisabled();
  });
});

describe('CodeBlock', () => {
  it('shows the text exactly as given, with a copy button only when it is named', () => {
    const { rerender } = render(<CodeBlock code={'{\n  "a": 1\n}'} copyLabel="Copy the settings" />);
    expect(screen.getByText(/"a": 1/).tagName).toBe('PRE');
    expect(screen.getByRole('button', { name: 'Copy the settings' })).toBeInTheDocument();
    rerender(<CodeBlock code="https://mcp.example.test/<console>/mcp" />);
    expect(screen.getByText('https://mcp.example.test/<console>/mcp')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
