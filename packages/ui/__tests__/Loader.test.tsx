import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Loader, LoadingOverlay } from '../src/loader';

describe('Loader', () => {
  it('is a block spinner by default, announced with the shared label', () => {
    const { container } = render(<Loader />);
    const status = screen.getByRole('status', { name: 'Loading…' });
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });

  it('draws the label beside an inline spinner, sized for a text baseline', () => {
    const { container } = render(<Loader variant="inline" showLabel label="Saving pod DUN-POD-4821" />);
    expect(screen.getByRole('status', { name: 'Saving pod DUN-POD-4821' })).toBeInTheDocument();
    expect(screen.getByText('Saving pod DUN-POD-4821')).toBeInTheDocument();
    expect(container.querySelector('.MuiCircularProgress-root')).toHaveStyle({ width: '16px' });
  });

  it('never draws the label on the page variant, even when asked to', () => {
    render(<Loader variant="page" showLabel label="Starting the console" />);
    expect(screen.getByRole('status', { name: 'Starting the console' })).toBeInTheDocument();
    expect(screen.queryByText('Starting the console')).not.toBeInTheDocument();
  });

  it('stacks the overlay vertically and honours an explicit size', () => {
    const { container } = render(<Loader variant="overlay" size={24} showLabel />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(container.querySelector('.MuiCircularProgress-root')).toHaveStyle({ width: '24px' });
    expect(screen.getByRole('status')).toHaveStyle({ flexDirection: 'column' });
  });
});

describe('LoadingOverlay', () => {
  it('keeps the content readable and draws the scrim only while open', () => {
    const { rerender } = render(
      <LoadingOverlay open={false} wrapperSx={{ minHeight: 120 }}>
        <p>12 pods · ₹4,990 collected</p>
      </LoadingOverlay>,
    );
    expect(screen.getByText('12 pods · ₹4,990 collected')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    rerender(
      <LoadingOverlay open label="Refreshing the pod list">
        <p>12 pods · ₹4,990 collected</p>
      </LoadingOverlay>,
    );
    expect(screen.getByText('12 pods · ₹4,990 collected')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Refreshing the pod list' })).toBeInTheDocument();
  });
});
