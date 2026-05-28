/**
 * Canonical, grouped list of legal document types. Rendered as a grouped,
 * searchable Autocomplete when creating/editing a document.
 */
export interface DocumentTypeGroup {
  group: string;
  options: string[];
}

export const DOCUMENT_TYPE_GROUPS: DocumentTypeGroup[] = [
  {
    group: 'Business & Company Documents',
    options: [
      'Memorandum of Understanding (MOU)',
      'Memorandum of Association (MOA)',
      'Articles of Association (AOA)',
      'Partnership Deed',
      'Founders Agreement',
      'Shareholders Agreement (SHA)',
      'LLP Agreement',
      'Joint Venture Agreement (JVA)',
      'Service Level Agreement (SLA)',
      'Master Service Agreement (MSA)',
      'Vendor Agreement',
      'Franchise Agreement',
      'Distribution Agreement',
      'Agency Agreement',
    ],
  },
  {
    group: 'Website / App Legal Documents',
    options: [
      'Terms of Use',
      'Terms & Conditions',
      'Terms of Service (TOS)',
      'Privacy Policy',
      'Cookie Policy',
      'Refund & Cancellation Policy',
      'Shipping & Delivery Policy',
      'Community Guidelines',
      'Acceptable Use Policy (AUP)',
      'Content Policy',
      'User Agreement',
      'End User License Agreement (EULA)',
      'Copyright Policy',
      'DMCA Policy',
      'Disclaimer',
      'Consent Policy',
    ],
  },
  {
    group: 'Employment & HR Documents',
    options: [
      'Employment Agreement',
      'Offer Letter',
      'Appointment Letter',
      'Internship Agreement',
      'Freelancer Agreement',
      'Consultant Agreement',
      'Non-Disclosure Agreement (NDA)',
      'Non-Compete Agreement',
      'Employee Handbook',
      'HR Policy',
      'POSH Policy',
      'Code of Conduct',
    ],
  },
  {
    group: 'Finance & Investment Documents',
    options: [
      'Investment Agreement',
      'SAFE Agreement',
      'Convertible Note Agreement',
      'Loan Agreement',
      'Escrow Agreement',
      'Revenue Sharing Agreement',
      'Subscription Agreement',
    ],
  },
  {
    group: 'Intellectual Property (IP) Documents',
    options: [
      'Trademark Assignment',
      'Copyright Agreement',
      'IP Assignment Agreement',
      'Licensing Agreement',
      'Patent Agreement',
    ],
  },
  {
    group: 'Community / Event / Platform Documents',
    options: [
      'Community Rules',
      'Host Agreement',
      'Creator Agreement',
      'Influencer Agreement',
      'Affiliate Agreement',
      'Sponsorship Agreement',
      'Event Participation Waiver',
      'Volunteer Agreement',
    ],
  },
  {
    group: 'Compliance & Governance',
    options: [
      'Board Resolution',
      'Compliance Policy',
      'Risk Management Policy',
      'Data Processing Agreement (DPA)',
      'GDPR Compliance Document',
      'Information Security Policy',
    ],
  },
  {
    group: 'Minutes & Internal Docs',
    options: [
      'MOM (Minutes of Meeting)',
      'Meeting Resolution',
      'Internal Circular',
      'SOP (Standard Operating Procedure)',
    ],
  },
];

/** Flat option list with its group label, for a grouped MUI Autocomplete. */
export interface DocumentTypeOption {
  group: string;
  label: string;
}

export const DOCUMENT_TYPE_OPTIONS: DocumentTypeOption[] = DOCUMENT_TYPE_GROUPS.flatMap((g) =>
  g.options.map((label) => ({ group: g.group, label }))
);

/** The documents Duncit cares about most — surfaced as quick-pick suggestions. */
export const PRIORITY_DOCUMENT_TYPES: string[] = [
  'Terms of Service (TOS)',
  'Privacy Policy',
  'Community Guidelines',
  'Host Agreement',
  'Refund & Cancellation Policy',
  'Non-Disclosure Agreement (NDA)',
  'Founders Agreement',
  'Vendor Agreement',
  'Creator Agreement',
  'Cookie Policy',
];
