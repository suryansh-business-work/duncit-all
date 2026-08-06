import gql from 'graphql-tag';
import { EMAIL_CATEGORIES } from '@services/email/email.provider';

/**
 * The enum values are interpolated from EMAIL_CATEGORIES rather than repeated,
 * for the same reason EnvCategory is: the SDL is a string, so a category added
 * in code and forgotten here fails at REQUEST time with "Enum EmailCategory
 * cannot represent value" and no typecheck can catch it.
 */
export const emailFragmentTypeDefs = gql`
  "Why an email is being sent. Decides which header/footer wraps it."
  enum EmailCategory {
    ${EMAIL_CATEGORIES.join('\n    ')}
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
