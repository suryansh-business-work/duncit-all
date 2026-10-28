import type { MockedResponse } from '@apollo/client/testing';
import { act, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MODE_STORAGE_KEY } from '../../../shared/theme';
import { LITE_UPDATE_PROFILE } from '../../graphql/profile';
import { DISPLAY_MODES, useDisplayMode } from '../../lib/useDisplayMode';
import { captureNotifications, meFixture, renderHookWithProviders } from '../test-utils';

const saveMock = (mode: 'SYSTEM' | 'LIGHT' | 'DARK', answer: MockedResponse['result'] | Error): MockedResponse =>
  answer instanceof Error
    ? { request: { query: LITE_UPDATE_PROFILE, variables: { input: { display_mode: mode } } }, error: answer }
    : { request: { query: LITE_UPDATE_PROFILE, variables: { input: { display_mode: mode } } }, result: answer };

let toasts: ReturnType<typeof captureNotifications>;

beforeEach(() => {
  localStorage.clear();
  toasts = captureNotifications();
});

afterEach(() => {
  toasts.stop();
  localStorage.clear();
});

describe('useDisplayMode', () => {
  it('cycles System, Light, Dark in that order', () => {
    expect(DISPLAY_MODES).toEqual(['SYSTEM', 'LIGHT', 'DARK']);
  });

  it("starts from the app's dark default and offers System next", () => {
    const { result } = renderHookWithProviders(() => useDisplayMode());
    expect(result.current.current).toBe('DARK');
    expect(result.current.next).toBe('SYSTEM');
  });

  it("starts from the reader's remembered choice on this device", () => {
    localStorage.setItem(MODE_STORAGE_KEY, 'light');
    const { result } = renderHookWithProviders(() => useDisplayMode());
    expect(result.current.current).toBe('LIGHT');
    expect(result.current.next).toBe('DARK');
  });

  it('applies a choice on this device only when signed out', async () => {
    const answered = vi.fn(() => ({ data: { liteUpdateProfile: meFixture() } }));
    const { result } = renderHookWithProviders(() => useDisplayMode(), { mocks: [saveMock('LIGHT', answered)] });

    act(() => result.current.choose('LIGHT'));

    expect(result.current.current).toBe('LIGHT');
    expect(result.current.next).toBe('DARK');
    expect(localStorage.getItem(MODE_STORAGE_KEY)).toBe('light');
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });
    expect(answered).not.toHaveBeenCalled();
  });

  it('saves the choice to the account when signed in, so it follows the reader', async () => {
    const me = meFixture();
    const answered = vi.fn(() => ({ data: { liteUpdateProfile: { ...me, display_mode: 'SYSTEM' as const } } }));
    const { result } = renderHookWithProviders(() => useDisplayMode(), { me, mocks: [saveMock('SYSTEM', answered)] });

    act(() => result.current.choose('SYSTEM'));

    expect(result.current.current).toBe('SYSTEM');
    expect(result.current.next).toBe('LIGHT');
    await waitFor(() => expect(answered).toHaveBeenCalledTimes(1));
    expect(toasts.seen).toEqual([]);
  });

  it("keeps the choice on this device and says why when the account can't be saved", async () => {
    const { result } = renderHookWithProviders(() => useDisplayMode(), { me: meFixture(), mocks: [saveMock('LIGHT', new Error('Your session has ended'))] });

    act(() => result.current.choose('LIGHT'));

    await waitFor(() => expect(toasts.seen).toEqual([{ message: 'Your session has ended', severity: 'error' }]));
    expect(result.current.current).toBe('LIGHT');
  });
});
