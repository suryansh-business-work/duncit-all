import { AppState, type AppStateStatus } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { logs } from '@duncit/logs';

import { OccasionColorMode, OccasionGarlandStyle } from '@/generated/graphql/graphql';
import { nextLookCheckDelay, useOccasionLook } from '@/hooks/useOccasionLook';
import { graphqlRequest } from '@/services/graphql.client';
import { keepSameLook, useOccasionStore, type OccasionLiveData } from '@/stores/occasion.store';

jest.mock('@/services/graphql.client');
jest.mock('@duncit/logs', () => ({
  logs: { mobileApp: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() } },
}));

const mockedRequest = jest.mocked(graphqlRequest);
type Theme = NonNullable<OccasionLiveData['occasionLive']['theme']>;

const tokens = {
  bg: '',
  surface: '',
  soft: '',
  ink: '',
  muted: '',
  border: '',
  inputBorder: '',
  primary: '#C62828',
  primaryHover: '',
  primaryActive: '',
  onPrimary: '',
  accent: '',
  onAccent: '',
  brand: '',
  success: '',
  warning: '',
  error: '',
  info: '',
  onSemantic: '',
};

const theme = (key: string, greeting = 'Merry Christmas from Duncit!'): Theme => ({
  key,
  color_mode: OccasionColorMode.Auto,
  greeting,
  palette_light: tokens,
  palette_dark: tokens,
  particles: [],
  flyers: [],
  fireworks: { enabled: false, colors: [], bursts_per_minute: 0, sparks: 0, radius: 0 },
  overlays: [],
  garland: { style: OccasionGarlandStyle.None, colors: [] },
});

const answer = (look: Theme | null, next: string | null = null): OccasionLiveData => ({
  occasionLive: { next_change_at: next, theme: look },
});

let appStateListener: ((state: AppStateStatus) => void) | undefined;
const removeAppState = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  useOccasionStore.setState({ data: undefined, isLoading: false, error: undefined });
  appStateListener = undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListener = listener;
    return { remove: removeAppState };
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('nextLookCheckDelay', () => {
  const now = Date.parse('2026-12-24T18:00:00.000Z');

  it('waits for nothing when no change is scheduled', () => {
    expect(nextLookCheckDelay(null, now)).toBeNull();
    expect(nextLookCheckDelay(undefined, now)).toBeNull();
    expect(nextLookCheckDelay('not a date', now)).toBeNull();
  });

  it('asks a second after the scheduled change', () => {
    expect(nextLookCheckDelay('2026-12-24T19:00:00.000Z', now)).toBe(60 * 60 * 1000 + 1000);
  });

  it('never asks again within fifteen seconds, even for a change already due', () => {
    expect(nextLookCheckDelay('2026-12-24T17:00:00.000Z', now)).toBe(15_000);
  });

  it('looks again within a day however far off the change is', () => {
    expect(nextLookCheckDelay('2027-03-01T00:00:00.000Z', now)).toBe(24 * 60 * 60 * 1000);
  });
});

describe('keepSameLook', () => {
  it('keeps the earlier look object when the look has not changed', () => {
    const before = answer(theme('christmas'), '2026-12-26T00:00:00.000Z');
    const kept = keepSameLook(before, answer(theme('christmas'), '2026-12-27T00:00:00.000Z'));
    expect(kept.occasionLive.theme).toBe(before.occasionLive.theme);
    expect(kept.occasionLive.next_change_at).toBe('2026-12-27T00:00:00.000Z');
  });

  it('takes the fresh answer when the look changed, appeared or ended', () => {
    const changed = answer(theme('christmas', 'Happy holidays!'));
    expect(keepSameLook(answer(theme('christmas')), changed)).toBe(changed);
    const appeared = answer(theme('diwali'));
    expect(keepSameLook(answer(null), appeared)).toBe(appeared);
    const ended = answer(null);
    expect(keepSameLook(answer(theme('diwali')), ended)).toBe(ended);
    expect(keepSameLook(undefined, appeared)).toBe(appeared);
  });
});

describe('useOccasionLook', () => {
  it('fetches the live look once and hands it over', async () => {
    mockedRequest.mockResolvedValue(answer(theme('christmas')));
    const { result } = renderHook(() => useOccasionLook());
    await waitFor(() => expect(result.current?.key).toBe('christmas'));
    expect(mockedRequest).toHaveBeenCalledTimes(1);
  });

  it('is null for the house look', async () => {
    mockedRequest.mockResolvedValue(answer(null));
    const { result } = renderHook(() => useOccasionLook());
    await waitFor(() => expect(useOccasionStore.getState().data).toBeDefined());
    expect(result.current).toBeNull();
  });

  it('asks again when the app comes back to the front, not when it leaves', async () => {
    mockedRequest.mockResolvedValue(answer(null));
    const { unmount } = renderHook(() => useOccasionLook());
    await waitFor(() => expect(mockedRequest).toHaveBeenCalledTimes(1));

    await act(async () => appStateListener?.('background'));
    expect(mockedRequest).toHaveBeenCalledTimes(1);

    mockedRequest.mockResolvedValue(answer(theme('new-year')));
    await act(async () => appStateListener?.('active'));
    await waitFor(() =>
      expect(useOccasionStore.getState().data?.occasionLive.theme?.key).toBe('new-year'),
    );
    expect(mockedRequest).toHaveBeenCalledTimes(2);

    unmount();
    expect(removeAppState).toHaveBeenCalled();
  });

  it('asks again when a scheduled look opens, and stops waiting once gone', async () => {
    jest.useFakeTimers({ now: Date.parse('2026-12-24T18:00:00.000Z') });
    mockedRequest.mockResolvedValue(answer(null, '2026-12-24T18:10:00.000Z'));
    const { result, unmount } = renderHook(() => useOccasionLook());
    await waitFor(() => expect(mockedRequest).toHaveBeenCalledTimes(1));

    mockedRequest.mockResolvedValue(answer(theme('christmas'), '2026-12-26T00:00:00.000Z'));
    await act(async () => {
      jest.advanceTimersByTime(10 * 60 * 1000 + 1000);
    });
    await waitFor(() => expect(result.current?.key).toBe('christmas'));
    expect(mockedRequest).toHaveBeenCalledTimes(2);

    unmount();
    await act(async () => {
      jest.advanceTimersByTime(48 * 60 * 60 * 1000);
    });
    expect(mockedRequest).toHaveBeenCalledTimes(2);
  });

  it('logs a failed request and keeps the house look', async () => {
    const error = new Error('Network error');
    mockedRequest.mockRejectedValue(error);
    const { result } = renderHook(() => useOccasionLook());
    await waitFor(() =>
      expect(logs.mobileApp.warn).toHaveBeenCalledWith('useOccasionLook', 'occasionLive', {
        error,
      }),
    );
    expect(result.current).toBeNull();
  });
});
