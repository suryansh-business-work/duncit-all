import { describe, expect, it, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import DefaultDeductionsPage from '../../src/pages/finance/default-deductions-page';
import { notifySuccess } from './mocks/dialogs';
import { renderWithProviders } from '../testkit';
import {
  deductionSettingsLoadingMock,
  deductionSettingsMock,
  nullDeductionSettings,
  updateDeductionsMock,
} from '../mocks/deductions.mock';

beforeEach(() => {
  (notifySuccess as unknown as { mockClear: () => void }).mockClear();
});

describe('DefaultDeductionsPage', () => {
  it('shows a spinner while loading with no data', () => {
    renderWithProviders(<DefaultDeductionsPage />, { mocks: [deductionSettingsLoadingMock()] });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders with empty settings when financeSettings is absent', async () => {
    renderWithProviders(<DefaultDeductionsPage />, { mocks: [deductionSettingsMock(null)] });
    expect(await screen.findByText('Default Deductions')).toBeInTheDocument();
  });

  it('defaults every null deduction field to zero', async () => {
    renderWithProviders(<DefaultDeductionsPage />, {
      mocks: [deductionSettingsMock(nullDeductionSettings())],
    });
    await screen.findByText('Default Deductions');
    await waitFor(() => expect(screen.getAllByText('0%').length).toBeGreaterThan(0));
  });

  it('maps settings, edits a slider and saves', async () => {
    renderWithProviders(<DefaultDeductionsPage />, {
      mocks: [deductionSettingsMock(), updateDeductionsMock()],
    });
    await screen.findByText('Default Deductions');
    const gstSlider = screen.getByLabelText('GST') as HTMLInputElement;
    fireEvent.change(gstSlider, { target: { value: '20' } });

    fireEvent.click(screen.getByRole('button', { name: /save deductions/i }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Default deductions saved'));
  });

  it('surfaces a save error', async () => {
    renderWithProviders(<DefaultDeductionsPage />, {
      mocks: [deductionSettingsMock(), updateDeductionsMock({ fail: true })],
    });
    await screen.findByText('Default Deductions');
    fireEvent.click(screen.getByRole('button', { name: /save deductions/i }));
    expect(await screen.findByText('nope')).toBeInTheDocument();
  });

  it('shows the saving state', async () => {
    renderWithProviders(<DefaultDeductionsPage />, {
      mocks: [deductionSettingsMock(), updateDeductionsMock({ delay: 60_000 })],
    });
    await screen.findByText('Default Deductions');
    fireEvent.click(screen.getByRole('button', { name: /save deductions/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled());
  });
});
