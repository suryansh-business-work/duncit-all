import { useState } from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { ChipSelectField } from '@/components/create-pod/ChipSelectField';
import { ChipArrayField } from '@/components/create-pod/ChipArrayField';
import { ClubSearchField } from '@/components/create-pod/ClubSearchField';
import { PlaceChargesField } from '@/components/create-pod/PlaceChargesField';
import {
  ProductRequestsField,
  productRequestTotal,
} from '@/components/create-pod/ProductRequestsField';
import type {
  CreatePodProduct,
  PodPlaceCharge,
  PodProductRequest,
} from '@/components/create-pod/create-pod.types';
import { renderWithProviders } from '@/utils/test-utils';

const products: CreatePodProduct[] = [
  { id: 'p1', product_name: 'Water', unit_cost: 20, available_count: 10 },
  { id: 'p2', product_name: 'Cap', unit_cost: 100, available_count: 5 },
];

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
  { id: 'c1', club_name: 'Runners', meetup_venues_id: [] },
  { id: 'c2', club_name: 'Readers', meetup_venues_id: [] },
];

describe('ClubSearchField', () => {
  it('filters clubs by the search box and selects one', () => {
    const onChange = jest.fn();
    renderWithProviders(
      <ClubSearchField clubs={clubs} value="" onChange={onChange} error="Pick one" />,
    );
    expect(screen.getByTestId('create-pod-club-c2')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByTestId('create-pod-club-search'), 'run');
    expect(screen.queryByTestId('create-pod-club-c2')).toBeNull();
    fireEvent.press(screen.getByTestId('create-pod-club-c1'));
    expect(onChange).toHaveBeenCalledWith('c1');
    expect(screen.getByTestId('create-pod-club-error')).toBeOnTheScreen();
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

function ProductHarness({ list = products }: { list?: CreatePodProduct[] }) {
  const [value, setValue] = useState<PodProductRequest[]>([]);
  return <ProductRequestsField value={value} onChange={setValue} products={list} error="" />;
}

describe('ProductRequestsField', () => {
  it('totals selected requests, ignoring unknown products and zero quantities', () => {
    expect(productRequestTotal([{ product_id: 'p1', quantity: 2 }], products)).toBe(40);
    expect(productRequestTotal([{ product_id: 'gone', quantity: 2 }], products)).toBe(0);
    expect(productRequestTotal([{ product_id: 'p1', quantity: 0 }], products)).toBe(0);
  });

  it('adds rows, selects a product, steps quantity and removes', () => {
    renderWithProviders(<ProductHarness />);
    fireEvent.press(screen.getByTestId('product-add'));
    fireEvent.press(screen.getByTestId('product-add'));
    // Editing row 0 leaves row 1 untouched (the map's non-matching branch).
    fireEvent.press(screen.getByTestId('product-0-p1'));
    fireEvent.press(screen.getByTestId('product-qty-inc-0'));
    expect(screen.getByTestId('product-qty-0')).toHaveTextContent('2');
    fireEvent.press(screen.getByTestId('product-qty-dec-0'));
    fireEvent.press(screen.getByTestId('product-qty-dec-0'));
    expect(screen.getByTestId('product-qty-0')).toHaveTextContent('1');
    fireEvent.press(screen.getByTestId('product-remove-1'));
    fireEvent.press(screen.getByTestId('product-remove-0'));
    expect(screen.queryByTestId('product-qty-0')).toBeNull();
  });

  it('shows the error message and the empty-products hint', () => {
    renderWithProviders(
      <ProductRequestsField
        value={[{ product_id: '', quantity: 1 }]}
        onChange={jest.fn()}
        products={[]}
        error="Add at least one product"
      />,
    );
    expect(screen.getByTestId('product-error')).toBeOnTheScreen();
    expect(screen.getByTestId('product-0-empty')).toBeOnTheScreen();
  });
});
