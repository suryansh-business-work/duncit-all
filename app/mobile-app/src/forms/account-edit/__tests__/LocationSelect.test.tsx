import { fireEvent, screen } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';
import { Text } from 'tamagui';

import { LocationSelect } from '@/forms/account-edit/LocationSelect';
import type { AccountEditValues } from '@/forms/account-edit/account-edit.types';
import { renderWithProviders } from '@/utils/test-utils';

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
      <LocationSelect control={control} setValue={setValue} />
      <Text testID="snapshot">{`${v.country ?? ''}|${v.state ?? ''}|${v.city ?? ''}`}</Text>
    </>
  );
}

const snapshot = () => screen.getByTestId('snapshot').props.children;

/** Filter the open picker, then tap the option (the dataset has ~250 items). */
const pick = (field: 'country' | 'state', query: string, value: string) => {
  fireEvent.press(screen.getByTestId(`location-${field}-trigger`));
  fireEvent.changeText(screen.getByTestId(`location-${field}-search`), query);
  fireEvent.press(screen.getByTestId(`location-${field}-option-${value}`));
};

describe('LocationSelect', () => {
  it('picks a country from the dataset and resets state + city', () => {
    renderWithProviders(<Harness initial={{ country: 'India', state: 'Goa', city: 'Panaji' }} />);
    pick('country', 'United States', 'United States');
    expect(snapshot()).toBe('United States||');
  });

  it('disables the state picker until a country is chosen', () => {
    renderWithProviders(<Harness />);
    fireEvent.press(screen.getByTestId('location-state-trigger'));
    expect(screen.queryByTestId('location-state-sheet')).toBeNull();
  });

  it('cascades country → state (dataset) and takes a free-text city', () => {
    renderWithProviders(<Harness />);
    pick('country', 'India', 'India');
    expect(snapshot()).toBe('India||');

    pick('state', 'Maharashtra', 'Maharashtra');
    expect(snapshot()).toBe('India|Maharashtra|');

    // City is a custom free-text value — not a fixed picklist.
    fireEvent.changeText(screen.getByTestId('location-city'), 'Pune');
    expect(snapshot()).toBe('India|Maharashtra|Pune');
  });

  it('keeps a saved country that is missing from the dataset selectable', () => {
    renderWithProviders(<Harness initial={{ country: 'Atlantis' }} />);
    fireEvent.press(screen.getByTestId('location-country-trigger'));
    // The off-dataset saved country is still offered (withCurrent).
    expect(screen.getByTestId('location-country-option-Atlantis')).toBeOnTheScreen();
  });

  it('keeps a saved state that is missing from the country dataset selectable', () => {
    renderWithProviders(<Harness initial={{ country: 'Atlantis', state: 'Poseidon' }} />);
    fireEvent.press(screen.getByTestId('location-state-trigger'));
    expect(screen.getByTestId('location-state-option-Poseidon')).toBeOnTheScreen();
  });

  it('treats unset location fields as empty (country picker starts at the placeholder)', () => {
    renderWithProviders(<Harness unset />);
    pick('country', 'India', 'India');
    expect(snapshot()).toBe('India||');
  });
});
