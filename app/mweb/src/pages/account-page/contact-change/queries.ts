import { gql } from '@apollo/client';

/**
 * The mutations behind a contact change.
 *
 * The address and the WhatsApp number take two steps, never one: the code has
 * to be sent before it can be typed, and the value is only stored once the code
 * comes back. A single mutation would have to hold the new value somewhere
 * while it waited, which is exactly what the server's `email_change_pending`
 * field does instead.
 *
 * The contact number takes one — `SET_CONTACT_PHONE_NUMBER` — because there is
 * no code to wait for. `contactChangeNeedsOtp` is what picks between them.
 */

export const SET_CONTACT_PHONE_NUMBER = gql`
  mutation SetContactPhoneNumber($ext: String!, $num: String!) {
    setContactPhoneNumber(phone_extension: $ext, phone_number: $num) {
      user_id
      phone_number
      phone_extension
      is_phone_verified
    }
  }
`;

export const REQUEST_PHONE_CHANGE_OTP = gql`
  mutation RequestContactPhoneChangeOtp(
    $field: ContactPhoneField!
    $ext: String!
    $num: String!
  ) {
    requestContactPhoneChangeOtp(
      field: $field
      phone_extension: $ext
      phone_number: $num
    ) {
      challenge_id
      resend_after_seconds
      test_code
    }
  }
`;

export const CONFIRM_PHONE_CHANGE = gql`
  mutation ConfirmContactPhoneChange(
    $field: ContactPhoneField!
    $ext: String!
    $num: String!
    $otp: String!
  ) {
    confirmContactPhoneChange(
      field: $field
      phone_extension: $ext
      phone_number: $num
      otp: $otp
    ) {
      user_id
      phone_number
      phone_extension
      is_phone_verified
      whatsapp_number
      whatsapp_extension
    }
  }
`;

export const REQUEST_EMAIL_CHANGE_OTP = gql`
  mutation RequestEmailChangeOtp($email: String!) {
    requestEmailChangeOtp(email: $email) {
      ok
      dev_otp
    }
  }
`;

export const CONFIRM_EMAIL_CHANGE = gql`
  mutation ConfirmEmailChange($email: String!, $otp: String!) {
    confirmEmailChange(email: $email, otp: $otp) {
      user_id
      email
      is_email_verified
    }
  }
`;
