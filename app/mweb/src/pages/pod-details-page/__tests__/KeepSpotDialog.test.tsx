import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import KeepSpotDialog from '../KeepSpotDialog';

describe('KeepSpotDialog', () => {
  const baseProps = {
    open: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    attemptsLeft: 3,
  };

  it('does not render content when closed', () => {
    render(<KeepSpotDialog {...baseProps} open={false} />);
    expect(screen.queryByText('Change of plans?')).not.toBeInTheDocument();
  });

  it('renders title, attempts-left copy and default action label', () => {
    render(<KeepSpotDialog {...baseProps} attemptsLeft={5} />);
    expect(screen.getByText('Change of plans?')).toBeInTheDocument();
    expect(
      screen.getByText(/you can only do it for up to 5 more/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep My Spot' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeEnabled();
  });

  it('does not show an alert when error is null', () => {
    render(<KeepSpotDialog {...baseProps} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders the server error alert when provided', () => {
    render(<KeepSpotDialog {...baseProps} error="Replacement already confirmed" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Replacement already confirmed');
  });

  it('fires onClose and onConfirm on button clicks', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(<KeepSpotDialog {...baseProps} onClose={onClose} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep My Spot' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables both buttons and shows restoring label while busy', () => {
    render(<KeepSpotDialog {...baseProps} busy />);
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    const confirm = screen.getByRole('button', { name: 'Restoring…' });
    expect(confirm).toBeDisabled();
  });
});
