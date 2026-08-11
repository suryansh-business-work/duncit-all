import { gql } from '@/generated/graphql';

/**
 * The marketing popup to show this signed-in user on app open, or null.
 *
 * The server decides everything — the date window, the platform, the audience
 * and whether this person already closed it — so the client only renders what
 * comes back. `platform` is what this build is, not what it wants.
 */
export const ActiveAppPopupDocument = gql(`
  query MobileActiveAppPopup($platform: AppPopupClientPlatform!) {
    activeAppPopup(platform: $platform) {
      id
      image_url
      close_button_enabled
      cta_label
      cta_url
    }
  }
`);

/** Remember that this user closed the popup, so it never shows again. */
export const DismissAppPopupDocument = gql(`
  mutation MobileDismissAppPopup($id: ID!) {
    dismissAppPopup(id: $id)
  }
`);
