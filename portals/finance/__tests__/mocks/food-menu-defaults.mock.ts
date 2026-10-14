import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import type { FoodTaxDefaultsInput, FoodTaxMode } from '@duncit/gql-types';
import { FOOD_TAX_DEFAULTS, UPDATE_FOOD_TAX_DEFAULTS } from '../../src/pages/finance/food-menu-defaults-page/queries';

/** Finance > Food Menu Defaults: the GST every venue without its own is priced with. */

export const makeFoodTaxDefaults = (tax_mode: FoodTaxMode = 'INCLUSIVE', gst_pct = 5) => ({
  __typename: 'FoodTaxDefaults' as const,
  tax_mode,
  gst_pct,
});

export const foodTaxDefaultsMock = (defaults = makeFoodTaxDefaults()): MockedResponse => ({
  request: { query: FOOD_TAX_DEFAULTS },
  result: { data: { foodTaxDefaults: defaults } },
  maxUsageCount: 10,
});

export const foodTaxDefaultsErrorMock = (): MockedResponse => ({
  request: { query: FOOD_TAX_DEFAULTS },
  error: new Error('food defaults unavailable'),
});

/** Records the input it was sent; answers with it as stored, or with the server's refusal. */
export const updateFoodTaxDefaultsMock = (
  sent: FoodTaxDefaultsInput[],
  over: { fail?: boolean } = {},
): MockedResponse => ({
  request: {
    query: UPDATE_FOOD_TAX_DEFAULTS,
    variables: (vars: { input: FoodTaxDefaultsInput }) => {
      sent.push(vars.input);
      return true;
    },
  },
  result: (vars: { input: FoodTaxDefaultsInput }) =>
    over.fail
      ? { errors: [new GraphQLError('GST must be a whole number from 0 to 28')] }
      : { data: { updateFoodTaxDefaults: makeFoodTaxDefaults(vars.input.tax_mode, vars.input.gst_pct) } },
  maxUsageCount: 10,
});
