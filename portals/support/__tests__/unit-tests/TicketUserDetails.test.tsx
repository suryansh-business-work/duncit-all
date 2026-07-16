import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TicketUserDetails from '../../src/pages/tickets/TicketDetailPage/TicketUserDetails';
import type { Ticket } from '../../src/graphql/tickets';

const user = (over: Partial<Ticket['user']> = {}): Ticket['user'] => ({
  id: 'u1',
  name: 'Riya',
  email: 'riya@example.com',
  phone: '+919800000000',
  avatar_url: null,
  city: 'Mumbai',
  state: 'MH',
  country: 'India',
  joined_at: '2026-01-01T00:00:00.000Z',
  is_email_verified: true,
  is_phone_verified: false,
  ...over,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TicketUserDetails', () => {
  it('renders full account details with a verified email chip and a joined date', () => {
    render(<TicketUserDetails user={user()} />);
    expect(screen.getByText('Riya')).toBeInTheDocument();
    expect(screen.getByText('riya@example.com')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Mumbai, MH, India')).toBeInTheDocument();
    expect(screen.getByText(/Joined/)).toBeInTheDocument();
    expect(screen.getByText('User ID u1')).toBeInTheDocument();
  });

  it('falls back to the admin prod URL when the origin is not a support subdomain', () => {
    vi.stubGlobal('location', { origin: 'http://localhost:3000' });
    render(<TicketUserDetails user={user()} />);
    const link = screen.getByRole('link', { name: /view in admin/i });
    expect(link).toHaveAttribute('href', 'https://admin.duncit.com/users/u1');
  });

  it('derives the admin URL from a support.* origin', () => {
    vi.stubGlobal('location', { origin: 'https://support.duncit.com' });
    render(<TicketUserDetails user={user()} />);
    const link = screen.getByRole('link', { name: /view in admin/i });
    expect(link).toHaveAttribute('href', 'https://admin.duncit.com/users/u1');
  });

  it('shows empty placeholders for missing fields and an unknown join date', () => {
    render(
      <TicketUserDetails
        user={user({
          email: null,
          phone: null,
          city: null,
          state: null,
          country: null,
          joined_at: null,
          is_email_verified: false,
        })}
      />,
    );
    expect(screen.getByText('No email on file')).toBeInTheDocument();
    expect(screen.getByText('No phone on file')).toBeInTheDocument();
    expect(screen.getByText('No location set')).toBeInTheDocument();
    expect(screen.getByText('Join date unknown')).toBeInTheDocument();
    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
  });

  it('treats an unparseable joined_at as an unknown join date', () => {
    render(<TicketUserDetails user={user({ joined_at: 'not-a-date' })} />);
    expect(screen.getByText('Join date unknown')).toBeInTheDocument();
  });
});
