import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import CartSettingsPage from '../../src/pages/cart-settings/CartSettingsPage';
import DeletionSettingsPage from '../../src/pages/deletion-requests/DeletionSettingsPage';
import {
  cartSettingsSchema,
  toCartSettingsForm,
  toCartSettingsInput,
} from '../../src/pages/cart-settings/cart-settings-form';
import {
  deletionSettingsSchema,
  toDeletionSettingsForm,
  toDeletionSettingsInput,
} from '../../src/pages/deletion-requests/deletion-settings-form';

const m = vi.hoisted(() => ({
  query: { data: undefined as unknown, loading: false, refetch: vi.fn() },
  save: vi.fn(),
  saving: false,
}));

vi.mock('@apollo/client/react', async (io) => ({
  ...(await io<typeof import('@apollo/client/react')>()),
  useQuery: () => m.query,
  useMutation: () => [m.save, { loading: m.saving }],
}));
vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

const t = (key: string, opts?: { vars?: Record<string, unknown> }) =>
  opts?.vars ? `${key}:${JSON.stringify(opts.vars)}` : key;

const cartSettings = {
  nudge_enabled: true,
  nudge_delay_minutes: 10,
  nudge_auto_hide_seconds: 8,
  email_enabled: false,
  email_first_delay_hours: 24,
  email_repeat_hours: 48,
  email_max_count: 3,
  updated_at: null,
};

const deletionWindow = {
  min_days: 30,
  max_days: 60,
  earliest: '2026-11-11',
  latest: '2026-12-11',
  updated_at: '2026-10-01',
};

const setQuery = (data: unknown, loading = false) => {
  m.query = { data, loading, refetch: vi.fn().mockResolvedValue({}) };
};

beforeEach(() => {
  m.save = vi.fn().mockResolvedValue({});
  m.saving = false;
  setQuery(undefined);
  vi.mocked(notifySuccess).mockClear();
  vi.mocked(notifyError).mockClear();
});

describe('cart settings mapping', () => {
  it('round-trips server values through string form values', () => {
    const form = toCartSettingsForm(cartSettings);
    expect(form).toEqual({
      nudge_enabled: true,
      nudge_delay_minutes: '10',
      nudge_auto_hide_seconds: '8',
      email_enabled: false,
      email_first_delay_hours: '24',
      email_repeat_hours: '48',
      email_max_count: '3',
    });
    const { updated_at, ...input } = cartSettings;
    expect(updated_at).toBeNull();
    expect(toCartSettingsInput(form)).toEqual(input);
  });

  it('accepts values on the bounds and rejects empty, fractional and out-of-range ones', () => {
    const schema = cartSettingsSchema(t);
    const base = toCartSettingsForm(cartSettings);
    expect(schema.safeParse({ ...base, nudge_delay_minutes: ' 1440 ', nudge_auto_hide_seconds: '3' }).success).toBe(true);
    for (const bad of [
      { nudge_delay_minutes: '' },
      { nudge_delay_minutes: '0' },
      { nudge_delay_minutes: '1441' },
      { nudge_auto_hide_seconds: '2' },
      { email_max_count: '1.5' },
      { email_repeat_hours: 'abc' },
    ]) {
      const result = schema.safeParse({ ...base, ...bad });
      expect(result.success, JSON.stringify(bad)).toBe(false);
    }
    const failed = schema.safeParse({ ...base, email_max_count: '21' });
    expect(failed.success).toBe(false);
    expect(failed.error?.issues[0].message).toBe('products.cartSettings.range:{"min":1,"max":20}');
  });
});

