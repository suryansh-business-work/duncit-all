import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import AccountSummary from './AccountSummary';

describe('AccountSummary', () => {
  it('renders full name, extension phone and a numeric-timestamp join date', () => {
    render(
      <AccountSummary
        user={{ full_name: 'Asha Rao', email: 'a@b.com', phone_number: '999', phone_extension: '+91', created_at: String(Date.UTC(2024, 0, 2)) }}
      />,
    );
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('+91 999')).toBeInTheDocument();
  });

  it('builds the name from first/last and formats an ISO date with no phone', () => {
    render(<AccountSummary user={{ first_name: 'Bo', last_name: 'Lee', created_at: '2020-01-01' }} />);
    expect(screen.getByText('Bo Lee')).toBeInTheDocument();
  });

  it('handles a phone without extension and an unparseable date', () => {
    render(<AccountSummary user={{ phone_number: '555', created_at: 'not-a-date' }} />);
    expect(screen.getByText('555')).toBeInTheDocument();
  });

  it('falls back to dashes when the user is missing', () => {
    render(<AccountSummary user={null} />);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });
});
