import { act, renderHook, waitFor } from '@testing-library/react-native';
import { shellAttendanceLabels, type PodAttendanceRow } from '@duncit/utils';

import { RequestAttendanceOtpDocument, VerifyAttendanceOtpDocument } from '@/graphql/attendance';
import { graphqlRequest } from '@/services/graphql.client';
import { useAttendanceOtp } from '@/hooks/useAttendanceOtp';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

/** Labels that read back as their own keys, so assertions name the copy used. */
const labels = shellAttendanceLabels((key) => key);

const row: PodAttendanceRow = {
  membership_id: 'm1',
  user_id: 'u1',
  ticket_id: 't1',
  ticket_code: 'TK1',
  name: 'Asha Rao',
  avatar_url: '',
  email: '',
  phone_extension: '+91',
  phone_number: '9876543210',
  seats: 1,
  attended: false,
  attended_at: null,
  marked_method: null,
  marked_by_name: '',
  verified_phone: '',
  companions: [],
  companions_required: 0,
};

function mount(initial: PodAttendanceRow | null = row) {
  return renderHook((r: PodAttendanceRow | null) => useAttendanceOtp('p1', r, labels), {
    initialProps: initial,
  });
}

const challenge = (test_code: string | null) => ({
  requestPodAttendanceOtp: { challenge_id: 'ch-1', test_code },
});

beforeEach(() => mockRequest.mockReset());

