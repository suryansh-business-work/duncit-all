import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EditorActionsBar from '../../src/pages/email-templates-page/EditorActionsBar';

describe('EditorActionsBar', () => {
  it('disables Save when not dirty and hides the unsaved-changes hint', () => {
    render(<EditorActionsBar dirty={false} busy={false} onSave={vi.fn()} onSendTest={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.queryByText('Unsaved changes')).toBeNull();
  });

  it('shows "Saving…" while busy', () => {
    render(<EditorActionsBar dirty busy onSave={vi.fn()} onSendTest={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });

  it('enables Save when dirty, shows the hint, and wires every action', () => {
    const onSave = vi.fn();
    const onSendTest = vi.fn();
    const onDelete = vi.fn();
    render(<EditorActionsBar dirty busy={false} onSave={onSave} onSendTest={onSendTest} onDelete={onDelete} />);

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send test' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onSave).toHaveBeenCalled();
    expect(onSendTest).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
  });
});
