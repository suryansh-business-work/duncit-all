import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { placeChargesTicketDraft, type PodPlaceCharge } from '@duncit/utils';
import { CREATE_TICKET } from '../../../support-tickets/queries';
import { PlaceChargesConfirmDialog, usePlaceChargesConfirm } from '..';
import type { PlaceChargesPod } from '../usePlaceChargesConfirm';

vi.mock('@duncit/logs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/logs')>();
  return { ...actual, logs: { ...actual.logs, mWeb: { ...actual.logs.mWeb, error: vi.fn() } } };
});

const CHARGES: PodPlaceCharge[] = [
  { label: 'Entry', amount: 200, note: 'Includes one drink' },
  { label: 'Table', amount: 300 },
];
const POD: PlaceChargesPod = { id: 'pod-1', pod_title: 'Sunday Board Games', place_charges: CHARGES };

const ticketInput = placeChargesTicketDraft({
  podId: 'pod-1',
  podTitle: 'Sunday Board Games',
  charges: CHARGES,
  currencySymbol: '₹',
});

const ticketMock = (result: { ticketNo?: string; error?: boolean } = { ticketNo: 'TKT-1042' }) => ({
  request: { query: CREATE_TICKET, variables: { input: ticketInput } },
  ...(result.error
    ? { error: new Error('Network down') }
    : { result: { data: { createTicket: { __typename: 'Ticket', id: 't1', ticket_no: result.ticketNo } } } }),
});

function Harness({ pod, book }: Readonly<{ pod: PlaceChargesPod; book: () => void }>) {
  const placeCharges = usePlaceChargesConfirm(pod, '₹');
  return (
    <>
      <button onClick={placeCharges.confirmFirst(book)}>book</button>
      <PlaceChargesConfirmDialog {...placeCharges.dialog} />
    </>
  );
}

const setup = (pod: PlaceChargesPod = POD, mocks: unknown[] = []) => {
  const book = vi.fn();
  render(
    <MockedProvider mocks={mocks as never}>
      <Harness pod={pod} book={book} />
    </MockedProvider>,
  );
  return book;
};

afterEach(() => vi.clearAllMocks());

describe('place charges confirmation (mWeb)', () => {
  it('books straight away when the pod lists no place charges', () => {
    const book = setup({ ...POD, place_charges: [] });
    fireEvent.click(screen.getByText('book'));
    expect(book).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('place-charges-dialog')).not.toBeInTheDocument();
  });

  it('shows every charge, the total and that Duncit plays no part, before booking', () => {
    const book = setup();
    fireEvent.click(screen.getByText('book'));
    expect(book).not.toHaveBeenCalled();
    const dialog = screen.getByTestId('place-charges-dialog');
    expect(within(dialog).getAllByTestId('venue-charge-row')).toHaveLength(2);
    expect(dialog).toHaveTextContent('Entry');
    expect(dialog).toHaveTextContent('Includes one drink');
    expect(within(dialog).getByTestId('venue-charges-total')).toHaveTextContent('₹500.00');
    expect(dialog).toHaveTextContent('You pay these charges directly to the venue, at the venue.');
    expect(dialog).toHaveTextContent(/Duncit does not collect these charges and has no role in them/);
  });

  it('books only once the member says they are OK', () => {
    const book = setup();
    fireEvent.click(screen.getByText('book'));
    fireEvent.click(screen.getByTestId('place-charges-dialog-confirm'));
    expect(book).toHaveBeenCalledTimes(1);
  });

  it('does not book when the member cancels', async () => {
    const book = setup();
    fireEvent.click(screen.getByText('book'));
    fireEvent.click(screen.getByTestId('place-charges-dialog-cancel'));
    await waitFor(() => expect(screen.queryByTestId('place-charges-dialog')).not.toBeInTheDocument());
    expect(book).not.toHaveBeenCalled();
  });

  it('raises one ticket in one tap and shows its number, without booking', async () => {
    const book = setup(POD, [ticketMock()]);
    fireEvent.click(screen.getByText('book'));
    const report = screen.getByTestId('place-charges-report');
    fireEvent.click(report);
    // A second tap while the first is in flight must not open a second ticket
    // (only one mock exists, so a second request would fail the test).
    fireEvent.click(report);
    expect(await screen.findByTestId('place-charges-reported')).toHaveTextContent(
      'Ticket TKT-1042 raised. Our support team will check these charges.',
    );
    expect(screen.queryByTestId('place-charges-report')).not.toBeInTheDocument();
    expect(book).not.toHaveBeenCalled();
  });

  it('says so when the ticket could not be raised, and lets the member try again', async () => {
    setup(POD, [ticketMock({ error: true }), ticketMock()]);
    fireEvent.click(screen.getByText('book'));
    fireEvent.click(screen.getByTestId('place-charges-report'));
    expect(await screen.findByTestId('place-charges-report-failed')).toHaveTextContent(
      'Could not raise the ticket. Please try again.',
    );
    fireEvent.click(screen.getByTestId('place-charges-report'));
    expect(await screen.findByTestId('place-charges-reported')).toHaveTextContent('TKT-1042');
  });
});
