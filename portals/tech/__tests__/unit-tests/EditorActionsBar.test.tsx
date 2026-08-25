import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EditorActionsBar from '../../src/pages/email-templates-page/EditorActionsBar';

type Props = React.ComponentProps<typeof EditorActionsBar>;

const renderBar = (over: Partial<Props> = {}) => {
  const props: Props = {
    dirty: false,
    busy: false,
    autoSave: true,
    onAutoSaveChange: vi.fn(),
    savedAt: null,
    onSave: vi.fn(),
    onSendTest: vi.fn(),
    onDelete: vi.fn(),
    ...over,
  };
  render(<EditorActionsBar {...props} />);
  return props;
};

describe('EditorActionsBar', () => {
  it('disables Save when not dirty and says nothing before the first save', () => {
    renderBar();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.queryByText('Unsaved changes')).toBeNull();
    expect(screen.queryByText('All changes saved')).toBeNull();
  });

  it('shows "Saving…" while busy', () => {
    renderBar({ dirty: true, busy: true });
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });

  it('enables Save when dirty, shows the hint, and wires every action', () => {
    const props = renderBar({ dirty: true });

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send test' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(props.onSave).toHaveBeenCalled();
    expect(props.onSendTest).toHaveBeenCalled();
    expect(props.onDelete).toHaveBeenCalled();
  });

  /**
   * The line auto-save exists for: nobody pressed Save, so the only way to
   * know the edit is written is for the bar to say so.
   */
  it('reports a clean draft that has already been saved', () => {
    renderBar({ dirty: false, savedAt: 1_700_000_000_000 });
    expect(screen.getByText('All changes saved')).toBeInTheDocument();
  });

  it('still says unsaved while a save is in flight, rather than claiming saved', () => {
    renderBar({ dirty: true, busy: true, savedAt: 1_700_000_000_000 });
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    expect(screen.queryByText('All changes saved')).toBeNull();
  });

  it('switches auto-save off, and is named by its label rather than its tooltip', () => {
    const props = renderBar({ autoSave: true });
    const toggle = screen.getByRole('switch', { name: 'Auto-save' });
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    expect(props.onAutoSaveChange).toHaveBeenCalledWith(false);
  });

  it('switches auto-save back on', () => {
    const props = renderBar({ autoSave: false });
    fireEvent.click(screen.getByRole('switch', { name: 'Auto-save' }));
    expect(props.onAutoSaveChange).toHaveBeenCalledWith(true);
  });
});
