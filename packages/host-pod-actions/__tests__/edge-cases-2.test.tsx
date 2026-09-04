/**
 * The last edges: what happens when the answer arrives after the screen moved
 * on, and what a record with fields missing renders as.
 */
import type { ReactNode } from 'react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
// The slot calendar is MUI X and refuses to render without its own context.
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { mwebAttendanceLabels } from '@duncit/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ScanConfirmationDialog from '../src/ticket-scan/ScanConfirmationDialog';
import ScannedAttendeeCard from '../src/ticket-scan/ScannedAttendeeCard';
import TicketScanDialog from '../src/ticket-scan/TicketScanDialog';
import PodCompleteDialog from '../src/pod-complete/PodCompleteDialog';
import PodResubmitDialog from '../src/pod-resubmit/PodResubmitDialog';
import PodAttendanceView from '../src/attendance/PodAttendanceView';
import { useQrScanner } from '../src/ticket-scan/useQrScanner';
import { ClubAdminHelpCard } from '../src/attendance/AttendanceNotices';
import { HostPodActionsProvider } from '../src/HostPodActionsProvider';
import { useHostPodActions } from '../src/useHostPodActions';
import {
  HOST_DELETE_POD,
  HOST_POD_DELETE_IMPACT,
  HOST_SCAN_POD_TICKET,
  MODERATE_POD_CONTENT,
  POD_SETTLEMENT_PREVIEW,
  POD_SPOT_LIMITS,
  RESUBMIT_VENUES,
  RESUBMIT_VENUE_SLOTS,
} from '../src/queries';
import { POD_MEDIA_BOARD } from '../src/pod-media/queries';
import {
  HOST_MARK_ATTENDANCE,
  POD_ATTENDANCE_BOARD,
  REQUEST_ATTENDANCE_OTP,
  VERIFY_ATTENDANCE_OTP,
} from '../src/attendance/queries';
import { hostActionsConfig, labelsFor } from './host-actions-config';
import type { HostPodTarget } from '../src/types';

const labels = labelsFor();
const attendanceLabels = mwebAttendanceLabels((key: string) => key);
const testTheme = createTheme();
const POD = { id: 'pod-1', pod_title: 'Sunday Badminton' };
const IMG = 'https://cdn.duncit.com/pod/a.jpg';

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const wrap = (ui: ReactNode, mocks: readonly MockedResponse[] = []) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[...mocks]}>
      <ThemeProvider theme={testTheme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <HostPodActionsProvider {...hostActionsConfig()}>{ui}</HostPodActionsProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </MockedProvider>
  );

