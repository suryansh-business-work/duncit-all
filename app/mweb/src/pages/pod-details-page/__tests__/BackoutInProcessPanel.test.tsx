import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BackoutInProcessPanel from '../BackoutInProcessPanel';

describe('BackoutInProcessPanel', () => {
  it('renders the locked notice and no Keep My Spot button when canCancel is false', () => {
    render(<BackoutInProcessPanel canCancel={false} busy={false} onKeepSpot={vi.fn()} />);
    expect(screen.getByTestId('pod-backout-locked')).toHaveTextContent(/replacement has been confirmed/i);
    expect(screen.queryByTestId('pod-backout-in-process-panel')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Keep My Spot' })).not.toBeInTheDocument();
  });

  it('renders the in-process state, searching caption and button when canCancel is true', () => {
    render(<BackoutInProcessPanel canCancel busy={false} onKeepSpot={vi.fn()} />);
    expect(screen.getByTestId('pod-backout-in-process')).toHaveTextContent('Backout in process');
    expect(screen.getByText('Searching for a replacement')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep My Spot' })).toBeEnabled();
    expect(screen.queryByTestId('pod-backout-locked')).not.toBeInTheDocument();
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
