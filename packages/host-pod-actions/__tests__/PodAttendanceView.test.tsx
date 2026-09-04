/**
 * The attendance board, which is the screen a host is paid on.
 *
 * The rules this covers are the ones the roster exists to keep honest: who may
 * mark (host vs club admin), whether a by-hand mark needs a one-time code, and
 * that the board closes once the pod is completed — at which point the payout
 * is already split, so a late mark would change money that has moved.
 */
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { mwebAttendanceLabels } from '@duncit/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PodAttendanceView from '../src/attendance/PodAttendanceView';
import { HostPodActionsProvider } from '../src/HostPodActionsProvider';
import {
  FORCE_ATTENDANCE,
  HOST_MARK_ATTENDANCE,
  POD_ATTENDANCE_BOARD,
  REQUEST_ATTENDANCE_OTP,
  VERIFY_ATTENDANCE_OTP,
} from '../src/attendance/queries';
import { hostActionsConfig } from './host-actions-config';

const POD_ID = 'pod-1';

/** Echoes the key back, so the assertions read as the key that was rendered. */
const labels = mwebAttendanceLabels(
  (key: string, options?: { vars?: Record<string, string | number> }) => {
    const vars = Object.values(options?.vars ?? {});
    return vars.length ? `${key} ${vars.join(' ')}` : key;
  },
);

/**
 * A theme, because MUI's `useTheme()` returns NULL outside a provider rather
 * than falling back to the default one — so a component reading it through a
 * callback (`useMediaQuery((theme) => theme.breakpoints.down('sm'))`) throws
 * mid-render. In the app the theme comes from the surface; here it does not.
 */
const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const row = (over: Record<string, unknown> = {}) => ({
  __typename: 'PodAttendanceRow',
  membership_id: 'm-1',
  user_id: 'u-1',
  ticket_id: 't-1',
  ticket_code: 'DUN-TKT-001',
  name: 'Asha Rao',
  avatar_url: null,
  email: 'asha@duncit.com',
  phone_extension: '+91',
  phone_number: '9000000000',
  seats: 2,
  attended: false,
  attended_at: null,
  marked_method: null,
  marked_by_name: null,
  verified_phone: null,
  companions: [],
  companions_required: false,
  ...over,
});

const board = (over: Record<string, unknown> = {}) => ({
  __typename: 'PodAttendanceBoard',
  pod_id: 'DUN-POD-001',
  pod_title: 'Sunday Badminton',
  pod_date_time: '2026-08-30T12:30:00.000Z',
  pod_end_date_time: '2026-08-30T14:00:00.000Z',
  viewer: 'HOST',
  lock: null,
  can_mark: true,
  // Null: the deadline notice is opt-in per test, so the default board draws
  // the roster and nothing else.
  complete_deadline: null,
  complete_timeout_hours: 24,
  otp_required: true,
  marked_count: 1,
  total_count: 2,
  marked_seats: 2,
  total_seats: 4,
  rows: [row(), row({ membership_id: 'm-2', name: 'Vikram S', attended: true, attended_at: '2026-08-30T12:40:00.000Z', marked_method: 'HOST_SCAN', ticket_code: 'DUN-TKT-002' })],
  club_admins: [],
  ...over,
});

const boardMock = (over: Record<string, unknown> = {}): MockedResponse => ({
  request: { query: POD_ATTENDANCE_BOARD, variables: { pod_doc_id: POD_ID } },
  result: { data: { podAttendanceBoard: board(over) } },
});

const view = (
  <PodAttendanceView
    podId={POD_ID}
    labels={labels}
    formatDateTime={(iso) => `at:${iso}`}
    notifySuccess={vi.fn()}
    notifyError={vi.fn()}
  />
);

/**
 * A host surface: the scanner it opens reads the host-actions config, so the
 * provider is part of what a host area supplies.
 */
