import { useEffect } from 'react';
import { Linking } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';
import type {
  FoodMenuConfig,
  FoodMenuFormValues,
  FoodMenuVenue,
  VenueFoodItem,
} from '@duncit/utils';

import { FoodMenuOrdering } from '@/components/venue-food-desk/menu/FoodMenuOrdering';
import { foodMenuTextValues } from '@/components/venue-food-desk/menu/foodMenuText';
import { renderWithProviders } from '@/utils/test-utils';

const CONFIG: FoodMenuConfig = {
  food_diets: ['VEG'],
  food_spice_levels: ['NONE'],
  food_menu_limit: 10,
  food_image_limit: 4,
  food_price_max: 10000,
  food_discount_max_pct: 30,
  food_video_limit: 2,
  food_table_limit: 20,
};

const DISH: VenueFoodItem = {
  id: 'd1',
  name: 'Masala Dosa',
  description: '',
  category: 'Mains',
  price: 120,
  images: [],
  diet: 'VEG',
  spice_level: 'NONE',
  is_available: true,
};

const venue = (over: Partial<FoodMenuVenue> = {}): FoodMenuVenue => ({
  id: 'v1',
  venue_name: 'Sunset Cafe',
  status: 'APPROVED',
  offers_food: true,
  food_menu: [DISH],
  food_ordering: {
    enabled: false,
    razorpay_linked: true,
    discount_pct: 10,
    tax_override: false,
    tax_mode: 'INCLUSIVE',
    gst_pct: 5,
  },
  ...over,
});

interface HarnessProps {
  source: FoodMenuVenue;
  savedGstin?: string;
  /** The menu rules' refusal on the ordering switch, as the form would raise it. */
  enabledError?: string;
  /** The tax rules' refusal on the GST mode. */
  taxModeError?: string;
}

function Harness({ source, savedGstin = '', enabledError, taxModeError }: Readonly<HarnessProps>) {
  const { control, setError } = useForm<FoodMenuFormValues>({
    defaultValues: foodMenuTextValues(source),
  });
  useEffect(() => {
    if (enabledError) setError('food_ordering.enabled', { message: enabledError });
    if (taxModeError) setError('food_ordering.tax_mode', { message: taxModeError });
  }, [enabledError, taxModeError, setError]);
  return <FoodMenuOrdering control={control} config={CONFIG} savedGstin={savedGstin} />;
}

const orderingSwitch = () => screen.getByTestId('food-menu-ordering-enabled-switch');

afterEach(() => {
  jest.restoreAllMocks();
});

