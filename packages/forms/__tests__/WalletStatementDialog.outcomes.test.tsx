import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { downloadBase64File } from '@duncit/utils';
import WalletStatementDialog, { type WalletStatementQueryResult } from '../src/WalletStatementDialog';
import {
  combobox,
  dateFormat,
  deferredQuery,
  fileResult,
  setup,
  StackedFields,
  submitButton,
  t,
  type RunQuery,
} from './walletStatementHarness';

// The browser download is the one side effect; everything else in @duncit/utils stays real.
vi.mock('@duncit/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/utils')>()),
  downloadBase64File: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(downloadBase64File).mockClear();
});

describe('WalletStatementDialog — failures, the busy state and the surface\'s look', () => {
  it('shows the server\'s own message when the query throws, and Retry asks again', async () => {
    const runQuery = vi
      .fn<RunQuery>()
      .mockRejectedValueOnce(new Error('Ledger is offline'))
      .mockResolvedValueOnce(fileResult(2));
    const { user } = setup({ runQuery });
    await user.click(submitButton());
    expect(await screen.findByTestId('statement-error')).toHaveTextContent('Ledger is offline');
    expect(downloadBase64File).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('statement-retry'));
    expect(await screen.findByTestId('statement-done')).toHaveTextContent('withdraw.statement.downloaded');
    expect(screen.queryByTestId('statement-error')).not.toBeInTheDocument();
    expect(runQuery).toHaveBeenCalledTimes(2);
    expect(downloadBase64File).toHaveBeenCalledTimes(1);
  });

  it.each<[string, WalletStatementQueryResult]>([
    ['no data and no error', {}],
    ['null data', { data: null }],
    ['a null file', { data: { myWalletStatementFile: null } }],
    ['an error with no message', { error: new Error('') }],
    ['an error that is not an Error', { error: 'boom' }],
  ])('falls back to the shared failure copy when the query settles with %s', async (_label, result) => {
    const { user } = setup({ runQuery: vi.fn<RunQuery>().mockResolvedValue(result) });
    await user.click(submitButton());
    expect(await screen.findByTestId('statement-error')).toHaveTextContent('withdraw.statement.failed');
    expect(screen.getByTestId('statement-retry')).toHaveTextContent('withdraw.statement.retry');
    expect(downloadBase64File).not.toHaveBeenCalled();
  });

  it('uses the query\'s error message when it settles without a file', async () => {
    const { user } = setup({
      runQuery: vi.fn<RunQuery>().mockResolvedValue({ error: new Error('Statement too large') }),
    });
    await user.click(submitButton());
    expect(await screen.findByTestId('statement-error')).toHaveTextContent('Statement too large');
  });

  it('locks the form and cannot be dismissed while the file is fetched, then unlocks', async () => {
    const query = deferredQuery();
    const { onClose, user } = setup({ runQuery: query.runQuery });
    await user.click(submitButton());
    await waitFor(() => expect(submitButton()).toBeDisabled());
    expect(submitButton()).toHaveTextContent('withdraw.statement.downloading');
    // Without `spinner` the button is only disabled.
    expect(within(submitButton()).queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByTestId('statement-close')).toBeDisabled();
    expect(combobox('statement-preset')).toHaveAttribute('aria-disabled', 'true');
    expect(combobox('statement-format')).toHaveAttribute('aria-disabled', 'true');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      query.settle(fileResult(1));
    });
    await screen.findByTestId('statement-done');
    expect(submitButton()).toBeEnabled();
    expect(submitButton()).toHaveTextContent('withdraw.statement.download');
    expect(combobox('statement-preset')).not.toHaveAttribute('aria-disabled', 'true');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes from the Close button', async () => {
    const { onClose, user } = setup();
    await user.click(screen.getByTestId('statement-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the Download button\'s spinner while fetching when the surface asks for one', async () => {
    const query = deferredQuery();
    const { user } = setup({ runQuery: query.runQuery, spinner: true });
    expect(within(submitButton()).queryByRole('progressbar')).not.toBeInTheDocument();
    await user.click(submitButton());
    await waitFor(() => expect(within(submitButton()).getByRole('progressbar')).toBeInTheDocument());
    expect(submitButton()).toBeDisabled();

    await act(async () => {
      query.settle(fileResult(1));
    });
    await screen.findByTestId('statement-done');
    expect(within(submitButton()).queryByRole('progressbar')).not.toBeInTheDocument();
    expect(submitButton()).toBeEnabled();
  });

  it('weights the title and the Download button 700 by default, or as the surface asks', () => {
    const { unmount } = render(
      <WalletStatementDialog
        t={t}
        dateFormat={dateFormat}
        Fields={StackedFields}
        runQuery={vi.fn<RunQuery>()}
        closeLabel="Close"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'withdraw.statement.title' })).toHaveStyle({ fontWeight: '700' });
    expect(submitButton()).toHaveStyle({ fontWeight: '700' });
    unmount();

    setup({ fontWeight: 900 });
    expect(screen.getByRole('heading', { name: 'withdraw.statement.title' })).toHaveStyle({ fontWeight: '900' });
    expect(submitButton()).toHaveStyle({ fontWeight: '900' });
  });
});
