import { gql } from '@/generated/graphql';

/** FAQ groups (grouped by super-category) for the FAQs page. */
export const FaqsDocument = gql(`
  query MobileFaqs {
    publicFaqGroups {
      super_category {
        id
        name
      }
      faqs {
        id
        question
        answer
      }
    }
  }
`);

/** The viewer's id + saved pods + all active pods — powers Saved Items and Pod
 * History (filtered client-side by saved ids / attendance). */
export const MyPodsDocument = gql(`
  query MobileMyPods {
    me {
      user_id
      saved_pod_ids
    }
    pods(filter: { is_active: true }) {
      id
      pod_id
      pod_title
      pod_date_time
      pod_type
      pod_amount
      no_of_spots
      host_names
      pod_attendees
      pod_hosts_id
      pod_images_and_videos {
        url
        type
      }
      club_id
      club_slug
      pod_mode
      place_label
      place_detail
    }
  }
`);