describe('CartSettingsPage', () => {
  it('shows a spinner while loading with no data', () => {
    setQuery(undefined, true);
    render(<CartSettingsPage />);
    expect(screen.getByRole('progressbar', { name: 'Cart Settings' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('shows a retry alert when the settings could not load', () => {
    setQuery(undefined, false);
    render(<CartSettingsPage />);
    expect(screen.getByText('Could not load the cart settings.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(m.query.refetch).toHaveBeenCalledTimes(1);
  });

  it('swallows a failed retry instead of crashing', async () => {
    setQuery(undefined, false);
    m.query.refetch = vi.fn().mockRejectedValue(new Error('offline'));
    render(<CartSettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(m.query.refetch).toHaveBeenCalled());
    expect(screen.getByText('Could not load the cart settings.')).toBeInTheDocument();
  });

  it('renders both sections from the server values and keeps Save disabled until edited', () => {
    setQuery({ productCartSettings: cartSettings });
    render(<CartSettingsPage />);
    expect(screen.getByRole('heading', { name: 'Cart Settings' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Show after \(minutes\)/)).toHaveValue('10');
    expect(screen.getByLabelText(/At most \(emails\)/)).toHaveValue('3');
    expect(screen.getAllByRole('switch')).toHaveLength(2);
    expect(screen.getAllByRole('switch')[0]).toBeChecked();
    expect(screen.getAllByRole('switch')[1]).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('saves edited values as numbers and confirms', async () => {
    setQuery({ productCartSettings: cartSettings });
    render(<CartSettingsPage />);
    fireEvent.change(screen.getByLabelText(/Show after \(minutes\)/), { target: { value: '15' } });
    fireEvent.click(screen.getAllByRole('switch')[1]);
    const save = screen.getByRole('button', { name: 'Save' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Cart settings saved'));
    const { updated_at, ...expected } = cartSettings;
    expect(updated_at).toBeNull();
    expect(m.save).toHaveBeenCalledWith({
      variables: { input: { ...expected, nudge_delay_minutes: 15, email_enabled: true } },
    });
  });

  it('does not save an out-of-range value and shows the range error', async () => {
    setQuery({ productCartSettings: cartSettings });
    render(<CartSettingsPage />);
    fireEvent.change(screen.getByLabelText(/Show after \(minutes\)/), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Enter a whole number between 1 and 1440.')).toBeInTheDocument();
    expect(m.save).not.toHaveBeenCalled();
  });

  it('reports a failed save and shows the saving label while in flight', async () => {
    m.save = vi.fn().mockRejectedValue(new Error('500'));
    setQuery({ productCartSettings: cartSettings });
    const { unmount } = render(<CartSettingsPage />);
    fireEvent.change(screen.getByLabelText(/At most \(emails\)/), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Could not save the cart settings'));
    expect(notifySuccess).not.toHaveBeenCalled();
    unmount();
    m.saving = true;
    render(<CartSettingsPage />);
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });
});

describe('deletion settings mapping', () => {
  it('maps the window to strings and back to numbers', () => {
    const form = toDeletionSettingsForm(deletionWindow);
    expect(form).toEqual({ min_days: '30', max_days: '60' });
    expect(toDeletionSettingsInput(form)).toEqual({ min_days: 30, max_days: 60 });
  });

  it('validates whole days within 1..365 and min not above max', () => {
    const schema = deletionSettingsSchema(t);
    expect(schema.safeParse({ min_days: '1', max_days: '365' }).success).toBe(true);
    expect(schema.safeParse({ min_days: '30', max_days: '30' }).success).toBe(true);
    for (const bad of [
      { min_days: '0', max_days: '30' },
      { min_days: '', max_days: '30' },
      { min_days: '10', max_days: '366' },
      { min_days: '1.5', max_days: '30' },
    ]) {
      expect(schema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
    const inverted = schema.safeParse({ min_days: '40', max_days: '20' });
    expect(inverted.success).toBe(false);
    expect(inverted.error?.issues[0]).toMatchObject({
      path: ['max_days'],
      message: 'products.deletionSettings.minAboveMax',
    });
  });
});

describe('DeletionSettingsPage', () => {
  it('shows a spinner while loading with no data', () => {
    setQuery(undefined, true);
    render(<DeletionSettingsPage />);
    expect(screen.getByRole('progressbar', { name: 'Deletion settings' })).toBeInTheDocument();
    expect(screen.queryByText(/A request raised today/)).not.toBeInTheDocument();
  });

  it('shows a retry alert when the window could not load', () => {
    setQuery(undefined, false);
    render(<DeletionSettingsPage />);
    expect(screen.getByText('Could not load the deletion settings.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(m.query.refetch).toHaveBeenCalledTimes(1);
  });

  it('swallows a failed retry', async () => {
    setQuery(undefined, false);
    m.query.refetch = vi.fn().mockRejectedValue(new Error('offline'));
    render(<DeletionSettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(m.query.refetch).toHaveBeenCalled());
    expect(screen.getByText('Could not load the deletion settings.')).toBeInTheDocument();
  });

  it('shows the live window and the current values', () => {
    setQuery({ catalogDeletionWindow: deletionWindow });
    render(<DeletionSettingsPage />);
    expect(screen.getByText('A request raised today can be scheduled from 2026-11-11 to 2026-12-11.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Minimum days/)).toHaveValue('30');
    expect(screen.getByLabelText(/Maximum days/)).toHaveValue('60');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('saves the edited window and confirms', async () => {
    setQuery({ catalogDeletionWindow: deletionWindow });
    render(<DeletionSettingsPage />);
    fireEvent.change(screen.getByLabelText(/Maximum days/), { target: { value: '90' } });
    const save = screen.getByRole('button', { name: 'Save' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Deletion settings saved.'));
    expect(m.save).toHaveBeenCalledWith({ variables: { input: { min_days: 30, max_days: 90 } } });
  });

  it('blocks a window whose maximum is below the minimum', async () => {
    setQuery({ catalogDeletionWindow: deletionWindow });
    render(<DeletionSettingsPage />);
    fireEvent.change(screen.getByLabelText(/Maximum days/), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('The maximum cannot be less than the minimum.')).toBeInTheDocument();
    expect(m.save).not.toHaveBeenCalled();
  });

  it('shows the server message on failure, or the generic one for a non-Error', async () => {
    m.save = vi.fn().mockRejectedValueOnce(new Error('Window locked')).mockRejectedValueOnce('boom');
    setQuery({ catalogDeletionWindow: deletionWindow });
    render(<DeletionSettingsPage />);
    fireEvent.change(screen.getByLabelText(/Maximum days/), { target: { value: '70' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Window locked'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Could not save the deletion settings.'));
  });

  it('labels the button Saving while the mutation runs', () => {
    m.saving = true;
    setQuery({ catalogDeletionWindow: deletionWindow });
    render(<DeletionSettingsPage />);
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });
});
