import { gql } from '@apollo/client';

export type AutoReplyKind = 'KEYWORD' | 'FAQ' | 'WELCOME' | 'COMMENT_TO_DM';

/** One auto-reply rule as the server holds it (bounds in auto-reply-rule.types). */
export interface SocialAutoReplyRule {
  id: string;
  name: string;
  kind: AutoReplyKind;
  keywords: string[];
  reply_text: string;
  account_ids: string[];
  trusted: boolean;
  enabled: boolean;
  sent_7d: number;
  updated_at: string | null;
}

export type SocialAutoReplyRuleInput = Omit<SocialAutoReplyRule, 'id' | 'sent_7d' | 'updated_at'>;

const RULE_FIELDS = gql`
  fragment SocialAutoReplyRuleFields on SocialAutoReplyRule {
    id
    name
    kind
    keywords
    reply_text
    account_ids
    trusted
    enabled
    sent_7d
    updated_at
  }
`;

export const SOCIAL_AUTO_REPLY_RULES_TABLE = gql`
  query SocialAutoReplyRulesTable($query: TableQueryInput) {
    socialAutoReplyRulesTable(query: $query) {
      rows {
        ...SocialAutoReplyRuleFields
      }
      total
      page
      page_size
    }
  }
  ${RULE_FIELDS}
`;

export const CREATE_SOCIAL_AUTO_REPLY_RULE = gql`
  mutation CreateSocialAutoReplyRule($input: SocialAutoReplyRuleInput!) {
    createSocialAutoReplyRule(input: $input) {
      ...SocialAutoReplyRuleFields
    }
  }
  ${RULE_FIELDS}
`;

export const UPDATE_SOCIAL_AUTO_REPLY_RULE = gql`
  mutation UpdateSocialAutoReplyRule($id: ID!, $input: SocialAutoReplyRuleInput!) {
    updateSocialAutoReplyRule(id: $id, input: $input) {
      ...SocialAutoReplyRuleFields
    }
  }
  ${RULE_FIELDS}
`;

export const DELETE_SOCIAL_AUTO_REPLY_RULE = gql`
  mutation DeleteSocialAutoReplyRule($id: ID!) {
    deleteSocialAutoReplyRule(id: $id)
  }
`;
