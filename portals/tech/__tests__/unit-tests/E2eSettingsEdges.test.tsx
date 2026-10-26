import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { e2eSettings, e2eSuites } from '../mocks/e2e.mock';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
// The picker itself is MUI's; what the page owns is turning its Date into the HH:mm it stores.
vi.mock('@mui/x-date-pickers/TimePicker', () => ({
  TimePicker: (p: { label: string; onChange: (value: Date | null) => void }) => (
    <label>
      {p.label}
      <input
        data-testid="time-picker"
        onChange={(e) => {
          const [hours, minutes] = e.target.value.split(':').map(Number);
          p.onChange(e.target.value ? new Date(2026, 0, 1, hours, minutes) : null);
        }}
      />
    </label>
  ),
}));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));

import E2eSettingsPage from '../../src/pages/e2e/settings/E2eSettingsPage';

const seed = (over: Parameters<typeof e2eSettings>[0] = {}) => {
  ops.q = {
    E2eRunSettings: { data: { e2eRunSettings: e2eSettings(over) } },
    E2eSuiteCatalogue: { data: { e2eSuiteCatalogue: e2eSuites() } },
    SlackChannels: { data: { slackChannels: [{ id: 'C0123ABCD', name: 'qa-results', is_private: false }] } },
  };
};

beforeEach(() => {
  resetOps();
  seed();
});

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));
const mount = async () => {
  renderWithProviders(<E2eSettingsPage />);
  await screen.findByLabelText('Branch');
};

describe('E2E settings page / states', () => {
  it('shows a placeholder until both the settings and the suite catalogue have arrived', () => {
    ops.q.E2eSuiteCatalogue = { loading: true };
    const { unmount } = renderWithProviders(<E2eSettingsPage />);
    expect(screen.queryByLabelText('Branch')).not.toBeInTheDocument();
    unmount();

    seed();
    ops.q.E2eRunSettings = { loading: true };
    renderWithProviders(<E2eSettingsPage />);
    expect(screen.queryByLabelText('Branch')).not.toBeInTheDocument();
  });

  it('shows the form with no channel list while the Slack channels have not loaded', async () => {
    seed({ slack_configured: true, slack_channel: 'C0123ABCD' });
    ops.q.SlackChannels = { loading: true };
    await mount();
    expect(screen.getByLabelText('Results channel')).toHaveValue('C0123ABCD');
  });

  it('shows who last reported from CI, and when', async () => {
    seed({ last_reported_at: '2026-01-02T10:00:00.000Z', last_reported_by: 'ci@example.test' });
    await mount();
    expect(screen.getByText(/ci@example\.test/)).toBeInTheDocument();
    expect(screen.queryByText(/No run has ever reported here/)).not.toBeInTheDocument();
  });

  it('names no one when CI reported without an account', async () => {
    seed({ last_reported_at: '2026-01-02T10:00:00.000Z', last_reported_by: null });
    await mount();
    expect(screen.queryByText(/No run has ever reported here/)).not.toBeInTheDocument();
  });

  it('reports a save refused with text', async () => {
    ops.mut.UpdateE2eRunSettings = vi.fn().mockRejectedValue('quota exceeded');
    await mount();
    save();
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('quota exceeded'));
  });

  it('shows a busy save button while the settings are being saved', async () => {
    ops.mutLoading.UpdateE2eRunSettings = true;
    await mount();
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });
});

describe('E2E settings / schedule', () => {
  it('keeps the narrowed suite list the schedule already has instead of selecting every suite', async () => {
    seed({ suites: ['mweb'] });
    await mount();
    expect(screen.getByRole('checkbox', { name: 'mWeb' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Tech portal' })).not.toBeChecked();

    save();

    await waitFor(() => expect(mutation('UpdateE2eRunSettings')).toHaveBeenCalled());
    expect(mutation('UpdateE2eRunSettings').mock.calls[0][0].variables.input.suites).toEqual(['mweb']);
  });

  it('reads a schedule with no Slack channel as an empty channel', async () => {
    seed({ slack_configured: true, slack_channel: null as never });
    await mount();
    expect(screen.getByLabelText('Results channel')).toHaveValue('');
  });

  it('refuses a Slack channel that is not an id', async () => {
    seed({ slack_configured: true, slack_channel: '' });
    await mount();
    fireEvent.change(screen.getByLabelText('Results channel'), { target: { value: 'not-an-id' } });

    save();

    expect(await screen.findByText(/Slack channel ID/i)).toBeInTheDocument();
    expect(mutation('UpdateE2eRunSettings')).not.toHaveBeenCalled();
  });
});

describe('E2E settings / schedule controls', () => {
  it('switches the schedule off and saves it', async () => {
    await mount();
    fireEvent.click(screen.getByRole('switch', { name: 'Run the suite on a schedule' }));
    save();

    await waitFor(() => expect(mutation('UpdateE2eRunSettings')).toHaveBeenCalled());
    expect(mutation('UpdateE2eRunSettings').mock.calls[0][0].variables.input.enabled).toBe(false);
  });

  it('changes the time of day from the time field, and falls back to the quiet hour when it is cleared', async () => {
    seed({ time_of_day: '04:15' });
    await mount();
    fireEvent.change(screen.getByTestId('time-picker'), { target: { value: '05:30' } });
    save();
    await waitFor(() => expect(mutation('UpdateE2eRunSettings')).toHaveBeenCalledTimes(1));
    expect(mutation('UpdateE2eRunSettings').mock.calls[0][0].variables.input.time_of_day).toBe('05:30');

    fireEvent.change(screen.getByTestId('time-picker'), { target: { value: '' } });
    save();
    await waitFor(() => expect(mutation('UpdateE2eRunSettings')).toHaveBeenCalledTimes(2));
    expect(mutation('UpdateE2eRunSettings').mock.calls[1][0].variables.input.time_of_day).toBe('03:00');
  });
});

describe('E2E settings / run identity', () => {
  it('asks for the prefix when only a domain is given', async () => {
    await mount();
    fireEvent.change(screen.getByLabelText('Email domain'), { target: { value: 'qa.example.test' } });

    save();

    expect(await screen.findByText('A prefix needs a domain, and a domain needs a prefix.')).toBeInTheDocument();
    expect(mutation('UpdateE2eRunSettings')).not.toHaveBeenCalled();
  });

  it('warns only about the muted traffic when the run account codes stay off', async () => {
    seed({ mute_communications: true, otp_bypass: false });
    await mount();
    expect(screen.getByText(/^Nothing is reaching anyone right now/)).toBeInTheDocument();
    expect(screen.queryByText(/run account.*readable|kept for the suite/i, { selector: '[role="alert"] *' })).not.toBeInTheDocument();
  });
});
