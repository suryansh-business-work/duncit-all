/**
 * The grievance GraphQL documents, as SDL strings.
 *
 * mWeb, the native app and the website all raise the same grievance and read
 * the same officer, and each one wraps documents differently (Apollo's `gql`
 * on the apps, a bare `fetch` on the Astro site). Strings are the one form all
 * three accept, so the query lives here once instead of three times — the same
 * trick @duncit/slack uses for SUBMIT_APP_FEEDBACK_SDL.
 *
 * Framework-free on purpose: the native app cannot import a package that pulls
 * in graphql or React.
 */

export const SUBMIT_GRIEVANCE_SDL = `
  mutation SubmitGrievance($input: SubmitGrievanceInput!) {
    submitGrievance(input: $input) {
      id
      grievance_no
      status
    }
  }
`;

export const GRIEVANCE_OFFICER_SDL = `
  query GrievanceOfficer {
    grievanceOfficer {
      name
      email
      phone
      address
    }
  }
`;

/** What the app and website read to publish the officer block. */
export interface PublicGrievanceOfficer {
  name: string;
  email: string;
  phone: string;
  address: string;
}

/** What `submitGrievance` gives back — the reference number is the point of it. */
export interface SubmittedGrievance {
  id: string;
  grievance_no: string;
  status: string;
}
