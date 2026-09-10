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

/** Row shape used by the ideas table columns and row actions. */
export interface IdeaRow {
  id: string;
  author_id: string;
  title: string;
  description: string;
  likes_count: number;
  shares_count: number;
  comments_count: number;
  status: Status;
  created_at: string;
  author?: {
    user_id: string;
    full_name?: string | null;
    first_name?: string | null;
    email?: string | null;
    profile_photo?: string | null;
  } | null;
}

export const POD_IDEAS_TABLE = gql`
  query AdminPodIdeasTable($query: TableQueryInput) {
    podIdeasTable(query: $query) {
      total
      rows {
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

export type Status = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Per-domain color map for the shared `<StatusChip>` (else -> warning fallback). */
export const STATUS_COLOR_MAP = { APPROVED: 'success', REJECTED: 'error' } as const;

export const statusIcon = (s: Status) => {
  if (s === 'APPROVED') return <CheckCircleIcon fontSize="small" />;
  if (s === 'REJECTED') return <CancelIcon fontSize="small" />;
  return <HourglassEmptyIcon fontSize="small" />;
};
