import { gql } from '@apollo/client';

const METRIC_FIELDS = `
  key
  category
  label
  unit
  value
  delta_pct
  definition
  formula
  source
  setting_keys
  series {
    label
    value
  }
`;

export const FOUNDER_DASHBOARD = gql`
  query FounderDashboard($from: String, $to: String) {
    founderDashboard(from: $from, to: $to) {
      from
      to
      top {
        ${METRIC_FIELDS}
      }
      categories {
        key
        label
        icon
        metrics {
          ${METRIC_FIELDS}
        }
      }
      settings {
        key
        value
      }
    }
  }
`;

export const SAVE_FOUNDER_SETTING = gql`
  mutation SaveFounderSetting($input: FounderSettingInput!) {
    saveFounderSetting(input: $input) {
      key
      value
    }
  }
`;
