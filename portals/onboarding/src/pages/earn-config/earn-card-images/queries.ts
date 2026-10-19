import { gql } from '@apollo/client';
import type { EarnCardImagesValues } from './earn-card-images.types';

export interface EarnCardImagesQueryResult {
  onboardingIntro: { earn_card_images: EarnCardImagesValues };
}

const EARN_CARD_IMAGES_FIELDS = `
  earn_card_images {
    host
    venue
    ecomm
    club
    freelancer
  }
`;

export const EARN_CARD_IMAGES = gql`
  query EarnCardImagesSettings {
    onboardingIntro {
      ${EARN_CARD_IMAGES_FIELDS}
    }
  }
`;

export const UPDATE_EARN_CARD_IMAGES = gql`
  mutation UpdateEarnCardImages($input: UpdateOnboardingIntroInput!) {
    updateOnboardingIntro(input: $input) {
      ${EARN_CARD_IMAGES_FIELDS}
    }
  }
`;
