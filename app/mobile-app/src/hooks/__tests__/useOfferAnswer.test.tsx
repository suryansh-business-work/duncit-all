import { act, renderHook } from '@testing-library/react-native';

import { roundOf, useOfferAnswer } from '@/hooks/useOfferAnswer';
import { ApiError } from '@/utils/errors';

const mockWarn = jest.fn();
jest.mock('@duncit/logs', () => ({
  logs: { mobileApp: { warn: (...args: unknown[]) => mockWarn(...args), error: jest.fn() } },
}));

const offerChanged = () =>
  new ApiError('The offer changed', 400, { code: 'BAD_USER_INPUT', reason: 'OFFER_CHANGED' });

beforeEach(() => mockWarn.mockReset());

describe('useOfferAnswer', () => {
  it('says the answer went through, re-reads, and lets the sheet close', async () => {
    const reread = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useOfferAnswer(reread, 'test'));
    const request = jest.fn().mockResolvedValue({});
    let closes = false;
    await act(async () => {
      closes = await result.current.run(request, 'Booking accepted');
    });
    expect(closes).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
    expect(reread).toHaveBeenCalledTimes(1);
    expect(result.current.notice).toEqual({ tone: 'success', text: 'Booking accepted' });
    expect(result.current.error).toBeNull();
    expect(result.current.busy).toBe(false);

    act(() => result.current.clearNotice());
    expect(result.current.notice).toBeNull();
  });

  it('says the terms changed when the other side moved first, re-reads the latest and closes', async () => {
    const reread = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useOfferAnswer(reread, 'test'));
    let closes = false;
    await act(async () => {
      closes = await result.current.run(() => Promise.reject(offerChanged()), 'Booking accepted');
    });
    expect(closes).toBe(true);
    expect(reread).toHaveBeenCalledTimes(1);
    expect(result.current.notice).toEqual({
      tone: 'warning',
      text: 'The terms changed while you were reading them. Here are the latest.',
    });
    expect(mockWarn).toHaveBeenCalledWith('test', 'answer', { error: expect.any(ApiError) });
  });

  it("keeps the sheet open with the server's reason — or a plain failure — and re-reads nothing", async () => {
    const reread = jest.fn();
    const { result } = renderHook(() => useOfferAnswer(reread, 'test'));
    let closes = true;
    await act(async () => {
      closes = await result.current.run(
        () => Promise.reject(new ApiError('This booking has already started', 400, {})),
        'done',
      );
    });
    expect(closes).toBe(false);
    expect(result.current.error).toBe('This booking has already started');
    expect(result.current.notice).toBeNull();
    expect(reread).not.toHaveBeenCalled();

    await act(async () => {
      // A refusal that names no reason reads the plain failure.
      await result.current.run(() => Promise.reject(new Error('')), 'done');
    });
    expect(result.current.error).toBe('That did not work. Please try again.');
    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });

  it('keeps an answer that went through when only the re-read fails', async () => {
    const reread = jest.fn().mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useOfferAnswer(reread, 'test'));
    let closes = false;
    await act(async () => {
      closes = await result.current.run(() => Promise.resolve(true), 'Your counter was sent.');
    });
    expect(closes).toBe(true);
    expect(result.current.notice?.text).toBe('Your counter was sent.');
    expect(mockWarn).toHaveBeenCalledWith('test', 'refresh', { error: expect.any(Error) });
  });
});

describe('roundOf', () => {
  it('sends the round read, and none for a request from before offers', () => {
    expect(roundOf(3)).toEqual({ round: 3 });
    expect(roundOf(null)).toEqual({});
  });
});
