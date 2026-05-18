import { gql } from '@apollo/client';

export const MY_HOST = gql`
  query PartnerMyHost {
    myHost {
      id step_completed status full_name email phone dob aadhar_number pan_number
      passport_photo_url police_verification_url full_address reviewer_notes
    }
  }
`;

export const STEP1 = gql`mutation PartnerH1($input: HostStep1Input!) { submitHostStep1(input: $input) { id step_completed } }`;
export const STEP2 = gql`mutation PartnerH2($input: HostStep2Input!) { submitHostStep2(input: $input) { id step_completed } }`;
export const STEP3 = gql`mutation PartnerH3($input: HostStep3Input!) { submitHostStep3(input: $input) { id step_completed } }`;
export const FINAL = gql`mutation PartnerHFinal { submitHostFinal { id status } }`;