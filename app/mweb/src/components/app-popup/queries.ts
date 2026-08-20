import { gql } from '@apollo/client';

// The union itself lives in @duncit/utils, next to the user-agent rule that
// produces it, so mWeb and the native web build cannot drift apart on it.
export type { AppPopupClientPlatform } from '@duncit/utils';

/** What the app-open popup needs to render. The server decides eligibility. */
export interface ActiveAppPopup {
  id: string;
  image_url: string;
  close_button_enabled: boolean;
  cta_label: string;
  cta_url: string;
}

/**
 * The marketing popup to show this signed-in user, or null. The date window,
 * the platform, the audience and whether this person already closed it are all
 * decided server-side, so the client only renders what comes back.
 */
export const ACTIVE_APP_POPUP = gql`
  query ActiveAppPopup($platform: AppPopupClientPlatform!) {
    activeAppPopup(platform: $platform) {
      id
      image_url
      close_button_enabled
      cta_label
      cta_url
    }
  }
`;

/** Remember that this user closed the popup, so it never shows again. */
export const DISMISS_APP_POPUP = gql`
  mutation DismissAppPopup($id: ID!) {
    dismissAppPopup(id: $id)
  }
`;
