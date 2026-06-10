import { gql } from '@apollo/client';

export const USERS = gql`
  query Users($filter: UsersFilter) {
    users(filter: $filter) {
      user_id
      first_name
      last_name
      full_name
      email
      phone_number
      roles
      profile_photo
      is_email_verified
      auth_providers
      last_login_provider
      last_login_at
      city
      zone
      status
      created_at
    }
    roles {
      id
      key
      name
    }
  }
`;

export const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      user_id
    }
  }
`;
