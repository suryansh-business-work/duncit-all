import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntegrationLogo } from '../src/IntegrationLogo';

describe('IntegrationLogo', () => {
  it('announces the Razorpay tile by its label and draws the Razorpay mark', () => {
    render(<IntegrationLogo vendor="RAZORPAY" label="Razorpay" />);
    const tile = screen.getByRole('img', { name: 'Razorpay' });
    expect(tile).toHaveAttribute('data-testid', 'integration-logo-razorpay');
    const mark = tile.querySelector('svg path');
    expect(mark).toHaveAttribute('fill', 'currentColor');
    expect(tile.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows the shipping glyph for ShipRocket, hidden from screen readers', () => {
    render(<IntegrationLogo vendor="SHIPROCKET" label="ShipRocket" />);
    const tile = screen.getByRole('img', { name: 'ShipRocket' });
    expect(tile).toHaveAttribute('data-testid', 'integration-logo-shiprocket');
    expect(tile.querySelector('[data-testid="LocalShippingOutlinedIcon"]')).toHaveAttribute('aria-hidden', 'true');
    expect(tile.querySelector('path[fill="currentColor"]')).toBeNull();
  });

  it('sizes the tile and the glyph from size, and merges a caller sx', () => {
    render(<IntegrationLogo vendor="RAZORPAY" label="Razorpay" size={50} sx={{ mr: 2 }} />);
    const tile = screen.getByRole('img', { name: 'Razorpay' });
    expect(tile).toHaveStyle({ width: '50px', height: '50px' });
    expect(tile.querySelector('svg')).toHaveAttribute('width', '30');
  });
});
