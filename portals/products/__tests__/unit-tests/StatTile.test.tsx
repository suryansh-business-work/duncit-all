import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import StatTile from '../../src/pages/WelcomePage/StatTile';
import { renderWithProviders } from './testkit';

describe('StatTile', () => {
  it('renders the label, value and hint', () => {
    renderWithProviders(<StatTile icon="inventory" label="Products" value={12} hint="in stock" />);
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('in stock')).toBeInTheDocument();
  });

  it('omits the hint when none is supplied', () => {
    renderWithProviders(<StatTile icon="payments" label="Revenue" value="₹0" />);
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('₹0')).toBeInTheDocument();
  });
});
