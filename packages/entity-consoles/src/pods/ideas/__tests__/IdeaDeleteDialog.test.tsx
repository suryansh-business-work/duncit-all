import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import IdeaDeleteDialog from '../IdeaDeleteDialog';

const onClose = vi.fn();
const onConfirm = vi.fn();

describe('IdeaDeleteDialog', () => {
  beforeEach(() => {
    onClose.mockReset();
    onConfirm.mockReset();
  });

  it('stays closed when there is no delete target', () => {
    render(<IdeaDeleteDialog target={null} onClose={onClose} onConfirm={onConfirm} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens with the target idea title and wires Cancel/Delete', () => {
    render(
      <IdeaDeleteDialog
        target={{ id: 'idea-1', title: 'Sunday board games' }}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Sunday board games')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
