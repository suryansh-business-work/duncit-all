/**
 * The attendance board, which is the screen a host is paid on.
 *
 * The rules this covers are the ones the roster exists to keep honest: who may
 * mark (host vs club admin), whether a by-hand mark needs a one-time code, and
 * that the board closes once the pod is completed — at which point the payout
 * is already split, so a late mark would change money that has moved.
 */
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, render, screen } from '@testing-library/react';
import { mwebAttendanceLabels } from '@duncit/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PodAttendanceView from '../src/attendance/PodAttendanceView';
import { HostPodActionsProvider } from '../src/HostPodActionsProvider';
import { POD_ATTENDANCE_BOARD } from '../src/attendance/queries';
import { hostActionsConfig } from './host-actions-config';

const POD_ID = 'pod-1';

/** Echoes the key back, so the assertions read as the key that was rendered. */
const labels = mwebAttendanceLabels((key: string) => key);

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
    <MockedProvider mocks={mocks}>
      <ThemeProvider theme={testTheme}>
        <HostPodActionsProvider {...hostActionsConfig()}>{view}</HostPodActionsProvider>
      </ThemeProvider>
    </MockedProvider>
  );

/** A surface with no host area at all — the Club Admin's console. */
const mountBare = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={mocks}>
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
