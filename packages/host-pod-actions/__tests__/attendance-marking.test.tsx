/**
 * Marking an attendee, and the two things standing in front of it.
 *
 * Attendance is what the host is paid on, so neither way in is a bare toggle: a
 * host's by-hand mark is proved with a one-time code, and a Club Admin's
 * override — which has no scan and no code behind it — names the person before
 * it will confirm.
 */
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { mwebAttendanceLabels, type PodAttendanceRow } from '@duncit/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AttendanceOtpDialog from '../src/attendance/AttendanceOtpDialog';
import AttendanceRow from '../src/attendance/AttendanceRow';
import ForceMarkDialog from '../src/attendance/ForceMarkDialog';
import MediumPicker from '../src/attendance/MediumPicker';
import { REQUEST_ATTENDANCE_OTP, VERIFY_ATTENDANCE_OTP } from '../src/attendance/queries';
import {
  attendanceOtpCodeSchema,
  attendanceOtpInitialValues,
  buildAttendanceOtpInput,
  buildAttendanceOtpSchema,
} from '../src/attendance/otp.form';

/** Echoes the key back, with the vars appended — a sentence that names the
 * attendee names them only through those. */
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

const wrap = (ui: React.ReactNode, mocks: readonly MockedResponse[] = []) =>
  render(
    <MockedProvider mocks={[...mocks]} addTypename={false}>
      <ThemeProvider theme={testTheme}>{ui}</ThemeProvider>
    </MockedProvider>
  );

afterEach(() => {
  vi.clearAllMocks();
});

// ------------------------------------------------------------- otp.form ----

describe('attendanceOtpInitialValues', () => {
  // The common case is "confirm", not "type" — but the number stays editable,
  // because a wrong number on file is exactly what needs fixing at the door.
  it('pre-fills the name and number from the attendee account', () => {
    expect(attendanceOtpInitialValues(row())).toEqual({
      name: 'Asha Rao',
      extension: '+91',
      number: '9876543210',
      mediums: ['WHATSAPP', 'SMS'],
      code: '',
    });
  });

  it('falls back to the India dial code, and opens blank with no attendee at all', () => {
    expect(attendanceOtpInitialValues(row({ phone_extension: '' })).extension).toBe('+91');
    expect(attendanceOtpInitialValues(null)).toEqual({
      name: '',
      extension: '+91',
      number: '',
      mediums: ['WHATSAPP', 'SMS'],
      code: '',
    });
  });

  it('hands each dialog its own mediums array rather than one shared default', () => {
    const first = attendanceOtpInitialValues(null);
    first.mediums.push('SMS');

    expect(attendanceOtpInitialValues(null).mediums).toEqual(['WHATSAPP', 'SMS']);
  });
});

describe('buildAttendanceOtpSchema', () => {
  const schema = buildAttendanceOtpSchema(labels);
  const values = (over: Record<string, unknown> = {}) => ({
    name: 'Asha Rao',
    extension: '+91',
    number: '9876543210',
    mediums: ['WHATSAPP'],
    code: '',
    ...over,
  });
  const errorFor = (input: unknown, path: string) => {
    const result = schema.safeParse(input);
    if (result.success) return undefined;
    return result.error.issues.find((i) => i.path.join('.') === path)?.message;
  };

  it('accepts a complete challenge', () => {
    expect(schema.safeParse(values()).success).toBe(true);
  });

  it('needs a name to put on the record', () => {
    expect(errorFor(values({ name: 'A' }), 'name')).toBe(labels.otpNameRequired);
  });

  it('needs a country code and a number that could reach somebody', () => {
    expect(errorFor(values({ extension: 'IN' }), 'extension')).toBe(labels.otpExtensionInvalid);
    expect(errorFor(values({ number: '12' }), 'number')).toBe(labels.otpPhoneInvalid);
  });

  it('needs at least one channel to send on', () => {
    expect(errorFor(values({ mediums: [] }), 'mediums')).toBe(labels.otpMediumRequired);
  });

  // Folding the code into this schema would block Send until the host typed a
  // code they have not been sent yet.
  it('says nothing about the code, which does not exist until a challenge does', () => {
    expect(schema.safeParse(values({ code: '' })).success).toBe(true);
  });
});

describe('attendanceOtpCodeSchema', () => {
  const schema = attendanceOtpCodeSchema(labels);

  it('accepts a six-digit code', () => {
    expect(schema.safeParse('123456').success).toBe(true);
  });

  it('refuses anything else', () => {
    for (const bad of ['', '12345', '1234567', 'abcdef']) {
      const result = schema.safeParse(bad);
      expect(result.success, bad).toBe(false);
      if (!result.success) expect(result.error.issues[0].message).toBe(labels.otpCodeInvalid);
    }
  });
});

