import { gql } from '@apollo/client';

/** The console's documents — staff reads and moderation (server: gigAdmin.service). */

const CONTACT = 'contact { name phone email }';

export const GIG_JOB_STATS = gql`
  query GigJobStats {
    gigJobStats { total open closed interests freelancers posters categories }
  }
`;

export const GIG_JOBS_ADMIN_TABLE = gql`
  query GigJobsAdminTable($query: TableQueryInput) {
    gigJobsAdminTable(query: $query) {
      total page page_size
      rows {
        id title category_title roles event_type event_date city budget openings status
        poster_role poster_name poster_user_id interest_count created_at ${CONTACT}
      }
    }
  }
`;

export const FREELANCERS_ADMIN_TABLE = gql`
  query FreelancersAdminTable($query: TableQueryInput) {
    freelancersAdminTable(query: $query) {
      total page page_size
      rows {
        id user_id display_name city skills category_titles experience_years portfolio_url is_available
        created_at ${CONTACT}
      }
    }
  }
`;

export const GIG_INTERESTS_ADMIN_TABLE = gql`
  query GigInterestsAdminTable($query: TableQueryInput, $job_id: ID) {
    gigInterestsAdminTable(query: $query, job_id: $job_id) {
      total page page_size
      rows { id job_id job_title freelancer_name skills message created_at ${CONTACT} }
    }
  }
`;

export const ADMIN_SET_GIG_JOB_STATUS = gql`
  mutation AdminSetGigJobStatus($id: ID!, $status: GigJobStatus!) {
    adminSetGigJobStatus(id: $id, status: $status)
  }
`;

export const ADMIN_DELETE_GIG_JOB = gql`
  mutation AdminDeleteGigJob($id: ID!) {
    adminDeleteGigJob(id: $id)
  }
`;
