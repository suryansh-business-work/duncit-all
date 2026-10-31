/**
 * The Venue and Host studios' Banner Kit and Banners pages. The panels are
 * @duncit/shell's subject; here they are stand-ins that show what each page
 * hands them: the picked venue's own kit and pods, the signed-in host's own
 * profile and the pods their account runs.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders, partnerUser } from '../../__tests__/render';
import { myVenue, myVenuesMock } from '../../__tests__/venue-fixtures';
import { SELECTED_VENUE_KEY } from '../../components/venue/useSelectedVenue';
import VenueBannerKitPage from './VenueBannerKitPage';
import VenueBannersPage from './VenueBannersPage';
import HostBannerKitPage from './HostBannerKitPage';
import HostBannersPage from './HostBannersPage';

vi.mock('@duncit/shell', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  BannerKitPanel: (props: { entity: string; mode: string; id?: string }) => (
    <div data-testid="kit-panel">{`${props.entity}:${props.mode}:${props.id ?? 'own'}`}</div>
  ),
  PodBannersPanel: (props: { filter: { field: string; value: string } }) => (
    <div data-testid="banners-panel">{`${props.filter.field}=${props.filter.value}`}</div>
  ),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const venues = myVenuesMock([myVenue('v-live', 'Rooftop', 'APPROVED'), myVenue('v-draft', 'Garden', 'DRAFT')]);

describe('Venue Banner Kit', () => {
  it("opens the picked venue's own kit, a draft included, and follows a switch of venue", async () => {
    localStorage.setItem(SELECTED_VENUE_KEY, 'v-draft');
    renderWithProviders(<VenueBannerKitPage />, { mocks: [venues] });

    expect((await screen.findByTestId('kit-panel')).textContent).toBe('VENUE:owner:v-draft');
    expect(screen.getByRole('heading', { name: 'Banner Kit' })).toBeTruthy();

    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: /Rooftop/ }));
    expect((await screen.findByTestId('kit-panel')).textContent).toBe('VENUE:owner:v-live');
  });
});

describe('Venue Banners', () => {
  it("lists the picked venue's pods", async () => {
    localStorage.setItem(SELECTED_VENUE_KEY, 'v-live');
    renderWithProviders(<VenueBannersPage />, { mocks: [venues] });
    expect((await screen.findByTestId('banners-panel')).textContent).toBe('venue_id=v-live');
    expect(screen.getByRole('heading', { name: 'Banners' })).toBeTruthy();
  });
});

describe('Host Banner Kit', () => {
  it("opens the signed-in host's own kit, with no id to pick", () => {
    renderWithProviders(<HostBannerKitPage />, { user: partnerUser() });
    expect(screen.getByTestId('kit-panel').textContent).toBe('HOST:owner:own');
    expect(screen.getByText('Your photos, Instagram and past events for your pod banners')).toBeTruthy();
  });
});

describe('Host Banners', () => {
  it("lists the pods the host's account runs", () => {
    renderWithProviders(<HostBannersPage />, { user: partnerUser({ user_id: 'u-asha' }) });
    expect(screen.getByTestId('banners-panel').textContent).toBe('host_user_id=u-asha');
  });

  it('waits with no account id until the user is in', () => {
    renderWithProviders(<HostBannersPage />, { user: null });
    expect(screen.getByTestId('banners-panel').textContent).toMatch(/^host_user_id=$/);
  });
});
