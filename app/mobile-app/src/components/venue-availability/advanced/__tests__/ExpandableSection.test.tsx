import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'tamagui';

import { renderWithProviders } from '@/utils/test-utils';
import { ExpandableSection } from '../ExpandableSection';

const mount = (tone?: 'default' | 'error') =>
  renderWithProviders(
    <ExpandableSection testID="sec" icon="rule" title="Venue rules" caption="Limits" tone={tone}>
      <Text>section body</Text>
    </ExpandableSection>,
  );

describe('ExpandableSection', () => {
  it('starts collapsed, showing the title and caption but not the body', () => {
    mount();
    expect(screen.getByText('Venue rules')).toBeOnTheScreen();
    expect(screen.getByText('Limits')).toBeOnTheScreen();
    expect(screen.queryByText('section body')).toBeNull();
    expect(screen.getByTestId('sec-toggle').props['aria-expanded']).toBe(false);
  });

  it('opens and closes from the header, announcing its state', () => {
    mount();
    fireEvent.press(screen.getByTestId('sec-toggle'));
    expect(screen.getByText('section body')).toBeOnTheScreen();
    expect(screen.getByTestId('sec-toggle').props['aria-expanded']).toBe(true);
    fireEvent.press(screen.getByTestId('sec-toggle'));
    expect(screen.queryByText('section body')).toBeNull();
    expect(screen.getByTestId('sec-toggle').props['aria-expanded']).toBe(false);
  });

  it('names the toggle by its title', () => {
    mount();
    expect(screen.getByLabelText('Venue rules')).toBeOnTheScreen();
  });

  it('frames a destructive section in the danger tone', () => {
    mount('error');
    expect(screen.UNSAFE_getByProps({ children: 'Venue rules' }).props.color).toBe('$danger');
  });

  it('uses the normal tone by default', () => {
    mount();
    expect(screen.UNSAFE_getByProps({ children: 'Venue rules' }).props.color).toBe('$color');
  });
});
