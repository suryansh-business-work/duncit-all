/**
 * The public page a share link opens, as a stranger with no session sees it:
 * read the prompt, fill its blanks (required ones gate the buttons), add more,
 * watch the finished prompt, copy it or send it to an LLM — every interaction
 * reported anonymously. A dead link and a failed read look different, and only
 * the failure offers a retry.
 */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PublicPromptView } from '../src/mui/PublicPrompt';
import type { SharedPrompt } from '../src/share/publicApi';
import { renderInPortal, settle } from './support/harness';

const SHARED: SharedPrompt = {
  name: 'Weekend planner',
  description: 'Plans two days somewhere new.',
  category: 'Travel',
  target_model: '',
  content: 'Plan a weekend in {{city}} for {{who}}.',
  variables: [
    { name: 'city', label: 'City', description: 'Where you are going', required: true, example: 'Pune' },
    { name: 'who', label: 'Who is going', description: '', required: false, example: '' },
  ],
  token_count: 12,
  updated_at: '2026-11-21T00:00:00.000Z',
};

const API = 'https://server.duncit.com';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn();
const writeText = vi.fn<(text: string) => Promise<void>>();
const openWindow = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('open', openWindow);
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: { writeText } });
});
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  vi.clearAllMocks();
});

/** Every POST the page made to the events route, as parsed bodies. */
const reported = () =>
  fetchMock.mock.calls
    .filter(([url]) => String(url).endsWith('/events'))
    .map(([, init]) => JSON.parse(String((init as RequestInit).body)) as { type: string; platform: string | null });

describe('PublicPromptView', () => {
  it('reads the prompt, counts the visit, and keeps the buttons off until the required blank is filled', async () => {
    fetchMock.mockImplementation((url: string) => Promise.resolve(url.endsWith('/events') ? new Response(null, { status: 204 }) : json(SHARED)));
    renderInPortal(<PublicPromptView token="tok123" apiOrigin={API} />);

    expect(screen.getByRole('status').textContent).toContain('Loading the prompt');
    expect(await screen.findByRole('heading', { level: 1, name: 'Weekend planner' })).toBeDefined();
    expect(fetchMock.mock.calls[0][0]).toBe(`${API}/ai-prompts/share/tok123`);
    await waitFor(() => expect(reported()).toEqual([expect.objectContaining({ type: 'PUBLIC_VIEW' })]));

    const preview = screen.getByLabelText('Your prompt');
    expect(preview.textContent).toBe('Plan a weekend in {{city}} for {{who}}.');
    expect((screen.getByRole('button', { name: 'Copy prompt' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Open in Claude' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByRole('textbox', { name: /City/ }), { target: { value: 'Pune' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Anything to add?' }), { target: { value: 'Cheap food only.' } });

    await waitFor(() => expect(preview.textContent).toBe('Plan a weekend in Pune for {{who}}.\n\nCheap food only.'));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Copy prompt' }) as HTMLButtonElement).disabled).toBe(false));

    fireEvent.click(screen.getByRole('button', { name: 'Copy prompt' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Plan a weekend in Pune for {{who}}.\n\nCheap food only.'));
    fireEvent.click(screen.getByRole('button', { name: 'Open in Perplexity' }));
    await waitFor(() =>
      expect(reported().map((event) => [event.type, event.platform])).toEqual([
        ['PUBLIC_VIEW', null],
        ['COPY_PROMPT', null],
        ['OPEN_IN_PLATFORM', 'PERPLEXITY'],
      ]),
    );
    expect(String(openWindow.mock.calls[0][0])).toContain('perplexity.ai');

    // A refused clipboard counts nothing.
    writeText.mockRejectedValueOnce(new Error('blocked'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy prompt' }));
    await settle();
    expect(reported()).toHaveLength(3);
  });

  it('shows a prompt with no blanks straight away, ready to send', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(url.endsWith('/events') ? new Response(null, { status: 500 }) : json({ ...SHARED, description: '', variables: [], content: 'Tell me a joke.' })),
    );
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderInPortal(<PublicPromptView token="tok123" apiOrigin={API} />);

    await screen.findByRole('heading', { level: 1, name: 'Weekend planner' });
    expect(screen.queryByText('Fill in the blanks')).toBeNull();
    await waitFor(() => expect((screen.getByRole('button', { name: 'Copy prompt' }) as HTMLButtonElement).disabled).toBe(false));
    // The visit could not be recorded: logged, never shown to the visitor.
    await waitFor(() => expect(warn).toHaveBeenCalledWith(expect.stringContaining('could not record'), 'PUBLIC_VIEW'));

    fireEvent.click(screen.getByRole('button', { name: 'Open in Grok' }));
    await waitFor(() => expect(warn).toHaveBeenCalledWith(expect.stringContaining('could not record'), 'OPEN_IN_PLATFORM'));
    warn.mockRestore();
  });

  it('says a dead link is not available, without a retry', async () => {
    fetchMock.mockResolvedValue(json({ error: 'NOT_FOUND' }, 404));
    renderInPortal(<PublicPromptView token="gone" apiOrigin={API} />);

    expect(await screen.findByText(/This shared prompt is not available/)).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('offers a retry when the read fails, and loads on the next try', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    fetchMock.mockResolvedValueOnce(json({}, 503));
    fetchMock.mockImplementation((url: string) => Promise.resolve(url.endsWith('/events') ? new Response(null, { status: 204 }) : json(SHARED)));
    renderInPortal(<PublicPromptView token="tok123" apiOrigin={API} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Weekend planner' })).toBeDefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('could not read'), expect.any(Error));
    warn.mockRestore();
  });

  it('drops an answer that arrives after the page has gone', async () => {
    let answer: (value: Response) => void = () => undefined;
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          answer = resolve;
          init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { unmount } = renderInPortal(<PublicPromptView token="tok123" apiOrigin={API} />);

    unmount();
    answer(json(SHARED));
    await settle();

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
