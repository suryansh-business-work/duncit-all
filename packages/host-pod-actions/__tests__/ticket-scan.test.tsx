/**
 * Scanning a ticket at the door.
 *
 * One QR can admit a whole group, so the flow has two steps and both of them
 * have been reported as broken before: a ticket that still needs the rest of
 * the party is an INSTRUCTION, not a failure (red read as "the scan broke"),
 * and a successful group check-in that only swapped a line of text read as
 * "nothing happened" — hence the confirmation dialog with a tick per person.
 */
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CompanionsChecklist from '../src/ticket-scan/CompanionsChecklist';
import ScanConfirmationDialog from '../src/ticket-scan/ScanConfirmationDialog';
import ScannerViewport from '../src/ticket-scan/ScannerViewport';
import TicketScanDialog from '../src/ticket-scan/TicketScanDialog';
import { useQrScanner } from '../src/ticket-scan/useQrScanner';
import { HostPodActionsProvider } from '../src/HostPodActionsProvider';
import { HOST_SCAN_POD_TICKET } from '../src/queries';
import { hostActionsConfig, labelsFor } from './host-actions-config';

const POD = { id: 'pod-1', pod_title: 'Sunday Badminton' };
const TOKEN = 'DUN-TKT-001';
const labels = labelsFor();
const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const attendee = {
  __typename: 'ScannedAttendee',
  user_id: 'u-1',
  full_name: 'Asha Rao',
  profile_photo: '',
  profile_path: '/u/asha',
  email: 'asha@duncit.com',
  phone: '9876543210',
  whatsapp: '9876543210',
  bio: '',
  address: '',
  city: 'Bengaluru',
};

const scanResult = (over: Record<string, unknown> = {}) => ({
  __typename: 'HostTicketScanResult',
  ok: true,
  message: 'Checked in',
  already_checked_in: false,
  requires_companions: false,
  companions_required: 0,
  companions: [],
  ticket: {
    __typename: 'PodTicket',
    id: 't-1',
    ticket_code: TOKEN,
    status: 'CHECKED_IN',
    seats: 1,
    checked_in_at: '2026-08-30T12:40:00.000Z',
  },
  attendee,
  ...over,
});

const scanMock = (
  result: Record<string, unknown> | null,
  over: Partial<MockedResponse> = {},
): MockedResponse =>
  ({
    request: { query: HOST_SCAN_POD_TICKET, variables: () => true },
    result: { data: { hostScanPodTicket: result } },
    maxUsageCount: Number.POSITIVE_INFINITY,
    ...over,
  }) as MockedResponse;

const wrap = (ui: React.ReactNode, mocks: readonly MockedResponse[] = []) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[...mocks]}>
      <ThemeProvider theme={testTheme}>
        <HostPodActionsProvider {...hostActionsConfig()}>{ui}</HostPodActionsProvider>
      </ThemeProvider>
    </MockedProvider>
  );

