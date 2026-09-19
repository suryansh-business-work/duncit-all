import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import PolicyAcceptanceLogsPage from '../../src/pages/policy-acceptance-logs-page';
import { renderWithProviders } from '../testkit';
import { acceptanceDetailMock, makeAcceptance } from '../mocks';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));

/**
 * The acceptance log, read-only: a row opens everything behind it, and a
 * wording in that record opens the exact words that were agreed to.
 */
const ERASED = makeAcceptance({ id: 'acc-9', user_id: 'user-9', user_name: '', user_email: '' });

beforeEach(() => {
  __setTableRows([makeAcceptance(), ERASED]);
});

describe('PolicyAcceptanceLogsPage', () => {
  it('lists who accepted what, with a dash where the account is gone', async () => {
    renderWithProviders(<PolicyAcceptanceLogsPage />);
    await screen.findAllByText('Asha Rao');
    const [, erased] = screen.getAllByTestId('table-row');

    expect(within(erased).getByTestId('cell-user_name')).toHaveTextContent('—');
    expect(within(erased).getByTestId('cell-user_email')).toHaveTextContent('—');
    expect(within(erased).getAllByText('Signup form').length).toBeGreaterThan(0);
    expect(screen.getByText(/Open any row for its full record/)).toBeInTheDocument();
  });

  it('opens a row, reads the accepted wording, and closes both', async () => {
    renderWithProviders(<PolicyAcceptanceLogsPage />, { mocks: [acceptanceDetailMock()] });
    await screen.findAllByText('Asha Rao');
    fireEvent.click(screen.getAllByTestId('table-row')[0]);

    const record = await screen.findByRole('dialog');
    expect(await within(record).findByText('This acceptance')).toBeInTheDocument();
    // Newest first: Version 2 (in force), then Version 1 (the one they accepted).
    const readButtons = within(record).getAllByRole('button', { name: 'Read this wording' });
    expect(readButtons).toHaveLength(2);
    fireEvent.click(readButtons[1]);

    const wording = await screen.findByText('We collect your city to show pods near you.');
    const wordingDialog = wording.closest('[role="dialog"]') as HTMLElement;
    expect(within(wordingDialog).getByText('Version 1')).toBeInTheDocument();
    fireEvent.click(within(wordingDialog).getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(screen.queryByText('We collect your city to show pods near you.')).not.toBeInTheDocument(),
    );

    fireEvent.click(within(record).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
