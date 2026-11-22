import { gql } from '@/generated/graphql';

/**
 * The host's own Minimum Advance Days for Pod Creation — their Hosts-console
 * override, else Pod Settings. The same operation mWeb sends
 * (`@duncit/utils` MY_POD_MIN_ADVANCE_DAYS_SDL, rule 29), written out because
 * the mobile codegen reads these templates statically.
 */
export const MyPodMinAdvanceDaysDocument = gql(`
  query MobileMyPodMinAdvanceDays {
    myPodMinAdvanceDays
  }
`);
