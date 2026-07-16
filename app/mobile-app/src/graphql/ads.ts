import { gql } from '@/generated/graphql';

/**
 * Live approved ads for one placement. The server folds AUTO ads into every
 * position and only returns ads inside their approved live window, so the app
 * renders whatever comes back verbatim (empty array → the slot renders null).
 */
export const ActiveAdsDocument = gql(`
  query MobileActiveAds($position: AdPosition!) {
    activeAds(position: $position) {
      id
      ad_type
      media_url
      redirect_url
      ad_title
      position
    }
  }
`);
