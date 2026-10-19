import {
  isValidQuickAccess,
  parseStoredQuickAccess,
  profileMenuSections,
  profileSectionSubtitleKeys,
  type ProfileMenuFlags,
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';

interface ProfileMenuMock extends ProfileMenuFlags {
  /** What the device kept for Quick Access — a JSON array of keys, or empty. */
  stored: string;
}

export const profileMenuDemos: PackageDemo[] = [
  defineDemo<ProfileMenuMock>({
    id: 'profile-menu',
    title: 'profile-menu — the account menu’s Quick Access grid and section cards',
    note:
      'stored is what the device kept for Quick Access. Put "cart" in it and switch products off: the tile drops out and the grid is topped up from the defaults, never left with a hole. Clear stored, or make it invalid JSON, and the default six come back. Turn a flag off and its row leaves its section card and the subtitle stops naming it. Both apps render exactly this.',
    mock: {
      stored: '["cart","faqs","chats","saved"]',
      products: true,
      leaderboard: false,
      membership: true,
      gift_cards: true,
      tour_guide: false,
      pod_plans_section: false,
    },
    compute: ({ stored, ...flags }) => {
      const grid = parseStoredQuickAccess(stored, flags);
      return {
        grid,
        gridIsValid: isValidQuickAccess(grid, flags),
        sections: profileMenuSections(flags, { extraRows: ['account'] }).map((section) => ({
          id: section.id,
          rows: section.items.map((item) => item.key),
          subtitleKeys: profileSectionSubtitleKeys(section.items),
        })),
      };
    },
  }),
];