/** Types a ticket code into the paste-the-code fallback and submits it. */
const pasteCode = async (code = TOKEN) => {
  fireEvent.change(screen.getByLabelText(labels.pasteTicketCode), { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: labels.checkCode }));
  await settle();
  await settle();
};

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('TicketScanDialog', () => {
  it('checks a single ticket in and says who just walked past', async () => {
    wrap(<TicketScanDialog pod={POD} onClose={vi.fn()} />, [scanMock(scanResult())]);
    await settle();

    await pasteCode();

    expect(screen.getAllByText(labels.attendanceMarkedOne('Asha Rao')).length).toBeGreaterThan(0);
    // The unmissable "it worked" — a one-line text swap read as nothing.
    expect(screen.getByTestId('scan-checked-in-list')).toBeInTheDocument();
  });

  it('names the whole party a group ticket admitted', async () => {
    wrap(<TicketScanDialog pod={POD} onClose={vi.fn()} />, [
      scanMock(
        scanResult({
          ticket: { __typename: 'PodTicket', id: 't-1', ticket_code: TOKEN, status: 'CHECKED_IN', seats: 3, checked_in_at: null },
          companions: [
            { __typename: 'PodCompanion', name: 'Vikram S', phone_number: '9000000001' },
            { __typename: 'PodCompanion', name: 'Meera N', phone_number: '9000000002' },
          ],
        }),
      ),
    ]);
    await settle();

    await pasteCode();

    expect(screen.getAllByText(labels.attendanceMarkedGroup('Asha Rao', 2)).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Vikram S').length).toBeGreaterThan(0);
  });

  it('says so rather than marking again when the ticket was already scanned', async () => {
    wrap(<TicketScanDialog pod={POD} onClose={vi.fn()} />, [
      scanMock(scanResult({ already_checked_in: true })),
    ]);
    await settle();

    await pasteCode();

    expect(screen.getByText(labels.alreadyMarked)).toBeInTheDocument();
    // Not a fresh mark, so no confirmation to dismiss.
    expect(screen.queryByRole('button', { name: labels.confirmDone })).not.toBeInTheDocument();
  });

  // "Add the other person" is an INSTRUCTION, not a failure.
  it('asks for the rest of the group in blue, with the form to enter them', async () => {
    wrap(<TicketScanDialog pod={POD} onClose={vi.fn()} />, [
      scanMock(
        scanResult({
          ok: false,
          message: 'Add the other 2 people on this booking.',
          requires_companions: true,
          companions_required: 2,
          ticket: { __typename: 'PodTicket', id: 't-1', ticket_code: TOKEN, status: 'BOOKED', seats: 3, checked_in_at: null },
        }),
      ),
    ]);
    await settle();

    await pasteCode();

    expect(
      screen.getByText('Add the other 2 people on this booking.').closest('[role="alert"]')?.className,
    ).toMatch(/Info/);
    // The next step is the form, and it has to be reachable.
    expect(screen.getAllByRole('button', { name: labels.markGroupPresent })[0]).toBeInTheDocument();
  });

  it('reads a plain refusal as an error', async () => {
    wrap(<TicketScanDialog pod={POD} onClose={vi.fn()} />, [
      scanMock(scanResult({ ok: false, message: 'That ticket is for another pod.', attendee: null })),
    ]);
    await settle();

    await pasteCode();

    expect(
      screen.getByText('That ticket is for another pod.').closest('[role="alert"]')?.className,
    ).toMatch(/Error/);
  });

  it('states the reason when the scan itself failed', async () => {
    wrap(<TicketScanDialog pod={POD} onClose={vi.fn()} />, [
      scanMock(null, { result: undefined, error: new Error('That code is not a Duncit ticket') }),
    ]);
    await settle();

    await pasteCode();

    expect(screen.getByText('That code is not a Duncit ticket')).toBeInTheDocument();
  });

  it('renders a result the server answered with nothing behind', async () => {
    wrap(<TicketScanDialog pod={POD} onClose={vi.fn()} />, [scanMock(null)]);
    await settle();

    await pasteCode();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Scan next', hidden: true })).not.toBeInTheDocument();
  });

  it('clears the result for the next person in the queue', async () => {
    wrap(<TicketScanDialog pod={POD} onClose={vi.fn()} />, [scanMock(scanResult())]);
    await settle();
    await pasteCode();
    fireEvent.click(screen.getAllByRole('button', { name: labels.confirmDone })[0]);
    await settle();
    await settle();

    fireEvent.click(screen.getByRole('button', { name: 'Scan next', hidden: true }));
    await settle();

    expect(screen.getAllByLabelText(labels.pasteTicketCode)[0]).toBeInTheDocument();
    expect(screen.queryByText(labels.attendanceMarkedOne('Asha Rao'))).not.toBeInTheDocument();
  });

  it('closes through the caller and forgets the ticket on screen', async () => {
    const onClose = vi.fn();
    wrap(<TicketScanDialog pod={POD} onClose={onClose} />, [scanMock(scanResult())]);
    await settle();
    await pasteCode();
    fireEvent.click(screen.getAllByRole('button', { name: labels.confirmDone })[0]);
    await settle();
    await settle();

    fireEvent.click(screen.getByRole('button', { name: labels.close, hidden: true }));
    await settle();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('sends the group on the SAME ticket, without asking for the QR again', async () => {
    const variables: Record<string, unknown>[] = [];
    wrap(<TicketScanDialog pod={POD} onClose={vi.fn()} />, [
      {
        request: { query: HOST_SCAN_POD_TICKET, variables: (v: Record<string, unknown>) => {
          variables.push(v);
          return true;
        } },
        result: {
          data: {
            hostScanPodTicket: scanResult({
              ok: false,
              message: 'Add the other 1 person on this booking.',
              requires_companions: true,
              companions_required: 1,
              ticket: { __typename: 'PodTicket', id: 't-1', ticket_code: TOKEN, status: 'BOOKED', seats: 2, checked_in_at: null },
            }),
          },
        },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);
    await settle();
    await pasteCode();

    const [name, phone] = screen.getAllByRole('textbox');
    fireEvent.input(name, { target: { value: 'Vikram S' } });
    fireEvent.input(phone, { target: { value: '9000000001' } });
    await settle();
    fireEvent.submit(name.closest('form') as HTMLFormElement);
    await settle();
    await settle();

    expect(variables).toHaveLength(2);
    expect(variables[1]).toMatchObject({ token: TOKEN });
    expect(variables[1].companions).not.toBeNull();
  });
});

describe('ScanConfirmationDialog', () => {
  it('stays closed until a scan has actually marked somebody', () => {
    wrap(<ScanConfirmationDialog result={null} text="" onDone={vi.fn()} />);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('ticks the buyer and every companion the ticket admitted', () => {
    wrap(
      <ScanConfirmationDialog
        result={
          scanResult({
            companions: [
              { name: 'Vikram S', phone_number: '9000000001' },
              { name: 'Meera N', phone_number: '9000000002' },
            ],
          }) as never
        }
        text="Asha and 2 more are checked in."
        onDone={vi.fn()}
      />,
    );

    expect(screen.getByText('Asha and 2 more are checked in.')).toBeInTheDocument();
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('Vikram S')).toBeInTheDocument();
    expect(screen.getByText('Meera N')).toBeInTheDocument();
  });

  it('lists only the companions on a scan with no buyer attached', () => {
    wrap(
      <ScanConfirmationDialog
        result={
          scanResult({
            attendee: null,
            companions: [{ name: 'Vikram S', phone_number: '9000000001' }],
          }) as never
        }
        text="Checked in."
        onDone={vi.fn()}
      />,
    );

    expect(screen.getByText('Vikram S')).toBeInTheDocument();
    expect(screen.queryByText('Asha Rao')).not.toBeInTheDocument();
  });

  it('reports the dismissal to the caller', () => {
    const onDone = vi.fn();
    wrap(<ScanConfirmationDialog result={scanResult() as never} text="Checked in." onDone={onDone} />);

    fireEvent.click(screen.getByRole('button', { name: labels.confirmDone }));

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('CompanionsChecklist', () => {
  it('renders nothing at all with nobody to tick', () => {
    const { container } = wrap(<CompanionsChecklist title="Checked in" people={[]} />);

    expect(container.innerHTML).toBe('');
  });

  it('shows a name on its own when there is no second line for it', () => {
    wrap(
      <CompanionsChecklist title="Checked in" people={[{ key: 'u-1', primary: 'Asha Rao' }]} />,
    );

    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
  });
});

describe('useQrScanner', () => {
  const hook = (active: boolean, onCode = vi.fn()) =>
    renderHook(() => useQrScanner(active, onCode));

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  it('asks for no camera at all while it is not scanning', async () => {
    const getUserMedia = vi.fn();
    vi.stubGlobal('navigator', { ...globalThis.navigator, mediaDevices: { getUserMedia } });

    const { result } = hook(false);
    await settle();

    expect(getUserMedia).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  // A desktop browser or a denied permission still has to let the host work,
  // which is what the paste-the-code fallback is for.
  it.each([
    ['NotAllowedError', /Camera permission was denied/],
    ['SecurityError', /Camera permission was denied/],
    ['NotFoundError', /No camera was found/],
    ['OverconstrainedError', /No camera was found/],
    ['SomethingElse', /Could not start the camera/],
  ])('explains a camera that refused with %s', async (name, expected) => {
    const error = Object.assign(new Error('nope'), { name });
    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(error) },
    });

    const { result } = hook(true);
    await settle();

    expect(result.current.error).toMatch(expected);
  });

  it('explains a camera that failed with nothing to name it', async () => {
    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      mediaDevices: { getUserMedia: vi.fn().mockRejectedValue('nope') },
    });

    const { result } = hook(true);
    await settle();

    expect(result.current.error).toMatch(/Could not start the camera/);
  });

  // `active` is the whole control surface: turning it off releases the camera.
  it('stops every track when it stops scanning', async () => {
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] };
    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });
    const { result, unmount } = hook(true);
    Object.defineProperty(result.current.videoRef, 'current', {
      configurable: true,
      value: { play: vi.fn().mockResolvedValue(undefined), srcObject: null },
    });
    await settle();

    unmount();

    expect(stop).toHaveBeenCalled();
  });

  it('releases a camera that only arrived after it had already stopped', async () => {
    const stop = vi.fn();
    let release: (stream: unknown) => void = () => undefined;
    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      mediaDevices: {
        getUserMedia: vi.fn(() => new Promise((resolve) => { release = resolve; })),
      },
    });
    const { unmount } = hook(true);

    unmount();
    await act(async () => {
      release({ getTracks: () => [{ stop }] });
    });

    expect(stop).toHaveBeenCalled();
  });
});

describe('ScannerViewport', () => {
  it('offers the paste-the-code fallback, and refuses an empty one', async () => {
    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(new Error('no camera')) },
    });
    const onManualCode = vi.fn();
    wrap(<ScannerViewport active onCode={vi.fn()} onManualCode={onManualCode} />);
    await settle();

    expect(screen.getByRole('button', { name: labels.checkCode })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(labels.pasteTicketCode), {
      target: { value: `  ${TOKEN}  ` },
    });
    fireEvent.click(screen.getByRole('button', { name: labels.checkCode }));

    expect(onManualCode).toHaveBeenCalledWith(TOKEN);
  });

  it('shows the camera frame and its hint while the camera works', async () => {
    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      mediaDevices: { getUserMedia: vi.fn(() => new Promise(() => undefined)) },
    });
    const { container } = wrap(<ScannerViewport active onCode={vi.fn()} onManualCode={vi.fn()} />);
    await settle();

    expect(container.querySelector('video')).not.toBeNull();
    expect(screen.getByText(labels.scanFrameHint)).toBeInTheDocument();
  });

  it('replaces the frame with the reason once the camera refused', async () => {
    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'NotFoundError' })),
      },
    });
    const { container } = wrap(<ScannerViewport active onCode={vi.fn()} onManualCode={vi.fn()} />);
    await settle();

    expect(screen.getByText(/No camera was found/)).toBeInTheDocument();
    expect(container.querySelector('video')).toBeNull();
    cleanup();
  });
});
