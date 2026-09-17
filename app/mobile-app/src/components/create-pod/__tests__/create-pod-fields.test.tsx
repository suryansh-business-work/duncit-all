import { useState } from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { ChipSelectField } from '@/components/create-pod/ChipSelectField';
import { ChipArrayField } from '@/components/create-pod/ChipArrayField';
import { ClubSearchField } from '@/components/create-pod/ClubSearchField';
import { PlaceChargesField } from '@/components/create-pod/PlaceChargesField';
import type { PodPlaceCharge } from '@/components/create-pod/create-pod.types';
import { renderWithProviders } from '@/utils/test-utils';

describe('ChipSelectField', () => {
  it('selects options and shows error + empty hint states', () => {
    const onChange = jest.fn();
    const { rerender } = renderWithProviders(
      <ChipSelectField
        label="Club"
        options={[{ value: 'a', label: 'Alpha' }]}
        value=""
        onChange={onChange}
        error="Select a club"
        testID="chips"
      />,
    );
    fireEvent.press(screen.getByTestId('chips-a'));
    expect(onChange).toHaveBeenCalledWith('a');
    expect(screen.getByTestId('chips-error')).toBeOnTheScreen();

    rerender(
      <ChipSelectField
        label="Venue"
        options={[]}
        value=""
        onChange={onChange}
        emptyHint="None."
        testID="chips"
      />,
    );
    expect(screen.getByText('None.')).toBeOnTheScreen();

    rerender(
      <ChipSelectField label="Venue" options={[]} value="" onChange={onChange} testID="chips" />,
    );
    expect(screen.getByText('No options available.')).toBeOnTheScreen();
  });

  it('reads a club chip as "Name | (pin) place", picked or not', () => {
    renderWithProviders(
      <ChipSelectField
        label="Club"
        options={[
          { value: 'club-wea', label: 'Who Even Are We?', place: 'Gomti Nagar, Lucknow' },
          { value: 'club-lrc', label: 'Lucknow Run Club', place: 'Lucknow' },
          { value: 'club-bare', label: 'Book Nook' },
        ]}
        value="club-wea"
        onChange={jest.fn()}
        testID="chips"
      />,
    );

    expect(screen.getByTestId('chips-club-wea-place')).toHaveTextContent('Gomti Nagar, Lucknow');
    expect(screen.getByTestId('chips-club-wea')).toHaveProp(
      'aria-label',
      'Who Even Are We?, Gomti Nagar, Lucknow',
    );
    expect(screen.getByTestId('chips-club-lrc-place')).toHaveTextContent('Lucknow');
    expect(screen.getByTestId('chips-club-lrc')).toHaveProp(
      'aria-label',
      'Lucknow Run Club, Lucknow',
    );
    // A chip with no place is named by its label alone and draws no divider.
    expect(screen.queryByTestId('chips-club-bare-place')).toBeNull();
    expect(screen.getByTestId('chips-club-bare')).toHaveProp('aria-label', 'Book Nook');
  });
});

function ChipArrayHarness() {
  const [value, setValue] = useState<string[]>([]);
  return <ChipArrayField label="Offers" value={value} onChange={setValue} testID="offers" />;
}

describe('ChipArrayField', () => {
  it('adds, dedupes, removes and surfaces errors', () => {
    renderWithProviders(<ChipArrayHarness />);
    const input = screen.getByTestId('offers-input');
    fireEvent.changeText(input, 'Snacks');
    fireEvent(input, 'submitEditing');
    expect(screen.getByTestId('offers-chip-Snacks')).toBeOnTheScreen();

    // Duplicate is ignored; blank blur is a no-op.
    fireEvent.changeText(input, 'Snacks');
    fireEvent(input, 'submitEditing');
    fireEvent(input, 'blur');
    expect(screen.getAllByTestId('offers-chip-Snacks')).toHaveLength(1);

    fireEvent.press(screen.getByTestId('offers-chip-Snacks'));
    expect(screen.queryByTestId('offers-chip-Snacks')).toBeNull();
  });

  it('respects the max and renders the error', () => {
    const onChange = jest.fn();
    renderWithProviders(
      <ChipArrayField
        label="Perks"
        value={['a', 'b']}
        onChange={onChange}
        max={2}
        error="Too many"
        testID="perks"
      />,
    );
    fireEvent.changeText(screen.getByTestId('perks-input'), 'c');
    fireEvent(screen.getByTestId('perks-input'), 'submitEditing');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('perks-error')).toBeOnTheScreen();
  });
});

