import { describe, expect, it } from 'vitest';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ClubSettingsPage, { CLUB_SETTINGS, UPDATE_CLUB_SETTINGS } from '../ClubSettingsPage';

/**
 * Clubs > Club Settings: the club chat's message age limit is read from the
 * platform settings, edited in a whole-number box, and saved on its own.
 */
const settingsMock = (days: number): MockedResponse => ({
  request: { query: CLUB_SETTINGS },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      appSettings: {
        __typename: 'AppSettings',
        club_chat_retention_days: days,
        updated_at: '2026-10-16T04:00:00.000Z',
      },
    },
  },
});

const saveMock = (days: number): MockedResponse => ({
  request: { query: UPDATE_CLUB_SETTINGS, variables: { input: { club_chat_retention_days: days } } },
  result: {
    data: {
      updateAppSettings: {
        __typename: 'AppSettings',
        club_chat_retention_days: days,
        updated_at: '2026-10-16T04:05:00.000Z',
      },
    },
  },
});

const renderPage = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <ThemeProvider theme={createTheme()}>
        <ClubSettingsPage />
      </ThemeProvider>
    </MockedProvider>
  );

const daysInput = () => screen.getByRole('spinbutton');
const saveButton = () => screen.getByRole('button', { name: /^Sav/ });

describe('ClubSettingsPage', () => {
  it('shows the saved club chat retention once it loads', async () => {
    renderPage([settingsMock(30)]);

    await waitFor(() => expect(daysInput()).toHaveValue(30));
    expect(daysInput()).toHaveAttribute('min', '1');
    expect(daysInput()).toHaveAttribute('max', '3650');
    expect(saveButton()).toBeDisabled();
  });

  it('saves a new number of days and confirms it', async () => {
    renderPage([settingsMock(30), saveMock(45)]);
    await waitFor(() => expect(daysInput()).toHaveValue(30));

    fireEvent.change(daysInput(), { target: { value: '45' } });
    expect(saveButton()).toBeEnabled();
    fireEvent.click(saveButton());

    await waitFor(() => expect(screen.getByText('Club settings saved')).toBeInTheDocument());
  });

  it('refuses a number past the ten-year ceiling without saving', async () => {
    renderPage([settingsMock(30)]);
    await waitFor(() => expect(daysInput()).toHaveValue(30));

    fireEvent.change(daysInput(), { target: { value: '3651' } });

    expect(saveButton()).toBeDisabled();
    expect(screen.getByText('Enter a whole number of days between 1 and 3650.')).toBeInTheDocument();
  });
});
