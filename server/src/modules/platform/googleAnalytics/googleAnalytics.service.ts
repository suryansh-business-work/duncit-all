import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import {
  GoogleAnalyticsSiteModel,
  MEASUREMENT_ID_RE,
  TRACKED_WEBSITES,
  type IGoogleAnalyticsSite,
  type TrackedWebsite,
} from './googleAnalytics.model';

export interface GoogleAnalyticsSiteInput {
  site: TrackedWebsite;
  measurement_id: string;
  enabled: boolean;
}

export interface GoogleAnalyticsSiteView {
  site: TrackedWebsite;
  measurement_id: string | null;
  enabled: boolean;
  updated_at: string | null;
}

type StoredTag = Pick<IGoogleAnalyticsSite, 'site' | 'measurement_id' | 'enabled' | 'updated_at'>;

/** A website with no document yet reads as "no tag", not as an error. */
const toView = (site: TrackedWebsite, stored?: StoredTag | null): GoogleAnalyticsSiteView => ({
  site,
  measurement_id: stored?.measurement_id ?? null,
  enabled: stored?.enabled ?? false,
  updated_at: stored?.updated_at.toISOString() ?? null,
});

/**
 * Tech → Google Analytics: one GA4 tag per Duncit website, read by the
 * websites at page load. The site key is a GraphQL enum, so an unknown website
 * never reaches this service.
 */
export const googleAnalyticsService = {
  /** Every website in TRACKED_WEBSITES order, whether or not it has a tag. */
  async list(): Promise<GoogleAnalyticsSiteView[]> {
    const stored = await GoogleAnalyticsSiteModel.find().lean<StoredTag[]>();
    const bySite = new Map(stored.map((row) => [row.site, row]));
    return TRACKED_WEBSITES.map((site) => toView(site, bySite.get(site)));
  },

  /** The id the website should load right now: null when it has none or it is off. */
  async tag(site: TrackedWebsite): Promise<string | null> {
    const stored = await GoogleAnalyticsSiteModel.findOne({ site, enabled: true }).lean<StoredTag>();
    return stored?.measurement_id ?? null;
  },

  async save(input: GoogleAnalyticsSiteInput, by: string): Promise<GoogleAnalyticsSiteView> {
    const measurementId = input.measurement_id.trim().toUpperCase();
    if (!MEASUREMENT_ID_RE.test(measurementId)) {
      throw new GraphQLError('Enter a GA4 measurement ID, like G-XXXXXXXXXX.', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const saved = await GoogleAnalyticsSiteModel.findOneAndUpdate(
      { site: input.site },
      { measurement_id: measurementId, enabled: input.enabled, updated_by: by },
      { upsert: true, new: true, runValidators: true },
    ).lean<StoredTag>();
    logs.server.info('googleAnalytics', 'save', { site: input.site, measurement_id: measurementId, enabled: input.enabled, by });
    return toView(input.site, saved);
  },

  async remove(site: TrackedWebsite, by: string): Promise<boolean> {
    const { deletedCount } = await GoogleAnalyticsSiteModel.deleteOne({ site });
    logs.server.info('googleAnalytics', 'delete', { site, removed: deletedCount > 0, by });
    return deletedCount > 0;
  },
};
