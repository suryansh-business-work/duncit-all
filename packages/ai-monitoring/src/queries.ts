/**
 * The one selection of the AI Monitoring copy, as SDL text.
 *
 * A string rather than a `gql` document so this module stays framework-free
 * and Metro can bundle it for the native app: the MUI side wraps it with
 * Apollo's `gql` at the point of use.
 */
export const AI_MONITORING_CONFIG_QUERY = `
  query AiMonitoringConfig {
    aiMonitoringConfig {
      chip_enabled
      chip_label
      dialog_title
      dialog_intro
      dialog_points
      dialog_footnote
      dismiss_label
    }
  }
`;
