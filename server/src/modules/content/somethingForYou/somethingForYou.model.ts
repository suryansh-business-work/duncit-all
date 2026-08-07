import { Schema, model, type Document } from 'mongoose';

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
  title: string;
  image_url: string;
  bottom_text: string;
  link_path: string;
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
     * Where the card goes, as an in-app path (`/referral`, `/pod-ideas`).
     * A path rather than a URL because the two surfaces route it themselves —
     * mWeb through react-router, the app through its linking config, which
     * already mirrors mWeb's grammar. Empty means the card is decorative.
     */
    link_path: { type: String, default: '', trim: true },
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
