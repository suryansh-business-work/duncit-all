import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import EditorToolbar from '../../src/pages/cms/editor/EditorToolbar';
import { renderWithProviders } from '../testkit';

const renderToolbar = (over: Partial<Parameters<typeof EditorToolbar>[0]> = {}) => {
  const props = { title: 'About', dirty: false, busy: null, disabled: false, onBack: vi.fn(), onSave: vi.fn(), onPublish: vi.fn(), onCopyLink: vi.fn(), ...over };
  renderWithProviders(<EditorToolbar {...props} />);
  return props;
};

describe('EditorToolbar — copy preview link', () => {
  it('copies the draft preview link without saving or publishing', () => {
    const { onCopyLink, onSave, onPublish } = renderToolbar();
    fireEvent.click(screen.getByTestId('cms-editor-copy-link'));
    expect(screen.getByTestId('cms-editor-copy-link')).toHaveTextContent('Copy preview link');
    expect(onCopyLink).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
    expect(onPublish).not.toHaveBeenCalled();
  });

  it('stays available while the editor is still loading or saving', () => {
    renderToolbar({ disabled: true, busy: 'save', dirty: true });
    expect(screen.getByTestId('cms-editor-copy-link')).toBeEnabled();
    expect(screen.getByTestId('cms-editor-publish')).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes');
  });
});
