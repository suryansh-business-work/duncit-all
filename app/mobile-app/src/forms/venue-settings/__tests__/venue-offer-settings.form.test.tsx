import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { BookingOffersForm, type BookingOffersFormProps } from '@/forms/venue-settings';
import { renderWithProviders } from '@/utils/test-utils';

const mount = (over: Partial<BookingOffersFormProps> = {}) => {
  const onSubmit = jest.fn();
  renderWithProviders(
    <BookingOffersForm
      stored={{
        min_guests: 0,
        response_hours: 36,
        min_business: [{ model: 'FLAT', amount: 5000 }],
      }}
      effective={{ min_guests: 8, response_hours: 36 }}
      saving={false}
      saved={false}
      error={null}
      onSubmit={onSubmit}
      {...over}
    />,
  );
  return onSubmit;
};

describe('BookingOffersForm', () => {
  it('starts from the stored numbers and says what is in effect now', () => {
    mount();
    expect(screen.getByText('Booking offers')).toBeOnTheScreen();
    expect(screen.getByTestId('field-min_guests').props.value).toBe('0');
    expect(screen.getByTestId('field-response_hours').props.value).toBe('36');
    // The venue left the minimum to Duncit's default, which is 8 guests right now.
    expect(screen.getByText('0 uses Duncit’s default. In effect now: 8 guests.')).toBeOnTheScreen();
    expect(screen.getByText('0 uses Duncit’s default. In effect now: 36 hours.')).toBeOnTheScreen();
    expect(screen.getByText('Save booking offers')).toBeOnTheScreen();
    expect(screen.queryByTestId('venue-offer-settings-error')).toBeNull();
    expect(screen.queryByTestId('venue-offer-settings-saved')).toBeNull();
  });

  it('starts a venue that stored nothing at the defaults', () => {
    mount({ stored: null });
    expect(screen.getByTestId('field-min_guests').props.value).toBe('0');
    expect(screen.getByTestId('field-response_hours').props.value).toBe('0');
  });

  it('sends what the owner typed', async () => {
    const onSubmit = mount();
    fireEvent.changeText(screen.getByTestId('field-min_guests'), '12');
    fireEvent.changeText(screen.getByTestId('field-response_hours'), '48');
    fireEvent.press(screen.getByTestId('venue-offer-settings-save'));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        min_guests: '12',
        response_hours: '48',
        min_business: [{ model: 'FLAT', amount: '5000' }],
      }),
    );
  });

  // The boxes keep digits only, so what can still be wrong is a number past the server's bound.
  it('refuses numbers past the bounds, with the shared sentences, and sends nothing', async () => {
    const onSubmit = mount();
    fireEvent.changeText(screen.getByTestId('field-min_guests'), '1001');
    fireEvent.changeText(screen.getByTestId('field-response_hours'), '721');
    fireEvent.press(screen.getByTestId('venue-offer-settings-save'));
    expect(
      await screen.findByText('Enter a whole number of guests from 0 to 1000'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Enter a whole number of hours from 0 to 720')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('starts a venue with no amounts at one empty row, and holds the save until it is filled', async () => {
    const onSubmit = mount({ stored: { min_guests: 0, response_hours: 0 } });
    expect(screen.getByTestId('venue-min-business-0-PER_GUEST')).toHaveProp('aria-checked', true);
    // One row is the least there can be: it cannot be removed.
    expect(screen.queryByTestId('venue-min-business-remove-0')).toBeNull();
    fireEvent.press(screen.getByTestId('venue-offer-settings-save'));
    expect(await screen.findByText('Enter an amount above 0, up to 10000000')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('field-min_business.0.amount'), '200');
    fireEvent.press(screen.getByTestId('venue-offer-settings-save'));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ min_business: [{ model: 'PER_GUEST', amount: '200' }] }),
      ),
    );
  });

  it('adds a row per basis up to three, and removes one again', () => {
    mount();
    fireEvent.press(screen.getByTestId('venue-min-business-add'));
    // Per booking is taken by the first row, so the new one starts per guest.
    expect(screen.getByTestId('venue-min-business-1-PER_GUEST')).toHaveProp('aria-checked', true);
    fireEvent.press(screen.getByTestId('venue-min-business-add'));
    expect(screen.getByTestId('venue-min-business-2-PER_HOUR')).toHaveProp('aria-checked', true);
    // Every basis is listed: nothing more to add.
    expect(screen.queryByTestId('venue-min-business-add')).toBeNull();
    fireEvent.press(screen.getByTestId('venue-min-business-remove-1'));
    expect(screen.queryByTestId('venue-min-business-row-2')).toBeNull();
    expect(screen.getByTestId('venue-min-business-add')).toBeOnTheScreen();
  });

  it('refuses the same basis twice', async () => {
    const onSubmit = mount();
    fireEvent.press(screen.getByTestId('venue-min-business-add'));
    fireEvent.changeText(screen.getByTestId('field-min_business.1.amount'), '300');
    fireEvent.press(screen.getByTestId('venue-min-business-1-FLAT'));
    fireEvent.press(screen.getByTestId('venue-offer-settings-save'));
    expect(await screen.findByText('List each basis once')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps only the digits typed', () => {
    mount();
    fireEvent.changeText(screen.getByTestId('field-min_guests'), '1-2.a');
    expect(screen.getByTestId('field-min_guests').props.value).toBe('12');
  });

  it('shows the save in flight, a refused save and a saved one', () => {
    mount({ saving: true, error: 'Not your venue', saved: true });
    // The button spins while the save is with the server, still named for what it does.
    expect(screen.getByLabelText('Saving…')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-offer-settings-save-spinner')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-offer-settings-error')).toHaveTextContent('Not your venue');
    expect(screen.getByTestId('venue-offer-settings-saved')).toHaveTextContent(
      'Booking offers saved.',
    );
  });
});
