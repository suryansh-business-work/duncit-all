import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import WarehousesPage from './WarehousesPage';
import { renderWithProviders } from '../../../__tests__/render';
import { scriptedLink, type ScriptedAnswer } from '../../../__tests__/groupC-link';

// The warehouse list, editor and sync have their own suites; this page only chooses which brand they show.
vi.mock('../brand-settings/BrandSettingsPage', () => ({
  default: ({ brandId }: { brandId?: string }) => <p data-testid="settings-for">{brandId}</p>,
}));

afterEach(cleanup);

const option = (id: string, name: string) => ({ __typename: 'EcommBrand', id, brand_name: name, status: 'APPROVED' });

const mount = (answer: ScriptedAnswer) =>
  renderWithProviders(<WarehousesPage />, { link: scriptedLink({ PartnerBrandOptions: answer }) });

describe('WarehousesPage', () => {
  it('shows the first brand’s pickup addresses until another is picked', async () => {
    mount({ myEcommBrands: [option('b1', 'Aurora Pets'), option('b2', 'Blue Kettle')] });
    expect((await screen.findByTestId('settings-for')).textContent).toBe('b1');

    fireEvent.mouseDown(within(screen.getByTestId('brand-picker')).getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'Blue Kettle' }));
    expect((await screen.findByTestId('settings-for')).textContent).toBe('b2');
  });

  it('offers no picker to a single-brand partner', async () => {
    mount({ myEcommBrands: [option('b1', 'Aurora Pets')] });
    expect((await screen.findByTestId('settings-for')).textContent).toBe('b1');
    expect(screen.queryByTestId('brand-picker')).toBeNull();
  });

  it('tells a partner with no brand to create one', async () => {
    mount({ myEcommBrands: [] });
    expect(await screen.findByText('No brands yet — create your first product brand to get started.')).toBeTruthy();
    expect(screen.queryByTestId('settings-for')).toBeNull();
  });

  it('shows the server error', async () => {
    mount(new Error('Brands unavailable'));
    expect(await screen.findByText('Brands unavailable')).toBeTruthy();
  });
});
