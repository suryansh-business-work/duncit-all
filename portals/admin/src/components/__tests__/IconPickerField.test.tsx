import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import IconPickerField, { isImageIconValue, renderIconByName } from '../IconPickerField';

/** Owns the value the way CategoryFormDialog does, and records every write. */
function Harness({
  initial,
  onChange,
  helperText,
}: Readonly<{ initial: string; onChange: (next: string) => void; helperText?: string }>) {
  const [value, setValue] = useState(initial);
  return (
    <IconPickerField
      value={value}
      helperText={helperText}
      onChange={(next) => {
        onChange(next);
        setValue(next);
      }}
    />
  );
}

describe('IconPickerField — labels and hints', () => {
  it('falls back to the shipped label and hint when the caller passes neither', () => {
    render(<IconPickerField value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Icon')).toBeInTheDocument();
    expect(screen.getByText('Pick a Material icon, or paste an emoji.')).toBeInTheDocument();
  });

  it('uses the caller hint while the value is not a Material icon', () => {
    render(<IconPickerField value="🎉" onChange={vi.fn()} label="Category icon" helperText="Emoji or icon" />);
    expect(screen.getByLabelText('Category icon')).toBeInTheDocument();
    expect(screen.getByText('Emoji or icon')).toBeInTheDocument();
  });

  it('names the Material icon and previews it once the value resolves', () => {
    render(<IconPickerField value="Pets" onChange={vi.fn()} helperText="Emoji or icon" />);
    expect(screen.getByText('Material icon: Pets')).toBeInTheDocument();
    expect(screen.getByTestId('PetsIcon')).toBeInTheDocument();
  });

  it('shows a pasted emoji as-is in front of the input', () => {
    const { container } = render(<IconPickerField value="🎉" onChange={vi.fn()} />);
    expect(container.querySelector('.MuiInputBase-root')).toHaveTextContent('🎉');
  });
});

describe('IconPickerField — editing', () => {
  it('writes every keystroke through, so a pasted emoji is kept', () => {
    const onChange = vi.fn();
    render(<Harness initial="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Sp' } });
    expect(onChange).toHaveBeenLastCalledWith('Sp');
  });

  it('lists matching icons with their preview and stores the one picked', () => {
    const onChange = vi.fn();
    render(<Harness initial="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Sp' } });

    const option = screen.getByRole('option', { name: 'Spa' });
    expect(within(option).getByTestId('SpaIcon')).toBeInTheDocument();
    fireEvent.click(option);

    expect(onChange).toHaveBeenLastCalledWith('Spa');
    expect(screen.getByText('Material icon: Spa')).toBeInTheDocument();
  });

  it('writes an empty string when the value is cleared', () => {
    const onChange = vi.fn();
    render(<Harness initial="Pets" onChange={onChange} />);
    // The clear indicator is CSS-hidden until the field is hovered or focused.
    fireEvent.click(screen.getByRole('button', { name: 'Clear', hidden: true }));
    expect(onChange).toHaveBeenLastCalledWith('');
  });
});

describe('isImageIconValue / renderIconByName', () => {
  it('recognises uploaded and inline images, not icon names', () => {
    expect(isImageIconValue('https://cdn.duncit.com/icons/pets.png')).toBe(true);
    expect(isImageIconValue('data:image/png;base64,AAAA')).toBe(true);
    expect(isImageIconValue('/icons/pets.svg')).toBe(true);
    expect(isImageIconValue('Pets')).toBe(false);
    expect(isImageIconValue(null)).toBe(false);
  });

  it('renders a known icon name and nothing for an unknown or empty one', () => {
    render(<>{renderIconByName('Pets', 'large')}</>);
    expect(screen.getByTestId('PetsIcon')).toBeInTheDocument();
    expect(renderIconByName('NotAnIcon')).toBeNull();
    expect(renderIconByName('')).toBeNull();
  });
});
