/**
 * Proving one of the extra people a group ticket admits.
 *
 * The happy path is covered in ticket-scan.test.tsx. What is here is everything
 * that goes wrong at a real door: a code that will not send, a code typed
 * wrong, a second row trying to jump the queue, and a proved row whose number
 * is then retyped — the last one matters most, because a proof that survives an
 * edit describes a person who is no longer on that row.
 */
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CompanionEntry } from '@duncit/utils';

import CompanionOtpPanel from '../src/ticket-scan/CompanionOtpPanel';
import CompanionRow from '../src/ticket-scan/CompanionRow';
import TicketScanDialog from '../src/ticket-scan/TicketScanDialog';
import { useCompanionOtp, type CompanionOtpApi } from '../src/ticket-scan/useCompanionOtp';
import { buildCompanionsSchema, type CompanionValues } from '../src/ticket-scan/companions.form';
import { HostPodActionsProvider } from '../src/HostPodActionsProvider';
import { VERIFY_ATTENDANCE_OTP } from '../src/attendance/queries';
import { HOST_SCAN_POD_TICKET, REQUEST_COMPANION_OTP } from '../src/queries';
import { hostActionsConfig, labelsFor } from './host-actions-config';

const labels = labelsFor();
const testTheme = createTheme();
const TOKEN = 'DUN-TKT-001';
const POD = { id: 'pod-1', pod_title: 'Sunday Badminton' };

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const wrap = (ui: React.ReactNode, mocks: readonly MockedResponse[] = []) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[...mocks]}>
      <ThemeProvider theme={testTheme}>
        <HostPodActionsProvider {...hostActionsConfig()}>{ui}</HostPodActionsProvider>
      </ThemeProvider>
    </MockedProvider>,
  );

const entry = (over: Partial<CompanionEntry> = {}): CompanionEntry => ({
  name: 'Vikram S',
  phone_extension: '+91',
  phone_number: '9000000001',
  otp_challenge_id: '',
  ...over,
});

