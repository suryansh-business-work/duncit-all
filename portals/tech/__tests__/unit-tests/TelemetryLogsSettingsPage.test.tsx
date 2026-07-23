import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

interface Settings {
  signoz_enabled: boolean;
  persisted_levels: string[];
  retention_days: number;
  updated_at: string | null;
}

const m = vi.hoisted(() => ({
  data: undefined as { telemetrySettings: Settings } | undefined,
  loading: false,
  error: undefined as { message: string } | undefined,
  refetch: vi.fn(),
  saveMock: vi.fn(),
}));

vi.mock('@apollo/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client')>();
  return {
    ...actual,
    useQuery: () => ({ data: m.data, loading: m.loading, error: m.error, refetch: m.refetch }),
    useMutation: () => [m.saveMock, {}],
  };
});

import TelemetryLogsSettingsPage from '../../src/pages/telemetry-logs-settings/index';

const makeSettings = (over: Partial<Settings> = {}): Settings => ({
  signoz_enabled: false,
  persisted_levels: ['error', 'info'],
  retention_days: 45,
  updated_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

const withData = (over: Partial<Settings> = {}) => {
  m.data = { telemetrySettings: makeSettings(over) };
};

beforeEach(() => {
  m.data = undefined;
  m.loading = false;
  m.error = undefined;
  m.refetch = vi.fn().mockResolvedValue({});
  m.saveMock = vi.fn().mockResolvedValue({});
});

describe('TelemetryLogsSettingsPage', () => {
  it('shows a spinner while loading with no data', () => {
    m.loading = true;
    render(<TelemetryLogsSettingsPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows an error alert when the query fails', () => {
    m.error = { message: 'load fail' };
    render(<TelemetryLogsSettingsPage />);
    expect(screen.getByText('load fail')).toBeInTheDocument();
  });

  it('resets the form from data and shows the last-updated line', async () => {
    withData();
    render(<TelemetryLogsSettingsPage />);
    await waitFor(() =>
      expect((screen.getByLabelText(/^Retention/) as HTMLInputElement).value).toBe('45'),
    );
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'error' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'warn' })).not.toBeChecked();
  });

  it('hides the last-updated line when updated_at is null', async () => {
    withData({ updated_at: null });
    render(<TelemetryLogsSettingsPage />);
    await screen.findByRole('checkbox', { name: 'error' });
    expect(screen.queryByText(/Last updated/)).not.toBeInTheDocument();
  });

  it('toggles a level checkbox off and on', async () => {
    withData();
    render(<TelemetryLogsSettingsPage />);
    const warn = await screen.findByRole('checkbox', { name: 'warn' });
    const error = screen.getByRole('checkbox', { name: 'error' });

    fireEvent.click(warn); // unchecked → checked (spread branch)
    expect(warn).toBeChecked();
    fireEvent.click(error); // checked → unchecked (filter branch)
    expect(error).not.toBeChecked();
  });

  it('surfaces the no-level validation error on submit', async () => {
    withData();
    render(<TelemetryLogsSettingsPage />);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'error' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'info' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Select at least one level to persist')).toBeInTheDocument();
  });

  it('surfaces a retention validation error on submit', async () => {
    withData();
    render(<TelemetryLogsSettingsPage />);
    const retention = await screen.findByLabelText(/^Retention/);
    fireEvent.change(retention, { target: { value: '0' } });
    // The retention input's HTML min constraint makes jsdom block an interactive
    // submit before the zod resolver runs; dispatch the submit event directly so
    // react-hook-form validation (and the error helper) actually fires.
    fireEvent.submit(retention.closest('form') as HTMLFormElement);
    expect(await screen.findByText('At least 1 day')).toBeInTheDocument();
  });

  it('toggles SigNoz, edits retention, saves and closes the toast', async () => {
    withData();
    render(<TelemetryLogsSettingsPage />);
    const signoz = await screen.findByRole('checkbox', { name: /Ship logs to SigNoz/i });
    fireEvent.click(signoz);
    fireEvent.change(screen.getByLabelText(/^Retention/), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Telemetry settings saved')).toBeInTheDocument();
    expect(m.saveMock).toHaveBeenCalled();
    await waitFor(() => expect(m.refetch).toHaveBeenCalled());

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByText('Telemetry settings saved')).not.toBeInTheDocument(),
    );
  });

  it('shows an Error-instance save failure in an alert', async () => {
    withData();
    m.saveMock = vi.fn().mockRejectedValue(new Error('save boom'));
    render(<TelemetryLogsSettingsPage />);
    fireEvent.click(await screen.findByRole('checkbox', { name: /Ship logs to SigNoz/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('save boom')).toBeInTheDocument();
  });

  it('shows a non-Error save failure with the fallback message', async () => {
    withData();
    m.saveMock = vi.fn().mockRejectedValue('weird');
    render(<TelemetryLogsSettingsPage />);
    fireEvent.click(await screen.findByRole('checkbox', { name: /Ship logs to SigNoz/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Failed to save')).toBeInTheDocument();
  });
});
