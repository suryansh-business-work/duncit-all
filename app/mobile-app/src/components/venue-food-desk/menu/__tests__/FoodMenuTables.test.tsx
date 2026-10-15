import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';
import { publicPageTableStickersFileName, type FoodMenuFormValues } from '@duncit/utils';

import {
  fetchTableStickersBase64,
  shareBase64File,
} from '@/components/public-page/publicPageRequests';
import { FoodMenuTables } from '@/components/venue-food-desk/menu/FoodMenuTables';
import { foodMenuTextValues } from '@/components/venue-food-desk/menu/foodMenuText';
import { renderWithProviders } from '@/utils/test-utils';

// The sticker PDF request and the OS share sheet have their own spec.
jest.mock('@/components/public-page/publicPageRequests', () => ({
  fetchTableStickersBase64: jest.fn(),
  shareBase64File: jest.fn(),
}));

const mockFetch = fetchTableStickersBase64 as jest.Mock;
const mockShare = shareBase64File as jest.Mock;

function Harness({ tables, limit = 20 }: Readonly<{ tables: string[] | null; limit?: number }>) {
  const { control } = useForm<FoodMenuFormValues>({
    defaultValues: foodMenuTextValues({
      id: 'v1',
      venue_name: 'Sunset Cafe',
      status: 'APPROVED',
      offers_food: true,
      food_menu: [],
      food_tables: tables,
    }),
  });
  return (
    <FoodMenuTables
      control={control}
      limit={limit}
      venueId="v1"
      venueName="Sunset Cafe"
      hasSavedTables={(tables ?? []).length > 0}
    />
  );
}

const tablesField = () => screen.getByTestId('field-food_tables');
const fillButton = () => screen.getByTestId('food-menu-table-fill');
const stickersButton = () => screen.getByTestId('food-menu-table-stickers');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('FoodMenuTables', () => {
  it('numbers the tables from a whole, positive count, within the venue limit', () => {
    renderWithProviders(<Harness tables={null} limit={4} />);

    expect(tablesField()).toHaveProp('value', '');
    expect(fillButton().props['aria-disabled']).toBe(true);

    fireEvent.changeText(screen.getByTestId('food-menu-table-count'), '0');
    expect(fillButton().props['aria-disabled']).toBe(true);
    fireEvent.changeText(screen.getByTestId('food-menu-table-count'), '2.5');
    expect(fillButton().props['aria-disabled']).toBe(true);
    fireEvent.changeText(screen.getByTestId('food-menu-table-count'), 'ten');
    expect(fillButton().props['aria-disabled']).toBe(true);

    fireEvent.changeText(screen.getByTestId('food-menu-table-count'), '3');
    expect(fillButton().props['aria-disabled']).toBe(false);
    fireEvent.press(fillButton());
    expect(tablesField()).toHaveProp('value', '1, 2, 3');

    fireEvent.changeText(screen.getByTestId('food-menu-table-count'), '9');
    fireEvent.press(fillButton());
    expect(tablesField()).toHaveProp('value', '1, 2, 3, 4');
  });

  it('takes typed table names and holds the stickers until tables are saved', () => {
    renderWithProviders(<Harness tables={[]} />);

    fireEvent.changeText(tablesField(), '1, Patio');
    expect(tablesField()).toHaveProp('value', '1, Patio');
    expect(stickersButton().props['aria-disabled']).toBe(true);
    expect(screen.getByText('Add and save your tables to print their stickers.')).toBeOnTheScreen();
    fireEvent.press(stickersButton());
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('makes the saved tables stickers and hands the PDF to the share sheet', async () => {
    let finish: (value: string) => void = () => undefined;
    mockFetch.mockReturnValue(
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
    );
    mockShare.mockResolvedValue(true);
    renderWithProviders(<Harness tables={['1', '2']} />);

    expect(tablesField()).toHaveProp('value', '1, 2');
    expect(
      screen.getByText('Save first — the stickers print the tables as saved.'),
    ).toBeOnTheScreen();
    fireEvent.press(stickersButton());

    expect(mockFetch).toHaveBeenCalledWith('v1', 'Scan to see the menu and order', 'Table');
    // Busy while the PDF is being made — a second press cannot start another.
    await waitFor(() => expect(stickersButton().props['aria-disabled']).toBe(true));

    await act(async () => {
      finish('UERG');
    });
    expect(mockShare).toHaveBeenCalledWith(
      'UERG',
      publicPageTableStickersFileName('Sunset Cafe'),
      'application/pdf',
    );
    await waitFor(() => expect(stickersButton().props['aria-disabled']).toBe(false));
    expect(screen.queryByTestId('food-menu-table-stickers-error')).toBeNull();
  });

  it('says so when the device could not save the stickers', async () => {
    mockFetch.mockResolvedValue('UERG');
    mockShare.mockResolvedValue(false);
    renderWithProviders(<Harness tables={['1']} />);

    fireEvent.press(stickersButton());

    expect(await screen.findByTestId('food-menu-table-stickers-error')).toHaveTextContent(
      'We couldn’t make the stickers. Please try again.',
    );
  });

  it('shows why the stickers could not be made, and clears it on the next try', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Stickers are unavailable right now.'));
    renderWithProviders(<Harness tables={['1']} />);

    fireEvent.press(stickersButton());
    expect(await screen.findByTestId('food-menu-table-stickers-error')).toHaveTextContent(
      'Stickers are unavailable right now.',
    );

    mockFetch.mockResolvedValueOnce('UERG');
    mockShare.mockResolvedValueOnce(true);
    fireEvent.press(stickersButton());
    await waitFor(() => expect(screen.queryByTestId('food-menu-table-stickers-error')).toBeNull());
    expect(mockShare).toHaveBeenCalledTimes(1);
  });

  it('falls back to the generic message for a failure without one', async () => {
    mockFetch.mockRejectedValueOnce({});
    renderWithProviders(<Harness tables={['1']} />);

    fireEvent.press(stickersButton());
    expect(await screen.findByTestId('food-menu-table-stickers-error')).toHaveTextContent(
      'We couldn’t make the stickers. Please try again.',
    );
  });
});
