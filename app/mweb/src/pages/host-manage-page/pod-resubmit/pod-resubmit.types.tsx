/** Shared types for the venue-rejected pod's full edit + resubmission flow. */

export interface PodResubmitValues {
  pod_title: string;
  pod_description: string;
  media_text: string;
  venue_id: string;
  venue_slot_id: string;
}

export interface HostPodForResubmit {
  id: string;
  pod_title: string;
  pod_description?: string | null;
  pod_images_and_videos?: { url: string; type: string }[] | null;
  venue_id?: string | null;
}

export interface ResubmitVenueOption {
  id: string;
  venue_name: string;
  city?: string | null;
}

export interface ResubmitSlotOption {
  id: string;
  start_at: string;
  end_at: string;
  price: number;
  space_label: string;
}

export const blankPodResubmitValues: PodResubmitValues = {
  pod_title: '',
  pod_description: '',
  media_text: '',
  venue_id: '',
  venue_slot_id: '',
};
