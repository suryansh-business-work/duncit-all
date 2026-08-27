/**
 * The read-only column beside the editor, and the copyable feed URL bar: the
 * parts that make an edit safe to make — where a prompt runs, what it
 * substitutes, what the model receives, and the one-click repairs (copy a
 * placeholder byte-for-byte, copy the public URL).
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedUrlBar } from '../src/mui/FeedUrlBar';
import { PromptContext } from '../src/mui/PromptContext';
import { prompt } from './support/harness';

const FEED_URL = 'https://server.duncit.com/ai-prompts/prompts.json?kind=AI';

/** jsdom has no clipboard; stand one in and hand back the undo. */
const installClipboard = (writeText: ReturnType<typeof vi.fn>) => {
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  return () => {
    delete (globalThis.navigator as unknown as Record<string, unknown>).clipboard;
  };
};

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('PromptContext', () => {
  it('walks a code prompt: role hint, call site, placeholders and the substituted preview', () => {
    const row = prompt({
      usage: [{ file: 'server/src/modules/ai/ask-bot.ts', surface: 'Ask Bot', trigger: 'A member asks where a page is' }],
      variables: [
        ...prompt().variables,
        // An OPTIONAL placeholder renders as the quiet chip, without the marker.
        { name: 'tone', label: 'Tone', required: false, example: 'friendly', description: '' },
      ],
    });
    render(<PromptContext prompt={row} content={row.content} />);

    expect(screen.getByText('The standing instruction — identical on every call of this feature.')).toBeDefined();
    expect(screen.getByText('Ask Bot')).toBeDefined();
    expect(screen.getByText('server/src/modules/ai/ask-bot.ts')).toBeDefined();
    // The required placeholder chip, and the optional one beside it.
    expect(screen.getByText('{{navigation_map}}')).toBeDefined();
    expect(screen.getByText('The page catalogue')).toBeDefined();
    expect(screen.getByText('{{tone}}')).toBeDefined();
    expect(screen.getAllByText('· required')).toHaveLength(2);
    // The preview fills what has an example and leaves the rest as written.
    const preview = screen.getByTestId('prompt-preview').textContent ?? '';
    expect(preview).toContain('where do I add a venue?');
    expect(preview).toContain('{{navigation_map}}');
  });

  it('an AI prompt shows neither role hint nor call site, and says it takes no placeholders', () => {
    const row = prompt({ kind: 'AI', role: 'USER', variables: [], usage: [] });
    render(<PromptContext prompt={row} content="Write the Monday digest." />);

    expect(screen.queryByText('Where this runs')).toBeNull();
    expect(screen.getByText('This prompt takes no placeholders.')).toBeDefined();
  });

  it('a code prompt with no recorded call site still shows the section, saying so', () => {
    render(<PromptContext prompt={prompt({ usage: [] })} content="Use {{navigation_map}}." />);

    expect(screen.getByText('Where this runs')).toBeDefined();
    expect(screen.getByText('No call site recorded for this prompt.')).toBeDefined();
  });

  it('clicking a placeholder chip copies it byte-for-byte', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const restore = installClipboard(writeText);
    render(<PromptContext prompt={prompt()} content="Use {{navigation_map}}." />);

    fireEvent.click(screen.getByText('{{navigation_map}}'));
    await act(async () => Promise.resolve());

    expect(writeText).toHaveBeenCalledWith('{{navigation_map}}');
    restore();
  });

  it('a refused clipboard write is swallowed — the chip is a convenience, not a step', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    const restore = installClipboard(writeText);
    render(<PromptContext prompt={prompt()} content="Use {{navigation_map}}." />);

    fireEvent.click(screen.getByText('{{user_question}}'));
    await act(async () => Promise.resolve());

    expect(writeText).toHaveBeenCalledWith('{{user_question}}');
    restore();
  });
});

describe('FeedUrlBar', () => {
  it('copies the URL, confirms for a moment, then lets the confirmation go', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const restore = installClipboard(writeText);
    render(<FeedUrlBar url={FEED_URL} label="Copy list URL" />);

    fireEvent.click(screen.getByLabelText('Copy list URL'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(writeText).toHaveBeenCalledWith(FEED_URL);
    const icon = () => screen.getByTestId('ContentCopyIcon');
    expect(icon().getAttribute('class')).toContain('colorSuccess');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1800);
    });
    expect(icon().getAttribute('class')).not.toContain('colorSuccess');
    restore();
  });

  it('a refused copy leaves the bar unconfirmed rather than lying', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    const restore = installClipboard(writeText);
    render(<FeedUrlBar url={FEED_URL} label="Copy list URL" />);

    fireEvent.click(screen.getByLabelText('Copy list URL'));
    await act(async () => Promise.resolve());

    expect(screen.getByTestId('ContentCopyIcon').getAttribute('class')).not.toContain('colorSuccess');
    restore();
  });

  it('without a clipboard at all the press is inert — jsdom, an iframe, an old browser', () => {
    render(<FeedUrlBar url={FEED_URL} label="Copy list URL" />);

    fireEvent.click(screen.getByLabelText('Copy list URL'));

    expect(screen.getByText(FEED_URL)).toBeDefined();
  });
});
