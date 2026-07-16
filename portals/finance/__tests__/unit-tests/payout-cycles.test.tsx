import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { useMutation, useQuery } from '@apollo/client';
import PayoutCyclesPage from '../../src/pages/finance/payout-cycles-page';
import { notifySuccess } from './mocks/dialogs';
import { renderUI } from './testkit';

vi.mock('@apollo/client', async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  return { ...actual, useQuery: vi.fn(), useMutation: vi.fn() };
});

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseMutation = vi.mocked(useMutation);

const fs = (over: Record<string, unknown> = {}) => ({
  financeSettings: {
    venue_payout_mode: 'WEEKLY',
    host_payout_mode: 'IMMEDIATE',
    payout_day_of_week: 1,
    payout_time: '09:30',
    ...over,
  },
});

const selectOption = (name: RegExp | string, option: string) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name }));
  const listbox = screen.getByRole('listbox');
  fireEvent.click(within(listbox).getByText(option));
};

beforeEach(() => {
  mockedUseQuery.mockReset();
  mockedUseMutation.mockReset();
  (notifySuccess as any).mockClear();
});

describe('PayoutCyclesPage', () => {
  it('shows a spinner while loading', () => {
    mockedUseQuery.mockReturnValue({ data: undefined, loading: true, refetch: vi.fn() } as any);
    mockedUseMutation.mockReturnValue([vi.fn(), { loading: false }] as any);
    renderUI(<PayoutCyclesPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders a weekly schedule (scheduled + weekly controls visible) and saves', async () => {
    const refetch = vi.fn().mockResolvedValue({});
    const updateMut = vi.fn().mockResolvedValue({});
    mockedUseQuery.mockReturnValue({ data: fs(), loading: false, refetch } as any);
    mockedUseMutation.mockReturnValue([updateMut, { loading: false }] as any);
    renderUI(<PayoutCyclesPage />);

    // weekly => the "Payout day (weekly)" select is shown
    expect(screen.getByRole('combobox', { name: /payout day/i })).toBeInTheDocument();
    selectOption(/payout day/i, 'Wednesday');

    fireEvent.click(screen.getByRole('button', { name: /save cycle/i }));
    await waitFor(() => expect(updateMut).toHaveBeenCalled());
    expect(notifySuccess).toHaveBeenCalledWith('Payout cycle saved');
    expect(refetch).toHaveBeenCalled();
  });

  it('hides the weekly controls when both modes are immediate', () => {
    mockedUseQuery.mockReturnValue({
      data: fs({ venue_payout_mode: 'IMMEDIATE', host_payout_mode: 'IMMEDIATE', payout_time: '' }),
      loading: false,
      refetch: vi.fn(),
    } as any);
    mockedUseMutation.mockReturnValue([vi.fn(), { loading: false }] as any);
    renderUI(<PayoutCyclesPage />);
    expect(screen.queryByRole('combobox', { name: /payout day/i })).not.toBeInTheDocument();
  });

  it('switches to a MONTH_END schedule (scheduled, not weekly)', () => {
    mockedUseQuery.mockReturnValue({
      data: fs({ venue_payout_mode: 'IMMEDIATE', host_payout_mode: 'IMMEDIATE' }),
      loading: false,
      refetch: vi.fn(),
    } as any);
    mockedUseMutation.mockReturnValue([vi.fn(), { loading: false }] as any);
    renderUI(<PayoutCyclesPage />);
    selectOption('Venue payout', 'Month end');
    // Now scheduled but not weekly → TimePicker present, no day select
    expect(screen.queryByRole('combobox', { name: /payout day/i })).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Host payout' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Weekly'));
  });

  it('renders without settings (effect no-op)', () => {
    mockedUseQuery.mockReturnValue({ data: { financeSettings: null }, loading: false, refetch: vi.fn() } as any);
    mockedUseMutation.mockReturnValue([vi.fn(), { loading: false }] as any);
    renderUI(<PayoutCyclesPage />);
    expect(screen.getByText('Payout Cycles')).toBeInTheDocument();
  });

  it('surfaces a save error', async () => {
    mockedUseQuery.mockReturnValue({ data: fs(), loading: false, refetch: vi.fn() } as any);
    mockedUseMutation.mockReturnValue([vi.fn().mockRejectedValue(new Error('save failed')), { loading: false }] as any);
    renderUI(<PayoutCyclesPage />);
    fireEvent.click(screen.getByRole('button', { name: /save cycle/i }));
    expect(await screen.findByText('save failed')).toBeInTheDocument();
  });

  it('shows the saving state (disabled button)', () => {
    mockedUseQuery.mockReturnValue({ data: fs(), loading: false, refetch: vi.fn() } as any);
    mockedUseMutation.mockReturnValue([vi.fn(), { loading: true }] as any);
    renderUI(<PayoutCyclesPage />);
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });
});
