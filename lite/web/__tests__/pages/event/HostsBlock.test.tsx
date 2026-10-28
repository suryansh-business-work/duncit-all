import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HostsBlock } from '../../../pages/event/HostsBlock';
import { calendarFixture, eventFixture, hostFixture, renderWithProviders } from '../../test-utils';

describe('HostsBlock', () => {
  it('lists every host, each linking to their profile, and marks co-hosts', () => {
    renderWithProviders(
      <HostsBlock event={eventFixture({ hosts: [hostFixture(), hostFixture({ user_id: 'u-2', name: 'Ravi Kumar', handle: 'ravi', role: 'CO_HOST' })] })} />,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Hosted by' })).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);

    expect(within(items[0]).getByRole('link', { name: 'Asha Rao' })).toHaveAttribute('href', '/u/asha');
    expect(within(items[0]).queryByText('Co-host')).not.toBeInTheDocument();
    expect(within(items[0]).getByText('AR')).toBeInTheDocument();

    expect(within(items[1]).getByRole('link', { name: 'Ravi Kumar' })).toHaveAttribute('href', '/u/ravi');
    expect(within(items[1]).getByText('Co-host')).toBeInTheDocument();
  });

  it('names the calendar the event belongs to, linking to it', () => {
    renderWithProviders(<HostsBlock event={eventFixture({ calendar: calendarFixture() })} />);

    expect(screen.getByText(/Part of/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Run Club' })).toHaveAttribute('href', '/cal/run-club');
  });

  it('leaves the calendar line out for an event on no calendar', () => {
    renderWithProviders(<HostsBlock event={eventFixture({ calendar: null })} />);
    expect(screen.queryByText(/Part of/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('event-calendar-link')).not.toBeInTheDocument();
  });
});
