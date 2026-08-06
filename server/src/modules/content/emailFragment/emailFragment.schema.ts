import gql from 'graphql-tag';
import { EMAIL_CATEGORIES } from '@services/email/email.provider';

/**
 * The nine values, SPELLED OUT rather than interpolated from EMAIL_CATEGORIES.
 *
 * graphql-codegen's code-file loader plucks these template literals WITHOUT
 * evaluating them, so an interpolated enum body leaves the loader with an enum
 * it cannot parse — and every other file that names `EmailCategory` then fails
 * with "Unknown type: EmailCategory".
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
  "Why an email is being sent. The nine fragments that ship map one-to-one onto these."
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
  The header and footer that wrap a template's body.

  Nine ship with Duncit, one per email category, and cannot be deleted — a
  template that lost its header mid-flight would send bare. Beyond those an
  admin adds their own and removes them again.
  """
  type EmailFragment {
    fragment_id: ID!
    "Stable, immutable identity. A template stores this."
    key: String!
    "Set for the nine that ship; null for one an admin added."
    category: EmailCategory
    "True for the nine. Editable and switchable, never deletable."
    is_system: Boolean!
    name: String!
    description: String
    "MJML injected at the top of the template's mj-body."
    header_mjml: String!
    "MJML injected at the bottom of the template's mj-body."
    footer_mjml: String!
    "Off means templates naming it render without the wrap."
    is_active: Boolean!
    created_at: String
    updated_at: String
  }

  input CreateEmailFragmentInput {
    name: String!
    description: String
    header_mjml: String
    footer_mjml: String
  }

  input UpdateEmailFragmentInput {
    name: String
    description: String
    header_mjml: String
    footer_mjml: String
    is_active: Boolean
  }

  extend type Query {
    "Every fragment — the nine first, then the custom ones."
    emailFragments: [EmailFragment!]!
    emailFragment(key: String!): EmailFragment
  }

  extend type Mutation {
    "Add a fragment of your own. It belongs to no category and can be deleted."
    createEmailFragment(input: CreateEmailFragmentInput!): EmailFragment!
    updateEmailFragment(key: String!, input: UpdateEmailFragmentInput!): EmailFragment!
    """
    Delete a fragment you added. Refused for the nine that ship. Templates
    naming it are released rather than left pointing at nothing.
    """
    deleteEmailFragment(key: String!): Boolean!
    "Restore one of the nine to the header and footer it shipped with."
    resetEmailFragment(key: String!): EmailFragment!
  }
`;
