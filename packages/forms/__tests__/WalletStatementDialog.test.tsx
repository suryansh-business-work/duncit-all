import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { downloadBase64File } from '@duncit/utils';
import { choose, combobox, fileResult, setup, submitButton, type RunQuery } from './walletStatementHarness';

// The browser download is the one side effect; everything else in @duncit/utils stays real.
vi.mock('@duncit/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/utils')>()),
  downloadBase64File: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(downloadBase64File).mockClear();
});

describe('WalletStatementDialog — choosing a period and downloading', () => {
  it('opens on this month as a PDF and says which days that covers', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'withdraw.statement.title' })).toBeInTheDocument();
    expect(screen.getByText('withdraw.statement.intro')).toBeInTheDocument();
    expect(combobox('statement-preset')).toHaveTextContent('withdraw.statement.presetThisMonth');
    expect(combobox('statement-format')).toHaveTextContent('PDF');
    expect(screen.getByTestId('statement-range')).toHaveTextContent(
      'withdraw.statement.rangeSummary {"from":"day:2026-10-01","to":"day:2026-10-11"}',
    );
    expect(screen.queryByTestId('statement-custom-days')).not.toBeInTheDocument();
    expect(submitButton()).toHaveTextContent('withdraw.statement.download');
    expect(screen.getByTestId('statement-close')).toHaveTextContent('Close');
    expect(screen.queryByTestId('statement-done')).not.toBeInTheDocument();
    expect(screen.queryByTestId('statement-error')).not.toBeInTheDocument();
  });

  it('asks for the preset days and hands the file to the browser', async () => {
    const { runQuery, user } = setup();
    await user.click(submitButton());
    const done = await screen.findByTestId('statement-done');
    expect(done).toHaveTextContent('withdraw.statement.downloaded');
    expect(done).toHaveAttribute('role', 'status');
    expect(runQuery).toHaveBeenCalledTimes(1);
    expect(runQuery).toHaveBeenCalledWith({
      variables: { input: { from: '2026-10-01', to: '2026-10-11' }, format: 'PDF' },
    });
    expect(downloadBase64File).toHaveBeenCalledTimes(1);
    expect(downloadBase64File).toHaveBeenCalledWith('QUJD', 'wallet-statement.pdf', 'application/pdf');
  });

  it('still downloads a nil statement, and says the period had no transactions', async () => {
    const { user } = setup({ runQuery: vi.fn<RunQuery>().mockResolvedValue(fileResult(0)) });
    await user.click(submitButton());
    expect(await screen.findByTestId('statement-done')).toHaveTextContent('withdraw.statement.emptyPeriod');
    expect(downloadBase64File).toHaveBeenCalledTimes(1);
  });

  it('sends the chosen preset and format', async () => {
    const { runQuery, user } = setup();
    await choose(user, 'preset', 'LAST_MONTH');
    await choose(user, 'format', 'CSV');
    expect(screen.getByTestId('statement-range')).toHaveTextContent(
      '{"from":"day:2026-09-01","to":"day:2026-09-30"}',
    );
    await user.click(submitButton());
    await screen.findByTestId('statement-done');
    expect(runQuery).toHaveBeenCalledWith({
      variables: { input: { from: '2026-09-01', to: '2026-09-30' }, format: 'CSV' },
    });
  });

  it('refuses a blank custom period beside the start day, without asking the server', async () => {
    const { runQuery, user } = setup();
    await choose(user, 'preset', 'CUSTOM');
    expect(screen.queryByTestId('statement-range')).not.toBeInTheDocument();
    const from = screen.getByLabelText('withdraw.statement.fromLabel');
    const to = screen.getByLabelText('withdraw.statement.toLabel');
    // Today in the business zone is the last pickable day, and both days are required.
    expect(from).toHaveAttribute('data-max-day', '2026-10-11');
    expect(to).toHaveAttribute('data-max-day', '2026-10-11');
    expect(from).toBeRequired();
    expect(to).toBeRequired();

    await user.click(submitButton());
    expect(await screen.findByTestId('withdraw.statement.fromLabel-helper')).toHaveTextContent(
      'withdraw.statement.errorMissing {"days":366}',
    );
    expect(from).toHaveAttribute('aria-invalid', 'true');
    expect(to).toHaveAttribute('aria-invalid', 'false');
    expect(runQuery).not.toHaveBeenCalled();
    expect(downloadBase64File).not.toHaveBeenCalled();
  });

  it('refuses custom days the wrong way round beside the end day, then sends them once fixed', async () => {
    const { runQuery, user } = setup();
    await choose(user, 'preset', 'CUSTOM');
    const from = screen.getByLabelText('withdraw.statement.fromLabel');
    const to = screen.getByLabelText('withdraw.statement.toLabel');
    await user.type(from, '2026-10-05');
    await user.type(to, '2026-10-01');
    await user.click(submitButton());
    expect(await screen.findByTestId('withdraw.statement.toLabel-helper')).toHaveTextContent(
      'withdraw.statement.errorOrder {"days":366}',
    );
    expect(to).toHaveAttribute('aria-invalid', 'true');
    expect(from).toHaveAttribute('aria-invalid', 'false');
    expect(runQuery).not.toHaveBeenCalled();

    await user.clear(to);
    await user.type(to, '2026-10-09');
    await user.click(submitButton());
    await screen.findByTestId('statement-done');
    expect(runQuery).toHaveBeenCalledWith({
      variables: { input: { from: '2026-10-05', to: '2026-10-09' }, format: 'PDF' },
    });
  });
});
