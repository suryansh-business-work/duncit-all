/**
 * Handing a prompt to an LLM (one button per platform, plus copy-ready
 * scripts), and the Quick View dialog a row menu opens.
 */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PlatformSend } from '../src/mui/shared/PlatformSend';
import { QuickViewDialog } from '../src/mui/QuickView';
import { MAX_PREFILL_CHARS } from '../src/share/platforms';
import { prompt, renderInPortal, settle } from './support/harness';
import { eventMocks } from './support/detail-fixtures';

const writeText = vi.fn<(text: string) => Promise<void>>();
const openWindow = vi.fn();
beforeEach(() => {
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: { writeText } });
  vi.stubGlobal('open', openWindow);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('PlatformSend', () => {
  it('opens each LLM with the prompt typed in, and reports the hand-off', async () => {
    const onEvent = vi.fn();
    renderInPortal(<PlatformSend text="Plan a picnic" onEvent={onEvent} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open in ChatGPT' }));
    await waitFor(() => expect(onEvent).toHaveBeenCalledWith('OPEN_IN_PLATFORM', 'CHATGPT'));
    const [url, target, features] = openWindow.mock.calls[0] as [string, string, string];
    expect(new URL(url).searchParams.get('q')).toBe('Plan a picnic');
    expect([target, features]).toEqual(['_blank', 'noopener,noreferrer']);
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByText(/too long to put in a link/)).toBeNull();
  });

  it('copies a prompt too long for a link first, then opens an empty chat — and says so up front', async () => {
    const onEvent = vi.fn();
    const long = 'x'.repeat(MAX_PREFILL_CHARS + 1);
    renderInPortal(<PlatformSend text={long} onEvent={onEvent} />);
    expect(screen.getByText(/too long to put in a link/)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Open in Claude' }));

    await waitFor(() => expect(openWindow).toHaveBeenCalledWith('https://claude.ai/new', '_blank', 'noopener,noreferrer'));
    expect(writeText).toHaveBeenCalledWith(long);
  });

  it('copies a console script and a bookmarklet, counting only copies that landed', async () => {
    const onEvent = vi.fn();
    renderInPortal(<PlatformSend text="Hi" onEvent={onEvent} />);
    fireEvent.click(screen.getByText('Copy-ready scripts'));

    fireEvent.click(screen.getByRole('button', { name: 'Copy Perplexity script' }));
    await waitFor(() => expect(onEvent).toHaveBeenCalledWith('COPY_SCRIPT', 'PERPLEXITY'));
    expect(writeText.mock.calls[0][0]).toContain('const text = "Hi";');

    fireEvent.click(screen.getByRole('button', { name: 'Copy Grok bookmarklet' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    expect(writeText.mock.calls[1][0].startsWith('javascript:')).toBe(true);

    writeText.mockRejectedValueOnce(new Error('blocked'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy Claude script' }));
    await settle();
    expect(onEvent).toHaveBeenCalledTimes(2);
  });

  it('keeps every button off while the prompt is incomplete', () => {
    renderInPortal(<PlatformSend text="Hi {{city}}" disabled onEvent={vi.fn()} />);

    const buttons = screen.getAllByRole('button').filter((button) => button.textContent?.startsWith('Open in'));
    expect(buttons).toHaveLength(4);
    expect(buttons.every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
  });
});

describe('QuickViewDialog', () => {
  const ROW = prompt();

  it('shows the prompt and its size, counts the view once, copies, and opens the details', async () => {
    const onOpenDetails = vi.fn();
    const onClose = vi.fn();
    const { rerender } = renderInPortal(<QuickViewDialog prompt={ROW} onClose={onClose} onOpenDetails={onOpenDetails} />, eventMocks(ROW.id));

    expect(screen.getByRole('dialog', { name: ROW.name })).toBeDefined();
    expect(screen.getByLabelText('Full prompt').textContent).toBe(ROW.content);
    expect(screen.getByText('≈ 42 tokens')).toBeDefined();

    rerender(<QuickViewDialog prompt={ROW} onClose={onClose} onOpenDetails={onOpenDetails} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy prompt' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(ROW.content));
    // A refused clipboard is said out loud and counts nothing.
    writeText.mockRejectedValueOnce(new Error('blocked'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy prompt' }));
    await settle();
    expect(writeText).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Open details' }));
    expect(onOpenDetails).toHaveBeenCalledWith(ROW);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when no prompt is chosen', () => {
    renderInPortal(<QuickViewDialog prompt={null} onClose={vi.fn()} onOpenDetails={vi.fn()} />);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });
});
