import * as yup from 'yup';
import { GraphQLError } from 'graphql';
import { NewsletterSubscriberModel, type INewsletterSubscriber } from './newsletter.model';
import { sendEmail } from '../../services/email/email.service';
import { settingsService } from '../settings/settings.service';
import { getUrlConfigs } from '../../config/url-configs';

const subscribeSchema = yup.object({
  email: yup.string().required('Email required').email('Invalid email').max(160),
  source: yup
    .mixed<'WEBSITE_FOOTER' | 'WEBSITE_PAGE' | 'MWEB' | 'ADMIN' | 'OTHER'>()
    .oneOf(['WEBSITE_FOOTER', 'WEBSITE_PAGE', 'MWEB', 'ADMIN', 'OTHER'])
    .default('WEBSITE_FOOTER'),
});

const toPub = (s: INewsletterSubscriber) => ({
  id: String(s._id),
  email: s.email,
  source: s.source,
  unsubscribed_at: s.unsubscribed_at ? s.unsubscribed_at.toISOString() : null,
  created_at: s.created_at.toISOString(),
  updated_at: s.updated_at.toISOString(),
});

export const newsletterService = {
  async list() {
    const docs = await NewsletterSubscriberModel.find({}).sort({ created_at: -1 }).exec();
    return docs.map(toPub);
  },

  async subscribe(input: { email: string; source?: string }) {
    let payload: { email: string; source: any };
    try {
      payload = await subscribeSchema.validate(input, { abortEarly: false });
    } catch (e: any) {
      throw new GraphQLError(e.message || 'Invalid input', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const existing = await NewsletterSubscriberModel.findOne({ email: payload.email }).exec();
    if (existing) {
      if (existing.unsubscribed_at) {
        existing.unsubscribed_at = null;
        await existing.save();
      }
      return { ok: true, message: 'You are subscribed.' };
    }
    await NewsletterSubscriberModel.create({ email: payload.email, source: payload.source });
    // Best-effort welcome email; never block the response.
    try {
      const branding = await settingsService.getBranding();
      const urlConfigs = await getUrlConfigs();
      await sendEmail({
        to: payload.email,
        subject: `Welcome to ${branding?.app_name || 'Duncit'}`,
        template: 'newsletter-welcome',
        vars: {
          email: payload.email,
          app_name: branding?.app_name || 'Duncit',
          logo_url: branding?.logo_url || 'https://duncit.com/duncit-logo.svg',
          site_url: urlConfigs.websiteUrl,
        },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('newsletter welcome email failed:', e);
    }
    return { ok: true, message: 'Subscribed! Check your inbox.' };
  },

  async unsubscribe(email: string) {
    const r = await NewsletterSubscriberModel.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { $set: { unsubscribed_at: new Date() } }
    );
    return !!r;
  },
};
