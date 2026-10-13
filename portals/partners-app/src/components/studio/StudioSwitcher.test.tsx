import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import StudioSwitcher from './StudioSwitcher';
import { renderWithProviders } from '../../__tests__/render';
import type { PartnerRole } from '../../config/partner-sections';

afterEach(cleanup);

const mount = (roles: string[] | null, active: PartnerRole | null, products = true) =>
  renderWithProviders(<StudioSwitcher roles={roles} products={products} active={active} />);

const openMenu = async () => {
  fireEvent.click(screen.getByTestId('studio-switcher'));
  return within(await screen.findByRole('menu'));
};

describe('StudioSwitcher', () => {
  it('shows nothing to somebody who holds no studio', () => {
    mount(['USER'], null);
    expect(screen.queryByTestId('studio-switcher')).toBeNull();
  });

  it('names the studio the partner is in', () => {
    mount(['HOST', 'VENUE_OWNER'], 'VENUE_OWNER');
    expect(within(screen.getByTestId('studio-switcher')).getByText('Venue Studio')).toBeTruthy();
  });

  it('falls back to the first studio held when none is active', () => {
    mount(['HOST', 'CLUB_ADMIN'], null);
    // Club Admin comes before Host in the portal's order.
    expect(within(screen.getByTestId('studio-switcher')).getByText('Club Admin Studio')).toBeTruthy();
  });

  it('lists the held studios, marks the current one and opens another one’s options page', async () => {
    mount(['HOST', 'VENUE_OWNER'], 'HOST');
    const menu = await openMenu();
    expect(menu.getByTestId('studio-option-HOST').className).toContain('Mui-selected');
    expect(menu.getByTestId('studio-option-VENUE_OWNER').className).not.toContain('Mui-selected');
    expect(menu.queryByTestId('studio-option-CLUB_ADMIN')).toBeNull();

    fireEvent.click(menu.getByTestId('studio-option-VENUE_OWNER'));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/venues/options'));
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  it('offers the way into a studio that is not held yet', async () => {
    mount(['VENUE_OWNER'], 'VENUE_OWNER');
    const menu = await openMenu();
    expect(menu.getByTestId('studio-join-HOST').textContent).toBe('Be a Host');
    expect(menu.getByTestId('studio-join-ECOMM_MANAGER').textContent).toBe('Become an E-Commerce Brand Partner');
    // Club Admin is appointed, not applied for.
    expect(menu.queryByTestId('studio-join-CLUB_ADMIN')).toBeNull();

    fireEvent.click(menu.getByTestId('studio-join-HOST'));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/be-a-host'));
  });

  it('leaves the brand studio out entirely while products are switched off', async () => {
    mount(['HOST', 'ECOMM_MANAGER'], 'HOST', false);
    const menu = await openMenu();
    expect(menu.queryByTestId('studio-option-ECOMM_MANAGER')).toBeNull();
    expect(menu.queryByTestId('studio-join-ECOMM_MANAGER')).toBeNull();
  });

  it('shows no join section for somebody who already holds every applicable studio', async () => {
    mount(['CLUB_ADMIN', 'VENUE_OWNER', 'HOST', 'ECOMM_MANAGER'], 'HOST');
    const menu = await openMenu();
    expect(menu.getAllByRole('menuitem')).toHaveLength(4);
    expect(menu.queryByTestId('studio-join-HOST')).toBeNull();
  });
});
