import { gql } from '@apollo/client';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

export const POD_IDEAS = gql`
  query AdminPodIdeas($filter: PodIdeaFilterInput) {
    podIdeas(filter: $filter) {
      id
      author_id
      title
      description
      likes_count
      shares_count
      comments_count
      status
      created_at
      author {
        user_id
        full_name
        first_name
        email
        profile_photo
      }
    }
  }
`;

export const POD_IDEA_DETAILS = gql`
  query AdminPodIdeaDetails($id: ID!) {
    podIdea(pod_idea_doc_id: $id) {
      id
      author_id
      title
      description
      likes_count
      shares_count
      comments_count
      status
      created_at
      author {
        user_id
        full_name
        email
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
          email
        }
      }
    }
  }
`;

export const SET_STATUS = gql`
  mutation SetPodIdeaStatus($id: ID!, $status: PodIdeaStatus!) {
    setPodIdeaStatus(pod_idea_doc_id: $id, status: $status) {
      id
      status
    }
  }
`;
export const DELETE_IDEA = gql`
  mutation AdminDeletePodIdea($id: ID!) {
    deletePodIdea(pod_idea_doc_id: $id)
  }
`;
export const DELETE_COMMENT = gql`
  mutation AdminDeletePodIdeaComment($id: ID!, $commentId: ID!) {
    deletePodIdeaComment(pod_idea_doc_id: $id, comment_id: $commentId) {
      id
      comments_count
    }
  }
`;

export const STATUS_OPTIONS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const;
export type Status = 'PENDING' | 'APPROVED' | 'REJECTED';

export const statusColor = (s: Status) =>
  s === 'APPROVED' ? 'success' : s === 'REJECTED' ? 'error' : 'warning';

export const statusIcon = (s: Status) =>
  s === 'APPROVED' ? (
    <CheckCircleIcon fontSize="small" />
  ) : s === 'REJECTED' ? (
    <CancelIcon fontSize="small" />
  ) : (
    <HourglassEmptyIcon fontSize="small" />
  );
