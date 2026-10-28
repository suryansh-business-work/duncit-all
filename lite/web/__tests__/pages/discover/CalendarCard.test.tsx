import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CalendarCard } from '../../../pages/discover/CalendarCard';
import { calendarFixture, renderWithProviders } from '../../test-utils';

describe('CalendarCard', () => {
  it('links to the calendar page and names it with its initials avatar', () => {
    renderWithProviders(<CalendarCard calendar={calendarFixture({ description: 'Sunday long runs.' })} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/cal/run-club');
    expect(screen.getByRole('heading', { level: 3, name: 'Run Club' })).toBeInTheDocument();
    expect(screen.getByText('Sunday long runs.')).toBeInTheDocument();
    expect(screen.getByTestId('user-avatar')).toHaveTextContent('RC');
  });

  it('falls back to its upcoming count when it has no description', () => {
    renderWithProviders(<CalendarCard calendar={calendarFixture({ description: null, upcoming_count: 4 })} />);
    expect(screen.getByText('4 upcoming')).toBeInTheDocument();
  });

  it('keeps quiet (no Follow) unless asked to be followable', () => {
    renderWithProviders(<CalendarCard calendar={calendarFixture()} />);
    expect(screen.queryByTestId('calendar-follow')).not.toBeInTheDocument();
  });

  it('offers Follow on Discover', () => {
    renderWithProviders(<CalendarCard calendar={calendarFixture()} followable />);
    expect(screen.getByRole('button', { name: 'Follow Run Club' })).toBeInTheDocument();
  });

  it('never offers the owner a Follow on their own calendar', () => {
    renderWithProviders(<CalendarCard calendar={calendarFixture({ viewer_is_owner: true })} followable />);
    expect(screen.queryByTestId('calendar-follow')).not.toBeInTheDocument();
  });
});
