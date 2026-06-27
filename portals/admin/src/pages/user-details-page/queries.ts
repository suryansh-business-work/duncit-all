import { gql } from '@apollo/client';

export const USER = gql`
  query AdminUser($user_id: ID!) {
    user(user_id: $user_id) {
      user_id
      first_name
      last_name
      full_name
      email
      is_email_verified
      phone_number
      phone_extension
      is_phone_verified
      country
      city
      state
      pincode
      zone
      assigned_city
      assigned_zones
      profile_photo
      bio
      profile_links {
        label
        url
      }
      interest_category_ids
      interest_categories {
        id
        name
        level
        parent_id
      }
      status
      roles
      host_share_pct
      host_commission_pct
      dob
      created_at
      updated_at
    }
    roles {
      id
      key
      name
      description
      is_system
    }
  }
`;

export const UPDATE_USER = gql`
  mutation UpdateUser($user_id: ID!, $input: UpdateUserInput!) {
    updateUser(user_id: $user_id, input: $input) {
      user_id
      first_name
      last_name
      full_name
      email
      phone_number
      phone_extension
      city
      state
      pincode
      zone
      bio
      profile_photo
      status
      assigned_city
      assigned_zones
      host_share_pct
      host_commission_pct
    }
  }
`;

export const ASSIGN_ROLES = gql`
  mutation AssignUserRoles($user_id: ID!, $role_keys: [String!]!) {
    assignUserRoles(user_id: $user_id, role_keys: $role_keys) {
      user_id
      roles
    }
  }
`;

export const DELETE_USER = gql`
  mutation DeleteUser($user_id: ID!) {
    deleteUser(user_id: $user_id)
  }
`;

export const USER_ACTIVITY_YEAR = gql`
  query UserActivityYear($user_id: ID!, $year: Int) {
    userActivityYear(user_id: $user_id, year: $year) {
      user_id
      year
      available_years
      total_visits
      days {
        date
        count
        level
      }
    }
  }
`;

export const DELETE_USER_ACTIVITY_DAY = gql`
  mutation DeleteUserActivityDay($user_id: ID!, $date: String!) {
    deleteUserActivityDay(user_id: $user_id, date: $date)
  }
`;

export const DELETE_USER_ACTIVITY_YEAR = gql`
  mutation DeleteUserActivityYear($user_id: ID!, $year: Int!) {
    deleteUserActivityYear(user_id: $user_id, year: $year)
  }
`;

export const USER_CLICKSTREAM = gql`
  query UserClickstream($user_id: ID!, $date: String!, $limit: Int) {
    userClickstream(user_id: $user_id, date: $date, limit: $limit) {
      id
      event_type
      path
      title
      target_tag
      target_text
      target_label
      target_href
      super_category_slug
      checkout_url
      metadata_json
      occurred_at
    }
  }
`;

export const USER_CONTACT_ACTIONS = gql`
  query UserContactActions($user_id: ID!) {
    userContactActions(user_id: $user_id) {
      id
      type
      target
      subject
      notes
      status
      duration_seconds
      twilio_call_sid
      recording_sid
      recording_url
      created_at
    }
  }
`;

export const USER_SUPPORT_TICKETS = gql`
  query UserSupportTickets($email: String, $status: ContactStatus) {
    contactSubmissions(email: $email, status: $status) {
      id
      name
      email
      subject
      message
      attachments
      status
      created_at
    }
  }
`;

export const RECORD_USER_CONTACT_ACTION = gql`
  mutation RecordUserContactAction($input: RecordUserContactActionInput!) {
    recordUserContactAction(input: $input) {
      id
    }
  }
`;

export const START_RECORDED_USER_CALL = gql`
  mutation StartRecordedUserCall($input: StartRecordedUserCallInput!) {
    startRecordedUserCall(input: $input) {
      id
      status
      twilio_call_sid
    }
  }
`;

export const DELETE_USER_CONTACT_ACTION = gql`
  mutation DeleteUserContactAction($action_id: ID!) {
    deleteUserContactAction(action_id: $action_id)
  }
`;

export interface EditForm {
  first_name: string;
  last_name: string;
  email: string;
  phone_extension: string;
  phone_number: string;
  city: string;
  state: string;
  pincode: string;
  zone: string;
  assigned_city: string;
  assigned_zones: string;
  bio: string;
  profile_photo: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export const STATUS_META: Record<
  EditForm['status'],
  { color: 'success' | 'default' | 'error'; label: string }
> = {
  ACTIVE: { color: 'success', label: 'Active' },
  INACTIVE: { color: 'default', label: 'Inactive' },
  SUSPENDED: { color: 'error', label: 'Blocked' },
};
