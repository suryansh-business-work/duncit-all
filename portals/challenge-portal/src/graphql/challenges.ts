import { gql } from '@apollo/client';

export interface Challenge {
  id: string;
  name: string;
  description?: string | null;
  super_category_id?: string | null;
  category_id?: string | null;
  sub_category_id?: string | null;
  super_category_name?: string | null;
  category_name?: string | null;
  sub_category_name?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ChallengeStats {
  total: number;
  active: number;
}

export interface CategoryOption {
  id: string;
  name: string;
}

export interface ChallengeInput {
  name: string;
  description?: string | null;
  super_category_id?: string | null;
  category_id?: string | null;
  sub_category_id?: string | null;
}

const CHALLENGE_FIELDS = gql`
  fragment ChallengeFields on Challenge {
    id
    name
    description
    super_category_id
    category_id
    sub_category_id
    super_category_name
    category_name
    sub_category_name
    is_active
    created_at
  }
`;

export const CHALLENGE_STATS = gql`
  query ChallengeStats {
    challengeStats {
      total
      active
    }
  }
`;

export const CHALLENGES = gql`
  ${CHALLENGE_FIELDS}
  query Challenges($search: String) {
    challenges(search: $search) {
      ...ChallengeFields
    }
  }
`;

/** Server-side table page for the shared @duncit/table engine. */
export const CHALLENGES_TABLE = gql`
  ${CHALLENGE_FIELDS}
  query ChallengesTable($query: TableQueryInput) {
    challengesTable(query: $query) {
      total
      rows {
        ...ChallengeFields
      }
    }
  }
`;

export const CATEGORY_OPTIONS = gql`
  query CategoryOptions($filter: CategoryFilterInput) {
    categories(filter: $filter) {
      id
      name
    }
  }
`;

export const CREATE_CHALLENGE = gql`
  ${CHALLENGE_FIELDS}
  mutation CreateChallenge($input: CreateChallengeInput!) {
    createChallenge(input: $input) {
      ...ChallengeFields
    }
  }
`;

export const UPDATE_CHALLENGE = gql`
  ${CHALLENGE_FIELDS}
  mutation UpdateChallenge($id: ID!, $input: UpdateChallengeInput!) {
    updateChallenge(id: $id, input: $input) {
      ...ChallengeFields
    }
  }
`;

export const DELETE_CHALLENGE = gql`
  mutation DeleteChallenge($id: ID!) {
    deleteChallenge(id: $id)
  }
`;
