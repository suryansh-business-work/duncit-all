import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import IdeaActionsBar from '../IdeaActionsBar';

const onSetStatus = vi.fn();
const onClose = vi.fn();

describe('IdeaActionsBar', () => {
  beforeEach(() => {
    onSetStatus.mockReset();
    onClose.mockReset();
  });

  it('on a PENDING idea, hides Reset but offers Reject, Approve and Close', () => {
    render(<IdeaActionsBar status="PENDING" onSetStatus={onSetStatus} onClose={onClose} />);
    expect(screen.queryByRole('button', { name: 'Reset to Pending' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onSetStatus).toHaveBeenNthCalledWith(1, 'REJECTED');
    expect(onSetStatus).toHaveBeenNthCalledWith(2, 'APPROVED');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('on an APPROVED idea, hides Approve but offers Reset and Reject', () => {
    render(<IdeaActionsBar status="APPROVED" onSetStatus={onSetStatus} onClose={onClose} />);
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset to Pending' }));
    expect(onSetStatus).toHaveBeenCalledWith('PENDING');
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
  });

  it('on a REJECTED idea, hides Reject but offers Reset and Approve', () => {
    render(<IdeaActionsBar status="REJECTED" onSetStatus={onSetStatus} onClose={onClose} />);
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset to Pending' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
  });
});
