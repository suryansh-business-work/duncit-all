import { gql } from '@apollo/client';
import type { FoodTaxDefaults, FoodTaxDefaultsInput } from '@duncit/gql-types';

/** Finance → Food Menu Defaults: the GST every venue without its own is priced with. */
export const FOOD_TAX_DEFAULTS = gql`
  query FoodTaxDefaults {
    foodTaxDefaults {
      tax_mode
      gst_pct
    }
  }
`;

export const UPDATE_FOOD_TAX_DEFAULTS = gql`
  mutation UpdateFoodTaxDefaults($input: FoodTaxDefaultsInput!) {
    updateFoodTaxDefaults(input: $input) {
      tax_mode
      gst_pct
    }
  }
`;

export type FoodTaxDefaultsData = { foodTaxDefaults: Pick<FoodTaxDefaults, 'tax_mode' | 'gst_pct'> };
export type UpdateFoodTaxDefaultsData = { updateFoodTaxDefaults: Pick<FoodTaxDefaults, 'tax_mode' | 'gst_pct'> };
export type UpdateFoodTaxDefaultsVars = { input: FoodTaxDefaultsInput };
