import { gql } from '@apollo/client';

export const REQUEST_OTP = gql`
  mutation RequestWhatsAppOtp($ext: String!, $num: String!) {
    requestWhatsAppOtp(phone_extension: $ext, phone_number: $num) {
      ok
      dev_otp
    }
  }
`;
export const VERIFY_OTP = gql`
  mutation VerifyWhatsAppOtp($ext: String!, $num: String!, $otp: String!) {
    verifyWhatsAppOtp(phone_extension: $ext, phone_number: $num, otp: $otp) {
      user_id
      whatsapp_number
    }
  }
`;
export const SKIP = gql`
  mutation SkipWhatsAppOtp {
    skipWhatsAppOtp {
      user_id
    }
  }
`;
