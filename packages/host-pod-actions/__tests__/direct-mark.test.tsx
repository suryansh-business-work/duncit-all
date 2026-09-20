/**
 * The Club Admin's by-name door.
 *
 * The roster answers "who booked this pod"; this answers the call the admin is
 * actually on — "the host never scanned me, my name is X" — without first
 * finding a row. It searches the board's own bookings, keeps the already-marked
 * ones visible but disabled (a different answer from "not found"), and hands
 * whatever is picked to the same warning a row's Mark opens, so nothing is
 * written from the search itself (rule 41).
 */
import type { ReactNode } from 'react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { mwebAttendanceLabels, type PodAttendanceRow } from '@duncit/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AttendanceDialogs from '../src/attendance/AttendanceDialogs';
import DirectMarkDialog from '../src/attendance/DirectMarkDialog';
import PodAttendanceView from '../src/attendance/PodAttendanceView';
import { POD_ATTENDANCE_BOARD } from '../src/attendance/queries';
import type { AttendanceBoardApi } from '../src/attendance/useAttendanceBoard';
import { HostPodActionsProvider } from '../src/HostPodActionsProvider';
import { hostActionsConfig } from './host-actions-config';

const POD_ID = 'pod-1';

/** Echoes the key back, with the vars appended, so assertions read as keys. */
const labels = mwebAttendanceLabels((key: string, options?: { vars?: Record<string, string | number> }) => {
  const vars = Object.values(options?.vars ?? {});
  return vars.length ? `${key} ${vars.join(' ')}` : key;
});

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
  phone_number: '9876543210',
  seats: 1,
  attended: false,
  attended_at: null,
  marked_method: null,
  marked_by_name: null,
  verified_phone: null,
  companions: [],
  companions_required: false,
  ...over,
});

const asha = row() as unknown as PodAttendanceRow;
const vikram = row({
  membership_id: 'm-2',
  user_id: 'u-2',
  ticket_id: 't-2',
  ticket_code: 'DUN-TKT-002',
  name: 'Vikram S',
  email: 'vikram@duncit.com',
  phone_number: '9123456789',
  seats: 3,
  attended: true,
  attended_at: '2026-08-30T12:40:00.000Z',
  marked_method: 'HOST_SCAN',
}) as unknown as PodAttendanceRow;

const board = (over: Record<string, unknown> = {}) => ({
  __typename: 'PodAttendanceBoard',
  pod_id: 'DUN-POD-001',
  pod_title: 'Sunday Badminton',
  pod_date_time: '2026-08-30T12:30:00.000Z',
  pod_end_date_time: '2026-08-30T14:00:00.000Z',
  viewer: 'CLUB_ADMIN',
  lock: null,
  can_mark: true,
  complete_deadline: null,
  complete_timeout_hours: 24,
  otp_required: true,
  marked_count: 1,
  total_count: 2,
  marked_seats: 3,
  total_seats: 4,
  rows: [asha, vikram],
  club_admins: [],
  ...over,
});

const boardMock = (over: Record<string, unknown> = {}): MockedResponse => ({
  request: { query: POD_ATTENDANCE_BOARD, variables: { pod_doc_id: POD_ID } },
  result: { data: { podAttendanceBoard: board(over) } },
});

let mocks: MockedResponse[] = [];

/** A Club Admin's console: no host area, so no host-actions provider. */
function Providers({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <ThemeProvider theme={testTheme}>{children}</ThemeProvider>
    </MockedProvider>
  );
}

const wrap = (ui: ReactNode, withMocks: MockedResponse[] = []) => {
  mocks = withMocks;
  return render(ui, { wrapper: Providers });
};

/** A host surface: the scanner its board mounts reads the host-actions config. */
function HostProviders({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Providers>
      <HostPodActionsProvider {...hostActionsConfig()}>{children}</HostPodActionsProvider>
    </Providers>
  );
}

const wrapHost = (ui: ReactNode, withMocks: MockedResponse[]) => {
  mocks = withMocks;
  return render(ui, { wrapper: HostProviders });
};

const searchBox = () => screen.getByRole('textbox', { name: labels.directSearchLabel });

const dialog = (over: Partial<Parameters<typeof DirectMarkDialog>[0]> = {}) => (
  <DirectMarkDialog open rows={[asha, vikram]} labels={labels} onClose={vi.fn()} onPick={vi.fn()} {...over} />
);

afterEach(() => {
  vi.clearAllMocks();
});

