import type { MockedResponse } from '@apollo/client/testing';
import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MODE_STORAGE_KEY } from '../../../../shared/theme';
import { LITE_UPDATE_PROFILE } from '../../../graphql/profile';
import { DisplayPicker } from '../../../pages/settings/DisplayPicker';
import { captureNotifications, meFixture, renderWithProviders } from '../../test-utils';

const saveMock = (display_mode: 'SYSTEM' | 'LIGHT' | 'DARK', result: MockedResponse['result']): MockedResponse => ({
  request: { query: LITE_UPDATE_PROFILE, variables: { input: { display_mode } } },
  result,
});

describe('DisplayPicker', () => {
  afterEach(() => {
    globalThis.localStorage.clear();
  });

  it('offers System, Light and Dark as a labelled group, with the current mode pressed', () => {
    renderWithProviders(<DisplayPicker />);

    const group = screen.getByRole('group', { name: 'Display' });
    const options = within(group).getAllByRole('button');
    expect(options.map((option) => option.textContent)).toEqual([expect.stringContaining('System'), expect.stringContaining('Light'), expect.stringContaining('Dark')]);
    // The app starts dark until the reader chooses.
    expect(within(group).getByRole('button', { name: /Dark/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: /Light/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('previews each scheme: one half for Light or Dark, both halves for System', () => {
    renderWithProviders(<DisplayPicker />);

    const samples = (mode: string) => within(screen.getByTestId(`display-${mode}`)).getAllByText('Aa');
    expect(samples('SYSTEM')).toHaveLength(2);
    expect(samples('LIGHT')).toHaveLength(1);
    expect(samples('DARK')).toHaveLength(1);
  });

  it('switches at once and remembers the choice on this device when signed out', async () => {
    const { user } = renderWithProviders(<DisplayPicker />);

    await user.click(screen.getByTestId('display-LIGHT'));

    expect(screen.getByTestId('display-LIGHT')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('display-DARK')).toHaveAttribute('aria-pressed', 'false');
    expect(globalThis.localStorage.getItem(MODE_STORAGE_KEY)).toBe('light');
  });

  it('keeps the current mode when its own button is pressed again', async () => {
    const { user } = renderWithProviders(<DisplayPicker />);

    await user.click(screen.getByTestId('display-DARK'));

    expect(screen.getByTestId('display-DARK')).toHaveAttribute('aria-pressed', 'true');
  });

  it('saves a signed-in choice to the account so it follows the reader', async () => {
    const saved = vi.fn(() => ({ data: { liteUpdateProfile: meFixture({ display_mode: 'SYSTEM' }) } }));
    const { user } = renderWithProviders(<DisplayPicker />, { me: meFixture(), mocks: [saveMock('SYSTEM', saved)] });

    await user.click(screen.getByTestId('display-SYSTEM'));

    expect(screen.getByTestId('display-SYSTEM')).toHaveAttribute('aria-pressed', 'true');
    await vi.waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
  });

  it('keeps the new mode on this device and says why when the account could not be updated', async () => {
    const toasts = captureNotifications();
    const { user } = renderWithProviders(<DisplayPicker />, { me: meFixture(), mocks: [saveMock('LIGHT', () => ({ errors: [{ message: 'Please sign in again' }] }))] });

    await user.click(screen.getByTestId('display-LIGHT'));

    await vi.waitFor(() => expect(toasts.seen).toEqual([{ message: 'Please sign in again', severity: 'error' }]));
    expect(screen.getByTestId('display-LIGHT')).toHaveAttribute('aria-pressed', 'true');
    toasts.stop();
  });
});
