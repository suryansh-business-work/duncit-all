import { useState } from 'react';
import { Text } from 'tamagui';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { PodPlaceCharge } from '@duncit/utils';

import { PlaceChargesConfirmDialog, usePlaceChargesConfirm } from '@/components/details/place-charges';
import type { PlaceChargesPod } from '@/components/details/place-charges/usePlaceChargesConfirm';
import { createTicket } from '@/hooks/useSupport';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useSupport', () => ({ createTicket: jest.fn() }));
const mockedTicket = createTicket as jest.Mock;

const CHARGES: PodPlaceCharge[] = [
  { label: 'Entry', amount: 200, note: 'Includes one drink' },
  { label: 'Table', amount: 300 },
];
const POD: PlaceChargesPod = { id: 'pod-1', pod_title: 'Sunday Board Games', place_charges: CHARGES };

/** A Book action behind the gate, the way PodDetailsOverlays runs it. */
function Harness({ pod }: Readonly<{ pod: PlaceChargesPod }>) {
  const placeCharges = usePlaceChargesConfirm(pod, '₹');
  const [answer, setAnswer] = useState('none');
  return (
    <>
      <Text testID="book" onPress={() => placeCharges.confirm().then((go) => setAnswer(String(go)))}>
        book
      </Text>
      <Text testID="answer">{answer}</Text>
      <PlaceChargesConfirmDialog {...placeCharges.dialog} />
    </>
  );
}

const pressBook = async () => {
  await act(async () => {
    fireEvent.press(screen.getByTestId('book'));
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedTicket.mockResolvedValue({ id: 't1', ticketNo: 'TKT-1042' });
});

describe('place charges confirmation (native)', () => {
  it('lets the booking go ahead at once when the pod lists no place charges', async () => {
    renderWithProviders(<Harness pod={{ ...POD, place_charges: [] }} />);
    await pressBook();
    await waitFor(() => expect(screen.getByTestId('answer')).toHaveTextContent('true'));
    expect(screen.queryByTestId('place-charges-dialog-confirm')).toBeNull();
  });

  it('shows every charge, the total and that Duncit plays no part', async () => {
    renderWithProviders(<Harness pod={POD} />);
    await pressBook();
    expect(screen.getAllByTestId('venue-charge-row')).toHaveLength(2);
    expect(screen.getByText('Includes one drink')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-charges-total')).toHaveTextContent('₹500.00');
    expect(screen.getByText('You pay these charges directly to the venue, at the venue.')).toBeOnTheScreen();
    expect(screen.getByText(/Duncit does not collect these charges and has no role in them/)).toBeOnTheScreen();
  });

  it("answers yes on I'm OK and no on Cancel", async () => {
    renderWithProviders(<Harness pod={POD} />);
    await pressBook();
    await act(async () => {
      fireEvent.press(screen.getByTestId('place-charges-dialog-confirm'));
    });
    await waitFor(() => expect(screen.getByTestId('answer')).toHaveTextContent('true'));

    await pressBook();
    await act(async () => {
      fireEvent.press(screen.getByTestId('place-charges-dialog-cancel'));
    });
    await waitFor(() => expect(screen.getByTestId('answer')).toHaveTextContent('false'));
  });

  it('raises one BOOKING ticket for the pod in one tap and shows its number', async () => {
    renderWithProviders(<Harness pod={POD} />);
    await pressBook();
    await act(async () => {
      fireEvent.press(screen.getByTestId('place-charges-report'));
      fireEvent.press(screen.getByTestId('place-charges-report'));
    });
    expect(await screen.findByTestId('place-charges-reported')).toHaveTextContent(
      /Ticket TKT-1042 raised\. Our support team will check these charges\./,
    );
    expect(mockedTicket).toHaveBeenCalledTimes(1);
    const [subject, body, category, attachments, pod] = mockedTicket.mock.calls[0];
    expect(subject).toBe('Place charges look wrong — Sunday Board Games');
    expect(body).toContain('- Entry: ₹200 (Includes one drink)');
    expect(body).toContain('Total: ₹500');
    expect(category).toBe('BOOKING');
    expect(attachments).toEqual([]);
    expect(pod).toEqual({ id: 'pod-1', title: 'Sunday Board Games' });
    expect(screen.queryByTestId('place-charges-report')).toBeNull();
  });

  it('says so when the ticket could not be raised, and lets the member try again', async () => {
    mockedTicket.mockRejectedValueOnce(new Error('Network down'));
    renderWithProviders(<Harness pod={POD} />);
    await pressBook();
    await act(async () => {
      fireEvent.press(screen.getByTestId('place-charges-report'));
    });
    expect(await screen.findByTestId('place-charges-report-failed')).toHaveTextContent(
      'Could not raise the ticket. Please try again.',
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('place-charges-report'));
    });
    expect(await screen.findByTestId('place-charges-reported')).toHaveTextContent(/TKT-1042/);
    expect(mockedTicket).toHaveBeenCalledTimes(2);
  });
});
