import { describe, expect, it } from 'vitest';
import { gql } from '@apollo/client';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { PUBLIC_APP_SETTINGS } from '@duncit/app-settings';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PodSettingsPage from '../../PodSettingsPage';

/**
 * Both documents live inside the page, so restating them here is the contract:
 * drop `venue_cancel_health_penalty` from either one, or rename an operation,
 * and no mock matches any more.
 */
const POD_SETTINGS = gql`
  query PodSettings {
    appSettings {
      draft_retention_days
      max_backout_attempts
      venue_cancel_health_penalty
      attendance_otp_required
      pod_auto_cancel_enabled
      pod_auto_cancel_lead_hours
      auto_pod_slot_window_days
      auto_pod_venue_expiry_hours
      auto_pod_cancel_health_penalty
      updated_at
    }
  }
`;

const UPDATE_POD_SETTINGS = gql`
  mutation UpdatePodSettings($input: UpdateAppSettingsInput!) {
    updateAppSettings(input: $input) {
      draft_retention_days
      max_backout_attempts
      venue_cancel_health_penalty
      attendance_otp_required
      pod_auto_cancel_enabled
      pod_auto_cancel_lead_hours
      auto_pod_slot_window_days
      auto_pod_venue_expiry_hours
      auto_pod_cancel_health_penalty
      updated_at
    }
  }
`;

interface SavedPodSettings {
  draft_retention_days: number;
  max_backout_attempts: number;
  venue_cancel_health_penalty: number;
  attendance_otp_required: boolean;
  pod_auto_cancel_enabled: boolean;
  pod_auto_cancel_lead_hours: number;
}

const SAVED: SavedPodSettings = {
  draft_retention_days: 3,
  max_backout_attempts: 3,
  venue_cancel_health_penalty: 5,
  attendance_otp_required: true,
  pod_auto_cancel_enabled: false,
  pod_auto_cancel_lead_hours: 24,
};

/** The page refetches after every save, so this mock must be reusable. */
const settingsMock = (saved: SavedPodSettings = SAVED): MockedResponse => ({
  request: { query: POD_SETTINGS },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      appSettings: {
        __typename: 'AppSettings',
        ...saved,
        updated_at: '2024-05-17T04:00:00.000Z',
      },
    },
  },
});

/** Every save carries `refetchQueries: [{ query: PUBLIC_APP_SETTINGS }]`. */
const publicMock = (): MockedResponse => ({
  request: { query: PUBLIC_APP_SETTINGS },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      publicAppSettings: {
        __typename: 'PublicAppSettings',
        date_format: 'dd/MM/yyyy',
        time_format: 'HH:mm',
        time_zone: 'Asia/Kolkata',
        time_source: 'SERVER',
        custom_time: null,
        custom_time_set_at: null,
        server_time: '2024-05-17T04:00:37.000Z',
        min_birth_year: 1950,
        max_birth_year: 2010,
        draft_retention_days: 30,
      },
    },
  },
});

const updateOk = (input: Record<string, number>): MockedResponse => ({
  request: { query: UPDATE_POD_SETTINGS, variables: { input } },
  result: {
    data: {
      updateAppSettings: {
        __typename: 'AppSettings',
        ...SAVED,
        ...input,
        updated_at: '2024-05-17T04:05:00.000Z',
      },
    },
  },
});

const theme = createTheme();

const renderPage = (mocks: readonly MockedResponse[]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks as MockedResponse[]}>
      <ThemeProvider theme={theme}>
        <PodSettingsPage />
      </ThemeProvider>
    </MockedProvider>,
  );

const PENALTY_LABEL = 'Account Health Penalty (Points)';
const RETENTION_LABEL = 'Draft Pod Retention Period (Days)';
const PENALTY_INVALID = 'Enter a whole number of 0 or more.';

/** The card wrapping one setting — the page renders three, each with a Save. */
const cardOf = (input: HTMLElement) => {
  const card = input.closest('.MuiCard-root');
  if (!(card instanceof HTMLElement)) {
    throw new Error('setting input is not inside a card');
  }
  return within(card);
};

const saveIn = (input: HTMLElement) => cardOf(input).getByRole('button', { name: /^Sav/ });

const penaltyInput = () => screen.getByLabelText(PENALTY_LABEL);

const waitForPenalty = async (points: number) => {
  await waitFor(() => expect(penaltyInput()).toHaveValue(points));
};

const waitForToast = async () => {
  await waitFor(() => expect(screen.getByText('Pod settings saved')).toBeInTheDocument());
};

describe('PodSettingsPage — venue cancellation Account Health penalty', () => {
  it('hydrates the saved penalty and keeps its Save disabled until the number changes', async () => {
    renderPage([settingsMock(), publicMock()]);

    await waitForPenalty(5);
    expect(saveIn(penaltyInput())).toBeDisabled();

    fireEvent.change(penaltyInput(), { target: { value: '8' } });

    expect(saveIn(penaltyInput())).toBeEnabled();
  });

  it('saves only the penalty field', async () => {
    renderPage([settingsMock(), publicMock(), updateOk({ venue_cancel_health_penalty: 8 })]);

    await waitForPenalty(5);
    fireEvent.change(penaltyInput(), { target: { value: '8' } });
    fireEvent.click(saveIn(penaltyInput()));

    // A mismatch in the mutation variables would leave the snackbar unrendered.
    await waitForToast();
  });

  it('treats a saved 0 as a real value, not an unloaded field', async () => {
    renderPage([settingsMock({ ...SAVED, venue_cancel_health_penalty: 0 }), publicMock()]);

    await waitForPenalty(0);
    expect(saveIn(penaltyInput())).toBeDisabled();
    expect(cardOf(penaltyInput()).queryByText(PENALTY_INVALID)).toBeNull();

    fireEvent.change(penaltyInput(), { target: { value: '4' } });

    expect(saveIn(penaltyInput())).toBeEnabled();
  });

  it('saves 0 to switch the penalty off', async () => {
    renderPage([settingsMock(), publicMock(), updateOk({ venue_cancel_health_penalty: 0 })]);

    await waitForPenalty(5);
    fireEvent.change(penaltyInput(), { target: { value: '0' } });
    expect(saveIn(penaltyInput())).toBeEnabled();

    fireEvent.click(saveIn(penaltyInput()));

    await waitForToast();
  });

  it('blocks an emptied field instead of reading it as a 0', async () => {
    renderPage([settingsMock(), publicMock()]);

    await waitForPenalty(5);
    fireEvent.change(penaltyInput(), { target: { value: '' } });

    expect(saveIn(penaltyInput())).toBeDisabled();
    expect(cardOf(penaltyInput()).getByText(PENALTY_INVALID)).toBeInTheDocument();
  });

  it('leaves the existing min-1 cards saving their own field', async () => {
    renderPage([settingsMock(), publicMock(), updateOk({ draft_retention_days: 7 })]);

    const retention = screen.getByLabelText(RETENTION_LABEL);
    await waitFor(() => expect(retention).toHaveValue(3));

    fireEvent.change(retention, { target: { value: '0' } });
    expect(saveIn(retention)).toBeDisabled();
    expect(cardOf(retention).getByText('Enter a whole number of 1 or more.')).toBeInTheDocument();

    fireEvent.change(retention, { target: { value: '7' } });
    fireEvent.click(saveIn(retention));

    await waitForToast();
  });
});
