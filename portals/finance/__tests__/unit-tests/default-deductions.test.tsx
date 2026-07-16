import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { useMutation, useQuery } from '@apollo/client';
import DefaultDeductionsPage from '../../src/pages/finance/default-deductions-page';
import { notifySuccess } from './mocks/dialogs';
import { renderUI } from './testkit';

vi.mock('@apollo/client', async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  return { ...actual, useQuery: vi.fn(), useMutation: vi.fn() };
});

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseMutation = vi.mocked(useMutation);

const settings = {
  gst_pct: 18,
  platform_fee_pct: 5,
  default_host_commission_pct: 10,
  default_venue_commission_pct: 10,
  default_product_commission_pct: 12,
  default_club_admin_pct: 3,
  default_backout_deduction_pct: 20,
};

const nullSettings = {
  gst_pct: null,
  platform_fee_pct: null,
  default_host_commission_pct: null,
  default_venue_commission_pct: null,
  default_product_commission_pct: null,
  default_club_admin_pct: null,
  default_backout_deduction_pct: null,
};

beforeEach(() => {
  mockedUseQuery.mockReset();
  mockedUseMutation.mockReset();
  (notifySuccess as any).mockClear();
});

describe('DefaultDeductionsPage', () => {
  it('shows a spinner while loading with no data', () => {
    mockedUseQuery.mockReturnValue({ data: undefined, loading: true, refetch: vi.fn() } as any);
    mockedUseMutation.mockReturnValue([vi.fn(), { loading: false }] as any);
    renderUI(<DefaultDeductionsPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders with empty settings when financeSettings is absent', () => {
    mockedUseQuery.mockReturnValue({ data: { financeSettings: null }, loading: false, refetch: vi.fn() } as any);
    mockedUseMutation.mockReturnValue([vi.fn(), { loading: false }] as any);
    renderUI(<DefaultDeductionsPage />);
    expect(screen.getByText('Default Deductions')).toBeInTheDocument();
  });

  it('defaults every null deduction field to zero', () => {
    mockedUseQuery.mockReturnValue({ data: { financeSettings: nullSettings }, loading: false, refetch: vi.fn() } as any);
    mockedUseMutation.mockReturnValue([vi.fn(), { loading: false }] as any);
    renderUI(<DefaultDeductionsPage />);
    expect(screen.getAllByText('0%').length).toBeGreaterThan(0);
  });

  it('maps settings, edits a slider and saves', async () => {
    const refetch = vi.fn().mockResolvedValue({});
    const updateMut = vi.fn().mockResolvedValue({});
    mockedUseQuery.mockReturnValue({ data: { financeSettings: settings }, loading: false, refetch } as any);
    mockedUseMutation.mockReturnValue([updateMut, { loading: false }] as any);
    renderUI(<DefaultDeductionsPage />);

    const gstSlider = screen.getByLabelText('GST') as HTMLInputElement;
    fireEvent.change(gstSlider, { target: { value: '20' } });

    fireEvent.click(screen.getByRole('button', { name: /save deductions/i }));
    await waitFor(() => expect(updateMut).toHaveBeenCalled());
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Default deductions saved'));
    expect(refetch).toHaveBeenCalled();
  });

  it('surfaces a save error', async () => {
    mockedUseQuery.mockReturnValue({ data: { financeSettings: settings }, loading: false, refetch: vi.fn() } as any);
    mockedUseMutation.mockReturnValue([vi.fn().mockRejectedValue(new Error('nope')), { loading: false }] as any);
    renderUI(<DefaultDeductionsPage />);
    fireEvent.click(screen.getByRole('button', { name: /save deductions/i }));
    expect(await screen.findByText('nope')).toBeInTheDocument();
  });

  it('shows the saving state', () => {
    mockedUseQuery.mockReturnValue({ data: { financeSettings: settings }, loading: false, refetch: vi.fn() } as any);
    mockedUseMutation.mockReturnValue([vi.fn(), { loading: true }] as any);
    renderUI(<DefaultDeductionsPage />);
    const btn = screen.getByRole('button', { name: /saving/i });
    expect(btn).toBeDisabled();
  });
});
