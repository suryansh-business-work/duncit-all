import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import WalletStatementFields from '../src/WalletStatementFields';
import { blankWalletStatementValues, type WalletStatementValues } from '../src/schemas/wallet-statement';
import { combobox, dateFormat, StubDateField, t } from './walletStatementHarness';

/** The declarations emotion wrote for an element's own class, media queries included. */
function ownCss(element: HTMLElement): string {
  const sheet = Array.from(document.querySelectorAll('style'))
    .map((style) => style.textContent ?? '')
    .join('')
    .replaceAll(/\s+/g, '');
  return Array.from(element.classList)
    .flatMap((name) => sheet.split(`.${name}{`).slice(1))
    .map((rule) => rule.split('}')[0])
    .join(';');
}

describe('WalletStatementFields', () => {
  function Harness({ datesInline, disabled = false }: Readonly<{ datesInline?: boolean; disabled?: boolean }>) {
    const { control, formState } = useForm<WalletStatementValues>({
      defaultValues: { ...blankWalletStatementValues, preset: 'CUSTOM' },
    });
    return (
      <WalletStatementFields
        control={control}
        errors={formState.errors}
        preset="CUSTOM"
        disabled={disabled}
        t={t}
        dateFormat={dateFormat}
        DateField={StubDateField}
        datesInline={datesInline}
      />
    );
  }

  it('offers every preset, in the order the shared list gives them', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(combobox('statement-preset'));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'withdraw.statement.presetThisMonth',
      'withdraw.statement.presetLastMonth',
      'withdraw.statement.presetLast3Months',
      'withdraw.statement.presetLast6Months',
      'withdraw.statement.presetThisFinancialYear',
      'withdraw.statement.presetLastFinancialYear',
      'withdraw.statement.presetCustom',
    ]);
  });

  it('offers both file formats', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(combobox('statement-format'));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['PDF', 'CSV']);
  });

  it('stacks the two custom days unless the surface asks for them side by side', () => {
    const stacked = render(<Harness />);
    const stackedCss = ownCss(screen.getByTestId('statement-custom-days'));
    expect(stackedCss).toContain('flex-direction:column');
    expect(stackedCss).not.toContain('flex-direction:row');
    stacked.unmount();

    render(<Harness datesInline />);
    expect(ownCss(screen.getByTestId('statement-custom-days'))).toContain('flex-direction:row');
    expect(within(screen.getByTestId('statement-from')).getByLabelText('withdraw.statement.fromLabel')).toBeEnabled();
    expect(within(screen.getByTestId('statement-to')).getByLabelText('withdraw.statement.toLabel')).toBeEnabled();
  });

  it('locks every field while disabled', () => {
    render(<Harness disabled />);
    expect(screen.getByLabelText('withdraw.statement.fromLabel')).toBeDisabled();
    expect(screen.getByLabelText('withdraw.statement.toLabel')).toBeDisabled();
    expect(combobox('statement-preset')).toHaveAttribute('aria-disabled', 'true');
    expect(combobox('statement-format')).toHaveAttribute('aria-disabled', 'true');
  });
});
