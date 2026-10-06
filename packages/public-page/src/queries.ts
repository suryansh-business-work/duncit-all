import { gql, type TypedDocumentNode } from '@apollo/client';
import {
  MY_PUBLIC_PAGE_QUERY,
  PUBLIC_PAGE_POSTER_QUERY,
  PUBLISH_PUBLIC_PAGE_MUTATION,
  type PublicPageKind,
} from '@duncit/utils';

interface PosterVariables {
  kind: PublicPageKind;
  refId: string | null;
  copy: { headline: string; footer: string };
}

/** The documents live once in @duncit/utils, where the native app reads them too. */
export const MY_PUBLIC_PAGE = gql(MY_PUBLIC_PAGE_QUERY);
export const PUBLISH_PUBLIC_PAGE = gql(PUBLISH_PUBLIC_PAGE_MUTATION);
export const PUBLIC_PAGE_POSTER: TypedDocumentNode<
  { myPublicPagePosterPdfBase64: string },
  PosterVariables
> = gql(PUBLIC_PAGE_POSTER_QUERY);
