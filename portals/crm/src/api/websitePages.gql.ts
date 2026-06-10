import { gql } from '@apollo/client';

const WEBSITE_PAGE_FIELDS = `id entity_type lead_id url title status http_status content_text content_chars error fetched_at created_at updated_at`;

export type CrmEntityType = 'VENUE_LEAD' | 'HOST_LEAD';
export type CrmWebsitePageStatus = 'DISCOVERED' | 'FETCHED' | 'ERROR';

export interface CrmWebsitePage {
  id: string;
  entity_type: CrmEntityType;
  lead_id: string;
  url: string;
  title: string | null;
  status: CrmWebsitePageStatus;
  http_status: number | null;
  content_text: string | null;
  content_chars: number;
  error: string | null;
  fetched_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export const CRM_WEBSITE_PAGES = gql`
  query CrmWebsitePages($entity_type: CrmEntityType!, $lead_id: ID!) {
    crmWebsitePages(entity_type: $entity_type, lead_id: $lead_id) { ${WEBSITE_PAGE_FIELDS} }
  }
`;

export const SCRAPE_CRM_WEBSITE_PAGES = gql`
  mutation CrmScrapeWebsitePages($entity_type: CrmEntityType!, $lead_id: ID!, $limit: Int!) {
    crmScrapeWebsitePages(entity_type: $entity_type, lead_id: $lead_id, limit: $limit) {
      discovered
      saved
      pages { ${WEBSITE_PAGE_FIELDS} }
    }
  }
`;

export const FETCH_CRM_WEBSITE_PAGE_CONTENT = gql`
  mutation CrmFetchWebsitePageContent($id: ID!) {
    crmFetchWebsitePageContent(id: $id) { ${WEBSITE_PAGE_FIELDS} }
  }
`;

export const DELETE_CRM_WEBSITE_PAGE = gql`
  mutation CrmDeleteWebsitePage($id: ID!) {
    crmDeleteWebsitePage(id: $id)
  }
`;