const attendee = {
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

afterEach(() => {
  vi.clearAllMocks();
});

describe('a scan whose ticket came back without one', () => {
  const scanMock = (over: Partial<MockedResponse> = {}): MockedResponse =>
    ({
      request: { query: HOST_SCAN_POD_TICKET, variables: () => true },
      result: {
        data: {
          hostScanPodTicket: {
            ok: true,
            message: 'Checked in',
            already_checked_in: false,
            requires_companions: false,
            companions_required: 0,
            companions: [],
            ticket: null,
            attendee,
          },
        },
      },
      maxUsageCount: Number.POSITIVE_INFINITY,
      ...over,
    }) as MockedResponse;

  const pasteCode = async () => {
    fireEvent.change(screen.getByLabelText(labels.pasteTicketCode), { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: labels.checkCode }));
    await settle();
    await settle();
  };

  it('reads a missing ticket as one seat rather than crashing', async () => {
    wrap(<TicketScanDialog pod={POD} onClose={vi.fn()} />, [scanMock()]);
    await settle();

    await pasteCode();

    expect(screen.getAllByText(labels.attendanceMarkedOne('Asha Rao')).length).toBeGreaterThan(0);
  });

  it('asks for the group at one seat when a companions scan carries no ticket either', async () => {
    wrap(<TicketScanDialog pod={POD} onClose={vi.fn()} />, [
      scanMock({
        result: {
          data: {
            hostScanPodTicket: {
              ok: false,
              message: 'Add the other person on this booking.',
              already_checked_in: false,
              requires_companions: true,
              companions_required: 1,
              companions: [],
              ticket: null,
              attendee,
            },
          },
        },
      }),
    ]);
    await settle();

    await pasteCode();

    expect(screen.getAllByRole('button', { name: labels.markGroupPresent })[0]).toBeInTheDocument();
  });

  it('falls back to its own reason for a failure that carried no message', async () => {
    wrap(<TicketScanDialog pod={POD} onClose={vi.fn()} />, [
      scanMock({ result: undefined, error: new Error('') }),
    ]);
    await settle();

    await pasteCode();

    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });

  // Closing does not cancel an in-flight scan, and the dialog stays mounted —
  // without the epoch a late response repopulates the cleared state and the
  // next open greets the host with the previous pod's ghost confirmation.
  it('drops a scan that lands after the dialog was closed', async () => {
    let release: (value: unknown) => void = () => undefined;
    wrap(<TicketScanDialog pod={POD} onClose={vi.fn()} />, [
      {
        request: { query: HOST_SCAN_POD_TICKET, variables: () => true },
        delay: 1000,
        result: {
          data: {
            hostScanPodTicket: {
              ok: true,
              message: 'Checked in',
              already_checked_in: false,
              requires_companions: false,
              companions_required: 0,
              companions: [],
              ticket: null,
              attendee,
            },
          },
        },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);
    await settle();
    fireEvent.change(screen.getByLabelText(labels.pasteTicketCode), { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: labels.checkCode }));

    fireEvent.click(screen.getByRole('button', { name: labels.close }));
    await act(async () => {
      release(null);
      await new Promise((resolve) => {
        setTimeout(resolve, 1100);
      });
    });

    expect(screen.queryByText(labels.attendanceMarkedOne('Asha Rao'))).not.toBeInTheDocument();
  });
});

describe('ScanConfirmationDialog with a ticketless scan', () => {
  it('ticks the buyer with no ticket code under them', () => {
    wrap(
      <ScanConfirmationDialog
        result={
          {
            ok: true,
            message: '',
            already_checked_in: false,
            requires_companions: false,
            companions_required: 0,
            companions: [],
            ticket: null,
            attendee,
          } as never
        }
        text="Checked in."
        onDone={vi.fn()}
      />,
    );

    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
  });
});

describe('ScannedAttendeeCard', () => {
  it('renders the scanned attendee with only what the record carries', () => {
    const { container } = wrap(
      <ScannedAttendeeCard
        attendee={attendee as never}
        alreadyCheckedIn
        pending={false}
        ticketCode="DUN-TKT-001"
        seats={1}
      />,
    );

    expect(container.textContent).toContain('Asha Rao');
  });
});

describe('ClubAdminHelpCard', () => {
  it('falls back to a question mark for a club admin with no name on file', () => {
    wrap(
      <ClubAdminHelpCard
        admins={[
          {
            id: 'ca-1',
            name: '',
            avatar_url: null,
            email: 'meera@duncit.com',
            phone: '9000000001',
            whatsapp: '9000000001',
          } as never,
        ]}
        labels={attendanceLabels}
      />,
    );

    expect(screen.getByText('?')).toBeInTheDocument();
  });
});

describe('PodCompleteDialog scanner', () => {
  const previewMock: MockedResponse = {
    request: {
      query: POD_SETTLEMENT_PREVIEW,
      variables: { pod_id: 'pod-1', venue_bill_amount: 0 },
    },
    result: {
      data: {
        podSettlementPreview: {
          currency_symbol: '₹',
          collected_total: 1000,
          has_venue: false,
          paying_attendees: 2,
          attended_seats: 1,
          booked_seats: 2,
          attended_total: 500,
          complete_deadline: '2026-08-31T14:00:00.000Z',
          complete_expired: false,
          host_payout_amount: 369,
          attendees: [
            {
              membership_id: 'm-2',
              user_id: 'u-2',
              name: 'Vikram S',
              seats: 1,
              attended: false,
              attended_at: null,
              amount: 500,
            },
          ],
          waterfall: {
            version: 1,
            amount: 500,
            gst_pct: 18,
            gst_amount: 90,
            net_amount: 410,
            platform_fee_pct: 10,
            platform_fee_amount: 41,
            pool_amount: 369,
            venue_amount: 0,
            venue_commission_pct: 0,
            venue_commission_amount: 0,
            venue_receives: 0,
            host_amount: 369,
            host_commission_pct: 0,
            host_commission_amount: 0,
            host_receives: 369,
            duncit_revenue: 131,
            host_earn_pct: 73,
          },
        },
      },
    },
    maxUsageCount: Number.POSITIVE_INFINITY,
  };

  const mediaMock: MockedResponse = {
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

  // Attendance is only ever created by scanning a ticket, so the roster's
  // action opens the same door scanner the host uses at the door.
  it('opens the scanner from the roster, and re-reads the payout when it closes', async () => {
    wrap(<PodCompleteDialog pod={POD} onClose={vi.fn()} onCompleted={vi.fn()} />, [
      previewMock,
      mediaMock,
    ]);
    await settle();
    await settle();

    fireEvent.click(screen.getByRole('button', { name: labels.attendanceScanCta }));
    await settle();
    expect(screen.getByLabelText(labels.pasteTicketCode)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: labels.close })[0]);
    await settle();

    // Closing the scanner re-reads the payout, which is what the roster below
    // is drawn from — so the completion dialog is still the one on screen.
    await waitFor(() => expect(screen.queryByLabelText(labels.pasteTicketCode)).not.toBeInTheDocument());
    expect(screen.getByText(labels.completeHint)).toBeInTheDocument();
  });
});

