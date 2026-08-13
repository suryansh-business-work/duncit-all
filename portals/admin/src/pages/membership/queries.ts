import { gql } from '@apollo/client';

export const PLANS_TABLE = gql`
  query MembershipPlansTable($query: TableQueryInput) {
    membershipPlansTable(query: $query) {
      total
      rows {
        id
        key
        name
        tagline
        price_label
        price_note
        badge_label
        accent_color
        cta_label
        sort_order
        is_active
        updated_at
      }
    }
  }
`;

/** The tier list drives the Benefit dialog's one-input-per-plan editor, so it
 * is read whole rather than paged. */
export const PLANS = gql`
  query MembershipPlans {
    membershipPlans {
      id
      key
      name
      sort_order
      is_active
    }
  }
`;

export const BENEFITS_TABLE = gql`
  query MembershipBenefitsTable($query: TableQueryInput) {
    membershipBenefitsTable(query: $query) {
      total
      rows {
        id
        group
        label
        sort_order
        is_active
        updated_at
        values {
          plan_key
          value
        }
      }
    }
  }
`;

export const SUBSCRIBERS_TABLE = gql`
  query MembershipNewsSubscribersTable($query: TableQueryInput) {
    membershipNewsSubscribersTable(query: $query) {
      total
      rows {
        id
        user_id
        email
        name
        created_at
      }
    }
  }
`;

export const CREATE_PLAN = gql`
  mutation CreateMembershipPlan($input: MembershipPlanInput!) {
    createMembershipPlan(input: $input) {
      id
    }
  }
`;

export const UPDATE_PLAN = gql`
  mutation UpdateMembershipPlan($plan_id: ID!, $input: MembershipPlanUpdateInput!) {
    updateMembershipPlan(plan_id: $plan_id, input: $input) {
      id
    }
  }
`;

export const DELETE_PLAN = gql`
  mutation DeleteMembershipPlan($plan_id: ID!) {
    deleteMembershipPlan(plan_id: $plan_id)
  }
`;

export const CREATE_BENEFIT = gql`
  mutation CreateMembershipBenefit($input: MembershipBenefitInput!) {
    createMembershipBenefit(input: $input) {
      id
    }
  }
`;

export const UPDATE_BENEFIT = gql`
  mutation UpdateMembershipBenefit($benefit_id: ID!, $input: MembershipBenefitUpdateInput!) {
    updateMembershipBenefit(benefit_id: $benefit_id, input: $input) {
      id
    }
  }
`;

export const DELETE_BENEFIT = gql`
  mutation DeleteMembershipBenefit($benefit_id: ID!) {
    deleteMembershipBenefit(benefit_id: $benefit_id)
  }
`;
