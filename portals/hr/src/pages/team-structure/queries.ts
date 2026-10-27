import { gql } from '@apollo/client';

const NODE_FIELDS = gql`
  fragment TeamNodeFields on TeamStructureNode {
    id
    structure_id
    parent_id
    kind
    title
    person_name
    user_id
    department
    employment_type
    status
    notes
    sort_order
    monthly_cost
    pay {
      label
      kind
      frequency
      amount
      min_amount
      max_amount
      note
    }
  }
`;

export const TEAM_STRUCTURES = gql`
  query TeamStructures {
    teamStructures {
      id
      name
      description
      currency
      seat_count
      monthly_cost
      updated_at
    }
  }
`;

export const TEAM_STRUCTURE = gql`
  ${NODE_FIELDS}
  query TeamStructure($id: ID!) {
    teamStructure(id: $id) {
      structure {
        id
        name
        description
        currency
      }
      nodes {
        ...TeamNodeFields
      }
    }
  }
`;

export const PUBLIC_TEAM_STRUCTURE = gql`
  ${NODE_FIELDS}
  query PublicTeamStructure($token: String!) {
    publicTeamStructure(token: $token) {
      show_salary
      structure {
        id
        name
        description
        currency
      }
      nodes {
        ...TeamNodeFields
      }
    }
  }
`;

export const SAVE_TEAM_STRUCTURE = gql`
  mutation SaveTeamStructure($id: ID, $name: String!, $description: String, $currency: String) {
    saveTeamStructure(id: $id, name: $name, description: $description, currency: $currency) {
      id
    }
  }
`;

export const DELETE_TEAM_STRUCTURE = gql`
  mutation DeleteTeamStructure($id: ID!) {
    deleteTeamStructure(id: $id)
  }
`;

export const UPSERT_NODE = gql`
  ${NODE_FIELDS}
  mutation UpsertTeamStructureNode($structure_id: ID!, $input: TeamStructureNodeInput!) {
    upsertTeamStructureNode(structure_id: $structure_id, input: $input) {
      ...TeamNodeFields
    }
  }
`;

export const DELETE_NODE = gql`
  mutation DeleteTeamStructureNode($id: ID!) {
    deleteTeamStructureNode(id: $id)
  }
`;

export const TEAM_SHARES = gql`
  query TeamStructureShares($structure_id: ID!) {
    teamStructureShares(structure_id: $structure_id) {
      id
      token
      label
      show_salary
      expires_at
      revoked_at
    }
  }
`;

export const CREATE_SHARE = gql`
  mutation CreateTeamStructureShare($structure_id: ID!, $label: String, $show_salary: Boolean, $expires_at: String) {
    createTeamStructureShare(structure_id: $structure_id, label: $label, show_salary: $show_salary, expires_at: $expires_at) {
      id
    }
  }
`;

export const REVOKE_SHARE = gql`
  mutation RevokeTeamStructureShare($id: ID!) {
    revokeTeamStructureShare(id: $id)
  }
`;
