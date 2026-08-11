import { gql } from '@apollo/client';

/**
 * The rating form for one pod, plus this guest's own answers if they have
 * already sent some — what makes the shared link open filled in.
 */
export const POD_FEEDBACK_FORM = gql`
  query PodFeedbackForm($pod_id: ID!) {
    podFeedbackForm(pod_id: $pod_id) {
      pod {
        id
        title
        feedback_aspects
      }
      mine {
        rating
        ratings {
          aspect
          rating
        }
        message
        updated_at
      }
    }
  }
`;

export interface PodFeedbackFormData {
  podFeedbackForm: {
    pod: { id: string; title: string; feedback_aspects: string[] };
    mine: {
      rating: number;
      ratings: Array<{ aspect: string; rating: number }>;
      message: string;
      updated_at: string;
    } | null;
  };
}
