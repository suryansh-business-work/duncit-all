import { gql } from '@/generated/graphql';

/**
 * Stock photos for a pod cover.
 *
 * mWeb reaches these through `@duncit/media-picker`, which the native app
 * cannot import — that package is MUI. Same server queries, same fields, so the
 * two surfaces show the same results with different components (rule 27).
 */
export const PexelsSearchDocument = gql(`
  query MobilePexelsSearch($query: String, $page: Int, $perPage: Int, $orientation: String) {
    pexelsSearch(query: $query, page: $page, perPage: $perPage, orientation: $orientation) {
      page
      next_page
      photos {
        id
        photographer
        avg_color
        alt
        src_large
        src_medium
        src_tiny
      }
    }
  }
`);

/**
 * Copy a Pexels photo into our own ImageKit account.
 *
 * The pod stores the hosted URL, never the Pexels one — a cover that points at
 * somebody else's CDN breaks the day they move it.
 */
export const ImportRemoteImageDocument = gql(`
  mutation MobileImportRemoteImage($remoteUrl: String!, $folder: String) {
    importRemoteImageToImagekit(remoteUrl: $remoteUrl, folder: $folder) {
      url
      fileId
    }
  }
`);
