import { useState } from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { CategorySelect } from '@/components/support/CategorySelect';
import { renderWithProviders } from '@/utils/test-utils';

function Harness() {
  const [value, setValue] = useState('QUESTION');
  return <CategorySelect value={value} onChange={setValue} />;
}

describe('CategorySelect', () => {
  it('opens, selects an option, and shows the new label', () => {
    renderWithProviders(<Harness />);
    expect(screen.queryByTestId('ticket-category-options')).toBeNull();

    fireEvent.press(screen.getByTestId('ticket-category'));
    expect(screen.getByTestId('ticket-category-options')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('ticket-category-option-PAYMENT'));
    expect(screen.queryByTestId('ticket-category-options')).toBeNull();
    expect(screen.getByText('Payment / Refund')).toBeOnTheScreen();
  });

  it('toggles closed when the field is pressed again', () => {
    renderWithProviders(<Harness />);
    fireEvent.press(screen.getByTestId('ticket-category'));
    expect(screen.getByTestId('ticket-category-options')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('ticket-category'));
    expect(screen.queryByTestId('ticket-category-options')).toBeNull();
  });
});