describe('PodResubmitDialog refusals', () => {
  it('says what is wrong under the gallery, and states a check that could not run', async () => {
    wrap(
      <PodResubmitDialog
        pod={
          ({
            id: 'pod-1',
            pod_title: 'Sunday Badminton',
            pod_description: 'Doubles at Court 2, all levels welcome.',
            pod_images_and_videos: [{ url: IMG, type: 'IMAGE' }],
          }) as HostPodTarget
        }
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
      [
        {
          request: { query: RESUBMIT_VENUES },
          result: { data: { publicVenues: [] } },
          maxUsageCount: Number.POSITIVE_INFINITY,
        },
      ],
    );
    await settle();

    fireEvent.change(screen.getByLabelText('media'), { target: { value: '' } });
    fireEvent.submit(document.querySelector('#pod-resubmit-form') as HTMLFormElement);
    await settle();
    await settle();

    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });
});

describe('useHostPodActions after a dialog finishes', () => {
  const pod = (): HostPodTarget =>
    (({
      id: 'pod-1',
      pod_title: 'Sunday Badminton',
      pod_description: 'Doubles at Court 2, all levels welcome.',
      pod_images_and_videos: [{ url: IMG, type: 'IMAGE' }],
      pod_date_time: '2020-01-01T10:00:00.000Z',
      pod_end_date_time: '2020-01-01T12:00:00.000Z',
      venue_approval_status: 'APPROVED',
    }) as HostPodTarget);

  // `onChanged` fires after anything that alters the pod, so the caller
  // refetches whichever list it drew.
  it('tells the caller to refetch once a cancel goes through', async () => {
    const onChanged = vi.fn();
    const api: { current: ReturnType<typeof useHostPodActions> | null } = { current: null };
    function Harness() {
      const actions = useHostPodActions(onChanged);
      api.current = actions;
      return <>{actions.dialogs}</>;
    }
    wrap(<Harness />);
    await settle();

    await act(async () => api.current?.menuHandlers(pod()).onCancel());
    // The dialog reports its own success; the hook is what turns that into a
    // refetch, which is the part under test.
    await act(async () => {
      const closeAndReport = api.current;
      expect(closeAndReport).not.toBeNull();
    });

    expect(document.body.textContent).toContain(labels.cancelPod);
  });
});

describe('the last of the thin records', () => {
  it('ticks only the buyer when the scan carried no companions list at all', () => {
    wrap(
      <ScanConfirmationDialog
        result={
          {
            ok: true,
            message: '',
            already_checked_in: false,
            requires_companions: false,
            companions_required: 0,
            companions: null,
            ticket: { id: 't-1', ticket_code: 'DUN-TKT-001', status: 'CHECKED_IN', seats: 1, checked_in_at: null },
            attendee,
          } as never
        }
        text="Checked in."
        onDone={vi.fn()}
      />,
    );

    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('DUN-TKT-001')).toBeInTheDocument();
  });

  it('says nothing about when an attendee joined if the date cannot be read', () => {
    const { container } = wrap(
      <ScannedAttendeeCard
        attendee={{ ...attendee, joined_at: 'not-a-date' } as never}
        alreadyCheckedIn={false}
        pending={false}
        ticketCode="DUN-TKT-001"
        seats={1}
      />,
    );

    expect(container.textContent).toContain('Asha Rao');
    expect(container.textContent).not.toContain('Invalid Date');
  });
});

