import { act, renderHook, waitFor } from '@testing-library/react-native';
import { logs } from '@duncit/logs';

import { getItem, removeItem, setItem } from '@/services/secure-storage';
import { markGreeted, useOccasionPaused, wasGreeted } from '../occasion-prefs';

jest.mock('@duncit/logs', () => ({
  logs: { mobileApp: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() } },
}));
jest.mock('@/services/secure-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockedGet = jest.mocked(getItem);
const mockedSet = jest.mocked(setItem);
const mockedRemove = jest.mocked(removeItem);

beforeEach(() => {
  jest.clearAllMocks();
  mockedGet.mockResolvedValue(null);
  mockedSet.mockResolvedValue(undefined);
  mockedRemove.mockResolvedValue(undefined);
});

describe('useOccasionPaused', () => {
  it('is undecided until the stored choice is read, then plays a look never paused', async () => {
    const { result } = renderHook(() => useOccasionPaused('christmas'));
    expect(result.current.paused).toBeNull();
    await waitFor(() => expect(result.current.paused).toBe(false));
    expect(mockedGet).toHaveBeenCalledWith('duncit.occasion.paused.christmas');
  });

  it('remembers a look the viewer paused', async () => {
    mockedGet.mockResolvedValue('1');
    const { result } = renderHook(() => useOccasionPaused('diwali'));
    await waitFor(() => expect(result.current.paused).toBe(true));
  });

  it('pauses and plays again, saving the choice for that look only', async () => {
    const { result } = renderHook(() => useOccasionPaused('holi'));
    await waitFor(() => expect(result.current.paused).toBe(false));

    act(() => result.current.toggle());
    expect(result.current.paused).toBe(true);
    expect(mockedSet).toHaveBeenCalledWith('duncit.occasion.paused.holi', '1');

    act(() => result.current.toggle());
    expect(result.current.paused).toBe(false);
    expect(mockedRemove).toHaveBeenCalledWith('duncit.occasion.paused.holi');
  });

  it('plays the look and logs when the stored choice cannot be read', async () => {
    const error = new Error('keystore locked');
    mockedGet.mockRejectedValue(error);
    const { result } = renderHook(() => useOccasionPaused('eid'));
    await waitFor(() => expect(result.current.paused).toBe(false));
    expect(logs.mobileApp.warn).toHaveBeenCalledWith('occasion', 'readPaused', { error });
  });

  it('still pauses for this launch, and logs, when the choice cannot be saved', async () => {
    const error = new Error('disk full');
    mockedSet.mockRejectedValue(error);
    const { result } = renderHook(() => useOccasionPaused('onam'));
    await waitFor(() => expect(result.current.paused).toBe(false));
    act(() => result.current.toggle());
    expect(result.current.paused).toBe(true);
    await waitFor(() =>
      expect(logs.mobileApp.warn).toHaveBeenCalledWith('occasion', 'savePaused', { error }),
    );
  });
});

describe('greeted looks', () => {
  it('greets each look once a launch', () => {
    expect(wasGreeted('new-year')).toBe(false);
    markGreeted('new-year');
    expect(wasGreeted('new-year')).toBe(true);
    expect(wasGreeted('pongal')).toBe(false);
  });
});
