import { Schema, model, type Document, type Types } from 'mongoose';

/** What pressing the card does. Mirrors @duncit/utils' SomethingForYouAction —
 * the server cannot import a @duncit package (rule 40), so the union is
 * restated and the SDL enum is what keeps the two honest. */
export type SomethingForYouAction = 'NONE' | 'ROUTE' | 'URL';
export const SOMETHING_FOR_YOU_ACTIONS: SomethingForYouAction[] = ['NONE', 'ROUTE', 'URL'];

/**
 * One card in the "Something for you" rail at the bottom of Home.
 *
 * A card is a headline, a picture and the thing it takes you to — the same
 * three parts in mWeb and in the native app, from one row here, because the
 * two must not drift (rule 27) and neither should be edited in code to change
 * a promotion.
 *
 * `title` is capped at thirty characters by the validator rather than by CSS:
 * the card is a fixed size on both surfaces, and a headline that only fits
 * after being cut off is a headline nobody chose.
 */
export interface ISomethingForYouItem extends Document {
  /** Declared so String(_id) is a string conversion, not an object one. */
  _id: Types.ObjectId;
  title: string;
  image_url: string;
  bottom_text: string;
  action_type: SomethingForYouAction;
  link_path: string;
  link_url: string;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const somethingForYouSchema = new Schema<ISomethingForYouItem>(
  {
    title: { type: String, required: true, trim: true },
    image_url: { type: String, default: '', trim: true },
    bottom_text: { type: String, default: '', trim: true },
    /**
     * Which of the two things pressing the card does — asked rather than
     * inferred, because `/referral` and `https://…/referral` look alike to a
     * validator and nothing alike to the person who taps them.
     */
    action_type: { type: String, enum: SOMETHING_FOR_YOU_ACTIONS, default: 'NONE' },
    /**
     * An in-app path (`/referral`, `/pod-ideas`) when action_type is ROUTE.
     * A path rather than a URL because the two surfaces route it themselves —
     * mWeb through react-router, the app through its linking config, which
     * already mirrors mWeb's grammar. Nothing leaves the product.
     */
    link_path: { type: String, default: '', trim: true },
    /** Somewhere outside the product, when action_type is URL. Native hands it
     * to the browser; mWeb opens it in a new tab. */
    link_url: { type: String, default: '', trim: true },
    sort_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

somethingForYouSchema.index({ is_active: 1, sort_order: 1 });

export const SomethingForYouModel = model<ISomethingForYouItem>(
  'SomethingForYouItem',
  somethingForYouSchema
);
