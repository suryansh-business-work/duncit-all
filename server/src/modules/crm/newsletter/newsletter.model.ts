import { Schema, model, type Document } from 'mongoose';

export type NewsletterSource = 'WEBSITE_FOOTER' | 'WEBSITE_PAGE' | 'MWEB' | 'ADMIN' | 'OTHER';

export interface INewsletterSubscriber extends Document {
  email: string;
  source: NewsletterSource;
  unsubscribed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const schema = new Schema<INewsletterSubscriber>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    source: {
      type: String,
      enum: ['WEBSITE_FOOTER', 'WEBSITE_PAGE', 'MWEB', 'ADMIN', 'OTHER'],
      default: 'WEBSITE_FOOTER',
    },
    unsubscribed_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const NewsletterSubscriberModel = model<INewsletterSubscriber>(
  'NewsletterSubscriber',
  schema
);
