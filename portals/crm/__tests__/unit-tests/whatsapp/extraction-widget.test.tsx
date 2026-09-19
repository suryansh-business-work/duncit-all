import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { logs } from '@duncit/logs';
import { ExtractionProvider, ExtractionWidget, useExtraction } from '@/pages/tools/whatsapp/extraction';
import { WA_CANCEL_EXTRACTION, WA_EXTRACTION, type WaExtraction } from '@/pages/tools/whatsapp/whatsappQueries';
import { clearToken, setToken } from '@/lib/session';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { extractionJob } from './fixtures';

const jobMock = (job: WaExtraction | null, uses = 1): MockedResponse => ({
  request: { query: WA_EXTRACTION },
  result: { data: { waExtraction: job } },
  maxUsageCount: uses,
});

/** A consumer registering its completion callback the way the context's contract describes. */
function DoneListener({ onFinish }: Readonly<{ onFinish: () => void }>) {
  const { setOnDone } = useExtraction();
  useEffect(() => {
    setOnDone(() => onFinish);
  }, [setOnDone, onFinish]);
  return null;
}

/** Reads the hook with no provider above it. */
function Orphan() {
  useExtraction();
  return null;
}

const renderWidget = (mocks: MockedResponse[], onFinish?: () => void) =>
  renderWithApollo(
    <ExtractionProvider>
      <ExtractionWidget />
      {onFinish ? <DoneListener onFinish={onFinish} /> : null}
    </ExtractionProvider>,
    mocks,
  );

beforeEach(() => {
  setToken('fixture-session');
});

afterEach(() => {
  clearToken();
  vi.restoreAllMocks();
});

describe('ExtractionWidget', () => {
  it('renders nothing while signed out, because the job is never asked for', () => {
    clearToken();
    const { container } = renderWidget([]);
    expect(container.querySelector('.MuiChip-root')).toBeNull();
    expect(screen.queryByText(/Extract/)).toBeNull();
  });

  it('floats a running job as a chip with an indeterminate start, then expands it', async () => {
    renderWidget([jobMock(extractionJob({ status: 'RUNNING', total: 0 }), 5)]);

    fireEvent.click(await screen.findByText('Extracting 0%'));

    expect(screen.getByText('Extracting data…')).toBeInTheDocument();
    expect(screen.getByText('0 / … contacts (0%)')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
    expect(screen.getByText('New leads: 0')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Minimize' }));
    expect(await screen.findByText('Extracting 0%')).toBeInTheDocument();
  });

  it('shows real progress once the contact total is known, with a full summary on demand', async () => {
    renderWidget([
      jobMock(
        extractionJob({ status: 'RUNNING', total: 200, processed: 50, valid: 40, invalid: 6, duplicates: 4, communities: 3, groups: 12, leads_created: 38 }),
        5,
      ),
    ]);

    fireEvent.click(await screen.findByText('Extracting 25%'));
    expect(screen.getByText('50 / 200 contacts (25%)')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByText('Valid: 40')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    const summary = within(await screen.findByRole('dialog', { name: 'Extraction summary' }));
    expect(summary.getByText('50 / 200')).toBeInTheDocument();
    expect(summary.getByText('38')).toBeInTheDocument();
    expect(summary.queryByRole('alert')).toBeNull();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('cancels a running job and shows the cancelled state', async () => {
    const cancelled = extractionJob({ status: 'CANCELLED', total: 200, processed: 80 });
    renderWidget([
      jobMock(extractionJob({ status: 'RUNNING', total: 200, processed: 50 })),
      { request: { query: WA_CANCEL_EXTRACTION }, result: { data: { waCancelExtraction: cancelled } } },
      jobMock(cancelled, 5),
    ]);

    fireEvent.click(await screen.findByText('Extracting 25%'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel extraction' }));

    expect(await screen.findByText('Extraction cancelled')).toBeInTheDocument();
    expect(screen.getByText('80 contacts processed')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('logs a cancel whose follow-up refresh fails instead of crashing', async () => {
    const logError = vi.spyOn(logs.portal.crm, 'error').mockImplementation(() => undefined);
    renderWidget([
      jobMock(extractionJob({ status: 'RUNNING', total: 10, processed: 1 })),
      { request: { query: WA_CANCEL_EXTRACTION }, error: new Error('Gateway went away') },
      { request: { query: WA_EXTRACTION }, error: new Error('Gateway went away') },
    ]);

    fireEvent.click(await screen.findByText('Extracting 10%'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel extraction' }));

    await waitFor(() =>
      expect(logError).toHaveBeenCalledWith(
        'ExtractionWidget',
        'cancel',
        expect.objectContaining({ msg: 'Failed to cancel extraction', jobId: 'job-1' }),
      ),
    );
  });

  it('reports a finished job once to the registered listener and can be dismissed', async () => {
    const onFinish = vi.fn();
    renderWidget([jobMock(extractionJob({ status: 'DONE', total: 20, processed: 20, leads_created: 7 }), 5)], onFinish);

    fireEvent.click(await screen.findByText('Extraction finished'));
    expect(screen.getByText('20 contacts processed')).toBeInTheDocument();
    expect(screen.getByText('New leads: 7')).toBeInTheDocument();
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(screen.queryByText('Extraction finished')).toBeNull());
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('explains a failed job, with the server reason in the summary', async () => {
    renderWidget([jobMock(extractionJob({ status: 'FAILED', total: 50, processed: 5, error: 'Session logged out' }), 5)]);

    fireEvent.click(await screen.findByText('Extraction failed'));
    expect(screen.getByRole('alert')).toHaveTextContent('Session logged out');

    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    const summary = within(await screen.findByRole('dialog', { name: 'Extraction summary' }));
    expect(summary.getByRole('alert')).toHaveTextContent('Session logged out');
  });

  it('falls back to a generic line when a failed job carries no reason', async () => {
    renderWidget([jobMock(extractionJob({ status: 'FAILED', error: null }), 5)]);

    fireEvent.click(await screen.findByText('Extraction failed'));
    expect(screen.getByRole('alert')).toHaveTextContent('Extraction failed.');
  });
});

describe('useExtraction', () => {
  it('refuses to run outside its provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Orphan />)).toThrow('useExtraction must be used within an ExtractionProvider');
  });
});
