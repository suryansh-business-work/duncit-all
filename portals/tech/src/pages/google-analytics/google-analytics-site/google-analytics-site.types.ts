import { z } from 'zod';
import { GA_MEASUREMENT_ID } from '@duncit/regex';
import type { GoogleAnalyticsSite, TrackedWebsite } from '@duncit/gql-types';

/**
 * The tag editor's shape and its validation.
 *
 * The website comes from a picker that only lists the websites the server
 * returned, so it needs no rule of its own. The id is upper-cased before it is
 * checked, because a pasted id is often lower-case; the server upper-cases and
 * checks it again.
 */

/** The validation copy, passed in translated — the schema renders no English. */
export interface GoogleAnalyticsSiteMessages {
  measurementIdInvalid: string;
}

export const googleAnalyticsSiteSchema = (messages: GoogleAnalyticsSiteMessages) =>
  z.object({
    site: z.custom<TrackedWebsite>(),
    measurement_id: z.string().trim().toUpperCase().regex(GA_MEASUREMENT_ID, messages.measurementIdInvalid),
    enabled: z.boolean(),
  });

export type GoogleAnalyticsSiteForm = z.infer<ReturnType<typeof googleAnalyticsSiteSchema>>;

/** A website without a tag yet: switched on, so saving an id starts tracking. */
export const blankTag = (site: TrackedWebsite): GoogleAnalyticsSiteForm => ({ site, measurement_id: '', enabled: true });

/** A listed website, as the form edits it. One with no tag starts from a blank, switched-on tag. */
export const toForm = (row: Readonly<GoogleAnalyticsSite>): GoogleAnalyticsSiteForm =>
  row.measurement_id ? { site: row.site, measurement_id: row.measurement_id, enabled: row.enabled } : blankTag(row.site);
