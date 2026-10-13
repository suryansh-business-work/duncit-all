import { act, renderHook } from '@testing-library/react-native';

import { useCompanionOtp } from '@/hooks/useCompanionOtp';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const entry = { name: ' Ravi ', phone_extension: ' +91 ', phone_number: ' 9000000000 ' };

function setup() {
  return renderHook(() => useCompanionOtp('pod-1', 'mem-1', 'Enter 6 digits', 'Could not send'));
}

beforeEach(() => mockRequest.mockReset());

describe('useCompanionOtp', () => {
  it('requests a code with trimmed details and keeps the challenge', async () => {
    mockRequest.mockResolvedValue({
      requestPodCompanionOtp: { challenge_id: 'chal-1', test_code: '123456' },
    });
    const { result } = setup();
    await act(async () => {
      result.current.start(2, entry as never);
    });
    expect(mockRequest.mock.calls[0][1]).toEqual({
      input: {
        pod_doc_id: 'pod-1',
        membership_id: 'mem-1',
        name: 'Ravi',
        phone_extension: '+91',
        phone_number: '9000000000',
        mediums: ['WHATSAPP'],
      },
    });
    expect(result.current.activeIndex).toBe(2);
    expect(result.current.challengeId).toBe('chal-1');
    expect(result.current.testCode).toBe('123456');
    expect(result.current.sending).toBe(false);
  });

  it('leaves the test code empty when the server sends none', async () => {
    mockRequest.mockResolvedValue({
      requestPodCompanionOtp: { challenge_id: 'chal-1', test_code: null },
    });
    const { result } = setup();
    await act(async () => {
      result.current.start(0, entry as never);
    });
    expect(result.current.testCode).toBe('');
  });

  it('shows the server message and frees the row when sending fails', async () => {
    mockRequest.mockRejectedValue(new Error('Number already used'));
    const { result } = setup();
    await act(async () => {
      result.current.start(1, entry as never);
    });
    expect(result.current.error).toBe('Number already used');
    expect(result.current.activeIndex).toBeNull();
  });

  it('falls back to the supplied copy for an empty failure message', async () => {
    mockRequest.mockRejectedValue(new Error(''));
    const { result } = setup();
    await act(async () => {
      result.current.start(1, entry as never);
    });
    expect(result.current.error).toBe('Could not send');
  });

  it('rejects a malformed code without calling the server', async () => {
    const { result } = setup();
    let spent: string | null = 'x';
    await act(async () => {
      spent = await result.current.submit('12ab');
    });
    expect(spent).toBeNull();
    expect(result.current.error).toBe('Enter 6 digits');
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('verifies the code and resets, returning the spendable challenge', async () => {
    mockRequest.mockResolvedValueOnce({
      requestPodCompanionOtp: { challenge_id: 'chal-1', test_code: '' },
    });
    const { result } = setup();
    await act(async () => {
      result.current.start(0, entry as never);
    });
    mockRequest.mockResolvedValueOnce({ verifyAttendanceOtp: true });
    let spent: string | null = null;
    await act(async () => {
      spent = await result.current.submit(' 123456 ');
    });
    expect(spent).toBe('chal-1');
    expect(mockRequest.mock.calls[1][1]).toEqual({ challenge_id: 'chal-1', otp: '123456' });
    expect(result.current.activeIndex).toBeNull();
    expect(result.current.challengeId).toBe('');
    expect(result.current.verifying).toBe(false);
  });

  it('keeps the row open and shows the reason for a wrong code', async () => {
    mockRequest.mockResolvedValueOnce({
      requestPodCompanionOtp: { challenge_id: 'chal-1', test_code: '' },
    });
    const { result } = setup();
    await act(async () => {
      result.current.start(0, entry as never);
    });
    mockRequest.mockRejectedValueOnce(new Error('Wrong code'));
    let spent: string | null = 'x';
    await act(async () => {
      spent = await result.current.submit('654321');
    });
    expect(spent).toBeNull();
    expect(result.current.error).toBe('Wrong code');
    expect(result.current.activeIndex).toBe(0);
    expect(result.current.verifying).toBe(false);
  });

  it('cancel clears the live challenge and any error', async () => {
    mockRequest.mockRejectedValue(new Error(''));
    const { result } = setup();
    await act(async () => {
      await result.current.submit('bad');
    });
    expect(result.current.error).toBe('Enter 6 digits');
    act(() => result.current.cancel());
    expect(result.current.error).toBe('');
    expect(result.current.activeIndex).toBeNull();
  });
});
