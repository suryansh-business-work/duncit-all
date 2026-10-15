import { screen } from '@testing-library/react-native';

import { ChipSelectField } from '@/components/create-pod/ChipSelectField';
import { renderWithProviders } from '@/utils/test-utils';

const LONG_NAME = 'The Extremely Long Named Weekend Runners Collective of Lucknow';

/*
  A club chip reads "Name | (pin) Locality, City · N open slots". With a long
  name or place it used to run off the field; now the chip is capped at the
  field's width, the name truncates to one line and shrinks first, and the
  slot note keeps its full width so the count is never clipped.
*/
describe('ChipSelectField — long chips stay inside the field', () => {
  const renderChips = (value = '') =>
    renderWithProviders(
      <ChipSelectField
        label="Club"
        options={[
          {
            value: 'club-long',
            label: LONG_NAME,
            place: 'Gomti Nagar Extension, Lucknow',
            note: '2 open slots',
          },
        ]}
        value={value}
        onChange={jest.fn()}
        testID="chips"
      />,
    );

  it('caps the chip at the field width', () => {
    renderChips();
    expect(screen.getByTestId('chips-club-long')).toHaveStyle({ maxWidth: '100%' });
  });

  it('truncates the name to one shrinkable line, picked or not', () => {
    const { rerender } = renderChips();
    const name = screen.getByText(LONG_NAME);
    expect(name).toHaveProp('numberOfLines', 1);
    expect(name).toHaveStyle({ flexShrink: 1 });

    rerender(
      <ChipSelectField
        label="Club"
        options={[{ value: 'club-long', label: LONG_NAME }]}
        value="club-long"
        onChange={jest.fn()}
        testID="chips"
      />,
    );
    expect(screen.getByText(LONG_NAME)).toHaveProp('numberOfLines', 1);
    expect(screen.getByText(LONG_NAME)).toHaveStyle({ flexShrink: 1 });
  });

  it('never shrinks the slot note, so the count stays whole', () => {
    renderChips('club-long');
    const note = screen.getByTestId('chips-club-long-note');
    expect(note).toHaveTextContent('2 open slots');
    expect(note).toHaveProp('numberOfLines', 1);
    expect(note).toHaveStyle({ flexShrink: 0 });
  });
});
