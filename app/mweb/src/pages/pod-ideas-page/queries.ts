import { gql } from '@apollo/client';

export const POD_IDEAS = gql`
  query PodIdeas($filter: PodIdeaFilterInput) {
    podIdeas(filter: $filter) {
      id
      idea_no
      author_id
      title
      description
      super_category_id
      category_id
      sub_category_id
      super_category_name
      category_name
      sub_category_name
      likes_count
      liked_by_me
      shares_count
      comments_count
      status
      created_at
      author {
        user_id
        full_name
        first_name
        profile_photo
      }
    }
    me {
      user_id
      full_name
      first_name
      profile_photo
    }
  }
`;

export const POD_IDEA_DETAILS = gql`
  query PodIdeaDetails($id: ID!) {
    podIdea(pod_idea_doc_id: $id) {
      id
      author_id
      title
      description
      likes_count
      liked_by_me
      shares_count
      comments_count
      status
      created_at
      author {
        user_id
        full_name
        first_name
        profile_photo
      }
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

export const CREATE_IDEA = gql`
  mutation CreatePodIdea($input: CreatePodIdeaInput!) {
    createPodIdea(input: $input) {
      id
    }
  }
`;
export const TOGGLE_LIKE = gql`
  mutation TogglePodIdeaLike($id: ID!) {
    togglePodIdeaLike(pod_idea_doc_id: $id) {
      id
      likes_count
      liked_by_me
    }
  }
`;
export const SHARE = gql`
  mutation SharePodIdea($id: ID!) {
    sharePodIdea(pod_idea_doc_id: $id) {
      id
      shares_count
    }
  }
`;
export const ADD_COMMENT = gql`
  mutation AddPodIdeaComment($id: ID!, $text: String!) {
    addPodIdeaComment(pod_idea_doc_id: $id, text: $text) {
      id
      comments_count
    }
  }
`;
export const DELETE_COMMENT = gql`
  mutation DeletePodIdeaComment($id: ID!, $commentId: ID!) {
    deletePodIdeaComment(pod_idea_doc_id: $id, comment_id: $commentId) {
      id
      comments_count
    }
  }
`;
export const DELETE_IDEA = gql`
  mutation DeletePodIdea($id: ID!) {
    deletePodIdea(pod_idea_doc_id: $id)
  }
`;

export const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};
