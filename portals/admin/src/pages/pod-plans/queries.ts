import { gql } from '@apollo/client';

export const PLANS = gql`
  query PodPlans {
    podPlans {
      id
      key
      name
      description
      image_url
      features
      price_label
      is_coming_soon
      sort_order
      is_active
      updated_at
    }
  }
`;

export const PLANS_TABLE = gql`
  query PodPlansTable($query: TableQueryInput) {
    podPlansTable(query: $query) {
      total
      rows {
        id
        key
        name
        description
        image_url
        features
        price_label
        is_coming_soon
        sort_order
        is_active
        updated_at
      }
    }
  }
`;

export const CREATE_POD_PLAN = gql`
  mutation CreatePodPlan($input: PodPlanInput!) {
    createPodPlan(input: $input) {
      id
    }
  }
`;

export const UPDATE_POD_PLAN = gql`
  mutation UpdatePodPlan($plan_id: ID!, $input: PodPlanUpdateInput!) {
    updatePodPlan(plan_id: $plan_id, input: $input) {
      id
    }
  }
`;

export const DELETE_POD_PLAN = gql`
  mutation DeletePodPlan($plan_id: ID!) {
    deletePodPlan(plan_id: $plan_id)
  }
`;
