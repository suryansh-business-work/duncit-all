import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TicketList } from '../../../pages/event/TicketList';
import { renderWithProviders, ticketFixture } from '../../test-utils';

const rowOf = (name: string): HTMLElement => {
  const row = screen.getByText(name).closest('li');
  if (!row) throw new Error(`no list row for ${name}`);
  return row;
};

describe('TicketList', () => {
  it('lists only the tickets on sale, as list items', () => {
    renderWithProviders(
      <TicketList tickets={[ticketFixture({ id: 'a', name: 'General' }), ticketFixture({ id: 'b', name: 'Retired', is_active: false }), ticketFixture({ id: 'c', name: 'VIP', price: 2500 })]} />,
    );

    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByText('Retired')).not.toBeInTheDocument();
  });

  it('prices a free ticket as Free and a paid one in rupees with Indian grouping', () => {
    renderWithProviders(<TicketList tickets={[ticketFixture({ id: 'a', name: 'General', price: 0 }), ticketFixture({ id: 'b', name: 'Patron', price: 125_000 })]} />);

    expect(within(rowOf('General')).getByText('Free')).toBeInTheDocument();
    expect(within(rowOf('Patron')).getByText('₹1,25,000')).toBeInTheDocument();
  });

  it('marks a ticket sold out once every seat on it is taken', () => {
    renderWithProviders(
      <TicketList
        tickets={[
          ticketFixture({ id: 'a', name: 'Full', quantity: 20, sold: 20 }),
          ticketFixture({ id: 'b', name: 'One left', quantity: 20, sold: 19 }),
          ticketFixture({ id: 'c', name: 'Unlimited', quantity: null, sold: 900 }),
        ]}
      />,
    );

    expect(within(rowOf('Full')).getByText('Sold out')).toBeInTheDocument();
    expect(within(rowOf('One left')).queryByText('Sold out')).not.toBeInTheDocument();
    expect(within(rowOf('Unlimited')).queryByText('Sold out')).not.toBeInTheDocument();
  });

  it('shows the host’s description under a ticket name when there is one', () => {
    renderWithProviders(<TicketList tickets={[ticketFixture({ name: 'Early bird', description: 'Until Friday' })]} />);
    expect(within(rowOf('Early bird')).getByText('Until Friday')).toBeInTheDocument();
  });

  it('renders an empty list when nothing is on sale', () => {
    renderWithProviders(<TicketList tickets={[ticketFixture({ is_active: false })]} />);
    expect(within(screen.getByTestId('ticket-list')).queryAllByRole('listitem')).toHaveLength(0);
  });
});
