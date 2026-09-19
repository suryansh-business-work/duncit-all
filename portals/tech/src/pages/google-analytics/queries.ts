import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  GoogleAnalyticsSite,
  MutationDeleteGoogleAnalyticsSiteArgs,
  MutationSaveGoogleAnalyticsSiteArgs,
} from '@duncit/gql-types';

/** Every website, whether or not it has a tag — the list the table and the website picker are built from. */
export const GOOGLE_ANALYTICS_SITES: TypedDocumentNode<{ googleAnalyticsSites: GoogleAnalyticsSite[] }> = gql`
  query GoogleAnalyticsSites {
    googleAnalyticsSites {
      site
      measurement_id
      enabled
      updated_at
    }
  }
`;

export const SAVE_GOOGLE_ANALYTICS_SITE: TypedDocumentNode<
  { saveGoogleAnalyticsSite: GoogleAnalyticsSite },
  MutationSaveGoogleAnalyticsSiteArgs
> = gql`
  mutation SaveGoogleAnalyticsSite($input: GoogleAnalyticsSiteInput!) {
    saveGoogleAnalyticsSite(input: $input) {
      site
      measurement_id
      enabled
      updated_at
    }
  }
`;

export const DELETE_GOOGLE_ANALYTICS_SITE: TypedDocumentNode<
  { deleteGoogleAnalyticsSite: boolean },
  MutationDeleteGoogleAnalyticsSiteArgs
> = gql`
  mutation DeleteGoogleAnalyticsSite($site: TrackedWebsite!) {
    deleteGoogleAnalyticsSite(site: $site)
  }
`;
