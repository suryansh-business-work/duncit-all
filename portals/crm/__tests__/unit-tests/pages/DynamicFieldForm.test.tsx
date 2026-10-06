import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DynamicFieldForm from '@/pages/ManageDynamicFieldsPage/DynamicFieldForm';
import { blankDraft, type DraftState } from '@/pages/ManageDynamicFieldsPage/dynamicFieldDraft';

const selectDraft: DraftState = {
  ...blankDraft,
  id: 'f1',
  name: 'budget_band',
  label: 'Budget Band',
  kind: 'select',
  options: [{ value: 'low', label: 'Low' }],
};

const renderForm = (draft: DraftState, busy = false) => {
  const props = { onChange: vi.fn(), onCancel: vi.fn(), onSave: vi.fn() };
  render(<DynamicFieldForm draft={draft} busy={busy} {...props} />);
  return props;
};

describe('DynamicFieldForm', () => {
  it('titles a new field and hides the select-only controls', () => {
    renderForm(blankDraft);
    expect(screen.getByRole('heading', { name: 'New field' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'selection mode' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Add option/i })).toBeNull();
  });

  it('titles an existing field by its label', () => {
    renderForm(selectDraft);
    expect(screen.getByRole('heading', { name: 'Edit field — Budget Band' })).toBeInTheDocument();
  });

  it('falls back to the storage key in the title when the label is blank', () => {
    renderForm({ ...selectDraft, label: '' });
    expect(screen.getByRole('heading', { name: 'Edit field — budget_band' })).toBeInTheDocument();
  });

  it('switches a select field to multiple choice', () => {
    const { onChange } = renderForm(selectDraft);
    expect(screen.getByRole('button', { name: 'single select' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'multi select' }));

    expect(onChange).toHaveBeenCalledWith({ ...selectDraft, multi: true });
  });

  it('switches a multiple-choice field back to single', () => {
    const { onChange } = renderForm({ ...selectDraft, multi: true });
    expect(screen.getByRole('button', { name: 'multi select' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'single select' }));

    expect(onChange).toHaveBeenCalledWith({ ...selectDraft, multi: false });
  });

  it('keeps the mode when the already-selected toggle is clicked again', () => {
    const { onChange } = renderForm(selectDraft);
    fireEvent.click(screen.getByRole('button', { name: 'single select' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('edits the options of a select field through the options editor', () => {
    const { onChange } = renderForm(selectDraft);
    fireEvent.click(screen.getByRole('button', { name: /Add option/i }));
    expect(onChange).toHaveBeenCalledWith({
      ...selectDraft,
      options: [
        { value: 'low', label: 'Low' },
        { value: '', label: '' },
      ],
    });
  });

  it('reports each edited input as a patch over the current draft', () => {
    const { onChange } = renderForm(blankDraft);
    const lastPatch = () => {
      const next = onChange.mock.calls.at(-1)?.[0];
      return Object.fromEntries(Object.entries(next).filter(([k, v]) => v !== (blankDraft as any)[k]));
    };

    fireEvent.change(screen.getByLabelText('dynamic-field-label'), { target: { value: 'Region' } });
    expect(lastPatch()).toEqual({ label: 'Region' });
    fireEvent.change(screen.getByLabelText('dynamic-field-placeholder'), { target: { value: 'e.g. West' } });
    expect(lastPatch()).toEqual({ placeholder: 'e.g. West' });
    fireEvent.change(screen.getByLabelText('dynamic-field-default'), { target: { value: 'West' } });
    expect(lastPatch()).toEqual({ default_value: 'West' });
    fireEvent.change(screen.getByLabelText('dynamic-field-hint'), { target: { value: 'Zone' } });
    expect(lastPatch()).toEqual({ hint: 'Zone' });
    fireEvent.click(screen.getByLabelText('Applies to Venue leads'));
    expect(lastPatch()).toEqual({ applies_to_venue: false });
    fireEvent.click(screen.getByLabelText('Applies to Host leads'));
    expect(lastPatch()).toEqual({ applies_to_host: false });
    fireEvent.click(screen.getByLabelText('Applies to Ecomm leads'));
    expect(lastPatch()).toEqual({ applies_to_ecomm: true });
    fireEvent.click(screen.getByLabelText('Required'));
    expect(lastPatch()).toEqual({ required: true });
    fireEvent.click(screen.getByLabelText('Active'));
    expect(lastPatch()).toEqual({ is_active: false });
  });

  it('changes the field type from the type menu', async () => {
    const { onChange } = renderForm(blankDraft);
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Type' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Select' }));
    expect(onChange).toHaveBeenCalledWith({ ...blankDraft, kind: 'select' });
  });

  it('cancels and saves through the footer actions', () => {
    const { onCancel, onSave } = renderForm(selectDraft);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Save field/ }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('shows the saving state and blocks both actions while busy', () => {
    renderForm(selectDraft, true);
    expect(screen.getByRole('button', { name: /Saving…/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Save field/ })).toBeNull();
  });
});
