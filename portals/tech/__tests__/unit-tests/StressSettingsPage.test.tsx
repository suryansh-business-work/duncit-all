import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { stressSettings } from '../mocks/stress.mock';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));

import StressSettingsPage from '../../src/pages/stress-testing/settings';

beforeEach(() => {
  resetOps();
  ops.q = { StressSettings: { data: { stressSettings: stressSettings() } } };
});

describe('Stress settings page', () => {
  it('shows the saved ceilings and saves an edited one without the timestamp', async () => {
    renderWithProviders(<StressSettingsPage />);
    const users = await screen.findByLabelText('Max virtual users');
    expect(users).toHaveValue(500);
    fireEvent.change(users, { target: { value: '800' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mutation('UpdateStressSettings')).toHaveBeenCalled());
    const input = mutation('UpdateStressSettings').mock.calls[0][0].variables.input;
    expect(input.max_virtual_users).toBe(800);
    expect(input).not.toHaveProperty('updated_at');
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledWith('Saved'));
  });

  it('refuses values outside a ceiling and does not call the server', async () => {
    renderWithProviders(<StressSettingsPage />);
    fireEvent.change(await screen.findByLabelText('Max virtual users'), { target: { value: '99999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Must be between 1 and 20000.')).toBeInTheDocument();
    expect(mutation('UpdateStressSettings')).not.toHaveBeenCalled();
  });

  it('reports a failed save', async () => {
    ops.mut.UpdateStressSettings = vi.fn().mockRejectedValue(new Error('not allowed'));
    renderWithProviders(<StressSettingsPage />);
    await screen.findByLabelText('Max virtual users');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('not allowed'));
  });

  it('shows the query error instead of the form', async () => {
    ops.q.StressSettings = { error: new Error('settings unreadable') };
    renderWithProviders(<StressSettingsPage />);
    expect(await screen.findByText('settings unreadable')).toBeInTheDocument();
    expect(screen.queryByLabelText('Max virtual users')).not.toBeInTheDocument();
  });
});
