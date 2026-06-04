import { linking } from '@/navigation/linking';
import { TAB_CONFIG } from '@/navigation/tabs';
import { loadWebFonts } from '@/services/web-fonts';

jest.mock('expo-linking', () => ({ createURL: (path: string) => `duncit://${path}` }));

describe('navigation + web-fonts config', () => {
  it('defines the five tabs and the linking screen map', () => {
    expect(TAB_CONFIG.map((t) => t.name)).toEqual([
      'HomeTab',
      'Explore',
      'Clubs',
      'Chats',
      'Following',
    ]);
    expect(linking.config?.screens).toHaveProperty('Home');
  });

  it('loadWebFonts is a no-op on native', () => {
    expect(() => loadWebFonts()).not.toThrow();
  });
});
