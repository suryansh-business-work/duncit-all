import { gql } from '@apollo/client';

export interface LitePolicyLink {
  id: string;
  title: string;
  slug: string;
}

export interface LitePolicyPage extends LitePolicyLink {
  /** Rich-text HTML written in the console. */
  content: string;
  updated_at: string | null;
}

/** The live policies the footer links to. */
export const LITE_POLICIES = gql`
  query LitePolicies {
    litePolicies {
      id
      title
      slug
    }
  }
`;

export const LITE_POLICY = gql`
  query LitePolicy($slug: String!) {
    litePolicy(slug: $slug) {
      id
      title
      slug
      content
      updated_at
    }
  }
`;
