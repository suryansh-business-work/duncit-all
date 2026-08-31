/**
 * The edges every one of these screens has to survive.
 *
 * A row with no name, an attendee who was marked with no method recorded, a
 * settlement with no roster behind it, a challenge the server issued nothing
 * for — none of them are the happy path, and all of them reach a real host.
 */
import type { ReactNode } from 'react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { mwebAttendanceLabels, mwebPodMediaLabels, type PodAttendanceRow } from '@duncit/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AttendanceOtpDialog from '../src/attendance/AttendanceOtpDialog';
import AttendanceRow from '../src/attendance/AttendanceRow';
import CompanionsForm from '../src/ticket-scan/CompanionsForm';
import PodEditDialog from '../src/PodEditDialog';
import PodResubmitDialog from '../src/pod-resubmit/PodResubmitDialog';
import SettlementPreview from '../src/pod-complete/SettlementPreview';
import AttendanceRoster from '../src/pod-complete/AttendanceRoster';
import { HostPodActionsProvider } from '../src/HostPodActionsProvider';
import { useAttendanceBoard } from '../src/attendance/useAttendanceBoard';
import { usePodMediaBoard } from '../src/pod-media/usePodMediaBoard';
import { writeFailure } from '../src/write-failure';
import { POD_ATTENDANCE_BOARD, REQUEST_ATTENDANCE_OTP } from '../src/attendance/queries';
import { POD_MEDIA_BOARD } from '../src/pod-media/queries';
import { MODERATE_POD_CONTENT, POD_SETTLEMENT_PREVIEW, POD_SPOT_LIMITS, RESUBMIT_VENUES } from '../src/queries';
import { hostActionsConfig, labelsFor } from './host-actions-config';
import type { HostPodTarget } from '../src/types';

const labels = labelsFor();
const attendanceLabels = mwebAttendanceLabels(
  (key: string, options?: { vars?: Record<string, string | number> }) => {
    const vars = Object.values(options?.vars ?? {});
    return vars.length ? `${key} ${vars.join(' ')}` : key;
  },
);
const mediaLabels = mwebPodMediaLabels((key: string) => key);
const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const wrap = (ui: ReactNode, mocks: readonly MockedResponse[] = []) =>
  render(
    <MockedProvider mocks={[...mocks]}>
      <ThemeProvider theme={testTheme}>
        <HostPodActionsProvider {...hostActionsConfig()}>{ui}</HostPodActionsProvider>
      </ThemeProvider>
    </MockedProvider>
  );

const hookWrapper =
  (mocks: readonly MockedResponse[] = []) =>
  ({ children }: { children: ReactNode }) => (
    <MockedProvider mocks={[...mocks]}>
      <ThemeProvider theme={testTheme}>
        <HostPodActionsProvider {...hostActionsConfig()}>{children}</HostPodActionsProvider>
      </ThemeProvider>
    </MockedProvider>
  );

const row = (over: Partial<PodAttendanceRow> = {}): PodAttendanceRow =>
  (({
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
    companions_required: 0,
    ...over
  }) as PodAttendanceRow);

afterEach(() => {
  vi.clearAllMocks();
});

describe('writeFailure', () => {
  it('shows the sentence the server actually sent', () => {
    expect(writeFailure(new Error('That pod is already settled'), 'fallback')).toBe(
      'That pod is already settled',
    );
  });

  it('falls back to the localised line when what was thrown says nothing', () => {
    expect(writeFailure('boom', 'Could not save')).toBe('Could not save');
    expect(writeFailure(undefined, 'Could not save')).toBe('Could not save');
    expect(writeFailure({ message: 'not an Error' }, 'Could not save')).toBe('Could not save');
  });
});

