import { gql } from '@/generated/graphql';

/** One profile post with its full comment thread — mirrors mWeb's PostDetails
 * (the profile-image viewer with like + comments). */
export const PostDetailsDocument = gql(`
  query MobilePostDetails($id: ID!) {
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
        }
      }
      created_at
    }
  }
`);

export const TogglePostLikeDocument = gql(`
  mutation MobileTogglePostLike($id: ID!) {
    togglePostLike(post_doc_id: $id) {
      id
      liked_by_me
      likes_count
    }
  }
`);

export const AddPostCommentDocument = gql(`
  mutation MobileAddPostComment($id: ID!, $text: String!) {
    addPostComment(post_doc_id: $id, text: $text) {
      id
      comments_count
    }
  }
`);

export const DeletePostCommentDocument = gql(`
  mutation MobileDeletePostComment($id: ID!, $commentId: ID!) {
    deletePostComment(post_doc_id: $id, comment_id: $commentId) {
      id
      comments_count
    }
  }
`);

export const DeletePostDocument = gql(`
  mutation MobileDeletePost($id: ID!) {
    deletePost(post_doc_id: $id)
  }
`);
