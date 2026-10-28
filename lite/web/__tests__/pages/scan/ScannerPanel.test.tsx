import { act, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LITE_HOST_CHECK_IN_BY_CODE } from '../../../graphql/manage';
import { RESUME_AFTER_MS, ScannerPanel } from '../../../pages/scan/ScannerPanel';
import { eventFixture, meFixture, registrationFixture, renderWithProviders, type RenderOptions } from '../../test-utils';

/** What the panel handed the camera hook: whether it should be looking, and where a read QR goes. */
const camera = vi.hoisted(() => ({
  active: [] as boolean[],
  onCode: null as ((value: string) => void) | null,
  error: null as string | null,
}));

vi.mock('@duncit/host-pod-actions/qr-scanner', () => ({
  useQrScanner: (active: boolean, onCode: (value: string) => void) => {
    camera.active.push(active);
    camera.onCode = onCode;
    return { videoRef: { current: null }, canvasRef: { current: null }, error: camera.error };
  },
}));

/** The camera reads a QR off a guest's phone. */
function scan(value: string) {
  const deliver = camera.onCode;
  if (!deliver) throw new Error('the scanner is not mounted');
  act(() => deliver(value));
}

const lastActive = () => camera.active.at(-1);

const checkInMock = (code: string, result: MockedResponse['result']): MockedResponse => ({
  request: { query: LITE_HOST_CHECK_IN_BY_CODE, variables: { event_id: 'ev-1', code } },
  result,
});
const admitted = () => ({ data: { liteHostCheckInByCode: registrationFixture({ checked_in_at: '2026-11-21T14:00:00.000Z' }) } });

const renderPanel = (mocks: MockedResponse[], options: RenderOptions = {}) => {
  const onChecked = vi.fn();
  const utils = renderWithProviders(<ScannerPanel event={eventFixture({ viewer_is_host: true })} onChecked={onChecked} />, { me: meFixture(), mocks, ...options });
  return { ...utils, onChecked };
};

describe('ScannerPanel', () => {
  beforeEach(() => {
    camera.active = [];
    camera.onCode = null;
    camera.error = null;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts the camera, labelled for screen readers, and tells the host what to do', () => {
    renderPanel([]);

    expect(lastActive()).toBe(true);
    expect(screen.getByLabelText('Camera view for scanning tickets').tagName).toBe('VIDEO');
    expect(screen.getByText('Point the camera at the QR code on a guest’s ticket.')).toBeInTheDocument();
    expect(screen.queryByTestId('scan-camera-blocked')).not.toBeInTheDocument();
  });

  it('explains a blocked camera and still offers the typed code', () => {
    camera.error = 'NotAllowedError';
    renderPanel([]);

    expect(screen.getByTestId('scan-camera-blocked')).toHaveTextContent(
      'The camera is not available. Allow camera access for this site, or type the code from the ticket below.',
    );
    expect(screen.queryByTestId('scan-camera')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Or type the code from the ticket' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Check-in code' })).toBeInTheDocument();
  });

  it('checks a scanned ticket in, names the guest and pauses the camera so it is not sent twice', async () => {
    const answer = vi.fn(admitted);
    const { onChecked } = renderPanel([checkInMock('ABC123', answer)]);

    scan('ABC123');

    expect(lastActive()).toBe(false);
    const verdict = await screen.findByTestId('scan-ok');
    expect(verdict).toHaveTextContent('Ravi Kumar');
    expect(verdict).toHaveTextContent('General × 1 — checked in');
    expect(answer).toHaveBeenCalledTimes(1);
    expect(onChecked).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Scan next ticket' })).toBeInTheDocument();
    expect(screen.queryByText('Point the camera at the QR code on a guest’s ticket.')).not.toBeInTheDocument();
  });

  it('shows why a ticket was refused and does not count it', async () => {
    const { onChecked } = renderPanel([checkInMock('USED01', { errors: [{ message: 'This ticket was already checked in' }] })]);

    scan('USED01');

    const verdict = await screen.findByTestId('scan-error');
    expect(verdict).toHaveTextContent('Not checked in');
    expect(verdict).toHaveTextContent('This ticket was already checked in');
    expect(onChecked).not.toHaveBeenCalled();
  });

  it('falls back to its own words when the failure carries none', async () => {
    renderPanel([{ request: { query: LITE_HOST_CHECK_IN_BY_CODE, variables: { event_id: 'ev-1', code: 'NOPE01' } }, error: new Error('') }]);

    scan('NOPE01');

    expect(await screen.findByTestId('scan-error')).toHaveTextContent('No confirmed guest has that code.');
  });

  it('looks for the next guest on its own once the verdict has been read', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderPanel([checkInMock('ABC123', admitted)], { userOptions: { advanceTimers: vi.advanceTimersByTime } });

    scan('ABC123');
    await screen.findByTestId('scan-ok');
    // The countdown starts in an effect after the verdict paints: let it start before moving the clock.
    await act(() => Promise.resolve());

    act(() => {
      vi.advanceTimersByTime(RESUME_AFTER_MS - 1_000);
    });
    expect(screen.getByTestId('scan-ok')).toBeInTheDocument();
    expect(lastActive()).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.queryByTestId('scan-ok')).not.toBeInTheDocument();
    expect(lastActive()).toBe(true);
    expect(screen.getByText('Point the camera at the QR code on a guest’s ticket.')).toBeInTheDocument();
  });

  it('resumes at once when the host asks for the next ticket', async () => {
    const { user } = renderPanel([checkInMock('ABC123', admitted)]);
    scan('ABC123');
    await screen.findByTestId('scan-ok');

    await user.click(screen.getByRole('button', { name: 'Scan next ticket' }));

    expect(screen.queryByTestId('scan-ok')).not.toBeInTheDocument();
    expect(lastActive()).toBe(true);
  });

  it('admits a guest whose code the host typed, upper-cased, the same way as a scan', async () => {
    const { user, onChecked } = renderPanel([checkInMock('ABC123', admitted)]);

    await user.type(screen.getByRole('textbox', { name: 'Check-in code' }), 'abc123');
    await user.click(screen.getByRole('button', { name: 'Check in' }));

    expect(await screen.findByTestId('scan-ok')).toHaveTextContent('Ravi Kumar');
    await waitFor(() => expect(onChecked).toHaveBeenCalledTimes(1));
  });
});
