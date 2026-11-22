import {
  groupSolutions,
  resolveVenueKitOffer,
  solutionPath,
  venueKitFallbackSolution,
  VENUE_KIT_FEATURES,
  venueKitCopyVars,
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';

interface VenueKitMock {
  /** The annual price an admin saved, in paise. */
  annual_price_paise: number;
  included_table_labels: number;
  gift_card_count: number;
  gift_card_value_paise: number;
  order_benefit_pct: number;
}

export const venueKitDemos: PackageDemo[] = [
  defineDemo<VenueKitMock>({
    id: 'venue-kit-copy-vars',
    title: 'venue-kit — the Venue Kit plan as every surface words it',
    note:
      'The plan comes from venueKitOffer; any field missing from the answer is filled from the shipped plan (₹9,999, 25 labels, 10 × ₹100 cards). The copy vars are what venueKit.* sentences interpolate on duncit.com/venue-kit and in the Venues console.',
    mock: { annual_price_paise: 999_900, included_table_labels: 25, gift_card_count: 10, gift_card_value_paise: 10_000, order_benefit_pct: 1 },
    compute: (mock) => {
      const offer = resolveVenueKitOffer(mock);
      return { features: VENUE_KIT_FEATURES, vars: venueKitCopyVars(offer) };
    },
  }),
  defineDemo<{ extraTitle: string; extraAudience: 'HOST' | 'CREATOR' }>({
    id: 'solutions-grouping',
    title: 'solutions — duncit.com/solutions grouped by audience and category',
    note:
      'Every audience is returned in display order; one with no offering comes back with no categories and the page marks it coming soon. Each offering lives at /solutions/<category_slug>/<slug>.',
    mock: { extraTitle: 'Host Pass', extraAudience: 'HOST' },
    compute: ({ extraTitle, extraAudience }) => {
      const venueKit = venueKitFallbackSolution({ title: 'Duncit Venue Kit', summary: '', category: 'Cafe & Restaurant Automation', cta_label: '' });
      const extra = { ...venueKit, title: extraTitle, slug: 'host-pass', audience: extraAudience, category: 'Hosting', category_slug: 'hosting' };
      const groups = groupSolutions([venueKit, extra]);
      return groups.map((g) => ({ audience: g.audience, paths: g.categories.flatMap((c) => c.items.map(solutionPath)) }));
    },
  }),
];
