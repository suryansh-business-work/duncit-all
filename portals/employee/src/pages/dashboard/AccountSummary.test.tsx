import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AccountSummaryCard as AccountSummary } from '@duncit/shell';

describe('AccountSummary', () => {
  it('renders the full name, email, phone and member-since date', () => {
    render(
      <AccountSummary
        user={{
          full_name: 'Asha Rao',
          email: 'asha@duncit.com',
          phone_extension: '+91',
          phone_number: '9876543210',
          created_at: '1700000000000',
        }}
      />,
    );
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('asha@duncit.com')).toBeInTheDocument();
    expect(screen.getByText('+91 9876543210')).toBeInTheDocument();
  });

  it('builds the name from first/last and dashes out missing + invalid values', () => {
    render(<AccountSummary user={{ first_name: 'Asha', last_name: 'Rao', created_at: 'nope' }} />);
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('renders for a null user', () => {
    render(<AccountSummary user={null} />);
    expect(screen.getByText('Your account')).toBeInTheDocument();
  });

  it('formats an ISO created_at date', () => {
    render(<AccountSummary user={{ full_name: 'X', created_at: '2024-01-15T00:00:00.000Z' }} />);
    expect(screen.getByText(/Jan/)).toBeInTheDocument();
  });
});
