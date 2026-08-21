import { gql } from '@/generated/graphql';

/**
 * The AI Monitoring chip/dialog copy, edited in AI Portal > AI Monitoring >
 * Settings. Public and unauthenticated on purpose: the notice explaining what
 * happens to an upload has to render before a session resolves, and offline it
 * falls back to the bundled `aiMonitoring.*` copy.
 *
 * The selection matches `AI_MONITORING_CONFIG_QUERY` in @duncit/ai-monitoring
 * (mWeb and the portals use that one directly); native keeps a literal `gql`
 * document because codegen refuses an interpolated one, and codegen validates
 * this against the same schema, so the two cannot drift apart unnoticed.
 */
export const AiMonitoringConfigDocument = gql(`
  query MobileAiMonitoringConfig {
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
`);
