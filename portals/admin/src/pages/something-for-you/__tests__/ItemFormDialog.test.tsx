import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ItemFormDialog from '../ItemFormDialog';
import { emptyItem, type SomethingForYouForm } from '../queries';

/** The real field opens the shared media dialog (its own queries); the stub keeps its value contract. */
vi.mock('../../../components/MediaPickerField', () => ({
  default: ({ label, value, onChange }: Readonly<{ label: string; value: string; onChange: (url: string) => void }>) => (
    <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

/** Holds the form like the page does, and records every value handed back. */
function Harness({
  initial,
  onChange,
  onSave,
  busy = false,
}: Readonly<{
  initial: SomethingForYouForm;
  onChange: (next: SomethingForYouForm) => void;
  onSave: () => void;
  busy?: boolean;
}>) {
  const [form, setForm] = useState(initial);
  return (
    <ItemFormDialog
      open
      form={form}
      setForm={(next) => {
        onChange(next);
        setForm(next);
      }}
      busy={busy}
      onClose={vi.fn()}
      onSave={onSave}
    />
  );
}

const renderDialog = (initial: Partial<SomethingForYouForm> = {}, busy = false) => {
  const onChange = vi.fn();
  const onSave = vi.fn();
  render(
    <Harness
      initial={{ ...emptyItem, ...initial }}
      onChange={onChange}
      onSave={onSave}
      busy={busy}
    />,
  );
  return { onChange, onSave };
};

const sortInput = () => screen.getByLabelText('Sort order');

describe('ItemFormDialog', () => {
  it('stores the sort order as a number', () => {
    const { onChange } = renderDialog({ title: 'Refer a friend' });

    fireEvent.change(sortInput(), { target: { value: '3' } });

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ sort_order: 3 }));
    expect(sortInput()).toHaveValue(3);
  });

  it('falls a cleared sort order back to 0 rather than storing NaN', () => {
    const { onChange } = renderDialog({ title: 'Refer a friend', sort_order: 4 });

    fireEvent.change(sortInput(), { target: { value: '' } });

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ sort_order: 0 }));
    expect(sortInput()).toHaveValue(0);
  });

  it('writes the image, bottom text and Home visibility into the form', () => {
    const { onChange } = renderDialog({ title: 'Refer a friend' });

    fireEvent.change(screen.getByLabelText('Card image'), {
      target: { value: 'https://cdn.duncit.com/sfy/refer.png' },
    });
    fireEvent.change(screen.getByLabelText('Bottom text'), { target: { value: 'Refer and Earn' } });
    fireEvent.click(screen.getByLabelText('Show on Home'));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        image_url: 'https://cdn.duncit.com/sfy/refer.png',
        bottom_text: 'Refer and Earn',
        is_active: false,
      }),
    );
  });

  it('flags a title over the limit and blocks Save', () => {
    renderDialog({ title: 'x'.repeat(31) });

    expect(screen.getByText('31/30 — shown over the image, up to three lines')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Title/ })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('locks both actions while a save is in flight', () => {
    renderDialog({ title: 'Refer a friend' }, true);

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('titles a saved card "Edit card" and a new one "New card"', () => {
    renderDialog({ id: 'sfy-1', title: 'Refer a friend' });

    expect(screen.getByRole('heading', { name: 'Edit card' })).toBeInTheDocument();
  });

  it('blocks Save until the card has a title, then saves', () => {
    const { onSave } = renderDialog();

    expect(screen.getByRole('heading', { name: 'New card' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    fireEvent.change(screen.getByRole('textbox', { name: /Title/ }), {
      target: { value: 'Refer a friend' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
