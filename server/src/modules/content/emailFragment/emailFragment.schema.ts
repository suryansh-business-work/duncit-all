import gql from 'graphql-tag';
import { EMAIL_CATEGORIES } from '@services/email/email.provider';

/**
 * The nine values, SPELLED OUT rather than interpolated from EMAIL_CATEGORIES.
 *
 * graphql-codegen's code-file loader plucks these template literals WITHOUT
 * evaluating them, so an interpolated enum body leaves the loader with an enum
 * it cannot parse — and every other file that names `EmailCategory` then fails
 * with "Unknown type: EmailCategory". `EnvCategory` gets away with
 * interpolation only because nothing outside its own file refers to it.
 *
 * The cost of spelling them out is drift, which is what the guard below is for:
 * a category added to the code and forgotten here throws the moment this module
 * is imported, so `pnpm --filter server check:schema` catches it rather than a
 * request at 2am.
 */
const SDL_CATEGORIES = [
  'transactional',
  'authentication',
  'marketing',
  'service',
  'notification',
  'support',
  'billing',
  'legal',
  'internal',
];

if (SDL_CATEGORIES.join(',') !== EMAIL_CATEGORIES.join(',')) {
  throw new Error(
    `EmailCategory drift: the SDL enum lists [${SDL_CATEGORIES.join(', ')}] but EMAIL_CATEGORIES ` +
      `is [${EMAIL_CATEGORIES.join(', ')}]. Update emailFragment.schema.ts to match.`
  );
}

export const emailFragmentTypeDefs = gql`
  "Why an email is being sent. Decides which header/footer wraps it."
  enum EmailCategory {
    transactional
    authentication
    marketing
    service
    notification
    support
    billing
    legal
    internal
  }

  """
  The header and footer that wrap a template's body, one pair per category.
  There are exactly nine and they cannot be created or deleted — only edited,
  switched off, or reset to what they shipped with.
  """
  type EmailFragment {
    fragment_id: ID!
    category: EmailCategory!
    name: String!
    description: String
    "MJML injected at the top of the template's mj-body."
    header_mjml: String!
    "MJML injected at the bottom of the template's mj-body."
    footer_mjml: String!
    "Off means templates in this category render without the wrap."
    is_active: Boolean!
    created_at: String
    updated_at: String
  }

  input UpdateEmailFragmentInput {
    name: String
    description: String
    header_mjml: String
    footer_mjml: String
    is_active: Boolean
  }

  extend type Query {
    "All nine, in category order."
    emailFragments: [EmailFragment!]!
    emailFragment(category: EmailCategory!): EmailFragment
  }

  extend type Mutation {
    updateEmailFragment(category: EmailCategory!, input: UpdateEmailFragmentInput!): EmailFragment!
    "Restore one fragment's header and footer to what they shipped with."
    resetEmailFragment(category: EmailCategory!): EmailFragment!
  }
`;
