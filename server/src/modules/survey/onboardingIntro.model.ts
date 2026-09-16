import { Schema, model, InferSchemaType } from 'mongoose';

/**
 * Singleton: the rich-text "intro" screen shown before the Super/Category/Sub
 * picker on each of the four onboarding flows (Become a Host, Register Venue,
 * List Product, Be a Club Admin). Authored in the Onboarding portal. A kind
 * left blank skips straight to the category picker on the client.
 */
const onboardingIntroSchema = new Schema(
  {
    singleton_key: { type: String, required: true, unique: true, default: 'onboarding_intro' },
    host_intro_html: { type: String, default: '' },
    venue_intro_html: { type: String, default: '' },
    ecomm_intro_html: { type: String, default: '' },
    club_admin_intro_html: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export type OnboardingIntroDoc = InferSchemaType<typeof onboardingIntroSchema>;
export const OnboardingIntroModel = model('OnboardingIntro', onboardingIntroSchema);