describe('DirectMarkDialog', () => {
  it('lists every booking, unmarked first, with the marked ones disabled and chipped', () => {
    wrap(dialog());

    const results = within(screen.getByTestId('attendance-direct-results')).getAllByRole('button');
    expect(results.map((result) => result.textContent?.startsWith('Asha Rao'))).toEqual([true, false]);

    const ashaResult = screen.getByTestId('attendance-direct-result-m-1');
    expect(ashaResult).toHaveProperty('disabled', false);
    expect(ashaResult.textContent).toContain('+91 9876543210 · DUN-TKT-001');
    expect(ashaResult.textContent).not.toContain('mweb.attendance.seats');

    const vikramResult = screen.getByTestId('attendance-direct-result-m-2');
    expect(vikramResult).toHaveProperty('disabled', true);
    expect(vikramResult.textContent).toContain(labels.markedChip);
    expect(vikramResult.textContent).toContain(labels.seats(3));
  });

  it('narrows to the name typed and hands the picked booking up, unwritten', () => {
    const onPick = vi.fn();
    wrap(dialog({ onPick }));

    fireEvent.change(searchBox(), { target: { value: 'asha' } });

    expect(screen.queryByTestId('attendance-direct-result-m-2')).toBeNull();
    fireEvent.click(screen.getByTestId('attendance-direct-result-m-1'));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ membership_id: 'm-1' }));
  });

  it('says a name matched nobody, which is not the same as an empty roster', () => {
    wrap(dialog());

    fireEvent.change(searchBox(), { target: { value: 'zzz' } });

    expect(screen.getByTestId('attendance-direct-no-match').textContent).toBe(labels.directNoMatch);
  });

  it('says the pod has no bookings at all when the roster is empty', () => {
    wrap(dialog({ rows: [] }));

    expect(screen.getByTestId('attendance-direct-no-match').textContent).toBe(labels.emptyRoster);
  });

  it('forgets the previous search each time it opens', () => {
    const { rerender } = wrap(dialog());
    fireEvent.change(searchBox(), { target: { value: 'asha' } });
    expect(screen.queryByTestId('attendance-direct-result-m-2')).toBeNull();

    rerender(dialog({ open: false }));
    rerender(dialog());

    expect(searchBox()).toHaveProperty('value', '');
    expect(screen.getByTestId('attendance-direct-result-m-2')).toBeTruthy();
  });

  it('closes without picking anybody', () => {
    const onClose = vi.fn();
    const onPick = vi.fn();
    wrap(dialog({ onClose, onPick }));

    fireEvent.click(screen.getByTestId('attendance-direct-cancel'));

    expect(onClose).toHaveBeenCalled();
    expect(onPick).not.toHaveBeenCalled();
  });
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

describe('PodAttendanceView direct mark', () => {
  it('offers the by-name door to a Club Admin, opens the search from it, and closes it again', async () => {
    wrap(view, [boardMock()]);
    await settle();

    fireEvent.click(screen.getByTestId('attendance-direct-cta'));
    await settle();
    expect(screen.getByText(labels.directTitle)).toBeTruthy();

    fireEvent.click(screen.getByTestId('attendance-direct-cancel'));
    await waitFor(() => expect(screen.queryByTestId('attendance-direct-search')).toBeNull());
  });

  it('never offers the door to the host, whose by-hand mark the OTP setting gates', async () => {
    wrapHost(view, [boardMock({ viewer: 'HOST' })]);
    await settle();

    expect(screen.queryByTestId('attendance-direct-cta')).toBeNull();
  });

  it('hands a picked booking straight to the warning that names them', async () => {
    wrap(view, [boardMock()]);
    await settle();
    fireEvent.click(screen.getByTestId('attendance-direct-cta'));
    await settle();

    fireEvent.click(screen.getByTestId('attendance-direct-result-m-1'));
    await settle();

    expect(screen.getByText(labels.forceTitle)).toBeTruthy();
    await waitFor(() => expect(screen.queryByTestId('attendance-direct-search')).toBeNull());
  });
});

describe('AttendanceDialogs', () => {
  const api: AttendanceBoardApi = {
    board: undefined,
    loading: true,
    errorText: '',
    refetch: vi.fn(),
    busyId: '',
    otpRow: null,
    choiceRow: null,
    forceRow: null,
    directOpen: true,
    startMark: vi.fn(),
    finishMark: vi.fn(),
    chooseOtp: vi.fn(),
    chooseDirect: vi.fn(),
    openDirect: vi.fn(),
    pickDirect: vi.fn(),
    cancelOtp: vi.fn(),
    cancelChoice: vi.fn(),
    cancelForce: vi.fn(),
    cancelDirect: vi.fn(),
    confirmForce: vi.fn(),
  };

  it('opens the by-name search on an empty roster while the board is still loading', () => {
    wrap(<AttendanceDialogs podId={POD_ID} labels={labels} api={api} />);

    expect(screen.getByTestId('attendance-direct-no-match').textContent).toBe(labels.emptyRoster);
  });
});
