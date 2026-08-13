import type { MembershipBenefitRow } from '@duncit/utils';

/** One tier, exactly as `membershipPricing` returns it. Declared here rather
 * than derived from the generated document so the presentational components
 * take a plain shape and stay testable without a GraphQL result. */
export interface MembershipPlanShape {
  id: string;
  key: string;
  name: string;
  tagline: string;
  price_label: string;
  price_note: string;
  badge_label: string;
  accent_color: string;
  cta_label: string;
}

export type MembershipBenefitShape = MembershipBenefitRow;
