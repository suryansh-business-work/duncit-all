import { fireEvent, screen } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';
import { Text } from 'tamagui';

import { LocationSelect } from '@/forms/account-edit/LocationSelect';
import type { AccountEditValues } from '@/forms/account-edit/account-edit.types';
import type { CountryNode } from '@/utils/location-tree';
import { renderWithProviders } from '@/utils/test-utils';

const countries: CountryNode[] = [
  {
    country: 'India',
    country_code: 'in',
    states: [
      {
        state: 'Maharashtra',
        state_code: 'MH',
        cities: [
          { city: 'Pune', location_name: 'Pune' },
          { city: '', location_name: 'Mumbai Central' },
        ] as never,
      },
      {
        state: 'Goa',
        state_code: 'GA',
        cities: [{ city: 'Panaji', location_name: 'Panaji' }] as never,
      },
    ],
  },
  { country: 'Nepal', country_code: 'np', states: [] },
];

function Harness({
  initial,
  unset = false,
}: Readonly<{ initial?: Partial<AccountEditValues>; unset?: boolean }>) {
  const { control, setValue, watch } = useForm<AccountEditValues>({
    defaultValues: (unset
      ? {}
      : { country: '', state: '', city: '', ...initial }) as AccountEditValues,
  });
  const v = watch();
  return (
    <>
      <LocationSelect control={control} setValue={setValue} countries={countries} />
      <Text testID="snapshot">{`${v.country ?? ''}|${v.state ?? ''}|${v.city ?? ''}`}</Text>
    </>
  );
}

const snapshot = () => screen.getByTestId('snapshot').props.children;

describe('LocationSelect', () => {
  it('picks a country and resets state + city', () => {
    renderWithProviders(<Harness initial={{ country: 'India', state: 'Goa', city: 'Panaji' }} />);
    fireEvent.press(screen.getByTestId('location-country-trigger'));
    fireEvent.press(screen.getByTestId('location-country-option-Nepal'));
    expect(snapshot()).toBe('Nepal||');
  });

  it('disables state until a country is picked and city until a state is picked', () => {
    renderWithProviders(<Harness />);
    fireEvent.press(screen.getByTestId('location-state-trigger'));
    expect(screen.queryByTestId('location-state-sheet')).toBeNull();
    fireEvent.press(screen.getByTestId('location-city-trigger'));
    expect(screen.queryByTestId('location-city-sheet')).toBeNull();
  });

  it('cascades country → state → city and dedupes city names', () => {
    renderWithProviders(<Harness />);
    fireEvent.press(screen.getByTestId('location-country-trigger'));
    fireEvent.press(screen.getByTestId('location-country-option-India'));
    expect(snapshot()).toBe('India||');

    fireEvent.press(screen.getByTestId('location-state-trigger'));
    fireEvent.press(screen.getByTestId('location-state-option-Maharashtra'));
    expect(snapshot()).toBe('India|Maharashtra|');

    fireEvent.press(screen.getByTestId('location-city-trigger'));
    // The blank city falls back to the location_name.
    fireEvent.press(screen.getByTestId('location-city-option-Mumbai Central'));
    expect(snapshot()).toBe('India|Maharashtra|Mumbai Central');
  });

  it('resets the city when the state changes', () => {
    renderWithProviders(
      <Harness initial={{ country: 'India', state: 'Maharashtra', city: 'Pune' }} />,
    );
    fireEvent.press(screen.getByTestId('location-state-trigger'));
    fireEvent.press(screen.getByTestId('location-state-option-Goa'));
    expect(snapshot()).toBe('India|Goa|');
  });

  it('keeps a saved value that is missing from the tree selectable (withCurrent)', () => {
    renderWithProviders(<Harness initial={{ country: 'Atlantis' }} />);
    fireEvent.press(screen.getByTestId('location-country-trigger'));
    // The off-tree saved country is still offered as an option.
    expect(screen.getByTestId('location-country-option-Atlantis')).toBeOnTheScreen();
  });

  it('treats unset location fields as empty (country picker starts at the placeholder)', () => {
    renderWithProviders(<Harness unset />);
    fireEvent.press(screen.getByTestId('location-country-trigger'));
    fireEvent.press(screen.getByTestId('location-country-option-India'));
    expect(snapshot()).toBe('India||');
  });
});
