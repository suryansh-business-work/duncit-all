import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { HrCompensationRecord, HrTemplateLine } from '@duncit/utils';
import { renderWithProviders } from '../../../../../../__tests__/testkit';
import { PayForm } from '.';

const CURRENT: HrCompensationRecord = {
  id: 'c1',
  currency: 'INR',
  effective_from: '2026-01-01',
  reason: 'HIRE',
  note: null,
  components: [
    { label: 'Basic', type: 'EARNING', monthly_amount: 40000, target_linked: false },
    { label: 'Employee PF', type: 'DEDUCTION', monthly_amount: 1800, target_linked: false },
  ],
  totals: { gross_monthly: 40000, fixed_gross_monthly: 40000, variable_monthly: 0, deductions_monthly: 1800, employer_monthly: 0, net_monthly: 38200, annual_ctc: 480000 },
  is_current: true,
  is_upcoming: false,
  created_by: { user_id: 'u', name: 'Asha' },
  created_at: '2026-01-01T00:00:00Z',
};

const TEMPLATE: HrTemplateLine[] = [
  { label: 'Basic', type: 'EARNING', calc: 'PERCENT_OF_CTC', value: 50, target_linked: false },
  { label: 'Special', type: 'EARNING', calc: 'BALANCE', value: 0, target_linked: false },
];

describe('PayForm', () => {
  it('starts from the pay in force and updates the totals as an amount changes', () => {
    renderWithProviders(<PayForm current={CURRENT} currency="INR" template={[]} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByTestId('hr-pay-amount-0')).toHaveValue(40000);
    expect(screen.getByTestId('hr-pay-total-net')).toHaveTextContent('₹38,200.00');
    fireEvent.change(screen.getByTestId('hr-pay-amount-0'), { target: { value: '50000' } });
    expect(screen.getByTestId('hr-pay-total-net')).toHaveTextContent('₹48,200.00');
    expect(screen.getByTestId('hr-pay-total-ctc')).toHaveTextContent('₹6,00,000.00');
    expect(screen.getByText('Set up a salary template in HR settings to fill these lines from a CTC.')).toBeInTheDocument();
  });

  it('splits a CTC with the salary template and saves it as a revision', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    renderWithProviders(<PayForm current={null} currency="INR" template={TEMPLATE} onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByTestId('hr-pay-ctc'), { target: { value: '1200000' } });
    fireEvent.click(screen.getByTestId('hr-pay-apply-template'));
    await waitFor(() => expect(screen.getByTestId('hr-pay-amount-1')).toHaveValue(50000));
    expect(screen.getByTestId('hr-pay-amount-0')).toHaveValue(50000);
    fireEvent.click(screen.getByTestId('hr-pay-form-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      currency: 'INR',
      reason: 'REVISION',
      components: [
        { label: 'Basic', type: 'EARNING', monthly_amount: 50000, target_linked: false },
        { label: 'Special', type: 'EARNING', monthly_amount: 50000, target_linked: false },
      ],
    });
  });

  it('adds and removes lines, but always keeps one', () => {
    renderWithProviders(<PayForm current={null} currency="INR" template={[]} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByTestId('hr-pay-remove-0')).toBeDisabled();
    fireEvent.click(screen.getByTestId('hr-pay-add-line'));
    expect(screen.getByTestId('hr-pay-label-1')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('hr-pay-remove-1'));
    expect(screen.queryByTestId('hr-pay-label-1')).not.toBeInTheDocument();
  });

  it('will not save a revision without an earning', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<PayForm current={null} currency="INR" template={[]} onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByTestId('hr-pay-label-0'), { target: { value: 'Basic' } });
    fireEvent.change(screen.getByTestId('hr-pay-amount-0'), { target: { value: '0' } });
    fireEvent.click(screen.getByTestId('hr-pay-form-submit'));
    expect(await screen.findByText('Add at least one earning above zero')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
