import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PodAttendanceBoard, PodAttendanceRow } from '@duncit/utils';

import {
  ClubAdminForceAttendanceDocument,
  HostMarkAttendanceDocument,
  PodAttendanceBoardDocument,
} from '@/graphql/attendance';
import { graphqlRequest } from '@/services/graphql.client';
import { useAttendanceBoard } from '@/hooks/useAttendanceBoard';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const row: PodAttendanceRow = {
  membership_id: 'm1',
  user_id: 'u1',
  ticket_id: 't1',
  ticket_code: 'TK1',
  name: 'Asha',
  avatar_url: '',
  email: 'asha@example.com',
  phone_extension: '+91',
  phone_number: '9000000001',
  seats: 1,
  attended: false,
  attended_at: null,
  marked_method: null,
  marked_by_name: '',
  verified_phone: '',
  companions: [],
  companions_required: 0,
};

function board(over: Partial<PodAttendanceBoard> = {}): PodAttendanceBoard {
  return {
    pod_id: 'p1',
    pod_title: 'Pod',
    pod_date_time: null,
    pod_end_date_time: null,
    pod_mode: 'PHYSICAL',
    viewer: 'HOST',
    lock: 'OPEN',
    can_mark: true,
    complete_deadline: null,
    complete_timeout_hours: 24,
    otp_required: false,
    marked_count: 0,
    total_count: 1,
    marked_seats: 0,
    total_seats: 1,
    rows: [row],
    club_admins: [],
    ...over,
  };
}

/** Answers every board read with `b`, and every write with `write`. */
function serve(b: PodAttendanceBoard, write: () => Promise<unknown> = async () => ({})) {
  mockRequest.mockImplementation((doc: unknown) =>
    doc === PodAttendanceBoardDocument ? Promise.resolve({ podAttendanceBoard: b }) : write(),
  );
}

async function mounted(b: PodAttendanceBoard, write?: () => Promise<unknown>) {
  serve(b, write);
  const hook = renderHook(() => useAttendanceBoard('p1'));
  await waitFor(() => expect(hook.result.current.board).toEqual(b));
  return hook;
}

const writes = (doc: unknown) => mockRequest.mock.calls.filter(([d]) => d === doc);

beforeEach(() => mockRequest.mockReset());

