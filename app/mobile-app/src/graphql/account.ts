import { gql } from '@/generated/graphql';

/**
 * Current user for the account drawer — the same `me` fields mWeb's header
 * reads (name, email, photo, roles) so the mobile sidebar shows identical
 * identity + role chips. Typed via codegen (rule 13).
 */
export const MobileMeDocument = gql(`
  query MobileMe {
    me {
      user_id
      username
      first_name
      last_name
      full_name
      email
      phone_number
      phone_extension
      profile_photo
      bio
      roles
      locale
      timezone
      country
      city
      state
      zone
      assigned_city
      assigned_zones
      selected_location_id
      is_email_verified
      is_phone_verified
      # Checkout refuses an account with no billing address, and this document
      # is already loaded app-wide — so the gate costs no extra request.
      address {
        line1
      }
      onboarding_survey_completed
      created_at
      updated_at
      saved_pod_ids
    }
  }
`);

/**
 * Full profile-settings record — the same `me` fields mWeb's AccountPage reads
 * (contact, location, dob, status, plus the whatsapp fields the edit form needs).
 * Powers the mobile Account (Profile Settings) screen.
 */
export const MobileAccountDocument = gql(`
  query MobileAccount {
    me {
      user_id
      username
      first_name
      last_name
      full_name
      email
      phone_number
      phone_extension
      whatsapp_number
      whatsapp_extension
      profile_photo
      bio
      city
      state
      country
      address {
        line1
        line2
        landmark
        city
        state
        pincode
        country
      }
      dob
      roles
      status
      profile_visibility
      created_at
    }
  }
`);

/** Toggle the signed-in user's profile privacy (public/private). */
export const MobileUpdateProfileVisibilityDocument = gql(`
  mutation MobileUpdateProfileVisibility($visibility: ProfileVisibility!) {
    updateMyProfileVisibility(visibility: $visibility) {
      user_id
      profile_visibility
    }
  }
`);

/** Account health for the signed-in user — mWeb's MY_ACCOUNT_HEALTH. */
export const MobileAccountHealthDocument = gql(`
  query MobileAccountHealth {
    myAccountHealth {
      base_score
      delta_sum
      total_score
      band
      adjustments {
        id
        delta
        remark
        created_by_name
        created_at
      }
    }
  }
`);

/** Update the signed-in user's profile — mWeb's UPDATE_MY_PROFILE. */
export const MobileUpdateProfileDocument = gql(`
  mutation MobileUpdateMyProfile($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
      user_id
      first_name
      last_name
      full_name
      bio
      city
      state
      country
      phone_number
      phone_extension
      whatsapp_number
      whatsapp_extension
      profile_photo
      address {
        line1
        line2
        landmark
        city
        state
        pincode
        country
      }
    }
  }
`);

/**
 * Step 1 of a phone or WhatsApp change — send a code to the NEW number.
 *
 * Twin of mWeb's REQUEST_PHONE_CHANGE_OTP. `test_code` is filled only while no
 * SMS or WhatsApp transport is wired, which is when the server hands the code
 * straight back for the screen to display.
 */
export const MobileRequestContactPhoneChangeOtpDocument = gql(`
  mutation MobileRequestContactPhoneChangeOtp($field: ContactPhoneField!, $ext: String!, $num: String!) {
    requestContactPhoneChangeOtp(field: $field, phone_extension: $ext, phone_number: $num) {
      challenge_id
      resend_after_seconds
      test_code
    }
  }
`);

/** Step 2 of a phone or WhatsApp change — spend the code and store the number. */
export const MobileConfirmContactPhoneChangeDocument = gql(`
  mutation MobileConfirmContactPhoneChange($field: ContactPhoneField!, $ext: String!, $num: String!, $otp: String!) {
    confirmContactPhoneChange(field: $field, phone_extension: $ext, phone_number: $num, otp: $otp) {
      user_id
      phone_number
      phone_extension
      is_phone_verified
      whatsapp_number
      whatsapp_extension
    }
  }
`);

/** Step 1 of an email change — email a code to the NEW address. */
export const MobileRequestEmailChangeOtpDocument = gql(`
  mutation MobileRequestEmailChangeOtp($email: String!) {
    requestEmailChangeOtp(email: $email) {
      ok
      dev_otp
    }
  }
`);

/** Step 2 of an email change — spend the code and store the address. */
export const MobileConfirmEmailChangeDocument = gql(`
  mutation MobileConfirmEmailChange($email: String!, $otp: String!) {
    confirmEmailChange(email: $email, otp: $otp) {
      user_id
      email
      is_email_verified
    }
  }
`);

