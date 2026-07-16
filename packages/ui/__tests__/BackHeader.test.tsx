import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { BackButton, BackHeader } from '../src/BackHeader';

const withRouter = (ui: React.ReactElement) => <MemoryRouter>{ui}</MemoryRouter>;

describe('BackButton', () => {
  it('renders a router link when `to` is provided', () => {
    render(withRouter(<BackButton to="/venues">Back to Venues</BackButton>));
    const link = screen.getByRole('link', { name: /back to venues/i });
    expect(link).toHaveAttribute('href', '/venues');
  });

  it('renders a clickable button and fires onClick when `to` is omitted', async () => {
    const onClick = vi.fn();
    render(withRouter(<BackButton onClick={onClick}>Go back</BackButton>));
    await userEvent.click(screen.getByRole('button', { name: /go back/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('BackHeader', () => {
  it('renders the title with the default h5 variant and default Back aria-label', () => {
    render(withRouter(<BackHeader title="Venue Detail" />));
    expect(screen.getByText('Venue Detail')).toHaveClass('MuiTypography-h5');
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('uses a router IconButton when backTo is set', () => {
    render(withRouter(<BackHeader title="X" backTo="/home" backAriaLabel="Return" />));
    const link = screen.getByRole('link', { name: 'Return' });
    expect(link).toHaveAttribute('href', '/home');
  });

  it('calls onBack when the back icon is clicked (no backTo)', async () => {
    const onBack = vi.fn();
    render(withRouter(<BackHeader title="X" onBack={onBack} backSize="medium" />));
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders a string eyebrow as an overline with the default 900 weight', () => {
    render(withRouter(<BackHeader title="Detail" eyebrow="VENUE" />));
    const eyebrow = screen.getByText('VENUE');
    expect(eyebrow).toHaveClass('MuiTypography-overline');
    expect(eyebrow).toHaveStyle({ fontWeight: '900' });
  });

  it('renders a numeric eyebrow with a custom weight', () => {
    render(withRouter(<BackHeader title="Detail" eyebrow={42} eyebrowWeight={500} />));
    expect(screen.getByText('42')).toHaveStyle({ fontWeight: '500' });
  });

  it('renders a node eyebrow raw (not wrapped in an overline)', () => {
    render(
      withRouter(
        <BackHeader title="Detail" eyebrow={<span data-testid="chip">LIVE</span>} />,
      ),
    );
    const node = screen.getByTestId('chip');
    expect(node).toBeInTheDocument();
    expect(node).not.toHaveClass('MuiTypography-overline');
  });

  it('omits the eyebrow block entirely when eyebrow is null', () => {
    render(withRouter(<BackHeader title="Detail" />));
    expect(screen.queryByText('VENUE')).not.toBeInTheDocument();
  });

  it('renders the right-aligned actions slot when provided', () => {
    render(
      withRouter(<BackHeader title="Detail" actions={<button type="button">Edit</button>} />),
    );
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });
});
