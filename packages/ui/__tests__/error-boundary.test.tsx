import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DuncitErrorBoundary, ErrorFallback } from '../src/error-boundary';

/** Throws while `crash.now` is set — flipped off to prove a Retry re-renders. */
const crash = { now: true };
function Pod() {
  if (crash.now) throw new Error('Cannot read pod DUN-POD-4821 for ravi.plays@duncit.com');
  return <p>Sunday Badminton Doubles</p>;
}

const logger = () => ({ error: vi.fn(), warn: vi.fn() });

beforeEach(() => {
  crash.now = true;
  // React reports every caught render error to console.error; the assertions below are what matter.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DuncitErrorBoundary', () => {
  it('renders what it wraps while nothing throws', () => {
    crash.now = false;
    render(
      <DuncitErrorBoundary logger={logger()} surface="mWeb">
        <Pod />
      </DuncitErrorBoundary>,
    );
    expect(screen.getByText('Sunday Badminton Doubles')).toBeInTheDocument();
  });

  it('shows the fallback and logs a scrubbed CAUGHT row at error level', () => {
    const log = logger();
    render(
      <DuncitErrorBoundary logger={log} surface="mWeb" appVersion="1.81.10">
        <Pod />
      </DuncitErrorBoundary>,
    );
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toHaveFocus();
    expect(log.error).toHaveBeenCalledTimes(1);
    const [route, component, detail] = log.error.mock.calls[0];
    expect(route).toBe('/');
    expect(component).toBe('errorBoundary');
    expect(detail).toMatchObject({ event: 'CAUGHT', scope: 'page', surface: 'mWeb' });
    expect((detail.error as Error).message).toBe('Cannot read pod DUN-POD-4821 for [email]');
    expect(screen.getByText(/^Reference: /)).toBeInTheDocument();
  });

  it('logs at the level onCaught picks, and a page-level Retry re-renders the page', () => {
    const log = logger();
    const onCaught = vi.fn(() => 'warn' as const);
    render(
      <DuncitErrorBoundary logger={log} surface="admin" onCaught={onCaught}>
        <Pod />
      </DuncitErrorBoundary>,
    );
    expect(onCaught).toHaveBeenCalledWith(expect.any(Error));
    expect(log.warn).toHaveBeenCalledWith('/', 'errorBoundary', expect.objectContaining({ event: 'CAUGHT' }));
    expect(log.error).not.toHaveBeenCalled();

    crash.now = false;
    fireEvent.click(screen.getByTestId('error-boundary-retry'));
    expect(screen.getByText('Sunday Badminton Doubles')).toBeInTheDocument();
  });

  it('fills the screen at the root, where Retry reloads the whole app', () => {
    render(
      <DuncitErrorBoundary logger={logger()} surface="mWeb" scope="root">
        <Pod />
      </DuncitErrorBoundary>,
    );
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    // jsdom does not navigate; a reload is reported, not thrown — the fallback stays up.
    fireEvent.click(screen.getByTestId('error-boundary-retry'));
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
  });

  it('clears a crash when the reset key (the path) changes, and keeps it while it does not', () => {
    const log = logger();
    const { rerender } = render(
      <DuncitErrorBoundary logger={log} surface="mWeb" resetKey="/pods/1">
        <Pod />
      </DuncitErrorBoundary>,
    );
    rerender(
      <DuncitErrorBoundary logger={log} surface="mWeb" resetKey="/pods/1">
        <Pod />
      </DuncitErrorBoundary>,
    );
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();

    crash.now = false;
    rerender(
      <DuncitErrorBoundary logger={log} surface="mWeb" resetKey="/clubs">
        <Pod />
      </DuncitErrorBoundary>,
    );
    expect(screen.getByText('Sunday Badminton Doubles')).toBeInTheDocument();
    // A further update with nothing caught leaves the page alone.
    rerender(
      <DuncitErrorBoundary logger={log} surface="mWeb" resetKey="/clubs/2">
        <Pod />
      </DuncitErrorBoundary>,
    );
    expect(screen.getByText('Sunday Badminton Doubles')).toBeInTheDocument();
  });

  it('files a report once per crash, even when sending has to be tried again', async () => {
    const log = logger();
    const onReport = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
    render(
      <DuncitErrorBoundary logger={log} surface="mWeb" onReport={onReport}>
        <Pod />
      </DuncitErrorBoundary>,
    );
    fireEvent.click(screen.getByTestId('error-boundary-report'));
    await waitFor(() => expect(screen.getByText('The report could not be sent. Try again in a moment.')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('error-boundary-report'));
    await waitFor(() => expect(screen.getByText('Thanks — the report reached our team.')).toBeInTheDocument());

    expect(onReport).toHaveBeenCalledTimes(2);
    const reported = log.warn.mock.calls.filter(([, , detail]) => (detail as { event: string }).event === 'REPORTED');
    expect(reported).toHaveLength(1);
    expect(screen.queryByTestId('error-boundary-report')).not.toBeInTheDocument();
  });

  it('logs the report without a feedback pipeline, and does nothing when asked before any crash', async () => {
    const log = logger();
    render(
      <DuncitErrorBoundary logger={log} surface="tech">
        <Pod />
      </DuncitErrorBoundary>,
    );
    fireEvent.click(screen.getByTestId('error-boundary-report'));
    await waitFor(() => expect(screen.getByText('Thanks — the report reached our team.')).toBeInTheDocument());
    expect(log.warn).toHaveBeenCalledWith('/', 'errorBoundary', expect.objectContaining({ event: 'REPORTED' }));

    crash.now = false;
    const quiet = logger();
    const ref = createRef<DuncitErrorBoundary>();
    render(
      <DuncitErrorBoundary ref={ref} logger={quiet} surface="tech">
        <Pod />
      </DuncitErrorBoundary>,
    );
    await act(async () => {
      await (ref.current as unknown as { report: () => Promise<void> }).report();
    });
    expect(quiet.warn).not.toHaveBeenCalled();
  });
});

describe('ErrorFallback', () => {
  it('says it is sending while the report is out, and shows no reference without one', async () => {
    let finish: () => void = () => undefined;
    const onReport = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    render(<ErrorFallback onRetry={vi.fn()} onReport={onReport} />);
    expect(screen.queryByText(/^Reference: /)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('error-boundary-report'));
    expect(screen.getByTestId('error-boundary-report')).toHaveTextContent('Sending report…');
    expect(screen.getByTestId('error-boundary-report')).toBeDisabled();
    await act(async () => finish());
    expect(screen.getByText('Thanks — the report reached our team.')).toBeInTheDocument();
  });
});