describe('useAttendanceBoard — loading', () => {
  it('reads the board for the pod with auth and stops loading', async () => {
    const { result } = await mounted(board());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('');
    expect(mockRequest).toHaveBeenCalledWith(
      PodAttendanceBoardDocument,
      { pod_doc_id: 'p1' },
      { auth: true },
    );
  });

  it('stays loading and never asks the server when there is no pod id', () => {
    const { result } = renderHook(() => useAttendanceBoard(''));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.board).toBeNull();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('reports a failed read as the error message', async () => {
    mockRequest.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useAttendanceBoard('p1'));
    await waitFor(() => expect(result.current.error).toBe('offline'));
    expect(result.current.board).toBeNull();
  });

  it('reports an empty message when the failure carries none', async () => {
    mockRequest.mockRejectedValueOnce(undefined);
    const { result } = renderHook(() => useAttendanceBoard('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('');
    expect(result.current.board).toBeNull();
  });
});

describe('useAttendanceBoard — host marking', () => {
  it('ignores a Mark press before the board has loaded', () => {
    mockRequest.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useAttendanceBoard('p1'));
    act(() => result.current.startMark(row));
    expect(result.current.otpRow).toBeNull();
    expect(result.current.choiceRow).toBeNull();
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('marks straight away when no code is required, then re-reads the board', async () => {
    const { result } = await mounted(board());
    await act(async () => result.current.startMark(row));
    await waitFor(() => expect(writes(PodAttendanceBoardDocument)).toHaveLength(2));
    await waitFor(() => expect(result.current.busyId).toBe(''));
    expect(writes(HostMarkAttendanceDocument)[0]).toEqual([
      HostMarkAttendanceDocument,
      { pod_doc_id: 'p1', membership_id: 'm1', otp_challenge_id: null },
      { auth: true },
    ]);
    expect(writes(PodAttendanceBoardDocument)).toHaveLength(2);
  });

  it('opens the code step when the setting requires one', async () => {
    const { result } = await mounted(board({ otp_required: true }));
    act(() => result.current.startMark(row));
    expect(result.current.otpRow).toEqual(row);
    expect(writes(HostMarkAttendanceDocument)).toHaveLength(0);

    act(() => result.current.cancelOtp());
    expect(result.current.otpRow).toBeNull();
  });

  it('spends a verified challenge on the host mutation', async () => {
    const { result } = await mounted(board({ otp_required: true }));
    act(() => result.current.startMark(row));
    await act(async () => result.current.finishMark('ch-1'));
    await waitFor(() => expect(writes(HostMarkAttendanceDocument)).toHaveLength(1));
    expect(writes(HostMarkAttendanceDocument)[0][1]).toEqual({
      pod_doc_id: 'p1',
      membership_id: 'm1',
      otp_challenge_id: 'ch-1',
    });
    expect(result.current.otpRow).toBeNull();
  });

  it('does nothing when a code finishes with no row waiting for it', async () => {
    const { result } = await mounted(board());
    act(() => result.current.finishMark('ch-1'));
    expect(writes(HostMarkAttendanceDocument)).toHaveLength(0);
  });

  it('surfaces a failed mark and clears the busy row', async () => {
    const { result } = await mounted(board(), () => Promise.reject(new Error('FORBIDDEN')));
    await act(async () => result.current.startMark(row));
    await waitFor(() => expect(result.current.error).toBe('FORBIDDEN'));
    expect(result.current.busyId).toBe('');
  });

  it('falls back to an empty message when a mark fails without one', async () => {
    const { result } = await mounted(board(), () => Promise.reject(undefined));
    await act(async () => result.current.startMark(row));
    await waitFor(() => expect(writes(HostMarkAttendanceDocument)).toHaveLength(1));
    expect(result.current.error).toBe('');
  });
});

describe('useAttendanceBoard — Club Admin doors', () => {
  const admin = () => board({ viewer: 'CLUB_ADMIN', otp_required: true });

  it('asks which door first, and the code door hands the row to the OTP step', async () => {
    const { result } = await mounted(admin());
    act(() => result.current.startMark(row));
    expect(result.current.choiceRow).toEqual(row);
    expect(result.current.otpRow).toBeNull();

    act(() => result.current.chooseOtp());
    expect(result.current.choiceRow).toBeNull();
    expect(result.current.otpRow).toEqual(row);
  });

  it('spends a verified code on the Club Admin mutation with no companions', async () => {
    const { result } = await mounted(admin());
    act(() => result.current.startMark(row));
    act(() => result.current.chooseOtp());
    await act(async () => result.current.finishMark('ch-9'));
    await waitFor(() => expect(writes(ClubAdminForceAttendanceDocument)).toHaveLength(1));
    expect(writes(ClubAdminForceAttendanceDocument)[0][1]).toEqual({
      pod_doc_id: 'p1',
      membership_id: 'm1',
      otp_challenge_id: 'ch-9',
      companions: null,
    });
    expect(writes(HostMarkAttendanceDocument)).toHaveLength(0);
  });

  it('the by-name door names the attendee before a forced mark with companions', async () => {
    const { result } = await mounted(admin());
    act(() => result.current.startMark(row));
    act(() => result.current.chooseDirect());
    expect(result.current.forceRow).toEqual(row);

    const companions = [{ name: 'Ravi', phone_extension: '+91', phone_number: '9000000002' }];
    await act(async () => result.current.confirmForce(row, companions));
    await waitFor(() => expect(writes(ClubAdminForceAttendanceDocument)).toHaveLength(1));
    expect(result.current.forceRow).toBeNull();
    expect(writes(ClubAdminForceAttendanceDocument)[0][1]).toMatchObject({
      otp_challenge_id: null,
      companions,
    });
  });

  it('closing the chooser with no row picked opens nothing', async () => {
    const { result } = await mounted(admin());
    act(() => result.current.chooseDirect());
    expect(result.current.forceRow).toBeNull();

    act(() => result.current.startMark(row));
    act(() => result.current.cancelChoice());
    expect(result.current.choiceRow).toBeNull();
  });

  it('the page-level search opens, picks straight to the warning, and cancels', async () => {
    const { result } = await mounted(admin());
    act(() => result.current.openDirect());
    expect(result.current.directOpen).toBe(true);
    act(() => result.current.cancelDirect());
    expect(result.current.directOpen).toBe(false);

    act(() => result.current.openDirect());
    act(() => result.current.pickDirect(row));
    expect(result.current.directOpen).toBe(false);
    expect(result.current.forceRow).toEqual(row);
    act(() => result.current.cancelForce());
    expect(result.current.forceRow).toBeNull();
  });

  it('surfaces a failed forced mark', async () => {
    const { result } = await mounted(admin(), () => Promise.reject(new Error('LOCKED')));
    await act(async () => result.current.confirmForce(row, []));
    await waitFor(() => expect(result.current.error).toBe('LOCKED'));
    expect(result.current.busyId).toBe('');
  });

  it('falls back to an empty message when a forced mark fails without one', async () => {
    const { result } = await mounted(admin(), () => Promise.reject(undefined));
    await act(async () => result.current.confirmForce(row, []));
    await waitFor(() => expect(writes(ClubAdminForceAttendanceDocument)).toHaveLength(1));
    expect(result.current.error).toBe('');
  });
});
