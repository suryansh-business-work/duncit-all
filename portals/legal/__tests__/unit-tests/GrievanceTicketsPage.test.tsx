import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { notifySuccess } from '@duncit/dialogs';
import GrievanceTicketsPage from '../../src/pages/grievance/GrievanceTicketsPage';
import { renderWithProviders } from '../testkit';
import {
  makeGrievanceTicket,
  updateGrievanceStatusErrorMock,
  updateGrievanceStatusMock,
} from '../mocks';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock(import('@duncit/dialogs'), async (importOriginal) => ({
  ...(await importOriginal()),
  notifySuccess: vi.fn(),
}));

/**
 * The grievance queue and the one dialog that answers a grievance: what the
 * complainant wrote is read-only, the status and resolution note are the reply.
 */
const SKIPPED_SUPPORT = makeGrievanceTicket({
  id: 'grv-1',
  grievance_no: 'GRV-000123',
  status: 'RECEIVED',
  support_ticket_ref: '',
  address: '',
});
const RESOLVED = makeGrievanceTicket({
  id: 'grv-2',
  grievance_no: 'GRV-000124',
  subject: 'Host was rude at the venue',
  status: 'RESOLVED',
  source: 'EMAIL',
  resolution: 'Spoke to the host; warning issued.',
  resolved_at: '2026-03-06T12:00:00.000Z',
  handled_by_name: 'Priya Sharma',
});

const renderPage = (mocks: MockedResponse[] = []) => renderWithProviders(<GrievanceTicketsPage />, { mocks });

const openRow = async (index: number) => {
  await screen.findByText('Refund for the cancelled badminton pod');
  fireEvent.click(screen.getAllByTestId('table-row')[index]);
  return screen.findByTestId('grievance-dialog');
};

beforeEach(() => {
  vi.mocked(notifySuccess).mockClear();
  __setTableRows([SKIPPED_SUPPORT, RESOLVED]);
});

describe('GrievanceTicketsPage — the queue', () => {
  it('names the grievances that skipped support and shows each status', async () => {
    renderPage();
    await screen.findByText('Refund for the cancelled badminton pod');
    const [skipped, resolved] = screen.getAllByTestId('table-row');

    expect(within(skipped).getByText('None — support was never contacted')).toBeInTheDocument();
    expect(within(skipped).getAllByText('Received').length).toBeGreaterThan(0);
    expect(within(resolved).getByText('ST-000981')).toBeInTheDocument();
    expect(within(resolved).getAllByText('Resolved').length).toBeGreaterThan(0);
    expect(within(resolved).getByText('Email')).toBeInTheDocument();
  });
});

describe('GrievanceTicketsPage — the dialog', () => {
  it('shows what the complainant wrote, with the gaps said in words', async () => {
    renderPage();
    const dialog = await openRow(0);

    expect(within(dialog).getByTestId('grievance-dialog-no')).toHaveTextContent('GRV-000123');
    expect(within(dialog).getByTestId('grievance-dialog-subject')).toHaveTextContent(
      'Refund for the cancelled badminton pod',
    );
    expect(within(dialog).getByText('None — support was never contacted')).toBeInTheDocument();
    // A blank address shows the em-dash every empty fact shows.
    expect(within(dialog).getByText('—')).toBeInTheDocument();
    expect(within(dialog).queryByText('Closed')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Handled by')).not.toBeInTheDocument();
  });

  it('shows when a closed grievance was closed and who handled it', async () => {
    renderPage();
    await screen.findByText('Refund for the cancelled badminton pod');
    const [, resolved] = screen.getAllByTestId('table-row');
    fireEvent.click(within(resolved).getByRole('button', { name: 'Open' }));
    const dialog = await screen.findByTestId('grievance-dialog');

    expect(within(dialog).getByText('Closed')).toBeInTheDocument();
    expect(within(dialog).getByText('Priya Sharma')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Resolution note')).toHaveValue('Spoke to the host; warning issued.');
  });

  it('answers a grievance and re-reads the queue', async () => {
    renderPage([updateGrievanceStatusMock(makeGrievanceTicket({ status: 'RESOLVED' }))]);
    const dialog = await openRow(0);

    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Status' }));
    fireEvent.click(screen.getByRole('option', { name: 'Resolved' }));
    fireEvent.change(within(dialog).getByLabelText('Resolution note'), {
      target: { value: 'Refunded ₹499 to the original card.' },
    });
    fireEvent.click(within(dialog).getByTestId('grievance-dialog-apply'));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Grievance updated'));
    await waitFor(() => expect(screen.queryByTestId('grievance-dialog')).not.toBeInTheDocument());
  });

  it("keeps the dialog open with the server's reason", async () => {
    renderPage([updateGrievanceStatusErrorMock('A resolved grievance needs a resolution note')]);
    const dialog = await openRow(0);
    fireEvent.click(within(dialog).getByTestId('grievance-dialog-apply'));

    expect(await within(dialog).findByText('A resolved grievance needs a resolution note')).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('closes from the icon and from the Close button', async () => {
    renderPage();
    let dialog = await openRow(0);
    fireEvent.click(within(dialog).getByTestId('grievance-dialog-close-icon'));
    await waitFor(() => expect(screen.queryByTestId('grievance-dialog')).not.toBeInTheDocument());

    dialog = await openRow(1);
    fireEvent.click(within(dialog).getByTestId('grievance-dialog-close'));
    await waitFor(() => expect(screen.queryByTestId('grievance-dialog')).not.toBeInTheDocument());
  });
});
