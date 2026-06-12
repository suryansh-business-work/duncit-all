/** Shared types for the host's limited pod edit (title, images, description). */

export interface PodEditValues {
  pod_title: string;
  pod_description: string;
  media_text: string;
}

export interface HostPodSummary {
  id: string;
  pod_title: string;
  pod_description?: string | null;
  pod_images_and_videos?: { url: string; type: string }[] | null;
}

export const blankPodEditValues: PodEditValues = {
  pod_title: '',
  pod_description: '',
  media_text: '',
};
