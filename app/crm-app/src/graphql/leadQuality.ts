import { gql } from '@/generated/graphql';

/** CRM › Quality Analytics — the portal page's read, for every lead type or one. */
export const CrmAppQualityAnalyticsDocument = gql(`
  query CrmAppQualityAnalytics($entity_type: CrmEntityType) {
    crmLeadQualityAnalytics(entity_type: $entity_type) {
      generated_at
      duplicate_leads
      by_type {
        entity_type total scored average_score qualified not_qualified
        pending_verification failed_gate_leads pending_items
        classifications { key label count }
        distribution { key label count }
      }
      top_leads { entity_type id name city score classification_label qualification }
      cities { city leads average_score qualified }
      trend { week leads average_score }
      conversion { classification label leads won conversion_rate }
      origins { origin leads average_score qualified }
      missing_evidence { entity_type criterion leads }
      research_queue { key label count average_score }
    }
  }
`);
