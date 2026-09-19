import { Schema, model, type Document } from 'mongoose';

/**
 * Every Duncit website that can load a Google Analytics tag. Each website
 * passes its own key to the public `googleAnalyticsTag` query, so the list is
 * the contract between Tech → Google Analytics and the sites themselves.
 */
export const TRACKED_WEBSITES = ['MAIN', 'PARTNERS', 'ADS', 'EARNWITH', 'STATUS', 'ECOMM'] as const;
export type TrackedWebsite = (typeof TRACKED_WEBSITES)[number];

/** A GA4 measurement id: `G-` and the stream's alphanumeric suffix (G-XXXXXXXXXX). */
export const MEASUREMENT_ID_RE = /^G-[A-Z\d]{6,16}$/;

export interface IGoogleAnalyticsSite extends Document {
  site: TrackedWebsite;
  measurement_id: string;
  /** Off keeps the id on file but stops the website loading the tag. */
  enabled: boolean;
  /** User id of whoever last saved it. */
  updated_by: string;
  created_at: Date;
  updated_at: Date;
}

const googleAnalyticsSiteSchema = new Schema<IGoogleAnalyticsSite>(
  {
    site: { type: String, required: true, unique: true, enum: TRACKED_WEBSITES },
    measurement_id: { type: String, required: true, match: MEASUREMENT_ID_RE },
    enabled: { type: Boolean, required: true },
    updated_by: { type: String, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export const GoogleAnalyticsSiteModel = model<IGoogleAnalyticsSite>('GoogleAnalyticsSite', googleAnalyticsSiteSchema);
