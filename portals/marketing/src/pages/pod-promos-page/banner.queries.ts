import { gql } from '@apollo/client';
import type { PodBannerSlide, PodBannerStyle, PodPromoBannerStyle } from './queries';

/** A carousel made for one pod: its slides in posting order, and the run that recorded it. */
export interface PodBannerSet {
  pod_id: string;
  style: PodBannerStyle;
  size: PodPromoBannerStyle;
  slides: PodBannerSlide[];
  ai_copy: boolean;
  run_id: string;
}

/** Make a pod's banner carousel; nothing is scheduled. An omitted style or size is the server's default. */
export const GENERATE_POD_BANNERS = gql`
  mutation GeneratePodBanners($pod_id: ID!, $style: PodBannerStyle, $size: PodPromoBannerStyle) {
    generatePodBanners(pod_id: $pod_id, style: $style, size: $size) {
      pod_id
      style
      size
      slides {
        kind
        url
      }
      ai_copy
      run_id
    }
  }
`;

/** Render one slide of a pod's carousel again. */
export const REGENERATE_POD_BANNER_SLIDE = gql`
  mutation RegeneratePodBannerSlide($pod_id: ID!, $kind: PodBannerSlideKind!, $style: PodBannerStyle, $size: PodPromoBannerStyle) {
    regeneratePodBannerSlide(pod_id: $pod_id, kind: $kind, style: $style, size: $size) {
      kind
      url
    }
  }
`;
