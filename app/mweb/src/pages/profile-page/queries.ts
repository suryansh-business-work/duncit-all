import { gql } from '@apollo/client';

export const ME_AND_POSTS = gql`
  query MeAndMyPosts {
    me {
      user_id
      first_name
      last_name
      full_name
      email
      is_email_verified
      profile_photo
      bio
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
      liked_by_me
      created_at
    }
  }
`;

export const POST_DETAILS = gql`
  query PostDetails($id: ID!) {
    post(post_doc_id: $id) {
      id
      author_id
      author {
        user_id
        full_name
        first_name
        profile_photo
      }
      image_url
      caption
      likes_count
      liked_by_me
      comments_count
      comments {
        id
        author_id
        text
        created_at
        author {
          user_id
          full_name
          first_name
          profile_photo
        }
      }
      created_at
    }
  }
`;

export const CREATE_POST = gql`
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
    }
  }
`;
export const UPDATE_MY_PROFILE = gql`
  mutation UpdateMyProfile($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
      user_id
      first_name
      last_name
      full_name
      is_email_verified
      bio
      profile_photo
      profile_links {
        label
        url
      }
    }
  }
`;
export const TOGGLE_LIKE = gql`
  mutation TogglePostLike($id: ID!) {
    togglePostLike(post_doc_id: $id) {
      id
      liked_by_me
      likes_count
    }
  }
`;
export const ADD_COMMENT = gql`
  mutation AddPostComment($id: ID!, $text: String!) {
    addPostComment(post_doc_id: $id, text: $text) {
      id
      comments_count
      comments {
        id
        author_id
        text
        created_at
        author {
          user_id
          full_name
          first_name
          profile_photo
        }
      }
    }
  }
`;
export const DELETE_POST = gql`
  mutation DeletePost($id: ID!) {
    deletePost(post_doc_id: $id)
  }
`;
export const DELETE_COMMENT = gql`
  mutation DeletePostComment($id: ID!, $commentId: ID!) {
    deletePostComment(post_doc_id: $id, comment_id: $commentId) {
      id
      comments_count
      comments {
        id
        author_id
        text
        created_at
        author {
          user_id
          full_name
          first_name
          profile_photo
        }
      }
    }
  }
`;