const clubs = [
  { id: 'c1', club_name: 'Runners', location_id: 'l1', super_category_id: null },
  { id: 'c2', club_name: 'Readers', location_id: 'l1', super_category_id: null },
];

describe('ClubSearchField', () => {
  it('filters clubs by the search box and selects one', () => {
    const onChange = jest.fn();
    renderWithProviders(
      <ClubSearchField
        clubs={clubs}
        locations={[]}
        value=""
        onChange={onChange}
        error="Pick one"
      />,
    );
    expect(screen.getByTestId('create-pod-club-c2')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByTestId('create-pod-club-search'), 'run');
    expect(screen.queryByTestId('create-pod-club-c2')).toBeNull();
    fireEvent.press(screen.getByTestId('create-pod-club-c1'));
    expect(onChange).toHaveBeenCalledWith('c1');
    expect(screen.getByTestId('create-pod-club-error')).toBeOnTheScreen();
  });

  it('shows where each club operates and finds clubs by that place', () => {
    const lucknowClubs = [
      {
        id: 'club-wea',
        club_name: 'Who Even Are We?',
        location_id: 'loc-lucknow',
        locality: 'Gomti Nagar',
      },
      { id: 'club-lrc', club_name: 'Lucknow Run Club', location_id: 'loc-lucknow', locality: '' },
      // A club whose city is not among the loaded ones still shows its area.
      { id: 'club-baner', club_name: 'Baner Boarders', location_id: 'loc-pune', locality: 'Baner' },
    ];
    const cities = [{ id: 'loc-lucknow', location_name: 'Lucknow', city: 'Lucknow' }];
    renderWithProviders(
      <ClubSearchField clubs={lucknowClubs} locations={cities} value="" onChange={jest.fn()} />,
    );

    expect(screen.getByTestId('create-pod-club-club-wea-place')).toHaveTextContent(
      'Gomti Nagar, Lucknow',
    );
    expect(screen.getByTestId('create-pod-club-club-lrc-place')).toHaveTextContent('Lucknow');
    expect(screen.getByTestId('create-pod-club-club-baner-place')).toHaveTextContent('Baner');

    fireEvent.changeText(screen.getByTestId('create-pod-club-search'), '  GOMTI ');
    expect(screen.getByTestId('create-pod-club-club-wea')).toBeOnTheScreen();
    expect(screen.queryByTestId('create-pod-club-club-lrc')).toBeNull();
    expect(screen.queryByTestId('create-pod-club-club-baner')).toBeNull();

    fireEvent.changeText(screen.getByTestId('create-pod-club-search'), 'Hazratganj');
    expect(screen.getByTestId('create-pod-club-empty')).toHaveTextContent(
      'No clubs match your search.',
    );
  });
});

function PlaceChargesHarness() {
  const [value, setValue] = useState<PodPlaceCharge[]>([]);
  return <PlaceChargesField value={value} onChange={setValue} />;
}

describe('PlaceChargesField', () => {
  it('adds, edits every field, coerces amount and removes rows', () => {
    renderWithProviders(<PlaceChargesHarness />);
    fireEvent.press(screen.getByTestId('charge-add'));
    fireEvent.press(screen.getByTestId('charge-add'));
    // Editing row 0 leaves row 1 untouched (the map's non-matching branch).
    fireEvent.changeText(screen.getByTestId('charge-label-0'), 'Entry');
    fireEvent.changeText(screen.getByTestId('charge-amount-0'), '50');
    fireEvent.changeText(screen.getByTestId('charge-amount-0'), 'abc');
    fireEvent.changeText(screen.getByTestId('charge-note-0'), 'cash');
    expect(screen.getByTestId('charge-amount-0').props.value).toBe('0');
    fireEvent.press(screen.getByTestId('charge-remove-1'));
    fireEvent.press(screen.getByTestId('charge-remove-0'));
    expect(screen.queryByTestId('charge-label-0')).toBeNull();
  });
});

// The ProductRequestsField suite that lived here is gone with the component:
// Step 4's products block is now the full-page picker (product-picker/), whose
// derivations are covered in @duncit/utils.
