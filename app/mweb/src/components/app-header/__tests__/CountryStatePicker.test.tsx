import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import CountryStatePicker from '../CountryStatePicker';
import type { CountryNode } from '../../../utils/location-tree';

const states = (names: string[]) => names.map((state) => ({ state, state_code: state, cities: [] }));

const TREE: CountryNode[] = [
  { country: 'India', country_code: 'IN', states: states(['Karnataka', 'Kerala', 'Goa']) },
  {
    country: 'Nepal',
    country_code: '',
    states: states(['Bagmati', 'Gandaki', 'Koshi', 'Lumbini', 'Madhesh', 'Karnali', 'Sudurpashchim']),
  },
];

const picker = (over: Partial<Parameters<typeof CountryStatePicker>[0]> = {}) => {
  const props = { tree: TREE, country: 'India', state: 'Kerala', onCountry: vi.fn(), onState: vi.fn(), ...over };
  render(<CountryStatePicker {...props} />);
  return props;
};

describe('CountryStatePicker', () => {
  it('renders nothing for an empty tree', () => {
    picker({ tree: [] });
    expect(screen.queryByTestId('country-state-picker')).not.toBeInTheDocument();
  });

  it('marks the chosen country and state as pressed and shows the flag only when there is a code', () => {
    picker();
    expect(screen.getByTestId('country-state-picker-country-India')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('country-state-picker-country-Nepal')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('country-state-picker-country-India').querySelector('img')).toHaveAttribute(
      'src',
      'https://flagcdn.com/24x18/in.png'
    );
    expect(screen.getByTestId('country-state-picker-country-Nepal').querySelector('img')).toBeNull();
    expect(screen.getByTestId('country-state-picker-state-Kerala')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('country-state-picker-state-Goa')).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports the picked country and state', () => {
    const props = picker();
    fireEvent.click(screen.getByTestId('country-state-picker-country-Nepal'));
    expect(props.onCountry).toHaveBeenCalledWith('Nepal');
    fireEvent.click(screen.getByTestId('country-state-picker-state-Goa'));
    expect(props.onState).toHaveBeenCalledWith('Goa');
  });

  it('falls back to the first country when the chosen one is unknown, with no search for a short list', () => {
    picker({ country: 'Atlantis' });
    expect(screen.getByTestId('country-state-picker-country-India')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('country-state-picker-state-search')).not.toBeInTheDocument();
  });

  it('searches a long state list and reports when nothing matches', () => {
    picker({ country: 'Nepal', state: '' });
    const input = screen.getByTestId('country-state-picker-state-search-input');
    fireEvent.change(input, { target: { value: '  KAR ' } });
    expect(screen.getByTestId('country-state-picker-state-Karnali')).toBeInTheDocument();
    expect(screen.queryByTestId('country-state-picker-state-Koshi')).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'zzz' } });
    expect(screen.getByTestId('country-state-picker-no-states')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByTestId('country-state-picker-state-Koshi')).toBeInTheDocument();
  });
});
