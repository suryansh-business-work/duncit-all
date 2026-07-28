import { linking } from '@/navigation/linking';
import { consumePendingBooking } from '@/navigation/pendingBooking';
import { TAB_CONFIG } from '@/navigation/tabs';
import { useAuthStore } from '@/stores/auth.store';
import { loadWebFonts } from '@/services/web-fonts';

jest.mock('expo-linking', () => ({ createURL: (path: string) => `duncit://${path}` }));

const stateFor = (path: string) => linking.getStateFromPath?.(path, linking.config);
const routeNames = (path: string) => stateFor(path)?.routes.map((r) => r.name);

describe('navigation + web-fonts config', () => {
  afterEach(() => {
    useAuthStore.setState({ token: null });
    consumePendingBooking();
  });

  it('defines the five tabs and the linking screen map', () => {
    expect(TAB_CONFIG.map((t) => t.name)).toEqual([
      'HomeTab',
      'Explore',
      'Clubs',
      'Chats',
      'Following',
    ]);
    expect(linking.config?.screens).toHaveProperty('Home');
    // The account drawer is a routable overlay at /menu.
    expect(linking.config?.screens).toHaveProperty('Menu', 'menu');
    // Booking deep link from the receipt email (mWeb's /booking/:bookingId).
    expect(linking.config?.screens).toHaveProperty('Booking', 'booking/:bookingId');
  });

  it('loadWebFonts is a no-op on native', () => {
    expect(() => loadWebFonts()).not.toThrow();
  });

  it('routes an authenticated booking link straight to the Booking screen', () => {
    useAuthStore.setState({ token: 'jwt' });
    expect(routeNames('/booking/bk-1')).toEqual(['Booking']);
    expect(consumePendingBooking()).toBeNull();
  });

  it('parks a signed-out booking link and sends the user to Login', () => {
    expect(routeNames('/booking/bk-1')).toEqual(['Login']);
    expect(consumePendingBooking()).toBe('bk-1');
  });

  it('leaves non-booking paths alone while signed out', () => {
    expect(routeNames('/pod-history')).toEqual(['PodHistory']);
    expect(consumePendingBooking()).toBeNull();
  });
});
