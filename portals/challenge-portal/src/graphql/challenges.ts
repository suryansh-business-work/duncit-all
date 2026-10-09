import { gql } from '@apollo/client';
import type { ChallengeToolInstance, ChallengeWinnerRules } from '@duncit/gql-types';

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
  participant_mode: string;
  tool_instances: ChallengeToolInstance[];
  winner_rules: ChallengeWinnerRules;
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
    participant_mode
    tool_instances {
      instance_id
      tool_id
      tool_type
      tool_version
      preset_id
      label
      config_json
    }
    winner_rules {
      rank_by
      direction
      tie_breakers {
        rank_by
        direction
      }
      podium_size
    }
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

export const DUPLICATE_CHALLENGE = gql`
  mutation DuplicateChallenge($id: ID!) {
    duplicateChallenge(id: $id) {
      id
    }
  }
`;

export const DELETE_CHALLENGE = gql`
  mutation DeleteChallenge($id: ID!) {
    deleteChallenge(id: $id)
  }
`;
