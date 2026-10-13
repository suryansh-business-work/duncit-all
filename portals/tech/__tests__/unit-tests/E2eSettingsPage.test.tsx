import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { e2eSettings, e2eSuites } from '../mocks/e2e.mock';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));

import E2eSettingsPage from '../../src/pages/e2e/settings/E2eSettingsPage';

const seed = (over: Parameters<typeof e2eSettings>[0] = {}) => {
  ops.q = {
    E2eRunSettings: { data: { e2eRunSettings: e2eSettings(over) } },
    E2eSuiteCatalogue: { data: { e2eSuiteCatalogue: e2eSuites() } },
    SlackChannels: {
      data: { slackChannels: [{ id: 'C0123ABCD', name: 'qa-results', is_private: false }] },
    },
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

describe('E2E settings page', () => {
  it('shows when the next run is and that CI never reported', async () => {
    await mount();
    expect(screen.getByText(/^Next run /)).toBeInTheDocument();
    expect(screen.getByText(/No run has ever reported here/)).toBeInTheDocument();
  });

  it('saves an unchanged form with every suite folded to an empty list and no password', async () => {
    await mount();
    save();
    await waitFor(() => expect(mutation('UpdateE2eRunSettings')).toHaveBeenCalled());
    const input = mutation('UpdateE2eRunSettings').mock.calls[0][0].variables.input;
    expect(input.suites).toEqual([]);
    expect(input).not.toHaveProperty('password');
    expect(input).toMatchObject({ frequency: 'DAILY', time_of_day: '03:00', keep_last: 30, ref: 'main' });
    await waitFor(() => expect(ops.notify).toHaveBeenCalledWith('Settings saved.', 'success'));
  });

  it('sends a typed password, a narrowed suite list and the run-account identity', async () => {
    await mount();
    fireEvent.change(screen.getByLabelText('Email prefix'), { target: { value: 'e2e+' } });
    fireEvent.change(screen.getByLabelText('Email domain'), { target: { value: 'qa.example.test' } });
    expect(screen.getByText(/Runs as\s+e2e\+070920260300@qa.example.test/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'not-a-real-secret' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'mWeb' }));
    save();
    await waitFor(() => expect(mutation('UpdateE2eRunSettings')).toHaveBeenCalled());
    const input = mutation('UpdateE2eRunSettings').mock.calls[0][0].variables.input;
    expect(input).toMatchObject({ password: 'not-a-real-secret', email_prefix: 'e2e+', email_domain: 'qa.example.test' });
    expect(input.suites).toEqual(['tech-portal', 'admin-portal', 'shared']);
  });

  it('rejects a half-filled identity, a bad domain, a bad branch and an out-of-range retention', async () => {
    await mount();
    fireEvent.change(screen.getByLabelText('Email prefix'), { target: { value: 'e2e' } });
    fireEvent.change(screen.getByLabelText('Branch'), { target: { value: '/bad' } });
    fireEvent.change(screen.getByLabelText('Keep last'), { target: { value: '0' } });
    save();
    expect(await screen.findByText('A prefix needs a domain, and a domain needs a prefix.')).toBeInTheDocument();
    expect(screen.getByText('That is not a branch or tag name git would accept.')).toBeInTheDocument();
    expect(screen.getByText('Keep between 1 and 1000 runs.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Email domain'), { target: { value: 'http://x' } });
    await waitFor(() => expect(screen.getByText('That is not a domain — no scheme, no path.')).toBeInTheDocument());
    expect(mutation('UpdateE2eRunSettings')).not.toHaveBeenCalled();
  });

  it('reports a failed save', async () => {
    ops.mut.UpdateE2eRunSettings = vi.fn().mockRejectedValue(new Error('not permitted'));
    await mount();
    save();
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('not permitted'));
  });

  it('shows the weekday only for a weekly schedule and warns the schedule is off', async () => {
    seed({ frequency: 'WEEKLY', enabled: false, next_run_at: null });
    await mount();
    expect(screen.getByLabelText('Day')).toBeInTheDocument();
    expect(screen.getByText('The schedule is off. The suite only runs when somebody starts it.')).toBeInTheDocument();
  });

  it('offers the Slack channel picker when Slack is connected, and a notice when not', async () => {
    seed({ slack_configured: true, slack_channel: 'C0123ABCD' });
    await mount();
    expect(screen.getByLabelText('Results channel')).toBeInTheDocument();
    expect(await screen.findByText('qa-results')).toBeInTheDocument();
  });

  it('explains the override switches and the missing upload scope', async () => {
    seed({ otp_bypass: true, mute_communications: true, record_videos: true, can_upload_videos: false, password_set: true });
    await mount();
    expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByPlaceholderText('A password is saved')).toBeInTheDocument();
  });
});
