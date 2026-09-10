import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PodSeatsCell from '../src/PodSeatsCell';

/**
 * The bug this cell exists for: a pod sold out by three people who bought 1, 7
 * and 2 seats used to read "3 / 10". Both numbers have to survive together, so
 * every case below asserts the pair, not just the headline.
 */
describe('PodSeatsCell', () => {
  it('shows seats over capacity, with the bookings holding them underneath', () => {
    render(<PodSeatsCell seats={10} bookings={3} total={10} />);
    expect(screen.getByText('10 / 10')).toBeInTheDocument();
    expect(screen.getByText('3 bookings')).toBeInTheDocument();
  });

  it('names the multi-seat split in the hint when seats outrun bookings', () => {
    render(<PodSeatsCell seats={10} bookings={3} total={20} />);
    expect(
      screen.getByLabelText(
        '10 seats held by 3 bookings — 7 of them are extra seats bought on a single booking.',
      ),
    ).toBeInTheDocument();
  });

  it('says one seat each when every booking took a single seat', () => {
    render(<PodSeatsCell seats={4} bookings={4} total={12} />);
    expect(
      screen.getByLabelText('4 seats held by 4 bookings — one seat each.'),
    ).toBeInTheDocument();
  });

  it('singularises a lone booking', () => {
    render(<PodSeatsCell seats={1} bookings={1} total={8} />);
    expect(screen.getByText('1 booking')).toBeInTheDocument();
  });

  it('drops the "/ N" for an uncapped pod — 0 spots means unlimited, not full', () => {
    render(<PodSeatsCell seats={6} bookings={2} total={0} />);
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.queryByText('6 / 0')).not.toBeInTheDocument();
  });

  it('treats a missing capacity the same as an uncapped one', () => {
    render(<PodSeatsCell seats={5} bookings={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('never reports negative extra seats when the counts disagree', () => {
    render(<PodSeatsCell seats={2} bookings={5} total={10} />);
    expect(
      screen.getByLabelText('2 seats held by 5 bookings — one seat each.'),
    ).toBeInTheDocument();
  });
});
