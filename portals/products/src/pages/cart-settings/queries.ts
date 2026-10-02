import { gql } from '@apollo/client';

const CART_SETTINGS_FIELDS = `
  nudge_enabled
  nudge_delay_minutes
  nudge_auto_hide_seconds
  email_enabled
  email_first_delay_hours
  email_repeat_hours
  email_max_count
  updated_at
`;

export const PRODUCT_CART_SETTINGS = gql`
  query ProductCartSettings {
    productCartSettings {
      ${CART_SETTINGS_FIELDS}
    }
  }
`;

export const UPDATE_PRODUCT_CART_SETTINGS = gql`
  mutation UpdateProductCartSettings($input: UpdateProductCartSettingsInput!) {
    updateProductCartSettings(input: $input) {
      ${CART_SETTINGS_FIELDS}
    }
  }
`;
