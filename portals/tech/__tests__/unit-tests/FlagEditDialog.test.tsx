import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FlagEditDialog from '../../src/pages/feature-flags-page/FlagEditDialog';
import { blankFlag } from '../../src/pages/feature-flags-page/queries';

describe('FlagEditDialog', () => {
  it('renders the create title and disables Save until key + name are set', () => {
    const setEditing = vi.fn();
    render(
      <FlagEditDialog open editing={blankFlag} setEditing={setEditing} busy={false} opError={null} onClose={vi.fn()} onSave={vi.fn()} />,
    );
    expect(screen.getByText('New Feature Flag')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Key'), { target: { value: 'k' } });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'n' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'd' } });
    expect(setEditing).toHaveBeenCalledTimes(3);
  });

  it('renders the edit title (locked key), the enabled switch, busy state and an error', () => {
    const setEditing = vi.fn();
    const onSave = vi.fn();
    render(
      <FlagEditDialog
        open
        editing={{ id: '7', key: 'existing', name: 'Existing', description: 'x', enabled: true }}
        setEditing={setEditing}
        busy
        opError="Save failed"
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );
    expect(screen.getByText('Edit Flag')).toBeInTheDocument();
    expect(screen.getByLabelText('Key')).toBeDisabled();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByText('Save failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox')); // toggle enabled
    expect(setEditing).toHaveBeenCalled();
  });

  it('keeps Save disabled with a key but no name, and enables it when both are set', () => {
    const { rerender } = render(
      <FlagEditDialog open editing={{ key: 'k', name: '', description: '', enabled: false }} setEditing={vi.fn()} busy={false} opError={null} onClose={vi.fn()} onSave={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    rerender(
      <FlagEditDialog open editing={{ key: 'k', name: 'n', description: '', enabled: false }} setEditing={vi.fn()} busy={false} opError={null} onClose={vi.fn()} onSave={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });
});
