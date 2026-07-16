import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AccountSummaryCard } from '../src/dashboard/AccountSummaryCard';

describe('AccountSummaryCard', () => {
  it('renders full details from the user', () => {
    render(
      <AccountSummaryCard
        user={{
          full_name: 'Ada Lovelace',
          email: 'ada@x.test',
          phone_number: '12345',
          phone_extension: '+91',
          created_at: '1600000000000',
        }}
      />,
    );
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('ada@x.test')).toBeInTheDocument();
    expect(screen.getByText('+91 12345')).toBeInTheDocument();
    // '1600000000000' ms → 2020-09-13
    expect(screen.getByText(/Sep .*2020/)).toBeInTheDocument();
  });

  it('falls back to em-dashes for a null user', () => {
    render(<AccountSummaryCard user={null} />);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);
  });

  it('joins first + last name and drops the missing extension', () => {
    render(<AccountSummaryCard user={{ first_name: 'Grace', last_name: 'Hopper', phone_number: '999' }} />);
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('999')).toBeInTheDocument();
  });

  it('parses an ISO created_at string', () => {
    render(<AccountSummaryCard user={{ created_at: '2021-01-15T00:00:00Z' }} />);
    expect(screen.getByText(/Jan .*2021/)).toBeInTheDocument();
  });

  it('shows an em-dash for an unparseable created_at', () => {
    render(<AccountSummaryCard user={{ created_at: 'not-a-date' }} />);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });
});
