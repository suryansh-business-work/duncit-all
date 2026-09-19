import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import PhoneExtensionField from '../PhoneExtensionField';
import { COUNTRIES, findCountryByDial } from '../../utils/countries';

/** Owns the dial code the way ContactFields and CreateUserDialog do. */
function Harness({ initial, onChange }: Readonly<{ initial: string; onChange: (dial: string) => void }>) {
  const [dial, setDial] = useState(initial);
  return (
    <PhoneExtensionField
      value={dial}
      onChange={(next) => {
        onChange(next);
        setDial(next);
      }}
    />
  );
}

describe('PhoneExtensionField', () => {
  it('shows the selected country as flag + dial code under the default "Code" label', () => {
    render(<PhoneExtensionField value="+91" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Code')).toHaveValue('🇮🇳 +91');
  });

  it('leaves the field empty for a dial code no country uses', () => {
    render(<PhoneExtensionField value="+000" onChange={vi.fn()} label="Extension" />);
    expect(screen.getByLabelText('Extension')).toHaveValue('');
  });

  it('marks the current country in the list and writes the dial code of the one picked', () => {
    const onChange = vi.fn();
    render(<Harness initial="+91" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    const india = screen.getByRole('option', { selected: true });
    expect(within(india).getByText('India')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '+971' } });
    const uae = screen.getByRole('option');
    expect(within(uae).getByText('United Arab Emirates')).toBeInTheDocument();
    fireEvent.click(uae);

    expect(onChange).toHaveBeenLastCalledWith('+971');
    expect(screen.getByRole('combobox')).toHaveValue('🇦🇪 +971');
  });

  it('writes an empty dial code when the field is cleared', () => {
    const onChange = vi.fn();
    render(<Harness initial="+91" onChange={onChange} />);
    // The clear indicator is CSS-hidden until the field is hovered or focused.
    fireEvent.click(screen.getByRole('button', { name: 'Clear', hidden: true }));
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('forwards the disabled and error states to the input', () => {
    render(
      <PhoneExtensionField value="+91" onChange={vi.fn()} disabled error helperText="Pick a country code" />,
    );
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByText('Pick a country code')).toBeInTheDocument();
  });
});

describe('countries', () => {
  it('lists India first, then every other country by name', () => {
    expect(COUNTRIES[0]).toMatchObject({ iso: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' });
    const rest = COUNTRIES.slice(1).map((country) => country.name);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b)));
  });

  it('finds a country by its dial code', () => {
    expect(findCountryByDial('+971')?.iso).toBe('AE');
    expect(findCountryByDial('+000')).toBeUndefined();
  });
});