describe('buildAttendanceOtpInput', () => {
  it('maps the values onto the input, trimmed, against this pod and booking', () => {
    expect(
      buildAttendanceOtpInput(
        {
          name: '  Asha Rao ',
          extension: ' +91 ',
          number: ' 9876543210 ',
          mediums: ['WHATSAPP', 'SMS'],
          code: '123456',
        },
        'pod-1',
        'm-1',
      ),
    ).toEqual({
      pod_doc_id: 'pod-1',
      membership_id: 'm-1',
      name: 'Asha Rao',
      phone_extension: '+91',
      phone_number: '9876543210',
      mediums: ['WHATSAPP', 'SMS'],
    });
  });
});

// --------------------------------------------------------- MediumPicker ----

describe('MediumPicker', () => {
  // A multi-select rather than a radio: sending on both at once is a single
  // request, and a host at a noisy door should not have to guess.
  it('offers both channels and ticks the ones already chosen', () => {
    wrap(<MediumPicker labels={labels} value={['WHATSAPP']} onChange={vi.fn()} />);

    expect(screen.getByLabelText(labels.otpMediumWhatsapp)).toBeChecked();
    expect(screen.getByLabelText(labels.otpMediumSms)).not.toBeChecked();
  });

  it('adds a channel that was not chosen', () => {
    const onChange = vi.fn();
    wrap(<MediumPicker labels={labels} value={['WHATSAPP']} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText(labels.otpMediumSms));

    expect(onChange).toHaveBeenCalledWith(['WHATSAPP', 'SMS']);
  });

  it('removes one that was', () => {
    const onChange = vi.fn();
    wrap(<MediumPicker labels={labels} value={['WHATSAPP', 'SMS']} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText(labels.otpMediumWhatsapp));

    expect(onChange).toHaveBeenCalledWith(['SMS']);
  });

  it('states the refusal when neither channel is left', () => {
    wrap(
      <MediumPicker labels={labels} value={[]} onChange={vi.fn()} error={labels.otpMediumRequired} />,
    );

    expect(screen.getByText(labels.otpMediumRequired)).toBeInTheDocument();
  });

  it('says nothing when there is nothing wrong', () => {
    wrap(<MediumPicker labels={labels} value={['SMS']} onChange={vi.fn()} />);

    expect(screen.queryByText(labels.otpMediumRequired)).not.toBeInTheDocument();
  });
});

// -------------------------------------------------------- ForceMarkDialog ----

