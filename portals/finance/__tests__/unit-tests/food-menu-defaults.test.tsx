/**
 * Finance > Food Menu Defaults — whether venue food prices include GST or have
 * it added, and at what percent, for every venue that does not set its own.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { FoodTaxDefaultsInput } from '@duncit/gql-types';
import FoodMenuDefaultsPage from '../../src/pages/finance/food-menu-defaults-page';
import { notifySuccess } from './mocks/dialogs';
import { renderWithProviders } from '../testkit';
import {
  foodTaxDefaultsErrorMock,
  foodTaxDefaultsMock,
  makeFoodTaxDefaults,
  updateFoodTaxDefaultsMock,
} from '../mocks/food-menu-defaults.mock';

beforeEach(() => {
  notifySuccess.mockClear();
});

const gst = () => screen.getByLabelText(/^GST %/) as HTMLInputElement;
const save = () => screen.getByRole('button', { name: 'Save' });

describe('FoodMenuDefaultsPage', () => {
  it('waits for the saved defaults, then opens on them with nothing to save', async () => {
    renderWithProviders(<FoodMenuDefaultsPage />, { mocks: [foodTaxDefaultsMock(makeFoodTaxDefaults('EXCLUSIVE', 12))] });
    expect(screen.getByRole('status', { name: 'Loading the food menu defaults' })).toBeInTheDocument();

    await waitFor(() => expect(gst().value).toBe('12'));
    expect(screen.getByRole('heading', { name: 'Food Menu Defaults' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'GST added to prices' })).toBeChecked();
    expect(save()).toBeDisabled();
  });

  it('saves the chosen mode and a whole percent, and says so', async () => {
    const sent: FoodTaxDefaultsInput[] = [];
    renderWithProviders(<FoodMenuDefaultsPage />, {
      mocks: [foodTaxDefaultsMock(), updateFoodTaxDefaultsMock(sent), foodTaxDefaultsMock(makeFoodTaxDefaults('EXCLUSIVE', 18))],
    });
    await waitFor(() => expect(gst().value).toBe('5'));

    fireEvent.click(screen.getByRole('radio', { name: 'GST added to prices' }));
    fireEvent.change(gst(), { target: { value: '18' } });
    fireEvent.click(save());

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Food menu defaults saved'));
    // The percent typed as text reaches the server as the number it is.
    expect(sent).toEqual([{ tax_mode: 'EXCLUSIVE', gst_pct: 18 }]);
  });

  it('refuses a percent outside 0 to 28 without asking the server', async () => {
    const sent: FoodTaxDefaultsInput[] = [];
    renderWithProviders(<FoodMenuDefaultsPage />, { mocks: [foodTaxDefaultsMock(), updateFoodTaxDefaultsMock(sent)] });
    await waitFor(() => expect(gst().value).toBe('5'));

    fireEvent.change(gst(), { target: { value: '29' } });
    fireEvent.click(save());

    expect(await screen.findByText('GST must be a whole number from 0 to 28.')).toBeInTheDocument();
    expect(sent).toEqual([]);
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it("shows the server's refusal and keeps what was typed", async () => {
    const sent: FoodTaxDefaultsInput[] = [];
    renderWithProviders(<FoodMenuDefaultsPage />, { mocks: [foodTaxDefaultsMock(), updateFoodTaxDefaultsMock(sent, { fail: true })] });
    await waitFor(() => expect(gst().value).toBe('5'));

    fireEvent.change(gst(), { target: { value: '12' } });
    fireEvent.click(save());

    expect(await screen.findByTestId('food-tax-defaults-error')).toHaveTextContent('GST must be a whole number from 0 to 28');
    expect(gst().value).toBe('12');
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('says when the defaults cannot be read, and offers to try again', async () => {
    renderWithProviders(<FoodMenuDefaultsPage />, { mocks: [foodTaxDefaultsErrorMock(), foodTaxDefaultsMock()] });

    expect(await screen.findByTestId('food-menu-defaults-load-error')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(gst().value).toBe('5'));
  });
});