describe('FoodMenuOrdering', () => {
  it('reads a linked account and lets ordering be switched on with an available dish', () => {
    renderWithProviders(<Harness source={venue()} />);

    expect(screen.getByTestId('food-menu-account')).toHaveTextContent(
      'A Razorpay account is linked for these orders.',
      { exact: false },
    );
    expect(
      screen.getByText('Guests scan your venue QR, order from the menu and pay online.'),
    ).toBeOnTheScreen();
    expect(orderingSwitch().props.disabled).toBe(false);
    expect(screen.getByTestId('field-food_ordering.discount_pct')).toHaveProp('value', '10');
    expect(
      screen.getByText('Taken off every order placed from the QR. 0 to 30.'),
    ).toBeOnTheScreen();

    fireEvent(orderingSwitch(), 'valueChange', true);
    expect(orderingSwitch().props.value).toBe(true);
  });

  it('locks the switch while no account is linked', () => {
    renderWithProviders(
      <Harness
        source={venue({
          food_ordering: {
            enabled: false,
            razorpay_linked: false,
            discount_pct: 0,
            tax_override: false,
          },
        })}
      />,
    );

    expect(screen.getByTestId('food-menu-account')).toHaveTextContent(
      'No Razorpay account is linked yet',
      { exact: false },
    );
    expect(
      screen.getByText(
        'Pick a connected Razorpay account and keep at least one menu item available first.',
      ),
    ).toBeOnTheScreen();
    expect(orderingSwitch().props.disabled).toBe(true);
  });

  it('keeps an already-open switch usable so ordering can always be turned off', () => {
    renderWithProviders(
      <Harness
        source={venue({
          food_menu: [{ ...DISH, is_available: false }],
          food_ordering: {
            enabled: true,
            razorpay_linked: true,
            discount_pct: 0,
            tax_override: false,
          },
        })}
      />,
    );

    expect(orderingSwitch().props.disabled).toBe(false);
    fireEvent(orderingSwitch(), 'valueChange', false);
    expect(orderingSwitch().props.value).toBe(false);
  });

  it("shows the rules' refusal on the switch in place of its hint", () => {
    renderWithProviders(
      <Harness source={venue()} enabledError="Keep at least one menu item available" />,
    );

    expect(screen.getByText('Keep at least one menu item available')).toBeOnTheScreen();
    expect(
      screen.queryByText('Guests scan your venue QR, order from the menu and pay online.'),
    ).toBeNull();
  });

  it('opens the Partner console food menu to change the account', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderWithProviders(<Harness source={venue()} />);

    fireEvent.press(screen.getByTestId('food-menu-account-manage'));

    expect(openURL).toHaveBeenCalledWith(expect.stringMatching(/\/venues\/food-menu$/));
  });

  it('lets a venue with no GST number type one', () => {
    renderWithProviders(<Harness source={venue()} />);

    const gstin = screen.getByTestId('field-gstin');
    expect(gstin).toHaveProp('editable', true);
    fireEvent.changeText(gstin, '29ABCDE1234F1Z5');
    expect(screen.getByTestId('field-gstin')).toHaveProp('value', '29ABCDE1234F1Z5');
  });

  it('shows a saved GST number locked', () => {
    renderWithProviders(
      <Harness source={venue({ gstin: '29ABCDE1234F1Z5' })} savedGstin="29ABCDE1234F1Z5" />,
    );

    expect(screen.getByTestId('field-gstin')).toHaveProp('value', '29ABCDE1234F1Z5');
    expect(screen.getByTestId('field-gstin')).toHaveProp('editable', false);
  });
});

describe('FoodMenuTaxFields', () => {
  it("shows Finance's resolved GST read-only while the venue does not override it", () => {
    renderWithProviders(<Harness source={venue()} />);

    expect(screen.getByTestId('food-menu-tax-override-switch').props.value).toBe(false);
    expect(screen.getByTestId('food-menu-tax-mode-INCLUSIVE')).toHaveProp('aria-checked', true);
    expect(screen.getByTestId('field-food_ordering.gst_pct')).toHaveProp('value', '5');
    expect(screen.getByTestId('field-food_ordering.gst_pct')).toHaveProp('editable', false);

    fireEvent.press(screen.getByTestId('food-menu-tax-mode-EXCLUSIVE'));
    expect(screen.getByTestId('food-menu-tax-mode-INCLUSIVE')).toHaveProp('aria-checked', true);
    expect(screen.getByTestId('food-menu-tax-mode-EXCLUSIVE')).toHaveProp('aria-checked', false);
  });

  it("lets the venue set its own mode and percent once it overrides Finance's default", () => {
    renderWithProviders(<Harness source={venue()} />);

    fireEvent(screen.getByTestId('food-menu-tax-override-switch'), 'valueChange', true);
    fireEvent.press(screen.getByTestId('food-menu-tax-mode-EXCLUSIVE'));

    expect(screen.getByTestId('food-menu-tax-mode-EXCLUSIVE')).toHaveProp('aria-checked', true);
    expect(screen.getByTestId('field-food_ordering.gst_pct')).toHaveProp('editable', true);
    fireEvent.changeText(screen.getByTestId('field-food_ordering.gst_pct'), '18');
    expect(screen.getByTestId('field-food_ordering.gst_pct')).toHaveProp('value', '18');
  });

  it("shows the tax rules' refusal under the GST mode", () => {
    renderWithProviders(<Harness source={venue()} taxModeError="Pick how GST is charged" />);

    expect(screen.getByTestId('food-menu-tax-mode-error')).toHaveTextContent(
      'Pick how GST is charged',
    );
  });
});
