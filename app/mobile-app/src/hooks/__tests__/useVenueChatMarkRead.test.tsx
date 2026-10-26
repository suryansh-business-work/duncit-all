import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { MarkVenueChatReadDocument } from '@/graphql/venue-chat';
import { useVenueChatMarkRead } from '@/hooks/useVenueChatMarkRead';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
let mockFocused = true;
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocused }));
const mockWarn = jest.fn();
jest.mock('@duncit/logs', () => ({
  logs: { mobileApp: { warn: (...args: unknown[]) => mockWarn(...args), error: jest.fn() } },
}));
const mockRequest = graphqlRequest as jest.Mock;

type Line = { id: string; user_id: string };
type Props = { lines: Line[]; ready: boolean };
const mine = (id: string): Line => ({ id, user_id: 'me' });
const theirs = (id: string): Line => ({ id, user_id: 'venue-owner' });

let appStateChange: (state: AppStateStatus) => void = () => undefined;
let originalState: PropertyDescriptor | undefined;

const mountMarker = (initialProps: Props) =>
  renderHook(
    ({ lines, ready }: Props) => useVenueChatMarkRead({ podId: 'pod-1', lines, meId: 'me', ready }),
    { initialProps },
  );

/** Lets the throttled mark go out. */
const flush = () => act(() => jest.runOnlyPendingTimers());

beforeEach(() => {
  jest.useFakeTimers();
  mockRequest.mockReset();
  mockRequest.mockResolvedValue({ markVenueChatRead: true });
  mockWarn.mockReset();
  mockFocused = true;
  originalState = Object.getOwnPropertyDescriptor(AppState, 'currentState');
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
    appStateChange = handler as (state: AppStateStatus) => void;
    return { remove: jest.fn() } as never;
  });
});

afterEach(() => {
  (AppState.addEventListener as jest.Mock).mockRestore();
  if (originalState) Object.defineProperty(AppState, 'currentState', originalState);
  jest.useRealTimers();
});

describe('useVenueChatMarkRead', () => {
  it('leaves the opening to the first page, then marks the thread read for each new line from the other side', () => {
    const { rerender } = mountMarker({ lines: [], ready: false });
    rerender({ lines: [theirs('a'), mine('b')], ready: true });
    flush();
    // Reading the first page already marked it.
    expect(mockRequest).not.toHaveBeenCalled();

    // The reader's own line moves nothing.
    rerender({ lines: [theirs('a'), mine('b'), mine('c')], ready: true });
    flush();
    expect(mockRequest).not.toHaveBeenCalled();

    rerender({ lines: [theirs('a'), mine('b'), mine('c'), theirs('d')], ready: true });
    flush();
    expect(mockRequest).toHaveBeenCalledWith(
      MarkVenueChatReadDocument,
      { podId: 'pod-1' },
      { auth: true },
    );
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('holds the mark while the thread is off screen, and sends it on coming back', () => {
    const { rerender } = mountMarker({ lines: [theirs('a')], ready: true });
    mockFocused = false;
    rerender({ lines: [theirs('a'), theirs('b')], ready: true });
    flush();
    expect(mockRequest).not.toHaveBeenCalled();

    mockFocused = true;
    rerender({ lines: [theirs('a'), theirs('b')], ready: true });
    flush();
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('holds the mark while the app is in the background, and sends it when the app is back', () => {
    const { rerender } = mountMarker({ lines: [theirs('a')], ready: true });
    act(() => appStateChange('background'));
    rerender({ lines: [theirs('a'), theirs('b')], ready: true });
    flush();
    expect(mockRequest).not.toHaveBeenCalled();

    act(() => appStateChange('active'));
    flush();
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('logs a mark that failed and leaves it for the next one', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));
    const { rerender } = mountMarker({ lines: [theirs('a')], ready: true });
    rerender({ lines: [theirs('a'), theirs('b')], ready: true });
    flush();
    // The refusal settles a tick after the mark goes out.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockWarn).toHaveBeenCalledWith('venueChat', 'markRead', {
      pod_id: 'pod-1',
      error: expect.any(Error),
    });
  });

  it('marks nothing before the reader is known', () => {
    const { rerender } = renderHook(
      ({ lines }: { lines: Line[] }) =>
        useVenueChatMarkRead({ podId: 'pod-1', lines, meId: null, ready: true }),
      { initialProps: { lines: [theirs('a')] } },
    );
    rerender({ lines: [theirs('a'), theirs('b')] });
    flush();
    expect(mockRequest).not.toHaveBeenCalled();
  });
});
