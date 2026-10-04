import { fireEvent, screen } from '@testing-library/react-native';

import { HeaderGreeting } from '@/components/AppHeader/HeaderGreeting';
import { renderWithProviders } from '@/utils/test-utils';

// The location pill moved out to HeaderLocationRow (covered by AppHeader.test);
// HeaderGreeting is now the two-tone greeting that also opens the picker.
describe('HeaderGreeting', () => {
  it('renders the given tagline alone when there is no first name', () => {
    renderWithProviders(<HeaderGreeting tagline="Find your people" onOpenLocation={jest.fn()} />);
    expect(screen.getByTestId('header-greeting-title')).toHaveTextContent('Find your people');
    expect(screen.queryByText(/Hello/)).toBeNull();
  });

  it('falls back to the default tagline when the tagline is blank or missing', () => {
    renderWithProviders(<HeaderGreeting tagline="   " />);
    expect(screen.getByTestId('header-greeting-title')).toHaveTextContent('It All Starts Here!');
  });

  it('leads with "Hello, <name>!" and keeps the tagline as the muted second beat', () => {
    renderWithProviders(<HeaderGreeting tagline={null} firstName="  Asha " />);
    const title = screen.getByTestId('header-greeting-title');
    expect(title).toHaveTextContent('Hello, Asha!', { exact: false });
    expect(title).toHaveTextContent('It All Starts Here!', { exact: false });
  });

  it('treats a whitespace-only first name as no name', () => {
    renderWithProviders(<HeaderGreeting tagline="Solo header" firstName="   " />);
    expect(screen.getByTestId('header-greeting-title')).toHaveTextContent('Solo header');
    expect(screen.queryByText(/Hello/)).toBeNull();
  });

  it('asks the header to open the location picker when the greeting is tapped', () => {
    const onOpenLocation = jest.fn();
    renderWithProviders(<HeaderGreeting tagline="Tap me" onOpenLocation={onOpenLocation} />);
    fireEvent.press(screen.getByTestId('header-greeting-title'));
    expect(onOpenLocation).toHaveBeenCalledTimes(1);
  });
});
