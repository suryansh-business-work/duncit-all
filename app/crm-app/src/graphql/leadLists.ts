import { gql } from '@/generated/graphql';

/**
 * The portal's per-kind lead listings (Leads › Venue / Host / Ecomm / Creators
 * / Community): the same `*LeadsTable` reads with the same search, filters,
 * sort, paging and Nearby `near`, asking only for what a listing card shows.
 * Each kind's name (and its extra column) is aliased so every card reads the
 * same fields.
 */
export const CrmAppVenueLeadsTableDocument = gql(`
  query CrmAppVenueLeadsTable($query: TableQueryInput, $near: CrmLeadNearInput) {
    venueLeadsTable(query: $query, near: $near) {
      total unplaced
      rows {
        id name: venue_name city lead_status priority assigned_to next_follow_up_date created_at
        super_category { name } contacts { mobile_number email } is_duplicate distance_km geo_precision
        quality { score classification_label tone qualification }
        matched_user { platforms_used last_activity_at }
      }
    }
  }
`);

export const CrmAppHostLeadsTableDocument = gql(`
  query CrmAppHostLeadsTable($query: TableQueryInput, $near: CrmLeadNearInput) {
    hostLeadsTable(query: $query, near: $near) {
      total unplaced
      rows {
        id name: host_name extra: host_type city lead_status priority assigned_to next_follow_up_date created_at
        super_category { name } contacts { mobile_number email } is_duplicate distance_km geo_precision
        quality { score classification_label tone qualification }
        matched_user { platforms_used last_activity_at }
      }
    }
  }
`);

export const CrmAppEcommLeadsTableDocument = gql(`
  query CrmAppEcommLeadsTable($query: TableQueryInput, $near: CrmLeadNearInput) {
    ecommLeadsTable(query: $query, near: $near) {
      total unplaced
      rows {
        id name: seller_name extra: brand_name city lead_status priority assigned_to next_follow_up_date created_at
        super_category { name } contacts { mobile_number email } is_duplicate distance_km geo_precision
        quality { score classification_label tone qualification }
        matched_user { platforms_used last_activity_at }
      }
    }
  }
`);

export const CrmAppCreatorLeadsTableDocument = gql(`
  query CrmAppCreatorLeadsTable($query: TableQueryInput, $near: CrmLeadNearInput) {
    creatorLeadsTable(query: $query, near: $near) {
      total unplaced
      rows {
        id name: creator_name extra: primary_platform city lead_status priority assigned_to next_follow_up_date created_at
        super_category { name } contacts { mobile_number email } is_duplicate distance_km geo_precision
        quality { score classification_label tone qualification }
      }
    }
  }
`);

export const CrmAppCommunityLeadsTableDocument = gql(`
  query CrmAppCommunityLeadsTable($query: TableQueryInput, $near: CrmLeadNearInput) {
    communityLeadsTable(query: $query, near: $near) {
      total unplaced
      rows {
        id name: community_name extra: community_type city lead_status priority assigned_to next_follow_up_date created_at
        super_category { name } contacts { mobile_number email } is_duplicate distance_km geo_precision
        quality { score classification_label tone qualification }
      }
    }
  }
`);

export const CrmAppDeleteVenueLeadDocument = gql(
  `mutation CrmAppDeleteVenueLead($id: ID!) { deleteVenueLead(id: $id) }`,
);
export const CrmAppDeleteHostLeadDocument = gql(
  `mutation CrmAppDeleteHostLead($id: ID!) { deleteHostLead(id: $id) }`,
);
export const CrmAppDeleteEcommLeadDocument = gql(
  `mutation CrmAppDeleteEcommLead($id: ID!) { deleteEcommLead(id: $id) }`,
);
export const CrmAppDeleteCreatorLeadDocument = gql(
  `mutation CrmAppDeleteCreatorLead($id: ID!) { deleteCreatorLead(id: $id) }`,
);
export const CrmAppDeleteCommunityLeadDocument = gql(
  `mutation CrmAppDeleteCommunityLead($id: ID!) { deleteCommunityLead(id: $id) }`,
);

/** The listing's "Recalculate scores": rescore every lead of a kind as a background job. */
export const CrmAppRecalculateLeadScoresDocument = gql(`
  mutation CrmAppRecalculateLeadScores($entity_type: CrmEntityType!) {
    recalculateCrmLeadQualityScores(entity_type: $entity_type) { job_id total }
  }
`);

/** Fill with AI: the leads the AI reads in pasted text, as JSON. */
export const CrmAppAiParseLeadsDocument = gql(`
  mutation CrmAppAiParseLeads($entity: CrmAiEntity!, $text: String!) {
    aiParseCrmLeads(entity: $entity, text: $text)
  }
`);

/** Nearby leads › a city or area: the admin Location list (cities and their zones). */
export const CrmAppNearbyLocationsDocument = gql(`
  query CrmAppNearbyLocations {
    locations(filter: { is_active: true }) { id city location_zones { zone_name } }
  }
`);

/** Excel import, step 1: the spreadsheet's column headers (the portal's ExcelImportDialog). */
export const CrmAppExcelInspectDocument = gql(`
  query CrmAppExcelInspect($content_base64: String!) {
    crmExcelInspect(content_base64: $content_base64) { headers }
  }
`);

/** Excel import, step 2: create a lead per row with the columns mapped to lead fields. */
export const CrmAppExcelImportDocument = gql(`
  mutation CrmAppExcelImport($entity: CrmAiEntity!, $content_base64: String!, $mapping: [CrmImportMappingInput!]) {
    crmExcelImport(entity: $entity, content_base64: $content_base64, mapping: $mapping) {
      inserted failed errors { row message }
    }
  }
`);