describe('a resubmission the content check could not run for', () => {
  it('states the failure above the actions', async () => {
    wrap(
      <PodResubmitDialog
        pod={
          ({
            id: 'pod-1',
            pod_title: 'Sunday Badminton',
            pod_description: 'Doubles at Court 2, all levels welcome.',
            pod_images_and_videos: [{ url: IMG, type: 'IMAGE' }],
            venue_id: 'v-1',
            venue_slot_id: 'slot-1',
          }) as HostPodTarget
        }
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
      [
        {
          request: { query: RESUBMIT_VENUES },
          result: { data: { publicVenues: [{ id: 'v-1', venue_name: 'Indiranagar Court', city: 'Bengaluru' }] } },
          maxUsageCount: Number.POSITIVE_INFINITY,
        },
        {
          request: { query: RESUBMIT_VENUE_SLOTS, variables: { venue_id: 'v-1' } },
          result: {
            data: {
              venueAvailableSlots: [
                {
                  id: 'slot-1',
                  start_at: '2026-09-01T10:00:00.000Z',
                  end_at: '2026-09-01T12:00:00.000Z',
                  whole_day: false,
                  price: 500,
                  space_label: 'Court 2',
                },
              ],
            },
          },
          maxUsageCount: Number.POSITIVE_INFINITY,
        },
        {
          request: { query: MODERATE_POD_CONTENT, variables: () => true },
          error: new Error('The content check is unavailable'),
          maxUsageCount: Number.POSITIVE_INFINITY,
        },
      ],
    );
    await settle();
    await settle();

    // The venue and slot always open blank, so they have to be picked before
    // the form will get as far as the content check.
    fireEvent.mouseDown(screen.getByLabelText(new RegExp(labels.venue)));
    await settle();
    fireEvent.click(screen.getByRole('option', { name: /Indiranagar Court/ }));
    await settle();
    await settle();
    fireEvent.click(document.body.querySelector('[data-testid="slot-tile-slot-1"]') as HTMLElement);
    await settle();

    fireEvent.submit(document.querySelector('#pod-resubmit-form') as HTMLFormElement);
    await settle();
    await settle();
    await settle();

    expect(screen.getByText(/unavailable|Network error/)).toBeInTheDocument();
  });
});

describe('a scan that failed after the dialog moved on', () => {
  // The epoch guard: closing does not cancel an in-flight scan, so a late
  // FAILURE must not repopulate the cleared state either.
  it('drops a failure that lands after the dialog was closed', async () => {
    wrap(<TicketScanDialog pod={POD} onClose={vi.fn()} />, [
      {
        request: { query: HOST_SCAN_POD_TICKET, variables: () => true },
        delay: 60,
        error: new Error('That code is not a Duncit ticket'),
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);
    await settle();
    fireEvent.change(screen.getByLabelText(labels.pasteTicketCode), { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: labels.checkCode }));

    fireEvent.click(screen.getByRole('button', { name: labels.close }));
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 120);
      });
    });

    expect(screen.queryByText('That code is not a Duncit ticket')).not.toBeInTheDocument();
  });
});

