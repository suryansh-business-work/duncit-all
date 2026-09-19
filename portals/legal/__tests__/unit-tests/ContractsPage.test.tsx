import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { notifySuccess } from '@duncit/dialogs';
import ContractsPage from '../../src/pages/contracts/ContractsPage';
import { renderWithProviders } from '../testkit';
import {
  archiveContractMock,
  createContractErrorMock,
  createContractMock,
  makeContract,
  updateContractMock,
} from '../mocks';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock(import('@duncit/dialogs'), async (importOriginal) => ({
  ...(await importOriginal()),
  notifySuccess: vi.fn(),
}));

const ACTIVE = makeContract();
const EXECUTED = makeContract({
  id: 'ctr-2',
  contract_no: 'CTR-000043',
  title: 'Brand Sponsorship — Monsoon League',
  status: 'ARCHIVED',
  signing_status: 'SIGNED',
  signed_at: '2026-03-05T10:00:00.000Z',
  is_locked: true,
  effective_to: '2026-09-30T00:00:00.000Z',
});

const renderPage = (mocks: MockedResponse[] = []) => renderWithProviders(<ContractsPage />, { mocks });

const flush = () =>
  act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });

beforeEach(() => {
  vi.mocked(notifySuccess).mockClear();
  __setTableRows([ACTIVE, EXECUTED]);
});

describe('ContractsPage — the table', () => {
  it('lists each contract with its status, signing state and lock', async () => {
    renderPage();
    expect(await screen.findByText('Venue Partnership — Court 2')).toBeInTheDocument();
    const [active, archived] = screen.getAllByTestId('table-row');

    expect(within(active).getAllByText('Active').length).toBeGreaterThan(0);
    expect(within(active).getAllByText('Unsigned').length).toBeGreaterThan(0);
    expect(within(active).getByRole('button', { name: 'Edit' })).toBeEnabled();

    expect(within(archived).getAllByText('Archived').length).toBeGreaterThan(0);
    expect(within(archived).getAllByText('Signed').length).toBeGreaterThan(0);
    // Signed means locked, and archived cannot be archived again.
    expect(within(archived).getByRole('button', { name: 'Edit' })).toBeDisabled();
    expect(within(archived).getByRole('button', { name: 'Archive' })).toBeDisabled();
  });
});

describe('ContractsPage — create and edit', () => {
  it('creates a contract from the toolbar', async () => {
    renderPage([createContractMock()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Add Contract' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('New Contract')).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText(/^Title/), { target: { value: '  Coaching Agreement  ' } });
    fireEvent.change(within(dialog).getByLabelText('Counterparty'), { target: { value: 'Coach Vikram' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create Contract' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Contract created'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps the dialog open with the reason when the server refuses', async () => {
    renderPage([createContractErrorMock('A contract with this title already exists')]);
    fireEvent.click(await screen.findByRole('button', { name: 'Add Contract' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Title/), { target: { value: 'Coaching Agreement' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create Contract' }));

    expect(await within(dialog).findByText('A contract with this title already exists')).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('opens a contract for editing with its stored values and saves it', async () => {
    renderPage([updateContractMock()]);
    await screen.findByText('Venue Partnership — Court 2');
    const [activeRow] = screen.getAllByTestId('table-row');
    fireEvent.click(within(activeRow).getByRole('button', { name: 'Edit' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit · Venue Partnership — Court 2')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Counterparty')).toHaveValue('Smash Arena LLP');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Contract updated'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens a contract read-only from View and closes it', async () => {
    renderPage();
    await screen.findByText('Venue Partnership — Court 2');
    const [, archivedRow] = screen.getAllByTestId('table-row');
    fireEvent.click(within(archivedRow).getByRole('button', { name: 'View' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('View · Brand Sponsorship — Monsoon League')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('ContractsPage — archive and sign', () => {
  it('archives after confirming, once, however often Archive is pressed', async () => {
    const onArchive = vi.fn();
    renderPage([archiveContractMock('ctr-1', onArchive)]);
    await screen.findByText('Venue Partnership — Court 2');
    const [activeRow] = screen.getAllByTestId('table-row');
    fireEvent.click(within(activeRow).getByRole('button', { name: 'Archive' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Archive contract?')).toBeInTheDocument();
    const confirm = within(dialog).getByRole('button', { name: 'Archive' });
    fireEvent.click(confirm);
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Contract archived'));

    // A second press while the dialog fades out finds nothing left to archive.
    fireEvent.click(confirm);
    await flush();
    expect(onArchive).toHaveBeenCalledTimes(1);
  });

  it('backs out of archiving', async () => {
    const onArchive = vi.fn();
    renderPage([archiveContractMock('ctr-1', onArchive)]);
    await screen.findByText('Venue Partnership — Court 2');
    const [activeRow] = screen.getAllByTestId('table-row');
    fireEvent.click(within(activeRow).getByRole('button', { name: 'Archive' }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onArchive).not.toHaveBeenCalled();
  });

  it('opens the signing workflow on the contract', async () => {
    renderPage();
    await screen.findByText('Venue Partnership — Court 2');
    const [activeRow] = screen.getAllByTestId('table-row');
    fireEvent.click(within(activeRow).getByRole('button', { name: 'Sign' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Venue Partnership — Court 2')).toBeInTheDocument();
    expect(within(dialog).getByText('Download the draft')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
