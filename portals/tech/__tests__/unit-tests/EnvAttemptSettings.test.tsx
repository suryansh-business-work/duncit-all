import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));

import EnvSettingsTab from '../../src/pages/environment/attempt-settings';
import {
  ATTEMPT_BOUNDS,
  attemptSettingsSchema,
  toAttemptSettingsForm,
  toAttemptSettingsInput,
} from '../../src/pages/environment/attempt-settings/attempt-settings.types';

const settings = (over: Record<string, unknown> = {}) => ({
  __typename: 'EnvAttemptSettings',
  window_hours: 24,
  limits: [
    { __typename: 'EnvAttemptLimit', category: 'SHIPROCKET', label: 'ShipRocket', max_attempts: 3 },
    { __typename: 'EnvAttemptLimit', category: 'MSG91', label: 'MSG91', max_attempts: 0 },
  ],
  updated_at: null,
  ...over,
});

const seed = (over: Record<string, unknown> = {}) => {
  ops.q = { EnvAttemptSettings: { data: { envAttemptSettings: settings(over) } } };
};

const typeInto = (testId: string, value: string) =>
  fireEvent.change(screen.getByTestId(testId).querySelector('input') as HTMLInputElement, { target: { value } });

beforeEach(() => {
  resetOps();
  seed();
});

describe('Environment attempt settings tab', () => {
  it('shows the stored window and one cap per category', () => {
    renderWithProviders(<EnvSettingsTab />);

    expect(screen.getByText('Environment Variables max attempts')).toBeInTheDocument();
    expect(screen.getByTestId('env-attempt-window').querySelector('input')).toHaveValue(24);
    expect(screen.getByTestId('env-attempt-limit-SHIPROCKET').querySelector('input')).toHaveValue(3);
    expect(screen.getByTestId('env-attempt-limit-MSG91').querySelector('input')).toHaveValue(0);
    expect(screen.queryByText(/^Last updated/)).not.toBeInTheDocument();
  });

  it('says when the settings were last saved', () => {
    seed({ updated_at: '2026-10-20T10:00:00.000Z' });
    renderWithProviders(<EnvSettingsTab />);
    expect(screen.getByText(/^Last updated .+/)).toBeInTheDocument();
  });

  it('waits for the first read and shows its error', () => {
    ops.q = { EnvAttemptSettings: { loading: true } };
    const { unmount } = renderWithProviders(<EnvSettingsTab />);
    expect(screen.queryByTestId('env-attempt-settings-form')).not.toBeInTheDocument();
    unmount();

    ops.q = { EnvAttemptSettings: { error: new Error('settings unavailable') } };
    renderWithProviders(<EnvSettingsTab />);
    expect(screen.getByText('settings unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('env-attempt-settings-form')).not.toBeInTheDocument();
  });

  it('saves the typed window and every category cap, then confirms', async () => {
    mutation('UpdateEnvAttemptSettings').mockResolvedValue({ data: {} });
    renderWithProviders(<EnvSettingsTab />);

    typeInto('env-attempt-window', '48');
    typeInto('env-attempt-limit-SHIPROCKET', '5');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledWith('Saved'));
    expect(mutation('UpdateEnvAttemptSettings')).toHaveBeenCalledWith({
      variables: {
        input: {
          window_hours: 48,
          limits: [
            { category: 'SHIPROCKET', max_attempts: 5 },
            { category: 'MSG91', max_attempts: 0 },
          ],
        },
      },
    });
  });

  it('reports a refused save and keeps the form to retry', async () => {
    mutation('UpdateEnvAttemptSettings').mockRejectedValue(new Error('Not allowed'));
    renderWithProviders(<EnvSettingsTab />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('Not allowed'));
    expect(ops.notifySuccess).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('refuses a window outside the server bounds and sends nothing', async () => {
    renderWithProviders(<EnvSettingsTab />);

    typeInto('env-attempt-window', '721');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Enter a number from 1 to 720.')).toBeInTheDocument();
    expect(mutation('UpdateEnvAttemptSettings')).not.toHaveBeenCalled();
  });

  it('refuses a fractional cap', async () => {
    renderWithProviders(<EnvSettingsTab />);

    typeInto('env-attempt-limit-MSG91', '2.5');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Whole numbers only.')).toBeInTheDocument();
    expect(mutation('UpdateEnvAttemptSettings')).not.toHaveBeenCalled();
  });
});

describe('attempt settings schema and mappers', () => {
  const messages = { whole: 'whole', range: (min: number, max: number) => `${min}-${max}` };
  const schema = attemptSettingsSchema(messages);

  it('accepts the bounds themselves and rejects one past them', () => {
    const ok = (window_hours: number, cap: number) => schema.safeParse({ window_hours, limits: { A: cap } }).success;

    expect(ok(ATTEMPT_BOUNDS.window_hours.min, ATTEMPT_BOUNDS.max_attempts.min)).toBe(true);
    expect(ok(ATTEMPT_BOUNDS.window_hours.max, ATTEMPT_BOUNDS.max_attempts.max)).toBe(true);
    expect(ok(0, 0)).toBe(false);
    expect(ok(721, 0)).toBe(false);
    expect(ok(1, -1)).toBe(false);
    expect(ok(1, 1001)).toBe(false);
  });

  it('reads typed text as a number and rejects text that is not one', () => {
    expect(schema.parse({ window_hours: '12', limits: { A: '4' } })).toEqual({ window_hours: 12, limits: { A: 4 } });
    const refused = schema.safeParse({ window_hours: 'abc', limits: {} });
    expect(refused.success).toBe(false);
    expect(refused.error?.issues[0].message).toBe('whole');
  });

  it('round-trips the server shape through the form and back to the mutation input', () => {
    const stored = settings() as unknown as Parameters<typeof toAttemptSettingsForm>[0];
    const form = toAttemptSettingsForm(stored);

    expect(form).toEqual({ window_hours: 24, limits: { SHIPROCKET: 3, MSG91: 0 } });
    expect(toAttemptSettingsInput(form)).toEqual({
      window_hours: 24,
      limits: [
        { category: 'SHIPROCKET', max_attempts: 3 },
        { category: 'MSG91', max_attempts: 0 },
      ],
    });
  });
});
