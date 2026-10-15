import { Linking } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';
import { blankFoodLicences, type FoodMenuFormValues, type VenueFoodLicences } from '@duncit/utils';

import { FoodMenuLicences } from '@/components/venue-food-desk/menu/FoodMenuLicences';
import { foodMenuTextValues } from '@/components/venue-food-desk/menu/foodMenuText';
import { renderWithProviders } from '@/utils/test-utils';

const FSSAI_DOC = 'https://ik.imagekit.io/duncit/venues/v1/fssai.pdf';
const LIQUOR_DOC = 'https://ik.imagekit.io/duncit/venues/v1/liquor.pdf';

function Harness({ licences }: Readonly<{ licences: Partial<VenueFoodLicences> | null }>) {
  const { control } = useForm<FoodMenuFormValues>({
    defaultValues: foodMenuTextValues({
      id: 'v1',
      venue_name: 'Sunset Cafe',
      status: 'APPROVED',
      offers_food: true,
      food_menu: [],
      food_licences: licences ? { ...blankFoodLicences, ...licences } : null,
    }),
  });
  return <FoodMenuLicences control={control} />;
}

let openURL: jest.SpyInstance;

beforeEach(() => {
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});

afterEach(() => {
  openURL.mockRestore();
});

describe('FoodMenuLicences', () => {
  it('edits the saved FSSAI and liquor licence numbers, the FSSAI one capped at 14 digits', () => {
    renderWithProviders(
      <Harness licences={{ fssai_number: '12345678901234', liquor_licence_number: 'LQ-9' }} />,
    );

    expect(screen.getByTestId('food-menu-licences')).toBeOnTheScreen();
    expect(screen.getByRole('heading', { name: 'Licences' })).toBeOnTheScreen();
    const fssai = screen.getByTestId('field-food_licences.fssai_number');
    expect(fssai).toHaveProp('value', '12345678901234');
    expect(fssai).toHaveProp('maxLength', 14);
    expect(screen.getByTestId('field-food_licences.liquor_licence_number')).toHaveProp(
      'value',
      'LQ-9',
    );

    fireEvent.changeText(fssai, '98765432109876');
    expect(screen.getByTestId('field-food_licences.fssai_number')).toHaveProp(
      'value',
      '98765432109876',
    );
  });

  it('shows no document rows while none was uploaded', () => {
    renderWithProviders(<Harness licences={null} />);

    expect(screen.getByTestId('field-food_licences.fssai_number')).toHaveProp('value', '');
    expect(screen.queryByText('View FSSAI licence')).toBeNull();
    expect(screen.queryByText('View Liquor licence')).toBeNull();
  });

  it('opens an uploaded document and removes only the one asked for', () => {
    renderWithProviders(
      <Harness licences={{ fssai_document_url: FSSAI_DOC, liquor_document_url: LIQUOR_DOC }} />,
    );

    fireEvent.press(screen.getByText('View FSSAI licence'));
    expect(openURL).toHaveBeenCalledWith(FSSAI_DOC);
    fireEvent.press(screen.getByText('View Liquor licence'));
    expect(openURL).toHaveBeenLastCalledWith(LIQUOR_DOC);

    fireEvent.press(screen.getByLabelText('Remove FSSAI licence'));
    expect(screen.queryByText('View FSSAI licence')).toBeNull();
    expect(screen.queryByLabelText('Remove FSSAI licence')).toBeNull();
    expect(screen.getByText('View Liquor licence')).toBeOnTheScreen();
  });
});
