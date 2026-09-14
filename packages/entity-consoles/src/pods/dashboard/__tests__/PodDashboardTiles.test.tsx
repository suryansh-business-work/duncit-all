import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../__tests__/testkit';
import PodDashboardTiles from '../PodDashboardTiles';

const totals = { total: 42, upcoming: 12, completed: 20, cancelled: 3, awaiting_venue: 5, live_today: 2 };
const seats = { spots_total: 1200, seats_filled: 900, occupancy_pct: 75 };
const money = { revenue_total: 412345.6, payments_count: 318, average_ticket: 1296.7 };

/** The value text of the tile whose label is `label`. */
const tileText = (label: string) => screen.getByText(label).closest('.MuiCard-root')?.textContent ?? '';

describe('PodDashboardTiles', () => {
  it('renders every live count and the window figures from the board', () => {
    renderWithProviders(
      <PodDashboardTiles
        totals={totals}
        seats={seats}
        money={money}
        ratings={{ total: 64, overall_average: 4.26 }}
        loading={false}
      />,
    );
    expect(tileText('All pods')).toContain('42');
    expect(tileText('Upcoming')).toContain('12');
    expect(tileText('Later today')).toContain('2');
    expect(tileText('Completed')).toContain('20');
    expect(tileText('Awaiting venue')).toContain('5');
    expect(tileText('Cancelled')).toContain('3');
    expect(tileText('Seats filled')).toContain('75%');
    expect(tileText('Seats filled')).toContain('900 of 1,200 spots');
    expect(tileText('Collected')).toContain('₹4,12,346');
    expect(tileText('Collected')).toContain('318 payments');
    expect(tileText('Average payment')).toContain('₹1,297');
    expect(tileText('Rated')).toContain('4.3');
    expect(tileText('Rated')).toContain('64 ratings');
  });

  it('links the All pods tile to the pods list and leaves the others unlinked', () => {
    renderWithProviders(
      <PodDashboardTiles totals={totals} seats={seats} money={money} ratings={null} loading={false} />,
    );
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/pods');
    expect(links[0]).toHaveTextContent('All pods');
  });

  it('reads zero for every missing section and a dash when nothing has been rated', () => {
    renderWithProviders(
      <PodDashboardTiles
        totals={null}
        seats={null}
        money={null}
        ratings={{ total: 0, overall_average: 0 }}
        loading={false}
      />,
    );
    expect(tileText('All pods')).toContain('0');
    expect(tileText('Seats filled')).toContain('0%');
    expect(tileText('Seats filled')).toContain('0 of 0 spots');
    expect(tileText('Collected')).toContain('₹0');
    expect(tileText('Collected')).toContain('0 payments');
    expect(tileText('Average payment')).toContain('₹0');
    expect(tileText('Rated')).toContain('—');
    expect(tileText('Rated')).toContain('0 ratings');
  });

  it('shows a dash and zero ratings when the ratings section is absent', () => {
    renderWithProviders(
      <PodDashboardTiles totals={totals} seats={seats} money={money} ratings={null} loading={false} />,
    );
    expect(tileText('Rated')).toContain('—');
    expect(tileText('Rated')).toContain('0 ratings');
  });

  it('shows an ellipsis on every tile while the first read is still loading', () => {
    renderWithProviders(
      <PodDashboardTiles totals={null} seats={null} money={null} ratings={null} loading />,
    );
    expect(screen.getAllByText('…')).toHaveLength(10);
  });

  it('keeps the last numbers on screen while a refetch is loading', () => {
    renderWithProviders(
      <PodDashboardTiles totals={totals} seats={seats} money={money} ratings={null} loading />,
    );
    expect(screen.queryByText('…')).not.toBeInTheDocument();
    expect(tileText('All pods')).toContain('42');
  });
});