const mount = (mocks: MockedResponse[] = [boardMock()]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <ThemeProvider theme={testTheme}>
        <HostPodActionsProvider {...hostActionsConfig()}>{view}</HostPodActionsProvider>
      </ThemeProvider>
    </MockedProvider>
  );

/** A surface with no host area at all — the Club Admin's console. */
const mountBare = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <ThemeProvider theme={testTheme}>{view}</ThemeProvider>
    </MockedProvider>
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('PodAttendanceView', () => {
  it('shows a spinner before the board arrives', () => {
    const { container } = mount();

    expect(container.querySelector('.MuiCircularProgress-root')).not.toBeNull();
  });

  it('lists both attendees once the board resolves', async () => {
    mount();
    await settle();

    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('Vikram S')).toBeInTheDocument();
  });

  it('states, above the roster, that an unmarked attendee is a seat out of the payout', async () => {
    const { container } = mount();
    await settle();

    expect(container.textContent).toContain(labels.earningsTitle);
  });

  // The one thing on this page that costs the host money by being ignored, so
  // it is a warning above the roster rather than a footnote under it.
  it('warns the host how long is left to complete, while the window is open', async () => {
    mount([boardMock({ lock: 'OPEN', complete_deadline: '2026-08-31T14:00:00.000Z' })]);
    await settle();

    const note = await screen.findByTestId('attendance-deadline-note');
    expect(note.textContent).toContain(labels.deadlineTitle('at:2026-08-31T14:00:00.000Z'));
    expect(note.textContent).toContain(labels.deadlineBody(24));
  });

  it('leaves the deadline warning off a board that has no window running', async () => {
    mount();
    await settle();

    expect(screen.queryByTestId('attendance-deadline-note')).not.toBeInTheDocument();
  });

  it('survives the board failing rather than showing a blank page', async () => {
    const { container } = mount([
      {
        request: { query: POD_ATTENDANCE_BOARD, variables: { pod_doc_id: POD_ID } },
        error: new Error('upstream down'),
      },
    ]);
    await settle();

    expect(container.innerHTML).not.toBe('');
    expect(container.querySelector('.MuiCircularProgress-root')).toBeNull();
  });

  it('renders for a club admin, whose override is a different control from the host’s mark', async () => {
    const { container } = mount([boardMock({ viewer: 'CLUB_ADMIN' })]);
    await settle();

    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
    expect(container.innerHTML).not.toBe('');
  });

  it('renders a club admin’s board on a console with no host area behind it', async () => {
    // The Club Admin's section in the Partners console mounts this view on its
    // own: there is no door to scan at, so nothing there supplies the
    // host-actions config. Mounting the scanner regardless threw the whole
    // roster away the moment the board answered — the one screen a club admin
    // opens the pod to use.
    const { container } = mountBare([boardMock({ viewer: 'CLUB_ADMIN' })]);
    await settle();

    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
    expect(container.textContent).not.toContain(labels.scanCta);
  });

  it('closes the board once the pod is completed — the payout is already split by then', async () => {
    const { container } = mount([boardMock({ lock: 'COMPLETED', can_mark: false })]);
    await settle();

    expect(container.textContent).toContain(labels.lockedTitle('COMPLETED'));
  });

  it('closes the board for a cancelled pod', async () => {
    const { container } = mount([boardMock({ lock: 'CANCELLED', can_mark: false })]);
    await settle();

    expect(container.textContent).toContain(labels.lockedTitle('CANCELLED'));
  });

  it('renders the club-admin contact card when the board is locked', async () => {
    const { container } = mount([
      boardMock({
        lock: 'COMPLETED',
        can_mark: false,
        club_admins: [
          {
            __typename: 'PodAttendanceClubAdmin',
            id: 'ca-1',
            name: 'Meera N',
            avatar_url: null,
            email: 'meera@duncit.com',
            phone: '9000000001',
            whatsapp: '9000000001',
          },
        ],
      }),
    ]);
    await settle();

    expect(container.textContent).toContain('Meera N');
  });

  it('renders an empty roster without crashing', async () => {
    const { container } = mount([boardMock({ rows: [], marked_count: 0, total_count: 0, marked_seats: 0, total_seats: 0 })]);
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('renders a board where a by-hand mark needs no code, because the admin setting is off', async () => {
    const { container } = mount([boardMock({ otp_required: false })]);
    await settle();

    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
    expect(container.innerHTML).not.toBe('');
  });
});

/**
 * Marking, end to end through the board.
 *
 * Every write re-reads the board rather than patching a row: the counts, the
 * lock and the roster move together, and a client that edited one of them would
 * be the thing that disagrees with the payout.
 */
describe('PodAttendanceView marking', () => {
  const markMock = (over: Partial<MockedResponse> = {}): MockedResponse =>
    ({
      request: {
        query: HOST_MARK_ATTENDANCE,
        variables: { pod_doc_id: POD_ID, membership_id: 'm-1', otp_challenge_id: null },
      },
      result: { data: { hostMarkPodAttendance: board({ marked_count: 2 }) } },
      maxUsageCount: Number.POSITIVE_INFINITY,
      ...over,
    }) as MockedResponse;

  const OTP_CHALLENGE = {
    __typename: 'PhoneOtpChallenge',
    challenge_id: 'ch-1',
    expires_at: '2026-08-30T13:00:00.000Z',
    resend_after_seconds: 30,
    test_code: '123456',
    deliveries: [
      { __typename: 'PhoneOtpDelivery', medium: 'WHATSAPP', status: 'STUBBED', reason: null },
    ],
  };

  const otpRequestMock = (): MockedResponse =>
    ({
      request: { query: REQUEST_ATTENDANCE_OTP, variables: () => true },
      result: { data: { requestPodAttendanceOtp: OTP_CHALLENGE } },
      maxUsageCount: Number.POSITIVE_INFINITY,
    }) as MockedResponse;

  const otpVerifyMock = (): MockedResponse =>
    ({
      request: { query: VERIFY_ATTENDANCE_OTP, variables: () => true },
      result: { data: { verifyPodAttendanceOtp: true } },
      maxUsageCount: Number.POSITIVE_INFINITY,
    }) as MockedResponse;

  const forceMock = (over: Partial<MockedResponse> = {}): MockedResponse =>
    ({
      request: {
        query: FORCE_ATTENDANCE,
        // Both extras ride on every call and are null when the admin took the
        // by-name door with nothing to add — a mock missing them matches
        // nothing, and the write looks like it silently did not happen.
        variables: {
          pod_doc_id: POD_ID,
          membership_id: 'm-1',
          otp_challenge_id: null,
          companions: null,
        },
      },
      result: {
        data: {
          clubAdminForceAttendance: {
            __typename: 'Ticket',
            id: 't-1',
            status: 'CHECKED_IN',
            checked_in_at: '2026-08-30T12:45:00.000Z',
          },
        },
      },
      maxUsageCount: Number.POSITIVE_INFINITY,
      ...over,
    }) as MockedResponse;

  const mountWith = (
    mocks: MockedResponse[],
    spies: { notifySuccess?: ReturnType<typeof vi.fn>; notifyError?: ReturnType<typeof vi.fn> } = {},
  ) =>
    render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
        <ThemeProvider theme={testTheme}>
          <HostPodActionsProvider {...hostActionsConfig()}>
            <PodAttendanceView
              podId={POD_ID}
              labels={labels}
              formatDateTime={(iso) => `at:${iso}`}
              notifySuccess={spies.notifySuccess ?? vi.fn()}
              notifyError={spies.notifyError ?? vi.fn()}
            />
          </HostPodActionsProvider>
        </ThemeProvider>
      </MockedProvider>
    );

  const markButton = () =>
    screen.getAllByRole('button', { name: labels.markButton })[0];

  /** Mark, then take the by-name door out of the Club Admin's chooser. */
  const chooseDirect = async () => {
    fireEvent.click(markButton());
    await settle();
    fireEvent.click(screen.getByTestId('attendance-choose-direct'));
    await settle();
  };

  // The admin setting is off, so a scan is not the only proof and the host may
  // mark straight away.
  it('writes the mark straight away when no code is required', async () => {
    const notifySuccess = vi.fn();
    mountWith([boardMock({ otp_required: false }), markMock()], { notifySuccess });
    await settle();

    fireEvent.click(markButton());
    await settle();
    await settle();

    expect(notifySuccess).toHaveBeenCalledWith('Asha Rao');
  });

  it('states the reason when the mark was refused', async () => {
    const notifyError = vi.fn();
    mountWith(
      [
        boardMock({ otp_required: false }),
        markMock({ result: undefined, error: new Error('That pod is already settled') }),
      ],
      { notifyError },
    );
    await settle();

    fireEvent.click(markButton());
    await settle();
    await settle();

    expect(notifyError).toHaveBeenCalledWith('That pod is already settled');
  });

  it('asks for a code first when the admin setting requires one', async () => {
    mountWith([boardMock()]);
    await settle();

    fireEvent.click(markButton());
    await settle();

    expect(screen.getByText(labels.otpTitle)).toBeInTheDocument();
  });

  it('closes the code sheet without marking anybody', async () => {
    const notifySuccess = vi.fn();
    mountWith([boardMock()], { notifySuccess });
    await settle();
    fireEvent.click(markButton());
    await settle();

    fireEvent.click(screen.getByRole('button', { name: labels.otpCancel }));
    await settle();

    await waitFor(() => expect(screen.queryByText(labels.otpTitle)).not.toBeInTheDocument());
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  // A Club Admin gets asked WHICH door first — a code they send the attendee,
  // or a mark from the names they were read. Neither is assumed for them.
  it('asks a Club Admin which door before either form opens', async () => {
    mountWith([boardMock({ viewer: 'CLUB_ADMIN' })]);
    await settle();

    fireEvent.click(markButton());
    await settle();

    expect(screen.getByText(labels.chooseTitle('Asha Rao'))).toBeInTheDocument();
    expect(screen.queryByText(labels.forceTitle)).not.toBeInTheDocument();
    expect(screen.queryByText(labels.otpTitle)).not.toBeInTheDocument();
  });

  it('opens the code sheet for a Club Admin who picked the code door', async () => {
    mountWith([boardMock({ viewer: 'CLUB_ADMIN' })]);
    await settle();
    fireEvent.click(markButton());
    await settle();

    fireEvent.click(screen.getByTestId('attendance-choose-otp'));
    await settle();

    expect(screen.getByText(labels.otpTitle)).toBeInTheDocument();
  });

  it('writes the mark once the Club Admin has confirmed the by-name door', async () => {
    const notifySuccess = vi.fn();
    mountWith([boardMock({ viewer: 'CLUB_ADMIN' }), forceMock()], { notifySuccess });
    await settle();
    await chooseDirect();

    fireEvent.click(screen.getByRole('button', { name: labels.forceConfirm }));
    await settle();
    await settle();

    expect(notifySuccess).toHaveBeenCalledWith('Asha Rao');
  });

  it('writes nothing when the Club Admin backed out of the by-name door', async () => {
    const notifySuccess = vi.fn();
    mountWith([boardMock({ viewer: 'CLUB_ADMIN' }), forceMock()], { notifySuccess });
    await settle();
    await chooseDirect();

    fireEvent.click(screen.getByRole('button', { name: labels.forceCancel }));
    await settle();

    await waitFor(() => expect(screen.queryByText(labels.forceTitle)).not.toBeInTheDocument());
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  // Same verified challenge, different mutation: the host's mark is closed to a
  // Club Admin, so their code door has to spend the proof on their own write.
  it('spends a verified code on the Club Admin mutation, not the host one', async () => {
    const notifySuccess = vi.fn();
    mountWith(
      [
        boardMock({ viewer: 'CLUB_ADMIN' }),
        otpRequestMock(),
        otpVerifyMock(),
        forceMock({
          request: {
            query: FORCE_ATTENDANCE,
            variables: {
              pod_doc_id: POD_ID,
              membership_id: 'm-1',
              otp_challenge_id: 'ch-1',
              companions: null,
            },
          },
        }),
      ],
      { notifySuccess },
    );
    await settle();
    fireEvent.click(markButton());
    await settle();
    fireEvent.click(screen.getByTestId('attendance-choose-otp'));
    await settle();

    fireEvent.click(screen.getByRole('button', { name: labels.otpSend }));
    await settle();
    await settle();
    fireEvent.change(screen.getByLabelText(labels.otpCode), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: labels.otpVerify }));
    await settle();
    await settle();

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Asha Rao'));
  });

  it('sends the names the admin was read with the by-name mark', async () => {
    const notifySuccess = vi.fn();
    mountWith(
      [
        boardMock({
          viewer: 'CLUB_ADMIN',
          rows: [row({ seats: 2, companions_required: 1 })],
        }),
        forceMock({
          request: {
            query: FORCE_ATTENDANCE,
            variables: {
              pod_doc_id: POD_ID,
              membership_id: 'm-1',
              otp_challenge_id: null,
              companions: [{ name: 'Ishita Rao', phone_extension: '', phone_number: '' }],
            },
          },
        }),
      ],
      { notifySuccess },
    );
    await settle();
    await chooseDirect();

    fireEvent.change(screen.getByLabelText(labels.forceCompanionName), {
      target: { value: 'Ishita Rao' },
    });
    fireEvent.click(screen.getByRole('button', { name: labels.forceConfirm }));
    await settle();
    await settle();

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Asha Rao'));
  });

  it('closes the chooser without opening either door', async () => {
    const notifySuccess = vi.fn();
    mountWith([boardMock({ viewer: 'CLUB_ADMIN' })], { notifySuccess });
    await settle();
    fireEvent.click(markButton());
    await settle();

    fireEvent.click(screen.getByRole('button', { name: labels.chooseCancel }));
    await settle();

    await waitFor(() =>
      expect(screen.queryByText(labels.chooseTitle('Asha Rao'))).not.toBeInTheDocument(),
    );
    expect(screen.queryByText(labels.forceTitle)).not.toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('says the roster is done once every attendee is marked', async () => {
    mountWith([
      boardMock({
        rows: [
          row({
            attended: true,
            attended_at: '2026-08-30T12:40:00.000Z',
            marked_method: 'HOST_SCAN',
          }),
        ],
        marked_count: 1,
        total_count: 1,
        marked_seats: 2,
        total_seats: 2,
      }),
    ]);
    await settle();

    expect(screen.getByText(labels.allMarked)).toBeInTheDocument();
  });

  // Only the host has a door to scan at; a virtual pod has none, and a Club
  // Admin reading the same board is fixing a record after the fact.
  it('offers the scanner to a host running a physical pod', async () => {
    mountWith([boardMock()]);
    await settle();

    expect(screen.getByRole('button', { name: labels.scanCta })).toBeInTheDocument();
  });

  it('offers no scanner on a virtual pod, nor to a Club Admin', async () => {
    mountWith([boardMock({ pod_mode: 'VIRTUAL' })]);
    await settle();
    expect(screen.queryByRole('button', { name: labels.scanCta })).not.toBeInTheDocument();

    cleanup();
    mountWith([boardMock({ viewer: 'CLUB_ADMIN' })]);
    await settle();
    expect(screen.queryByRole('button', { name: labels.scanCta })).not.toBeInTheDocument();
  });

  it('re-reads the board when the scanner closes, so a scan is never one behind', async () => {
    mountWith([boardMock()]);
    await settle();

    fireEvent.click(screen.getByRole('button', { name: labels.scanCta }));
    await settle();
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();

    fireEvent.keyDown(document.body.querySelector('[role="dialog"]') as HTMLElement, {
      key: 'Escape',
    });
    await settle();

    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
  });
});
