import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BackoutInProcessPanel from '../BackoutInProcessPanel';

describe('BackoutInProcessPanel', () => {
  it('renders the confirmed-replacement info alert when canCancel is false', () => {
    render(<BackoutInProcessPanel canCancel={false} busy={false} onKeepSpot={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/replacement has been confirmed/i);
    expect(screen.queryByRole('button', { name: 'Keep My Spot' })).not.toBeInTheDocument();
  });

  it('renders the warning alert, button and caption when canCancel is true', () => {
    render(<BackoutInProcessPanel canCancel busy={false} onKeepSpot={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Backout in process/i);
    expect(screen.getByRole('button', { name: 'Keep My Spot' })).toBeEnabled();
    expect(screen.getByText(/Changed your mind\?/i)).toBeInTheDocument();
  });

  it('fires onKeepSpot when the button is clicked', () => {
    const onKeepSpot = vi.fn();
    render(<BackoutInProcessPanel canCancel busy={false} onKeepSpot={onKeepSpot} />);
    fireEvent.click(screen.getByRole('button', { name: 'Keep My Spot' }));
    expect(onKeepSpot).toHaveBeenCalledTimes(1);
  });

  it('disables the button while busy', () => {
    render(<BackoutInProcessPanel canCancel busy onKeepSpot={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Keep My Spot' })).toBeDisabled();
  });
});
