import { describe, expect, it } from 'vitest';
import { gql } from '@apollo/client';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { PUBLIC_APP_SETTINGS } from '@duncit/app-settings';
import { GraphQLError } from 'graphql';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PodSettingsPage from '../PodSettingsPage';

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
      pod_complete_timeout_hours
      pod_complete_reminder_hours
      pod_reminder_lead_hours
      venue_slot_reminder_lead_hours
      pod_feedback_delay_hours
      pod_cancel_refund_hold
      pod_auto_cancel_enabled
      pod_auto_cancel_lead_hours
      pod_cancel_risk_window_hours
      pod_cancel_risk_alert_hours
      auto_pod_slot_window_days
      auto_pod_venue_expiry_hours
      auto_pod_assignment_expiry_hours
      auto_pod_cancel_health_penalty
      venue_change_request_health_penalty
      host_change_request_health_penalty
      club_admin_change_request_health_penalty
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
      pod_complete_timeout_hours
      pod_complete_reminder_hours
      pod_reminder_lead_hours
      venue_slot_reminder_lead_hours
      pod_feedback_delay_hours
      pod_cancel_refund_hold
      pod_auto_cancel_enabled
      pod_auto_cancel_lead_hours
      pod_cancel_risk_window_hours
      pod_cancel_risk_alert_hours
      auto_pod_slot_window_days
      auto_pod_venue_expiry_hours
      auto_pod_assignment_expiry_hours
      auto_pod_cancel_health_penalty
      venue_change_request_health_penalty
      host_change_request_health_penalty
      club_admin_change_request_health_penalty
      updated_at
    }
  }
`;

type SavedPodSettings = Record<string, number | boolean>;

const SAVED: SavedPodSettings = {
  draft_retention_days: 3,
  max_backout_attempts: 3,
  venue_cancel_health_penalty: 5,
  attendance_otp_required: true,
  pod_complete_timeout_hours: 24,
  pod_complete_reminder_hours: 12,
  pod_reminder_lead_hours: 24,
  venue_slot_reminder_lead_hours: 48,
  pod_feedback_delay_hours: 1,
  pod_cancel_refund_hold: true,
  pod_auto_cancel_enabled: false,
  pod_auto_cancel_lead_hours: 24,
  pod_cancel_risk_window_hours: 72,
  pod_cancel_risk_alert_hours: 4,
  auto_pod_slot_window_days: 14,
  auto_pod_venue_expiry_hours: 48,
  auto_pod_assignment_expiry_hours: 72,
  auto_pod_cancel_health_penalty: 5,
  venue_change_request_health_penalty: 5,
  host_change_request_health_penalty: 5,
  club_admin_change_request_health_penalty: 5,
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

const updateOk = (input: SavedPodSettings): MockedResponse => ({
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
const REFUND_HOLD_TITLE = 'Hold cancellation refunds until the pod starts';

/** The card wrapping one setting — the page renders many, each with a Save. */
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

describe('PodSettingsPage — page wiring', () => {
  it('shows the page heading and every section before the settings arrive', () => {
    renderPage([settingsMock(), publicMock()]);

    expect(screen.getByRole('heading', { name: 'Pod Settings' })).toBeInTheDocument();
    expect(screen.getByText('Platform-level defaults for the Create-a-Pod flow.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pod Reminder (Hours Before)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Auto Pods — slot window' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Request Change Setting' })).toBeInTheDocument();
    // Nothing has loaded yet, so the numeric boxes start blank.
    expect(penaltyInput()).toHaveValue(null);
  });

  it('flips a toggle straight to the server and dismisses the saved toast on Escape', async () => {
    renderPage([settingsMock(), publicMock(), updateOk({ pod_cancel_refund_hold: false })]);

    const toggle = await screen.findByRole('switch', { name: REFUND_HOLD_TITLE });
    await waitFor(() => expect(toggle).toBeChecked());

    fireEvent.click(toggle);
    await waitForToast();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Pod settings saved')).not.toBeInTheDocument());
  });

  it('shows the server refusal inside the card and no saved toast when the write fails', async () => {
    renderPage([
      settingsMock(),
      publicMock(),
      {
        request: { query: UPDATE_POD_SETTINGS, variables: { input: { venue_cancel_health_penalty: 9 } } },
        result: { errors: [new GraphQLError('Only super admins can change penalties')] },
      },
    ]);

    await waitForPenalty(5);
    fireEvent.change(penaltyInput(), { target: { value: '9' } });
    fireEvent.click(saveIn(penaltyInput()));

    expect(await cardOf(penaltyInput()).findByText('Only super admins can change penalties')).toBeInTheDocument();
    expect(screen.queryByText('Pod settings saved')).not.toBeInTheDocument();
  });
});
