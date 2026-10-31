import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../src/guide/EmptyState';

describe('EmptyState', () => {
  it('is a region named by its title, with nothing else drawn when nothing else is given', () => {
    render(<EmptyState title="No payouts in this cycle" />);
    const region = screen.getByRole('region', { name: 'No payouts in this cycle' });
    expect(region.tagName).toBe('SECTION');
    expect(region).toHaveAttribute('data-testid', 'empty-state');
    // Static once drawn: not a live region, which would talk over the person.
    expect(region).not.toHaveAttribute('role', 'status');
    expect(screen.getByText('No payouts in this cycle')).toHaveClass('MuiTypography-subtitle1');
    expect(screen.queryByTestId('empty-state-icon')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('draws the glyph on a tile, the body, and both actions in one row', () => {
    render(
      <EmptyState
        icon={<svg data-testid="glyph" />}
        title="No leads yet"
        body="Leads arrive from the website form and from imports."
        action={<button type="button">Import leads</button>}
        secondaryAction={<button type="button">Open the form</button>}
      />,
    );
    const tile = screen.getByTestId('empty-state-icon');
    expect(tile).toContainElement(screen.getByTestId('glyph'));
    expect(tile).toHaveAttribute('aria-hidden', 'true');
    expect(tile).toHaveStyle({ width: '56px', height: '56px' });
    expect(screen.getByText('Leads arrive from the website form and from imports.')).toHaveClass('MuiTypography-body2');
    const buttons = screen.getAllByRole('button').map((button) => button.textContent);
    expect(buttons).toEqual(['Import leads', 'Open the form']);
  });

  it('tightens for a panel when compact, and takes its own test id and sx', () => {
    render(
      <EmptyState
        compact
        icon={<svg data-testid="glyph" />}
        title="Nothing matches"
        secondaryAction={<button type="button">Clear filters</button>}
        data-testid="leads-empty"
        sx={{ mt: 2 }}
      />,
    );
    const region = screen.getByTestId('leads-empty');
    expect(region).toHaveStyle({ marginTop: '16px' });
    expect(screen.getByTestId('leads-empty-icon')).toHaveStyle({ width: '40px', height: '40px' });
    // A secondary action alone still gets the actions row.
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });
});
