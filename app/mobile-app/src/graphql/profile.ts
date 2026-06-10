import { gql } from '@/generated/graphql';

/** The signed-in user's profile + their posts — RN port of mWeb's MeAndMyPosts. */
export const ProfileDocument = gql(`
  query MobileProfile {
    me {
      user_id
      first_name
      last_name
      full_name
      email
      is_email_verified
      profile_photo
      bio
      roles
      profile_links {
        label
        url
      }
      followers_count
      following_count
      pet_profile {
        name
        species
        breed
        age
        photo_url
        bio
      }
    }
    myPosts {
      id
      image_url
      caption
      likes_count
      comments_count
      created_at
    }
  }
`);
