import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { HrBankSummary } from '@duncit/utils';
import { renderWithProviders } from '../../../../../../__tests__/testkit';
import { BankForm } from '.';

const STORED: HrBankSummary = {
  account_holder_name: 'Meera Nair',
  account_number_masked: '•••• 9012',
  ifsc: 'HDFC0001234',
  bank_name: 'HDFC',
  pan_masked: '•••• 234F',
  uan: null,
};

describe('BankForm', () => {
  it('never shows the stored account number or PAN, and says an empty box keeps them', () => {
    renderWithProviders(<BankForm bank={STORED} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByTestId('hr-bank-account')).toHaveValue('');
    expect(screen.getByTestId('hr-bank-pan')).toHaveValue('');
    expect(screen.getByText('Leave empty to keep •••• 9012.')).toBeInTheDocument();
    expect(screen.getByText('Leave empty to keep •••• 234F.')).toBeInTheDocument();
  });

  it('leaves the kept secrets out of the input so the server keeps them', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    renderWithProviders(<BankForm bank={STORED} onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByTestId('hr-bank-ifsc'), { target: { value: 'icic0000001' } });
    fireEvent.click(screen.getByTestId('hr-bank-form-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const input = onSubmit.mock.calls[0][0];
    expect(input).toEqual({ account_holder_name: 'Meera Nair', ifsc: 'ICIC0000001', bank_name: 'HDFC', uan: null });
    expect(input).not.toHaveProperty('account_number');
  });

  it('sends a replacement account number, and refuses a malformed one', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    renderWithProviders(<BankForm bank={STORED} onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByTestId('hr-bank-account'), { target: { value: '12ab' } });
    fireEvent.click(screen.getByTestId('hr-bank-form-submit'));
    expect(await screen.findByText('Account number is 6 to 18 digits')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('hr-bank-account'), { target: { value: '998877665544' } });
    fireEvent.click(screen.getByTestId('hr-bank-form-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ account_number: '998877665544' });
  });
});
