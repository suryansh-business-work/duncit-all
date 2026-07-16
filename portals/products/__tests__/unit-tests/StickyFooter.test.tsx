import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StickyFooter from '../../src/pages/inventory-page/inventory-product-page/StickyFooter';

const noop = () => undefined;

describe('StickyFooter', () => {
  it('shows the create label and unsaved hint, and disables save & continue when clean', () => {
    render(
      <StickyFooter
        busy={false}
        dirty={false}
        isEdit={false}
        onCancel={noop}
        onSaveAndContinue={noop}
        onSave={noop}
      />,
    );
    expect(screen.getByText('All changes saved')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save product' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Save & continue' })).toBeDisabled();
  });

  it('shows the edit label and unsaved hint when dirty', () => {
    render(
      <StickyFooter
        busy={false}
        dirty
        isEdit
        onCancel={noop}
        onSaveAndContinue={noop}
        onSave={noop}
      />,
    );
    expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('shows the saving label and disables everything while busy', () => {
    render(
      <StickyFooter
        busy
        dirty
        isEdit={false}
        onCancel={noop}
        onSaveAndContinue={noop}
        onSave={noop}
      />,
    );
    expect(screen.getByRole('button', { name: /Saving/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('wires the button callbacks', () => {
    const onCancel = vi.fn();
    const onSaveAndContinue = vi.fn();
    const onSave = vi.fn();
    render(
      <StickyFooter
        busy={false}
        dirty
        isEdit
        onCancel={onCancel}
        onSaveAndContinue={onSaveAndContinue}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSaveAndContinue).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
