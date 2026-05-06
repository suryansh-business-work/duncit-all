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
      zone
      assigned_city
      assigned_zones
      profile_photo
      bio
      status
      roles
      permissions
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
      zone
      bio
      profile_photo
      status
      assigned_city
      assigned_zones
    }
  }
`;

export const ASSIGN_ROLES = gql`
  mutation AssignUserRoles($user_id: ID!, $role_keys: [String!]!) {
    assignUserRoles(user_id: $user_id, role_keys: $role_keys) {
      user_id
      roles
      permissions
    }
  }
`;

export const DELETE_USER = gql`
  mutation DeleteUser($user_id: ID!) {
    deleteUser(user_id: $user_id)
  }
`;

export interface EditForm {
  first_name: string;
  last_name: string;
  email: string;
  phone_extension: string;
  phone_number: string;
  city: string;
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