/** Step 1 of change-password — verify current password, email an OTP. */
export const MobileRequestPasswordChangeOtpDocument = gql(`
  mutation MobileRequestPasswordChangeOtp($input: RequestPasswordChangeInput!) {
    requestPasswordChangeOtp(input: $input) {
      ok
    }
  }
`);

/** Step 2 of change-password — commit the new password with the emailed OTP. */
export const MobileChangePasswordWithOtpDocument = gql(`
  mutation MobileChangePasswordWithOtp($input: ChangePasswordInput!) {
    changePasswordWithOtp(input: $input)
  }
`);

/** Step 1 of the deletion flow — email a confirmation code. */
export const MobileRequestAccountDeletionOtpDocument = gql(`
  mutation MobileRequestAccountDeletionOtp {
    requestAccountDeletionOtp {
      ok
    }
  }
`);

/*
  Step 2 FILES A REQUEST; it does not delete. The code proves who is asking,
  and what it buys is a row in the Tech portal's queue — the account keeps
  working until somebody there acts on it.
*/
export const MobileSubmitAccountDeletionRequestDocument = gql(`
  mutation MobileSubmitAccountDeletionRequest($input: SubmitAccountDeletionRequestInput!) {
    submitAccountDeletionRequest(input: $input) {
      id
      request_id
      status
      requested_at
      scheduled_delete_at
      days_remaining
    }
  }
`);

/** The member's own open request — what the banner in Profile Settings and the
 * warning on the next sign-in both read. */
export const MobileMyAccountDeletionRequestDocument = gql(`
  query MobileMyAccountDeletionRequest {
    myAccountDeletionRequest {
      id
      request_id
      status
      requested_at
      scheduled_delete_at
      days_remaining
    }
  }
`);

/** The retention window, so the warning quotes the number the server will
 * stamp the request with rather than a "30" hardcoded beside the button. */
export const MobileAccountDeletionSettingsDocument = gql(`
  query MobileAccountDeletionSettings {
    accountDeletionSettings {
      retention_days
    }
  }
`);

/** Withdraw an open request. */
export const MobileCancelAccountDeletionRequestDocument = gql(`
  mutation MobileCancelAccountDeletionRequest {
    cancelMyAccountDeletionRequest {
      id
      status
    }
  }
`);

/** Role key → display name map, shared with mWeb's <UserSummary/> chips. */
export const MobileRolesDocument = gql(`
  query MobilePublicRoles {
    publicRoles {
      key
      name
    }
  }
`);

/** Public policy links for the drawer's collapsible Policies section. */
export const MobilePublicPoliciesDocument = gql(`
  query MobilePublicPolicies {
    publicPolicies {
      id
      slug
      title
    }
  }
`);

/** A single policy by slug — backs the /policies/[slug] reader screen. */
export const MobilePolicyBySlugDocument = gql(`
  query MobilePolicyBySlug($slug: String!) {
    policyBySlug(slug: $slug) {
      id
      slug
      title
      content
    }
  }
`);

/**
 * Email verification — the RN twin of mWeb's EmailVerificationForm. Requesting
 * mails the OTP to the address already on the account, so neither mutation
 * takes an email argument.
 */
export const MobileRequestEmailVerificationOtpDocument = gql(`
  mutation MobileRequestEmailVerificationOtp {
    requestEmailVerificationOtp {
      ok
      dev_otp
    }
  }
`);

export const MobileVerifyEmailVerificationOtpDocument = gql(`
  mutation MobileVerifyEmailVerificationOtp($otp: String!) {
    verifyEmailVerificationOtp(otp: $otp) {
      user_id
      is_email_verified
    }
  }
`);

/**
 * Profile > Connected accounts — what this account can sign in with, plus the
 * connect/disconnect pair. `has_password` is what decides whether Google may be
 * disconnected: without one it is the only way in. mWeb twin.
 */
export const MobileMyConnectedAccountsDocument = gql(`
  query MobileMyConnectedAccounts {
    myConnectedAccounts {
      email
      has_password
      google {
        google_email
        linked_at
      }
    }
  }
`);

export const MobileConnectGoogleAccountDocument = gql(`
  mutation MobileConnectGoogleAccount($input: GoogleAuthInput!) {
    connectGoogleAccount(input: $input) {
      email
      has_password
      google {
        google_email
        linked_at
      }
    }
  }
`);

export const MobileDisconnectGoogleAccountDocument = gql(`
  mutation MobileDisconnectGoogleAccount {
    disconnectGoogleAccount {
      email
      has_password
      google {
        google_email
        linked_at
      }
    }
  }
`);
