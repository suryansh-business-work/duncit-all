import { gql } from '@/generated/graphql';

/**
 * Pod Ideas — community idea board (mirrors mWeb's pod-ideas page). The public
 * feed (APPROVED ideas, searchable) plus the viewer's own submissions and id.
 */
export const PodIdeasDocument = gql(`
  query MobilePodIdeas($filter: PodIdeaFilterInput) {
    podIdeas(filter: $filter) {
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
      }
    }
    myPodIdeas {
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
      }
    }
    me {
      user_id
    }
  }
`);

/** A single idea with its full comment thread (for the details sheet). */
export const PodIdeaDetailsDocument = gql(`
  query MobilePodIdeaDetails($id: ID!) {
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
        }
      }
    }
  }
`);

export const CreatePodIdeaDocument = gql(`
  mutation MobileCreatePodIdea($input: CreatePodIdeaInput!) {
    createPodIdea(input: $input) {
      id
    }
  }
`);

export const TogglePodIdeaLikeDocument = gql(`
  mutation MobileTogglePodIdeaLike($id: ID!) {
    togglePodIdeaLike(pod_idea_doc_id: $id) {
      id
      likes_count
      liked_by_me
    }
  }
`);

export const SharePodIdeaDocument = gql(`
  mutation MobileSharePodIdea($id: ID!) {
    sharePodIdea(pod_idea_doc_id: $id) {
      id
      shares_count
    }
  }
`);

export const AddPodIdeaCommentDocument = gql(`
  mutation MobileAddPodIdeaComment($id: ID!, $text: String!) {
    addPodIdeaComment(pod_idea_doc_id: $id, text: $text) {
      id
      comments_count
    }
  }
`);

export const DeletePodIdeaCommentDocument = gql(`
  mutation MobileDeletePodIdeaComment($id: ID!, $commentId: ID!) {
    deletePodIdeaComment(pod_idea_doc_id: $id, comment_id: $commentId) {
      id
      comments_count
    }
  }
`);

export const DeletePodIdeaDocument = gql(`
  mutation MobileDeletePodIdea($id: ID!) {
    deletePodIdea(pod_idea_doc_id: $id)
  }
`);
