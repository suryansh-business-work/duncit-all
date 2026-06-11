import { gql } from '@apollo/client';

export const MY_HOST = gql`
  query PartnerMyHost {
    me {
      user_id
      full_name
      first_name
      last_name
      email
    }
    myHost {
      id step_completed status full_name email phone dob aadhar_number pan_number
      passport_photo_url police_verification_url full_address reviewer_notes
    }
  }
`;

export const MY_HOST_PODS = gql`
  query PartnerMyHostPods {
    myHostPods {
      id
      pod_title
      pod_date_time
      pod_amount
      pod_attendees
      product_cost_total
      completed_at
      is_active
    }
  }
`;

export const WITHDRAW_HOST = gql`
  mutation WithdrawHostApplication {
    withdrawHostApplication {
      id
      status
      step_completed
    }
  }
`;

export const STEP1 = gql`mutation PartnerH1($input: HostStep1Input!) { submitHostStep1(input: $input) { id step_completed } }`;
export const STEP2 = gql`mutation PartnerH2($input: HostStep2Input!) { submitHostStep2(input: $input) { id step_completed } }`;
export const STEP3 = gql`mutation PartnerH3($input: HostStep3Input!) { submitHostStep3(input: $input) { id step_completed } }`;
export const FINAL = gql`mutation PartnerHFinal { submitHostFinal { id status } }`;