describe('useAttendanceOtp — sending', () => {
  it('pre-fills the attendee and offers Send', () => {
    const { result } = mount();
    expect(result.current.form.getValues()).toEqual({
      name: 'Asha Rao',
      extension: '+91',
      number: '9876543210',
      mediums: ['WHATSAPP', 'SMS'],
      code: '',
    });
    expect(result.current.sendLabel).toBe('shell.attendance.otpSend');
    expect(result.current.challengeId).toBe('');
  });

  it('does nothing without a row', async () => {
    const { result } = mount(null);
    await act(async () => result.current.send());
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('sends the trimmed details with both mediums and keeps the challenge', async () => {
    mockRequest.mockResolvedValueOnce(challenge('123456'));
    const { result } = mount();
    act(() => result.current.form.setValue('name', '  Asha Rao  '));
    await act(async () => result.current.send());
    await waitFor(() => expect(result.current.challengeId).toBe('ch-1'));

    expect(mockRequest).toHaveBeenCalledWith(
      RequestAttendanceOtpDocument,
      {
        input: {
          pod_doc_id: 'p1',
          membership_id: 'm1',
          name: 'Asha Rao',
          phone_extension: '+91',
          phone_number: '9876543210',
          mediums: ['WHATSAPP', 'SMS'],
        },
      },
      { auth: true },
    );
    expect(result.current.testCode).toBe('123456');
    expect(result.current.sending).toBe(false);
    expect(result.current.sendLabel).toBe('shell.attendance.otpResend');
  });

  it('keeps an empty test code when the server sends none', async () => {
    mockRequest.mockResolvedValueOnce(challenge(null));
    const { result } = mount();
    act(() => result.current.form.setValue('mediums', ['SMS']));
    await act(async () => result.current.send());
    await waitFor(() => expect(result.current.challengeId).toBe('ch-1'));
    expect(result.current.testCode).toBe('');
    expect(mockRequest.mock.calls[0][1].input.mediums).toEqual(['SMS']);
  });

  it('shows the in-flight label while the request is out', async () => {
    let resolve: (v: unknown) => void = () => undefined;
    mockRequest.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { result } = mount();
    await act(async () => result.current.send());
    await waitFor(() => expect(result.current.sending).toBe(true));
    expect(result.current.sendLabel).toBe('shell.attendance.otpSending');

    await act(async () => resolve(challenge('1')));
    await waitFor(() => expect(result.current.sending).toBe(false));
  });

  it('refuses to send when the number fails validation', async () => {
    const { result } = mount();
    act(() => result.current.form.setValue('number', '12'));
    await act(async () => result.current.send());
    await waitFor(() =>
      expect(result.current.form.getFieldState('number').error?.message).toBe(
        'shell.attendance.otpPhoneInvalid',
      ),
    );
    expect(mockRequest).not.toHaveBeenCalled();
    expect(result.current.sending).toBe(false);
  });

  it('reports a failed send, and an empty message when none is given', async () => {
    mockRequest.mockRejectedValueOnce(new Error('rate limited'));
    const { result } = mount();
    await act(async () => result.current.send());
    await waitFor(() => expect(result.current.error).toBe('rate limited'));
    expect(result.current.challengeId).toBe('');

    mockRequest.mockRejectedValueOnce(undefined);
    await act(async () => result.current.send());
    await waitFor(() => expect(result.current.error).toBe(''));
    expect(result.current.sending).toBe(false);
  });
});

describe('useAttendanceOtp — verifying', () => {
  async function sent() {
    mockRequest.mockResolvedValueOnce(challenge(null));
    const hook = mount();
    await act(async () => hook.result.current.send());
    await waitFor(() => expect(hook.result.current.challengeId).toBe('ch-1'));
    return hook;
  }

  it('rejects a malformed code locally without calling the server', async () => {
    const { result } = await sent();
    act(() => result.current.form.setValue('code', '12a'));
    let spent: string | null = 'x';
    await act(async () => {
      spent = await result.current.verify();
    });
    expect(spent).toBeNull();
    expect(result.current.form.getFieldState('code').error?.message).toBe(
      'shell.attendance.otpCodeInvalid',
    );
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('verifies a trimmed code and resolves with the spendable challenge', async () => {
    const { result } = await sent();
    mockRequest.mockResolvedValueOnce({ verifyPodAttendanceOtp: true });
    act(() => result.current.form.setValue('code', ' 654321 '));
    let spent: string | null = null;
    await act(async () => {
      spent = await result.current.verify();
    });
    expect(spent).toBe('ch-1');
    expect(mockRequest).toHaveBeenLastCalledWith(
      VerifyAttendanceOtpDocument,
      { challenge_id: 'ch-1', otp: '654321' },
      { auth: true },
    );
    expect(result.current.verifying).toBe(false);
  });

  it('resolves null and shows the error when the server rejects the code', async () => {
    const { result } = await sent();
    mockRequest.mockRejectedValueOnce(new Error('wrong code'));
    act(() => result.current.form.setValue('code', '111111'));
    let spent: string | null = 'x';
    await act(async () => {
      spent = await result.current.verify();
    });
    expect(spent).toBeNull();
    expect(result.current.error).toBe('wrong code');

    mockRequest.mockRejectedValueOnce(undefined);
    await act(async () => {
      spent = await result.current.verify();
    });
    expect(spent).toBeNull();
    expect(result.current.error).toBe('');
  });
});

describe('useAttendanceOtp — switching attendee', () => {
  it('drops the previous challenge and re-fills from the new row', async () => {
    mockRequest.mockResolvedValueOnce(challenge('999999'));
    const { result, rerender } = mount();
    await act(async () => result.current.send());
    await waitFor(() => expect(result.current.challengeId).toBe('ch-1'));

    const other: PodAttendanceRow = {
      ...row,
      membership_id: 'm2',
      name: 'Ravi',
      phone_extension: '',
      phone_number: '9000000000',
    };
    rerender(other);
    await waitFor(() => expect(result.current.challengeId).toBe(''));
    expect(result.current.testCode).toBe('');
    expect(result.current.form.getValues('name')).toBe('Ravi');
    // A blank extension on file falls back to the default rather than staying empty.
    expect(result.current.form.getValues('extension')).toBe('+91');

    rerender(null);
    await waitFor(() => expect(result.current.form.getValues('name')).toBe(''));
    expect(result.current.form.getValues('number')).toBe('');
  });
});