describe('a roster row with less than the usual on it', () => {
  it('falls back to a question mark for an attendee with no name at all', () => {
    wrap(
      <AttendanceRow
        row={row({ name: '' })}
        labels={attendanceLabels}
        canMark
        busy={false}
        formatDateTime={(iso) => iso}
        onMark={vi.fn()}
      />,
    );

    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('leaves the method out of the caption when the record does not name one', () => {
    wrap(
      <AttendanceRow
        row={row({ attended: true, attended_at: null, marked_by_name: null, marked_method: null })}
        labels={attendanceLabels}
        canMark
        busy={false}
        formatDateTime={(iso) => iso}
      />,
    );

    expect(screen.getByText(attendanceLabels.markedChip)).toBeInTheDocument();
  });
});

describe('an OTP sheet the server answered thinly', () => {
  it('opens no code box for a request that issued no challenge', async () => {
    wrap(
      <AttendanceOtpDialog
        podId="pod-1"
        row={row()}
        labels={attendanceLabels}
        onClose={vi.fn()}
        onVerified={vi.fn()}
      />,
      [
        {
          request: { query: REQUEST_ATTENDANCE_OTP, variables: () => true },
          result: { data: { requestPodAttendanceOtp: null } },
          maxUsageCount: Number.POSITIVE_INFINITY,
        },
      ],
    );
    await settle();

    fireEvent.click(screen.getByRole('button', { name: attendanceLabels.otpSend }));
    await settle();
    await settle();

    expect(screen.queryByLabelText(attendanceLabels.otpCode)).not.toBeInTheDocument();
  });

  it('shows what is wrong under each field it refused', async () => {
    wrap(
      <AttendanceOtpDialog
        podId="pod-1"
        row={row({ name: '', phone_extension: 'IN', phone_number: '12' })}
        labels={attendanceLabels}
        onClose={vi.fn()}
        onVerified={vi.fn()}
      />,
    );
    await settle();

    fireEvent.click(screen.getByRole('button', { name: attendanceLabels.otpSend }));
    await settle();

    expect(screen.getByText(attendanceLabels.otpNameRequired)).toBeInTheDocument();
    expect(screen.getByText(attendanceLabels.otpExtensionInvalid)).toBeInTheDocument();
    expect(screen.getByText(attendanceLabels.otpPhoneInvalid)).toBeInTheDocument();
  });

  it('says which channel is missing when the host unticks both', async () => {
    wrap(
      <AttendanceOtpDialog
        podId="pod-1"
        row={row()}
        labels={attendanceLabels}
        onClose={vi.fn()}
        onVerified={vi.fn()}
      />,
    );
    await settle();

    fireEvent.click(screen.getByLabelText(attendanceLabels.otpMediumWhatsapp));
    fireEvent.click(screen.getByLabelText(attendanceLabels.otpMediumSms));
    fireEvent.click(screen.getByRole('button', { name: attendanceLabels.otpSend }));
    await settle();

    expect(screen.getByText(attendanceLabels.otpMediumRequired)).toBeInTheDocument();
  });
});

describe('useAttendanceBoard before the board has arrived', () => {
  const boardMock: MockedResponse = {
    request: { query: POD_ATTENDANCE_BOARD, variables: { pod_doc_id: 'pod-1' } },
    result: {
      data: {
        podAttendanceBoard: {
          pod_id: 'DUN-POD-4821',
          pod_title: 'Sunday Badminton',
          pod_date_time: '2026-08-30T12:30:00.000Z',
          pod_end_date_time: null,
          pod_mode: 'PHYSICAL',
          viewer: 'HOST',
          lock: null,
          can_mark: true,
          otp_required: true,
          marked_count: 0,
          total_count: 1,
          marked_seats: 0,
          total_seats: 1,
          rows: [row()],
          club_admins: [],
        },
      },
    },
    maxUsageCount: Number.POSITIVE_INFINITY,
  };

  // A mark asked for before the board resolved has nothing to decide against.
  it('starts no mark at all', () => {
    const { result } = renderHook(
      () => useAttendanceBoard('pod-1', vi.fn(), vi.fn()),
      { wrapper: hookWrapper([boardMock]) },
    );

    act(() => result.current.startMark(row()));

    expect(result.current.otpRow).toBeNull();
    expect(result.current.forceRow).toBeNull();
    expect(result.current.busyId).toBe('');
  });

  // A verified challenge with no row behind it is a sheet that was closed while
  // the code was being checked.
  it('spends nothing when a code comes back for a row nobody is on', async () => {
    const notifySuccess = vi.fn();
    const { result } = renderHook(
      () => useAttendanceBoard('pod-1', notifySuccess, vi.fn()),
      { wrapper: hookWrapper([boardMock]) },
    );
    await settle();

    act(() => result.current.finishMark('ch-1'));
    await settle();

    expect(notifySuccess).not.toHaveBeenCalled();
    expect(result.current.busyId).toBe('');
  });
});

describe('usePodMediaBoard', () => {
  const boardMock: MockedResponse = {
    request: { query: POD_MEDIA_BOARD, variables: { pod_doc_id: 'pod-1' } },
    result: {
      data: {
        podMediaBoard: {
          pod_id: 'DUN-POD-4821',
          pod_title: 'Sunday Badminton',
          pod_date_time: '2026-08-30T12:30:00.000Z',
          viewer: 'HOST',
          can_upload: true,
          is_cancelled: false,
          count: 0,
          items: [],
        },
      },
    },
    maxUsageCount: Number.POSITIVE_INFINITY,
  };

  it('sends nothing to the pod when there was nothing to send', async () => {
    const notifySuccess = vi.fn();
    const { result } = renderHook(
      () =>
        usePodMediaBoard({
          podId: 'pod-1',
          labels: mediaLabels,
          notifySuccess,
          notifyError: vi.fn(),
        }),
      { wrapper: hookWrapper([boardMock]) },
    );
    await settle();

    await act(async () => {
      await result.current.add([]);
    });

    expect(notifySuccess).not.toHaveBeenCalled();
  });
});

describe('AttendanceRoster money', () => {
  it('prices a booking the server sent no amount for at zero', () => {
    wrap(
      <AttendanceRoster
        attendees={[
          {
            membership_id: 'm-1',
            user_id: 'u-1',
            name: 'Asha Rao',
            seats: 1,
            attended: true,
            attended_at: null,
            amount: 0,
          } as never,
        ]}
        attendedSeats={1}
        bookedSeats={1}
        symbol="₹"
        onScan={vi.fn()}
      />,
    );

    expect(screen.getByText(/1 seat · ₹0.00/)).toBeInTheDocument();
  });
});

describe('SettlementPreview thin answers', () => {
  const previewMock = (over: Partial<MockedResponse>): MockedResponse =>
    ({
      request: {
        query: POD_SETTLEMENT_PREVIEW,
        variables: { pod_id: 'pod-1', venue_bill_amount: 0 },
      },
      maxUsageCount: Number.POSITIVE_INFINITY,
      ...over,
    }) as MockedResponse;

  it('reads the server sentence off a refusal, not the transport wrapper', async () => {
    wrap(
      <SettlementPreview podId="pod-1" venueBillAmount={0} onScan={vi.fn()} refreshToken={0} />,
      [previewMock({ result: { errors: [{ message: 'This pod took no money' } as never] } })],
    );
    await settle();

    expect(screen.getByTestId('settlement-preview-error').textContent).toContain(
      'This pod took no money',
    );
  });

  it('renders a settlement whose roster came back as nothing at all', async () => {
    wrap(
      <SettlementPreview podId="pod-1" venueBillAmount={0} onScan={vi.fn()} refreshToken={0} />,
      [
        previewMock({
          result: {
            data: {
              podSettlementPreview: {
                currency_symbol: '₹',
                collected_total: 0,
                has_venue: false,
                paying_attendees: 0,
                attended_seats: 0,
                booked_seats: 0,
                attended_total: 0,
                attendees: null,
                waterfall: {
                  version: 1,
                  amount: 0,
                  gst_pct: 18,
                  gst_amount: 0,
                  net_amount: 0,
                  platform_fee_pct: 10,
                  platform_fee_amount: 0,
                  pool_amount: 0,
                  venue_amount: 0,
                  venue_commission_pct: 0,
                  venue_commission_amount: 0,
                  venue_receives: 0,
                  host_amount: 0,
                  host_commission_pct: 0,
                  host_commission_amount: 0,
                  host_receives: 0,
                  duncit_revenue: 0,
                  host_earn_pct: 0,
                },
              },
            },
          },
        }),
      ],
    );
    await settle();

    expect(screen.getByTestId('settlement-attendees')).toBeInTheDocument();
  });
});

describe('a form that will not submit', () => {
  const IMG = 'https://cdn.duncit.com/pod/a.jpg';
  const pod = (over: Partial<HostPodTarget> = {}): HostPodTarget =>
    (({
      id: 'pod-1',
      pod_title: 'Sunday Badminton',
      pod_description: 'Doubles at Court 2, all levels welcome.',
      pod_images_and_videos: [{ url: IMG, type: 'IMAGE' }],
      no_of_spots: 0,
      ...over
    }) as HostPodTarget);

  const limitsMock: MockedResponse = {
    request: { query: POD_SPOT_LIMITS, variables: { pod_doc_id: 'pod-1' } },
    result: {
      data: {
        podSpotLimits: {
          current: 8,
          min: 2,
          max: 20,
          seats_taken: 4,
          venue_capacity: 0,
          min_pax: 2,
          slidable: true,
          can_decrease: true,
        },
      },
    },
    maxUsageCount: Number.POSITIVE_INFINITY,
  };

  const failedCheck: MockedResponse = {
    request: { query: MODERATE_POD_CONTENT, variables: () => true },
    error: new Error('The content check is unavailable'),
    maxUsageCount: Number.POSITIVE_INFINITY,
  };

  it('says what is wrong under the title and the description of an edit', async () => {
    wrap(<PodEditDialog pod={pod()} onClose={vi.fn()} onSaved={vi.fn()} />, [limitsMock]);
    await settle();
    await settle();

    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'ab' } });
    fireEvent.change(screen.getAllByRole('textbox')[1], { target: { value: 'short' } });
    fireEvent.submit(document.querySelector('#pod-edit-form') as HTMLFormElement);
    await settle();
    await settle();

    expect(screen.getByText(labels.titleTooShort)).toBeInTheDocument();
    expect(screen.getByText(labels.descriptionTooShort)).toBeInTheDocument();
  });

  // The capacity is seeded from the server, so the control opens on the range
  // rather than on the zero the row happened to carry.
  it('seeds the capacity from the server range, not the row', async () => {
    wrap(<PodEditDialog pod={pod()} onClose={vi.fn()} onSaved={vi.fn()} />, [limitsMock]);
    await settle();
    await settle();

    expect(screen.getByText(labels.spotsFreeHint(2, 4))).toBeInTheDocument();
  });

  it('states a content check that could not be run at all', async () => {
    wrap(<PodEditDialog pod={pod()} onClose={vi.fn()} onSaved={vi.fn()} />, [
      limitsMock,
      failedCheck,
    ]);
    await settle();
    await settle();

    fireEvent.submit(document.querySelector('#pod-edit-form') as HTMLFormElement);
    await settle();
    await settle();

    expect(screen.getByText(/check is unavailable|Network error/)).toBeInTheDocument();
  });

  it('says what is wrong under the title of a resubmission, and states a failed check', async () => {
    wrap(<PodResubmitDialog pod={pod()} onClose={vi.fn()} onSaved={vi.fn()} />, [
      {
        request: { query: RESUBMIT_VENUES },
        result: { data: { publicVenues: [] } },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
      failedCheck,
    ]);
    await settle();

    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'ab' } });
    fireEvent.submit(document.querySelector('#pod-resubmit-form') as HTMLFormElement);
    await settle();
    await settle();

    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });
});

describe('CompanionsForm refusals', () => {
  // The server enforces the same count, so a half-filled form cannot mark a
  // group present — it can only fail.
  it('says what is wrong under each companion field', async () => {
    const onSubmit = vi.fn();
    wrap(<CompanionsForm seats={2} required={1} onSubmit={onSubmit} />);

    const [name, phone] = screen.getAllByRole('textbox');
    fireEvent.input(name, { target: { value: 'A' } });
    fireEvent.input(phone, { target: { value: '12' } });
    await settle();
    fireEvent.submit(name.closest('form') as HTMLFormElement);
    await settle();
    await settle();

    expect(screen.getByText(labels.nameInvalid)).toBeInTheDocument();
    expect(screen.getByText(labels.phoneInvalid)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
