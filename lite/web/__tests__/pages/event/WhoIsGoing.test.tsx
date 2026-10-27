import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WhoIsGoing } from '../../../pages/event/WhoIsGoing';
import { eventFixture, renderWithProviders, statsFixture } from '../../test-utils';

describe('WhoIsGoing', () => {
  it('counts the guests going in the singular and the plural', () => {
    const { unmount } = renderWithProviders(<WhoIsGoing event={eventFixture({ stats: statsFixture({ going: 1 }) })} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Who is going' })).toBeInTheDocument();
    expect(screen.getByText('1 person going')).toBeInTheDocument();
    unmount();

    renderWithProviders(<WhoIsGoing event={eventFixture({ stats: statsFixture({ going: 12 }) })} />);
    expect(screen.getByText('12 people going')).toBeInTheDocument();
  });

  it('mentions the waitlist only when someone is on it', () => {
    const { unmount } = renderWithProviders(<WhoIsGoing event={eventFixture({ stats: statsFixture({ going: 5, waitlisted: 0 }) })} />);
    expect(screen.queryByText(/on the waitlist/)).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<WhoIsGoing event={eventFixture({ stats: statsFixture({ going: 5, waitlisted: 3 }) })} />);
    expect(screen.getByText('3 on the waitlist')).toBeInTheDocument();
  });

  it('says nothing about spots when the event has no capacity', () => {
    renderWithProviders(<WhoIsGoing event={eventFixture({ capacity: null, stats: statsFixture({ going: 50 }) })} />);
    expect(screen.queryByText(/spots? left/)).not.toBeInTheDocument();
  });

  it.each([
    [10, 3, '7 spots left'],
    [4, 3, '1 spot left'],
    [4, 4, '0 spots left'],
    [4, 9, '0 spots left'],
  ])('with capacity %i and %i going, says "%s"', (capacity, going, sentence) => {
    renderWithProviders(<WhoIsGoing event={eventFixture({ capacity, stats: statsFixture({ going }) })} />);
    expect(screen.getByText(sentence)).toBeInTheDocument();
  });
});
