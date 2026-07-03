export const jobApplicationTypeDefs = /* GraphQL */ `
  enum JobApplicationStatus {
    NEW
    SHORTLISTED
    REJECTED
    HIRED
  }

  "A public careers-page application, triaged in the Website portal."
  type JobApplication {
    id: ID!
    role_content_id: ID
    role_title: String!
    name: String!
    email: String!
    phone: String!
    resume_url: String!
    portfolio_url: String!
    cover_note: String!
    status: JobApplicationStatus!
    created_at: String!
    updated_at: String!
  }

  input SubmitJobApplicationInput {
    role_content_id: ID
    role_title: String!
    name: String!
    email: String!
    phone: String
    resume_url: String
    portfolio_url: String
    cover_note: String
  }

  type JobApplicationResult {
    ok: Boolean!
    message: String!
  }

  extend type Query {
    jobApplications(status: JobApplicationStatus): [JobApplication!]!
  }

  extend type Mutation {
    "Public: apply to an open role from the careers page."
    submitJobApplication(input: SubmitJobApplicationInput!): JobApplicationResult!
    updateJobApplicationStatus(application_id: ID!, status: JobApplicationStatus!): JobApplication!
    deleteJobApplication(application_id: ID!): Boolean!
  }
`;