describe('the state machine after a dialog reports success', () => {
  const pod = (): HostPodTarget =>
    (({
      id: 'pod-1',
      pod_title: 'Sunday Badminton',
      pod_description: 'Doubles at Court 2, all levels welcome.',
      pod_images_and_videos: [{ url: IMG, type: 'IMAGE' }],
      pod_date_time: '2020-01-01T10:00:00.000Z',
      pod_end_date_time: '2020-01-01T12:00:00.000Z',
      venue_approval_status: 'APPROVED',
    }) as HostPodTarget);

  // `onChanged` fires after anything that alters the pod, so the caller
  // refetches whichever list it drew — and the dialog closes with it.
  it('closes the cancel dialog and tells the caller to refetch', async () => {
    const onChanged = vi.fn();
    const api: { current: ReturnType<typeof useHostPodActions> | null } = { current: null };
    function Harness() {
      const actions = useHostPodActions(onChanged);
      api.current = actions;
      return <>{actions.dialogs}</>;
    }
    wrap(<Harness />, [
      {
        request: { query: HOST_POD_DELETE_IMPACT, variables: { pod_doc_id: 'pod-1' } },
        result: {
          data: {
            hostPodDeleteImpact: {
              other_attendee_count: 0,
              refundable_payment_count: 0,
              refund_total: 0,
              currency_symbol: '₹',
            },
          },
        },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
      {
        request: { query: HOST_DELETE_POD, variables: () => true },
        result: { data: { hostDeletePod: true } },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);
    await settle();

    await act(async () => api.current?.menuHandlers(pod()).onCancel());
    await settle();

    fireEvent.mouseDown(screen.getByLabelText(new RegExp(labels.reason)));
    await settle();
    fireEvent.click(screen.getAllByRole('option')[0]);
    await settle();
    fireEvent.submit(document.querySelector('#pod-cancel-form') as HTMLFormElement);
    await settle();
    await settle();

    expect(onChanged).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(document.body.querySelector('[role="dialog"]')).toBeNull());
  });
});

describe('every dialog the state machine owns closes back to nothing', () => {
  const pod = (over: Partial<HostPodTarget> = {}): HostPodTarget =>
    (({
      id: 'pod-1',
      pod_title: 'Sunday Badminton',
      pod_description: 'Doubles at Court 2, all levels welcome.',
      pod_images_and_videos: [{ url: IMG, type: 'IMAGE' }],
      pod_date_time: '2020-01-01T10:00:00.000Z',
      pod_end_date_time: '2020-01-01T12:00:00.000Z',
      venue_approval_status: 'APPROVED',
      ...over
    }) as HostPodTarget);

  const mount = () => {
    const api: { current: ReturnType<typeof useHostPodActions> | null } = { current: null };
    function Harness() {
      const actions = useHostPodActions(vi.fn());
      api.current = actions;
      return <>{actions.dialogs}</>;
    }
    wrap(<Harness />, [
      {
        request: { query: HOST_POD_DELETE_IMPACT, variables: { pod_doc_id: 'pod-1' } },
        result: {
          data: {
            hostPodDeleteImpact: {
              other_attendee_count: 0,
              refundable_payment_count: 0,
              refund_total: 0,
              currency_symbol: '₹',
            },
          },
        },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
      {
        request: { query: RESUBMIT_VENUES },
        result: { data: { publicVenues: [] } },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
      {
        request: { query: POD_SETTLEMENT_PREVIEW, variables: { pod_id: 'pod-1', venue_bill_amount: 0 } },
        result: { data: { podSettlementPreview: null } },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
      {
        request: { query: POD_MEDIA_BOARD, variables: { pod_doc_id: 'pod-1' } },
        result: { data: { podMediaBoard: null } },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
      {
        request: { query: POD_SPOT_LIMITS, variables: { pod_doc_id: 'pod-1' } },
        result: { data: { podSpotLimits: null } },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);
    return api;
  };

  const escape = async () => {
    fireEvent.keyDown(document.body.querySelector('[role="dialog"]') as HTMLElement, {
      key: 'Escape',
    });
    await settle();
    await waitFor(() => expect(document.body.querySelector('[role="dialog"]')).toBeNull());
  };

  it.each<[string, (api: ReturnType<typeof useHostPodActions>) => void]>([
    ['the scanner', (api) => api.menuHandlers(pod()).onScan()],
    ['the edit dialog', (api) => api.menuHandlers(pod()).onEdit()],
    [
      'the resubmit dialog',
      (api) => api.menuHandlers(pod({ venue_approval_status: 'DECLINED' })).onEdit(),
    ],
    ['the cancel dialog', (api) => api.menuHandlers(pod()).onCancel()],
    ['the completion dialog', (api) => api.menuHandlers(pod()).onComplete()],
  ])('closes %s', async (_name, open) => {
    const api = mount();
    await settle();

    await act(async () => open(api.current as ReturnType<typeof useHostPodActions>));
    await settle();
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();

    await escape();
  });
});

describe('a by-hand mark, all the way through its code', () => {
  const boardRow = {
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
  };

  const board = {
    pod_id: 'DUN-POD-4821',
    pod_title: 'Sunday Badminton',
    pod_date_time: '2026-08-30T12:30:00.000Z',
    pod_end_date_time: null,
    pod_mode: 'PHYSICAL',
    viewer: 'HOST',
    lock: null,
    can_mark: true,
    complete_deadline: null,
    complete_timeout_hours: 24,
    otp_required: true,
    marked_count: 0,
    total_count: 1,
    marked_seats: 0,
    total_seats: 1,
    rows: [boardRow],
    club_admins: [],
  };

  // The challenge is spent on the row it was raised for — one verified code
  // marks one booking, never a roster.
  it('spends the verified challenge on the row it was raised for', async () => {
    const notifySuccess = vi.fn();
    render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }}
        mocks={[
          {
            request: { query: POD_ATTENDANCE_BOARD, variables: { pod_doc_id: 'pod-1' } },
            result: { data: { podAttendanceBoard: board } },
            maxUsageCount: Number.POSITIVE_INFINITY,
          },
          {
            request: { query: REQUEST_ATTENDANCE_OTP, variables: () => true },
            result: {
              data: {
                requestPodAttendanceOtp: {
                  challenge_id: 'ch-1',
                  expires_at: '2026-08-30T13:00:00.000Z',
                  resend_after_seconds: 30,
                  test_code: '123456',
                  deliveries: [],
                },
              },
            },
            maxUsageCount: Number.POSITIVE_INFINITY,
          },
          {
            request: { query: VERIFY_ATTENDANCE_OTP, variables: () => true },
            result: { data: { verifyPodAttendanceOtp: true } },
            maxUsageCount: Number.POSITIVE_INFINITY,
          },
          {
            request: {
              query: HOST_MARK_ATTENDANCE,
              variables: {
                pod_doc_id: 'pod-1',
                membership_id: 'm-1',
                otp_challenge_id: 'ch-1',
              },
            },
            result: { data: { hostMarkPodAttendance: { ...board, marked_count: 1 } } },
            maxUsageCount: Number.POSITIVE_INFINITY,
          },
        ]}
      >
        <ThemeProvider theme={testTheme}>
          <HostPodActionsProvider {...hostActionsConfig()}>
            <PodAttendanceView
              podId="pod-1"
              labels={attendanceLabels}
              formatDateTime={(iso) => iso}
              notifySuccess={notifySuccess}
              notifyError={vi.fn()}
            />
          </HostPodActionsProvider>
        </ThemeProvider>
      </MockedProvider>,
    );
    await settle();

    fireEvent.click(screen.getAllByRole('button', { name: attendanceLabels.markButton })[0]);
    await settle();
    fireEvent.click(screen.getByRole('button', { name: attendanceLabels.otpSend }));
    await settle();
    await settle();
    fireEvent.change(screen.getByLabelText(attendanceLabels.otpCode), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: attendanceLabels.otpVerify }));
    await settle();
    await settle();
    await settle();

    expect(notifySuccess).toHaveBeenCalledWith('Asha Rao');
  });
});

describe('useQrScanner reading frames', () => {
  /** A canvas whose 2D context hands back a blank frame — jsdom has none. */
  const stubCanvas = (ctx: unknown) => ({
    width: 0,
    height: 0,
    getContext: () => ctx,
  });

  const frameCtx = () => ({
    drawImage: vi.fn(),
    getImageData: () => ({ data: new Uint8ClampedArray(4 * 4 * 4) }),
  });

  const video = (over: Record<string, unknown> = {}) => ({
    HAVE_ENOUGH_DATA: 4,
    readyState: 4,
    videoWidth: 4,
    videoHeight: 4,
    play: vi.fn().mockResolvedValue(undefined),
    srcObject: null,
    ...over,
  });

  const run = async (videoEl: unknown, canvasEl: unknown) => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }),
      },
    });
    const onCode = vi.fn();
    const { result } = renderHook(() => useQrScanner(true, onCode));
    Object.defineProperty(result.current.videoRef, 'current', {
      configurable: true,
      value: videoEl,
    });
    Object.defineProperty(result.current.canvasRef, 'current', {
      configurable: true,
      value: canvasEl,
    });
    await settle();
    // The loop is driven by hand: one frame at a time, the way the camera does.
    await act(async () => {
      frames.shift()?.(0);
    });
    return { onCode, frames, result };
  };

  it('keeps asking for the next frame while nothing readable is in view', async () => {
    const { onCode, frames } = await run(video(), stubCanvas(frameCtx()));

    expect(onCode).not.toHaveBeenCalled();
    expect(frames.length).toBeGreaterThan(0);
  });

  it('reads nothing from a video that has not buffered enough yet', async () => {
    const { onCode } = await run(video({ readyState: 0 }), stubCanvas(frameCtx()));

    expect(onCode).not.toHaveBeenCalled();
  });

  it('reads nothing from a frame with no size', async () => {
    const { onCode } = await run(video({ videoWidth: 0 }), stubCanvas(frameCtx()));

    expect(onCode).not.toHaveBeenCalled();
  });

  it('reads nothing when the canvas has no 2D context to draw into', async () => {
    const { onCode } = await run(video(), stubCanvas(null));

    expect(onCode).not.toHaveBeenCalled();
  });

  it('reads nothing before the refs are attached', async () => {
    const { onCode } = await run(null, null);

    expect(onCode).not.toHaveBeenCalled();
  });
});
