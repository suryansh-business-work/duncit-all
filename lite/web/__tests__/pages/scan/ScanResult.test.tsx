import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScanResult } from '../../../pages/scan/ScanResult';
import { registrationFixture, renderWithProviders, typed } from '../../test-utils';

describe('ScanResult', () => {
  it('announces an admitted guest politely, by name, with what they hold', () => {
    const registration = registrationFixture({ quantity: 2, ticket: typed('LiteRegistrationTicket', { id: 'tk-1', name: 'VIP', price: 900 }) });
    renderWithProviders(<ScanResult outcome={{ kind: 'ok', registration }} />);

    const verdict = screen.getByRole('status');
    expect(verdict).toHaveAttribute('data-testid', 'scan-ok');
    expect(verdict).toHaveTextContent('Ravi Kumar');
    expect(verdict).toHaveTextContent('VIP × 2 — checked in');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('raises a refused ticket as an alert, with the reason', () => {
    renderWithProviders(<ScanResult outcome={{ kind: 'error', message: 'This ticket was already checked in' }} />);

    const verdict = screen.getByRole('alert');
    expect(verdict).toHaveAttribute('data-testid', 'scan-error');
    expect(verdict).toHaveTextContent('Not checked in');
    expect(verdict).toHaveTextContent('This ticket was already checked in');
  });
});