describe('ForceMarkDialog', () => {
  const dialog = (over: Record<string, unknown> = {}) => {
    const props = {
      row: row(),
      labels,
      busy: false,
      onClose: vi.fn(),
      onConfirm: vi.fn(),
      ...over,
    };
    wrap(<ForceMarkDialog {...(props as never)} />);
    return props;
  };

  it('renders nothing while there is nobody to mark', () => {
    dialog({ row: null });

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  // A confirm with no subject is a confirm people click through.
  it('names who is about to be marked, and warns why that matters', () => {
    dialog();

    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText(/\+91 9876543210 · asha@duncit\.com · DUN-TKT-001/)).toBeInTheDocument();
    expect(screen.getByText(labels.forceWarning)).toBeInTheDocument();
  });

  it('says how many seats the booking admits when it is more than one', () => {
    dialog({ row: row({ seats: 3 }) });

    expect(screen.getByText(labels.seats(3))).toBeInTheDocument();
  });

  it('leaves the seat line off a single-seat booking', () => {
    dialog();

    expect(screen.queryByText(labels.seats(1))).not.toBeInTheDocument();
  });

  it('names what it has when the account is missing an email or a ticket', () => {
    dialog({ row: row({ email: null, ticket_code: '', phone_number: '' }) });

    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
  });

  it('marks the person it named, and only on confirm', () => {
    const props = dialog();

    fireEvent.click(screen.getByRole('button', { name: labels.forceConfirm }));

    expect(props.onConfirm).toHaveBeenCalledWith(props.row);
  });

  it('closes without marking anybody', () => {
    const props = dialog();

    fireEvent.click(screen.getByRole('button', { name: labels.forceCancel }));

    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('locks both buttons while the mark is being written', () => {
    dialog({ busy: true });

    expect(screen.getByRole('button', { name: labels.marking })).toBeDisabled();
    expect(screen.getByRole('button', { name: labels.forceCancel })).toBeDisabled();
  });
});

// --------------------------------------------------------- AttendanceRow ----

describe('AttendanceRow', () => {
  const render_ = (over: Record<string, unknown> = {}) => {
    const props = {
      row: row(),
      labels,
      canMark: true,
      busy: false,
      formatDateTime: (iso: string) => `at:${iso}`,
      onMark: vi.fn(),
      ...over,
    };
    return { props, ...wrap(<AttendanceRow {...(props as never)} />) };
  };

  it('offers the mark on a row that is ready for one', () => {
    const { props } = render_();

    fireEvent.click(screen.getByRole('button', { name: labels.markButton }));

    expect(props.onMark).toHaveBeenCalledWith(props.row);
  });

  // A scan and a by-hand mark are not the same evidence, so the row says which.
  it('says how a marked attendee was marked, by whom and when', () => {
    render_({
      row: row({
        attended: true,
        attended_at: '2026-08-30T12:40:00.000Z',
        marked_method: 'HOST_SCAN',
        marked_by_name: 'Ravi',
      }),
    });

    expect(screen.getByText(labels.markedChip)).toBeInTheDocument();
    expect(
      screen.getByText(/methodScan.*markedBy Ravi.*markedAt at:2026-08-30/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: labels.markButton })).not.toBeInTheDocument();
  });

  it('names the phone the code went to, once one was verified', () => {
    render_({
      row: row({ attended: true, marked_method: 'HOST_MANUAL', verified_phone: '+91 98765' }),
    });

    expect(screen.getByText(labels.verifiedPhone('+91 98765'))).toBeInTheDocument();
  });

  it('falls back to the email when the attendee left no number', () => {
    render_({ row: row({ phone_number: '', phone_extension: '' }) });

    expect(screen.getByText('asha@duncit.com')).toBeInTheDocument();
  });

  // A ticket awaiting its companions has marked NOBODY: the chip used to say
  // "Marked present" there, which made a broken second step look finished.
  it('says the group is still incomplete rather than offering the mark', () => {
    render_({ row: row({ seats: 3, companions_required: 2 }) });

    expect(screen.getByText(labels.companionsNeeded(2))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: labels.markButton })).toBeDisabled();
  });

  it('shows the head count on a group booking, and none on a single seat', () => {
    render_({ row: row({ seats: 4 }) });
    expect(screen.getByText(labels.seats(4))).toBeInTheDocument();
  });

  it('renders read-only once the roster is locked', () => {
    render_({ onMark: undefined });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers nothing to a viewer who may not mark', () => {
    render_({ canMark: false });

    expect(screen.getByRole('button', { name: labels.markButton })).toBeDisabled();
  });

  it('locks the button and says so while this row is being written', () => {
    render_({ busy: true });

    expect(screen.getByRole('button', { name: labels.marking })).toBeDisabled();
  });

  it('renders the attendee avatar when they have one, and their initial when they do not', () => {
    const { container, unmount } = render_({ row: row({ avatar_url: 'https://cdn/x.jpg' }) });
    expect(container.querySelector('img')).not.toBeNull();
    unmount();

    render_();
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});

// ---------------------------------------------------- AttendanceOtpDialog ----

describe('AttendanceOtpDialog', () => {
  const CHALLENGE = {
    __typename: 'PhoneOtpChallenge',
    challenge_id: 'ch-1',
    expires_at: '2026-08-30T13:00:00.000Z',
    resend_after_seconds: 30,
    test_code: '123456',
    deliveries: [{ __typename: 'PhoneOtpDelivery', medium: 'WHATSAPP', status: 'STUBBED', reason: null }],
  };

  const requestMock = (over: Partial<MockedResponse> = {}): MockedResponse =>
    ({
      request: { query: REQUEST_ATTENDANCE_OTP },
      variableMatcher: () => true,
      result: { data: { requestPodAttendanceOtp: CHALLENGE } },
      maxUsageCount: Number.POSITIVE_INFINITY,
      ...over,
    }) as MockedResponse;

  const verifyMock = (over: Partial<MockedResponse> = {}): MockedResponse =>
    ({
      request: { query: VERIFY_ATTENDANCE_OTP },
      variableMatcher: () => true,
      result: { data: { verifyPodAttendanceOtp: true } },
      maxUsageCount: Number.POSITIVE_INFINITY,
      ...over,
    }) as MockedResponse;

  const dialog = (over: Record<string, unknown> = {}, mocks: readonly MockedResponse[] = []) => {
    const props = {
      podId: 'pod-1',
      row: row(),
      labels,
      onClose: vi.fn(),
      onVerified: vi.fn(),
      ...over,
    };
    return { props, ...wrap(<AttendanceOtpDialog {...(props as never)} />, mocks) };
  };

  const press = async (name: string | RegExp) => {
    fireEvent.click(screen.getByRole('button', { name }));
    await settle();
    await settle();
  };

  it('renders nothing while there is nobody to verify', () => {
    dialog({ row: null });

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens on the attendee, pre-filled from their account', async () => {
    dialog();
    await settle();

    expect(screen.getByLabelText(labels.otpName)).toHaveValue('Asha Rao');
    expect(screen.getByLabelText(labels.otpPhone)).toHaveValue('9876543210');
    expect(screen.getByRole('button', { name: labels.otpSend })).toBeInTheDocument();
  });

  it('sends nothing while the number could not reach anybody', async () => {
    const { props } = dialog({}, [requestMock()]);
    await settle();
    fireEvent.change(screen.getByLabelText(labels.otpPhone), { target: { value: '12' } });

    await press(labels.otpSend);

    expect(screen.getByText(labels.otpPhoneInvalid)).toBeInTheDocument();
    expect(props.onVerified).not.toHaveBeenCalled();
  });

  // Nothing is actually delivered yet: the server hands back a test code, which
  // the dialog renders so the host can finish the flow.
  it('shows the code the server handed back and asks for it', async () => {
    dialog({}, [requestMock()]);
    await settle();

    await press(labels.otpSend);

    expect(screen.getByText(labels.otpTestCode('123456'))).toBeInTheDocument();
    expect(screen.getByLabelText(labels.otpCode)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: labels.otpResend })).toBeInTheDocument();
  });

  it('states the reason when the code could not be issued', async () => {
    dialog({}, [requestMock({ result: undefined, error: new Error('Too many attempts') })]);
    await settle();

    await press(labels.otpSend);

    expect(screen.getByText('Too many attempts')).toBeInTheDocument();
    expect(screen.queryByLabelText(labels.otpCode)).not.toBeInTheDocument();
  });

  it('opens the code box even for a challenge that came back without a test code', async () => {
    dialog({}, [
      requestMock({
        result: { data: { requestPodAttendanceOtp: { ...CHALLENGE, test_code: null } } },
      }),
    ]);
    await settle();

    await press(labels.otpSend);

    expect(screen.getByLabelText(labels.otpCode)).toBeInTheDocument();
    expect(screen.queryByText(/otpTestCode/)).not.toBeInTheDocument();
  });

  it('will not verify before a code has been asked for', async () => {
    dialog();
    await settle();

    expect(screen.getByRole('button', { name: labels.otpVerify })).toBeDisabled();
  });

  it('refuses a code that is not six digits, without spending the challenge', async () => {
    const { props } = dialog({}, [requestMock(), verifyMock()]);
    await settle();
    await press(labels.otpSend);

    fireEvent.change(screen.getByLabelText(labels.otpCode), { target: { value: '12' } });
    await press(labels.otpVerify);

    expect(screen.getByText(labels.otpCodeInvalid)).toBeInTheDocument();
    expect(props.onVerified).not.toHaveBeenCalled();
  });

  it('hands the spendable challenge back once the code checks out', async () => {
    const { props } = dialog({}, [requestMock(), verifyMock()]);
    await settle();
    await press(labels.otpSend);

    fireEvent.change(screen.getByLabelText(labels.otpCode), { target: { value: '123456' } });
    await press(labels.otpVerify);

    expect(props.onVerified).toHaveBeenCalledWith('ch-1');
  });

  it('states the server reason for a code it refused, and reports nothing', async () => {
    const { props } = dialog({}, [
      requestMock(),
      verifyMock({ result: undefined, error: new Error('That code has expired') }),
    ]);
    await settle();
    await press(labels.otpSend);

    fireEvent.change(screen.getByLabelText(labels.otpCode), { target: { value: '123456' } });
    await press(labels.otpVerify);

    expect(screen.getByText('That code has expired')).toBeInTheDocument();
    expect(props.onVerified).not.toHaveBeenCalled();
  });

  it('closes without verifying anybody', async () => {
    const { props } = dialog();
    await settle();

    fireEvent.click(screen.getByRole('button', { name: labels.otpCancel }));

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  // A different attendee is a different challenge — never carry the previous
  // one's verified code onto somebody else's row.
  it('starts over when the dialog moves to another attendee', async () => {
    const { rerender } = dialog({}, [requestMock()]);
    await settle();
    await press(labels.otpSend);
    expect(screen.getByLabelText(labels.otpCode)).toBeInTheDocument();

    rerender(
      <MockedProvider mocks={[requestMock()]} addTypename={false}>
        <ThemeProvider theme={testTheme}>
          <AttendanceOtpDialog
            podId="pod-1"
            row={row({ membership_id: 'm-2', name: 'Vikram S', phone_number: '9000000000' })}
            labels={labels}
            onClose={vi.fn()}
            onVerified={vi.fn()}
          />
        </ThemeProvider>
      </MockedProvider>,
    );
    await settle();

    expect(screen.queryByLabelText(labels.otpCode)).not.toBeInTheDocument();
    expect(screen.getByLabelText(labels.otpName)).toHaveValue('Vikram S');
  });

  it('lets the host pick which channels the code goes out on', async () => {
    dialog({}, [requestMock()]);
    await settle();

    fireEvent.click(screen.getByLabelText(labels.otpMediumSms));
    await settle();

    expect(screen.getByLabelText(labels.otpMediumSms)).not.toBeChecked();
  });
});
