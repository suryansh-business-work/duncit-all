import { gql } from '@/generated/graphql';

/**
 * Gig Jobs — the same operations mWeb sends (`@duncit/utils` gig-jobs),
 * re-declared inline because the app's codegen only sees documents written in
 * this workspace.
 */

export const GigCategoriesDocument = gql(`
  query MobileGigCategories {
    gigCategories {
      id
      title
      examples
    }
  }
`);

export const GigViewerDocument = gql(`
  query MobileGigViewer {
    gigViewer {
      poster_roles
      is_freelancer
      default_contact {
        name
        phone
        email
      }
    }
  }
`);

export const GigJobsDocument = gql(`
  query MobileGigJobs($filter: GigJobFilter, $offset: Int, $limit: Int) {
    gigJobs(filter: $filter, offset: $offset, limit: $limit) {
      total
      rows {
        ...MobileGigRow
      }
    }
  }
`);

export const MyGigJobsDocument = gql(`
  query MobileMyGigJobs($offset: Int, $limit: Int) {
    myGigJobs(offset: $offset, limit: $limit) {
      total
      rows {
        ...MobileGigRow
      }
    }
  }
`);

export const GigRowFragment = gql(`
  fragment MobileGigRow on GigJob {
    id
    title
    category_title
    roles
    event_type
    event_date
    city
    budget
    openings
    status
    poster_role
    poster_name
    interest_count
    is_mine
    viewer_interested
    created_at
  }
`);

export const GigJobFragment = gql(`
  fragment MobileGigJob on GigJob {
    ...MobileGigRow
    description
    category_id
    location
    contact {
      name
      phone
      email
    }
  }
`);

export const GigJobDocument = gql(`
  query MobileGigJob($id: ID!) {
    gigJob(id: $id) {
      ...MobileGigJob
    }
  }
`);

export const GigJobInterestsDocument = gql(`
  query MobileGigJobInterests($job_id: ID!) {
    gigJobInterests(job_id: $job_id) {
      id
      freelancer_name
      skills
      message
      created_at
      contact {
        name
        phone
        email
      }
    }
  }
`);

export const MyFreelancerProfileDocument = gql(`
  query MobileMyFreelancerProfile {
    myFreelancerProfile {
      id
      display_name
      category_ids
      skills
      city
      bio
      portfolio_url
      experience_years
      contact_phone
      contact_email
      is_available
    }
  }
`);

export const CreateGigJobDocument = gql(`
  mutation MobileCreateGigJob($input: GigJobInput!) {
    createGigJob(input: $input) {
      id
    }
  }
`);

export const UpdateGigJobDocument = gql(`
  mutation MobileUpdateGigJob($id: ID!, $input: GigJobInput!) {
    updateGigJob(id: $id, input: $input) {
      id
    }
  }
`);

export const SetGigJobStatusDocument = gql(`
  mutation MobileSetGigJobStatus($id: ID!, $status: GigJobStatus!) {
    setGigJobStatus(id: $id, status: $status) {
      ...MobileGigJob
    }
  }
`);

export const ExpressGigInterestDocument = gql(`
  mutation MobileExpressGigInterest($job_id: ID!, $message: String) {
    expressGigInterest(job_id: $job_id, message: $message) {
      ...MobileGigJob
    }
  }
`);

export const SaveFreelancerProfileDocument = gql(`
  mutation MobileSaveFreelancerProfile($input: FreelancerProfileInput!) {
    saveFreelancerProfile(input: $input) {
      id
    }
  }
`);
