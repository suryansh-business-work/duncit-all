/**
 * Canonical, grouped list of policy types. Rendered as a grouped, searchable
 * Autocomplete when creating/editing a policy, and the grouping the dashboard's
 * "Policies by Type" section counts by.
 *
 * A curated list offered against a free-text field, exactly like the legal
 * document types beside it: a type nobody has picked yet costs nothing, and a
 * new one can be added here without a migration. What is stored is the label.
 */
export interface PolicyTypeGroup {
  group: string;
  options: string[];
}

export const POLICY_TYPE_GROUPS: PolicyTypeGroup[] = [
  {
    group: 'Platform & Legal',
    options: [
      'Privacy Policy',
      'Terms & Conditions',
      'Cookie Policy',
      'Acceptable Use Policy',
      'Intellectual Property Policy',
      'Disclaimer',
    ],
  },
  {
    group: 'Money',
    options: [
      'Refund Policy',
      'Cancellation Policy',
      'Backout Policy',
      'Payment & Billing Policy',
      'Payout Policy',
      'Pricing Policy',
    ],
  },
  {
    group: 'Community & Safety',
    options: [
      'Community Guidelines',
      'Code of Conduct',
      'Content Moderation Policy',
      'Anti-Harassment Policy',
      'Safety Policy',
      'Grievance Redressal Policy',
    ],
  },
  {
    group: 'Partners',
    options: [
      'Host Policy',
      'Venue Policy',
      'Club Policy',
      'Brand & Seller Policy',
      'Advertising Policy',
    ],
  },
  {
    group: 'Data & Operations',
    options: [
      'Data Retention Policy',
      'Security Policy',
      'Accessibility Policy',
      'Shipping & Delivery Policy',
      'Returns Policy',
    ],
  },
];

/** Flat option list with its group label, for a grouped MUI Autocomplete. */
export interface PolicyTypeOption {
  group: string;
  label: string;
}

export const POLICY_TYPE_OPTIONS: PolicyTypeOption[] = POLICY_TYPE_GROUPS.flatMap((g) =>
  g.options.map((label) => ({ group: g.group, label }))
);
