import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logs } from '@duncit/logs';
import ErrorBoundary from '../ErrorBoundary';

const hoisted = vi.hoisted(() => ({ mutate: vi.fn(), reload: vi.fn() }));
vi.mock('../../apollo', () => ({ apolloClient: { mutate: hoisted.mutate } }));
vi.mock('../staleChunkReload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../staleChunkReload')>()),
  reloadForStaleChunk: hoisted.reload,
}));

let message = 'Cannot read pod venue';
function Crash(): never {
  throw new Error(message);
}

beforeEach(() => {
  message = 'Cannot read pod venue';
  hoisted.mutate.mockReset().mockResolvedValue({ data: {} });
  hoisted.reload.mockReset();
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('mWeb ErrorBoundary', () => {
  it('logs a real crash at error level, after offering the stale-chunk reload', () => {
    const error = vi.spyOn(logs.mWeb, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Crash />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    expect(hoisted.reload).toHaveBeenCalledWith(expect.objectContaining({ message: 'Cannot read pod venue' }));
    expect(error).toHaveBeenCalledWith('/', 'errorBoundary', expect.objectContaining({ event: 'CAUGHT', surface: 'mWeb' }));
  });

  it('logs a chunk lost to a deploy as a warning, since the site itself is fine', () => {
    message = 'Failed to fetch dynamically imported module: /assets/PodPage-3f2a.js';
    const warn = vi.spyOn(logs.mWeb, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(logs.mWeb, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary scope="root">
        <Crash />
      </ErrorBoundary>,
    );
    expect(warn).toHaveBeenCalledWith('/', 'errorBoundary', expect.objectContaining({ event: 'CAUGHT', scope: 'root' }));
    expect(error).not.toHaveBeenCalled();
  });

  it('files a support feedback row for a signed-in member who reports the crash', async () => {
    localStorage.setItem('token', 'session-jwt');
    vi.spyOn(logs.mWeb, 'error').mockImplementation(() => undefined);
    vi.spyOn(logs.mWeb, 'warn').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Crash />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByTestId('error-boundary-report'));
    await waitFor(() => expect(hoisted.mutate).toHaveBeenCalledTimes(1));
    const { input } = hoisted.mutate.mock.calls[0][0].variables;
    expect(input).toMatchObject({ platform: 'web', source_screen: '/' });
    expect(input.message).toContain('Cannot read pod venue');
    expect(await screen.findByText('Thanks — the report reached our team.')).toBeInTheDocument();
  });

  it('reports a signed-out crash through its log row alone, without the session-only mutation', async () => {
    vi.spyOn(logs.mWeb, 'error').mockImplementation(() => undefined);
    const warn = vi.spyOn(logs.mWeb, 'warn').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Crash />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByTestId('error-boundary-report'));
    expect(await screen.findByText('Thanks — the report reached our team.')).toBeInTheDocument();
    expect(hoisted.mutate).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('/', 'errorBoundary', expect.objectContaining({ event: 'REPORTED' }));
  });
});