/** A hand-made api, so a panel can be put in a state the door reaches rarely. */
const otpApi = (over: Partial<CompanionOtpApi> = {}): CompanionOtpApi => ({
  activeIndex: null,
  challengeId: '',
  testCode: '',
  sending: false,
  verifying: false,
  error: '',
  start: vi.fn().mockResolvedValue(undefined),
  submit: vi.fn().mockResolvedValue(null),
  cancel: vi.fn(),
  ...over,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('the button that sends one companion a code', () => {
  it('offers to send before any code has gone out', () => {
    wrap(
      <CompanionOtpPanel
        index={0}
        entry={entry()}
        state="READY"
        labels={labels}
        otp={otpApi()}
        onVerified={vi.fn()}
      />,
    );

    expect(screen.getByTestId('companion-otp-send-0')).toHaveTextContent(
      labels.companionVerifyCta,
    );
    // Nothing to type into until a code exists.
    expect(screen.queryByTestId('companion-otp-code-0')).not.toBeInTheDocument();
  });

  it('offers to RESEND once a code is live, never to send a first one again', () => {
    wrap(
      <CompanionOtpPanel
        index={0}
        entry={entry()}
        state="READY"
        labels={labels}
        otp={otpApi({ activeIndex: 0, challengeId: 'otp-9' })}
        onVerified={vi.fn()}
      />,
    );

    expect(screen.getByTestId('companion-otp-send-0')).toHaveTextContent(labels.otpResend);
  });

  it('says a resend is on its way while it is in flight', () => {
    wrap(
      <CompanionOtpPanel
        index={0}
        entry={entry()}
        state="READY"
        labels={labels}
        otp={otpApi({ activeIndex: 0, challengeId: 'otp-9', sending: true })}
        onVerified={vi.fn()}
      />,
    );

    expect(screen.getByTestId('companion-otp-send-0')).toHaveTextContent(labels.otpSending);
  });

  it('goes dead on every other row while one code is live, and says why', () => {
    // One at a time is the whole rule: two open challenges at a door is how
    // the wrong person gets ticked in.
    wrap(
      <CompanionOtpPanel
        index={1}
        entry={entry()}
        state="BLOCKED"
        labels={labels}
        otp={otpApi({ activeIndex: 0, challengeId: 'otp-9' })}
        onVerified={vi.fn()}
      />,
    );

    expect(screen.getByText(labels.companionOtpBlocked)).toBeInTheDocument();
    expect(screen.getByTestId('companion-otp-send-1')).toBeDisabled();
  });

  it('shows the reason a code could not be sent, on the row that asked', () => {
    wrap(
      <CompanionOtpPanel
        index={0}
        entry={entry()}
        state="READY"
        labels={labels}
        otp={otpApi({ activeIndex: 0, error: 'That number is not on WhatsApp' })}
        onVerified={vi.fn()}
      />,
    );

    expect(screen.getByText('That number is not on WhatsApp')).toBeInTheDocument();
  });

  it('keeps another row failure off this row', () => {
    wrap(
      <CompanionOtpPanel
        index={1}
        entry={entry()}
        state="READY"
        labels={labels}
        otp={otpApi({ activeIndex: 0, error: 'That number is not on WhatsApp' })}
        onVerified={vi.fn()}
      />,
    );

    expect(screen.queryByText('That number is not on WhatsApp')).not.toBeInTheDocument();
  });

  it('shows a chip instead of a button once the number answered', () => {
    wrap(
      <CompanionOtpPanel
        index={0}
        entry={entry({ otp_challenge_id: 'otp-9' })}
        state="VERIFIED"
        labels={labels}
        otp={otpApi()}
        onVerified={vi.fn()}
      />,
    );

    expect(screen.getByTestId('companion-verified-0')).toBeInTheDocument();
    expect(screen.queryByTestId('companion-otp-send-0')).not.toBeInTheDocument();
  });

  it('hands the challenge up only when the code was right', async () => {
    const onVerified = vi.fn();
    const submit = vi.fn().mockResolvedValue(null);
    wrap(
      <CompanionOtpPanel
        index={0}
        entry={entry()}
        state="READY"
        labels={labels}
        otp={otpApi({ activeIndex: 0, challengeId: 'otp-9', submit })}
        onVerified={onVerified}
      />,
    );

    fireEvent.click(screen.getByTestId('companion-otp-verify-0'));
    await settle();

    expect(submit).toHaveBeenCalled();
    expect(onVerified).not.toHaveBeenCalled();
  });

  it('says it is checking while the code is being read', () => {
    wrap(
      <CompanionOtpPanel
        index={0}
        entry={entry()}
        state="READY"
        labels={labels}
        otp={otpApi({ activeIndex: 0, challengeId: 'otp-9', verifying: true })}
        onVerified={vi.fn()}
      />,
    );

    expect(screen.getByTestId('companion-otp-verify-0')).toHaveTextContent(labels.otpVerifying);
  });

  it('lets the host give up on the code and carry on without it', () => {
    const cancel = vi.fn();
    wrap(
      <CompanionOtpPanel
        index={0}
        entry={entry()}
        state="READY"
        labels={labels}
        otp={otpApi({ activeIndex: 0, challengeId: 'otp-9', cancel })}
        onVerified={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: labels.otpCancel }));

    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('shows the stand-in code back, because nothing really delivers one yet', () => {
    wrap(
      <CompanionOtpPanel
        index={0}
        entry={entry()}
        state="READY"
        labels={labels}
        otp={otpApi({ activeIndex: 0, challengeId: 'otp-9', testCode: '123456' })}
        onVerified={vi.fn()}
      />,
    );

    expect(screen.getByText(labels.otpTestCode('123456'))).toBeInTheDocument();
  });
});

/** A row needs a form around it; this is the smallest one that will do. */
function RowHarness({
  otp,
  onEdit,
  seed = entry(),
}: Readonly<{ otp: CompanionOtpApi; onEdit: (i: number) => void; seed?: CompanionEntry }>) {
  const { control, trigger } = useForm<CompanionValues>({
    resolver: zodResolver(buildCompanionsSchema(labels)) as never,
    defaultValues: { companions: [seed] },
  });
  useEffect(() => {
    trigger().catch(() => undefined);
  }, [trigger]);
  return (
    <CompanionRow
      index={0}
      control={control}
      entry={entry()}
      labels={labels}
      otp={otp}
      onEdit={onEdit}
      onVerified={vi.fn()}
    />
  );
}

describe('one companion row', () => {
  it('drops the proof when the DIAL CODE is retyped, not just the number', () => {
    // A proof names one number. +91 9000000001 and +44 9000000001 are two
    // different phones, so the challenge no longer describes this row.
    const onEdit = vi.fn();
    wrap(<RowHarness otp={otpApi()} onEdit={onEdit} />);
    const [, extension] = screen.getAllByRole('textbox');

    fireEvent.input(extension, { target: { value: '+44' } });

    expect(onEdit).toHaveBeenCalledWith(0);
  });

  it('says all three parts are required before a failed submit, not after', () => {
    wrap(<RowHarness otp={otpApi()} onEdit={vi.fn()} />);

    expect(screen.getAllByText(labels.fieldRequired).length).toBeGreaterThan(0);
  });

  it('puts the dial code complaint under the dial code box', async () => {
    // The extension is the only one of the three with no standing hint under
    // it, so a bad value there has to replace nothing — it just appears.
    wrap(<RowHarness otp={otpApi()} onEdit={vi.fn()} seed={entry({ phone_extension: 'IN' })} />);
    await settle();

    expect(screen.getByText(labels.otpExtensionInvalid)).toBeInTheDocument();
  });
});

describe('the code itself, as the hook runs it', () => {
  const hookWrapper =
    (mocks: readonly MockedResponse[]) =>
    ({ children }: Readonly<{ children: React.ReactNode }>) => (
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[...mocks]}>
        {children}
      </MockedProvider>
    );

  const issued = {
    __typename: 'PhoneOtpRequestResult',
    challenge_id: 'otp-9',
    expires_at: '2026-08-30T13:00:00.000Z',
    resend_after_seconds: 30,
    test_code: '123456',
    deliveries: [],
  };

  const requestMock = (result: unknown, over: Partial<MockedResponse> = {}): MockedResponse =>
    ({
      request: { query: REQUEST_COMPANION_OTP, variables: () => true },
      result: { data: { requestPodCompanionOtp: result } },
      maxUsageCount: Number.POSITIVE_INFINITY,
      ...over,
    }) as MockedResponse;

  const verifyMock = (over: Partial<MockedResponse> = {}): MockedResponse =>
    ({
      request: { query: VERIFY_ATTENDANCE_OTP, variables: () => true },
      result: { data: { verifyPodAttendanceOtp: true } },
      maxUsageCount: Number.POSITIVE_INFINITY,
      ...over,
    }) as MockedResponse;

  it('refuses a code that is not six digits without asking the server', async () => {
    const { result } = renderHook(() => useCompanionOtp('pod-1', 'pm-1', labels), {
      wrapper: hookWrapper([verifyMock({ result: undefined, error: new Error('never asked') })]),
    });

    let answer: string | null = 'unset';
    await act(async () => {
      answer = await result.current.submit('12');
    });

    expect(answer).toBeNull();
    // The server's error never appears, because the server was never called.
    expect(result.current.error).toBe(labels.otpCodeInvalid);
  });

  it('says why the code could not be sent, and frees the row to try again', async () => {
    const { result } = renderHook(() => useCompanionOtp('pod-1', 'pm-1', labels), {
      wrapper: hookWrapper([
        requestMock(null, { result: undefined, error: new Error('That number is not reachable') }),
      ]),
    });

    await act(async () => {
      await result.current.start(0, entry());
    });

    expect(result.current.error).toBe('That number is not reachable');
    // Nothing is live any more, so the OTHER rows stop being blocked.
    expect(result.current.activeIndex).toBeNull();
  });

  it('treats a request the server answered with nothing as no challenge at all', async () => {
    const { result } = renderHook(() => useCompanionOtp('pod-1', 'pm-1', labels), {
      wrapper: hookWrapper([requestMock(null)]),
    });

    await act(async () => {
      await result.current.start(0, entry());
    });

    expect(result.current.challengeId).toBe('');
    expect(result.current.testCode).toBe('');
    expect(result.current.error).toBe('');
  });

  it('reports a wrong code and keeps the challenge live for another try', async () => {
    const { result } = renderHook(() => useCompanionOtp('pod-1', 'pm-1', labels), {
      wrapper: hookWrapper([
        requestMock(issued),
        verifyMock({ result: undefined, error: new Error('That code has expired') }),
      ]),
    });

    await act(async () => {
      await result.current.start(0, entry());
    });

    let answer: string | null = 'unset';
    await act(async () => {
      answer = await result.current.submit('999999');
    });

    expect(answer).toBeNull();
    expect(result.current.error).toBe('That code has expired');
    // A wrong code is a retry, not a restart.
    expect(result.current.challengeId).toBe('otp-9');
  });

  it('hands back the spendable challenge when the code is right', async () => {
    const { result } = renderHook(() => useCompanionOtp('pod-1', 'pm-1', labels), {
      wrapper: hookWrapper([requestMock(issued), verifyMock()]),
    });

    await act(async () => {
      await result.current.start(0, entry());
    });

    let answer: string | null = null;
    await act(async () => {
      answer = await result.current.submit('123456');
    });

    expect(answer).toBe('otp-9');
    // Spent: the row is free for the next person.
    expect(result.current.activeIndex).toBeNull();
  });

  it('clears everything when the host gives up on the code', async () => {
    const { result } = renderHook(() => useCompanionOtp('pod-1', 'pm-1', labels), {
      wrapper: hookWrapper([requestMock(issued)]),
    });

    await act(async () => {
      await result.current.start(0, entry());
    });
    expect(result.current.challengeId).toBe('otp-9');

    act(() => {
      result.current.cancel();
    });

    expect(result.current.activeIndex).toBeNull();
    expect(result.current.challengeId).toBe('');
  });
});

describe('a proved row that is then edited', () => {
  const groupScan = {
    __typename: 'HostTicketScanResult',
    ok: false,
    message: 'Add the other 1 person on this booking.',
    already_checked_in: false,
    requires_companions: true,
    companions_required: 1,
    companions: [],
    ticket: {
      __typename: 'PodTicket',
      id: 't-1',
      ticket_code: TOKEN,
      status: 'BOOKED',
      // No seat count on the ticket: the form still has to come up, because
      // the group is standing at the door either way.
      seats: null,
      checked_in_at: null,
      membership_id: 'pm-1',
    },
    attendee: null,
  };

  const mocks = [
    {
      request: { query: HOST_SCAN_POD_TICKET, variables: () => true },
      result: { data: { hostScanPodTicket: groupScan } },
      maxUsageCount: Number.POSITIVE_INFINITY,
    },
    {
      request: { query: REQUEST_COMPANION_OTP, variables: () => true },
      result: {
        data: {
          requestPodCompanionOtp: {
            __typename: 'PhoneOtpRequestResult',
            challenge_id: 'otp-9',
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
  ] as unknown as MockedResponse[];

  const pasteCode = async () => {
    fireEvent.change(screen.getByLabelText(labels.pasteTicketCode), { target: { value: TOKEN } });
    fireEvent.click(screen.getByRole('button', { name: labels.checkCode }));
    await settle();
    await settle();
  };

  it('throws the proof away when the number under it is retyped', async () => {
    wrap(<TicketScanDialog pod={POD} onClose={vi.fn()} />, mocks);
    await settle();
    await pasteCode();

    const [name, , phone] = screen.getAllByRole('textbox');
    fireEvent.input(name, { target: { value: 'Vikram S' } });
    fireEvent.input(phone, { target: { value: '9000000001' } });
    await settle();

    fireEvent.click(screen.getByTestId('companion-otp-send-0'));
    await settle();
    await settle();
    fireEvent.change(
      screen.getByTestId('companion-otp-code-0').querySelector('input') as HTMLInputElement,
      { target: { value: '123456' } },
    );
    fireEvent.click(screen.getByTestId('companion-otp-verify-0'));
    await settle();
    await settle();
    expect(screen.getByTestId('companion-verified-0')).toBeInTheDocument();

    // The host corrects the number. The code proved the OLD one.
    fireEvent.input(phone, { target: { value: '9000000002' } });
    await settle();

    expect(screen.queryByTestId('companion-verified-0')).not.toBeInTheDocument();
    expect(screen.getByTestId('companion-otp-send-0')).toBeInTheDocument();
  });

  it('warns rather than submitting a group that is not filled in', async () => {
    wrap(<TicketScanDialog pod={POD} onClose={vi.fn()} />, mocks);
    await settle();
    await pasteCode();

    const [name] = screen.getAllByRole('textbox');
    fireEvent.submit(name.closest('form') as HTMLFormElement);
    await settle();
    await settle();

    expect(screen.getByText(labels.companionsIncomplete)).toBeInTheDocument();
  });

  it('renders nothing at all until there is a pod to scan for', () => {
    // The whole body sits inside the dialog, so a null pod is not an empty
    // scanner — it is no scanner.
    wrap(<TicketScanDialog pod={null} onClose={vi.fn()} />, mocks);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });
});
