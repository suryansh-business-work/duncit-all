import { gql } from '@/generated/graphql';

/**
 * The cards in the rail at the bottom of Home.
 *
 * Public on purpose: the rail is part of Home, which a signed-out visitor
 * sees. The server returns only the switched-on cards, already in the order an
 * admin put them, so the app renders what comes back verbatim — mWeb reads the
 * same query and the two must not drift (rule 27).
 */
export const PublicSomethingForYouDocument = gql(`
  query MobilePublicSomethingForYou {
    publicSomethingForYou {
      id
      title
      image_url
      bottom_text
      action_type
      link_path
      link_url
    }
  }
`);
