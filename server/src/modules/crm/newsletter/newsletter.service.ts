import { z } from 'zod';
import { GraphQLError } from 'graphql';
import { NewsletterSubscriberModel, type INewsletterSubscriber } from './newsletter.model';
import { sendEmail } from '@services/email/email.service';
import { settingsService } from '@modules/platform/settings/settings.service';
import { getUrlConfigs } from '@config/url-configs';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { logs } from '@observability/log';
import { email, filled, maxLen, mixed, obj, shape, str, summaryOf } from '@utils/zod-fields';

const SOURCES = ['WEBSITE_FOOTER', 'WEBSITE_PAGE', 'MWEB', 'ADMIN', 'OTHER'] as const;

// `loose`: keys beyond these ride through untouched, as they always have.
const subscribeSchema = obj(
  shape(
    {
      email: str(z.string().check(filled('Email required'), email('Invalid email'), maxLen(160)), {
        required: 'Email required',
      }),
      source: mixed(z.enum(SOURCES), { oneOf: SOURCES, default: 'WEBSITE_FOOTER' }),
    },
    { loose: true }
  )
);

const toPub = (s: INewsletterSubscriber) => ({
  id: String(s._id),
  email: s.email,
  source: s.source,
  unsubscribed_at: s.unsubscribed_at ? s.unsubscribed_at.toISOString() : null,
  created_at: s.created_at.toISOString(),
  updated_at: s.updated_at.toISOString(),
});

/** Allowlists for the shared table engine (newsletterSubscribersTable — DUNCIT TABLE CONTRACT v1). */
const NEWSLETTER_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['email', 'source'],
  sortFields: {
    email: 'email',
    source: 'source',
    // The Active / Unsubscribed chip orders by whether (and when) the subscriber left.
    status: 'unsubscribed_at',
    unsubscribed_at: 'unsubscribed_at',
    created_at: 'created_at',
  },
  filterFields: {
    email: { type: 'string' },
    source: { type: 'enum' },
    unsubscribed_at: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

export const newsletterService = {
  async list() {
    const docs = await NewsletterSubscriberModel.find({}).sort({ created_at: -1 }).exec();
    return docs.map(toPub);
  },

  /** Server-side table page (search/filter/sort/paginate) for the newsletterSubscribersTable query. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<INewsletterSubscriber>(
      NewsletterSubscriberModel,
      {},
      input,
      NEWSLETTER_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  async subscribe(input: { email: string; source?: string }) {
    const parsed = await subscribeSchema.safeParseAsync(input);
    if (!parsed.success) {
      throw new GraphQLError(summaryOf(parsed.error) || 'Invalid input', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const payload = parsed.data;
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
        category: 'marketing',
        vars: {
          email: payload.email,
          app_name: branding?.app_name || 'Duncit',
          logo_url: branding?.logo_url || 'https://duncit.com/duncit-logo.svg',
          site_url: urlConfigs.websiteUrl,
        },
      });
    } catch (e) {
      logs.server.warn('newsletter', 'subscribe', {
        error: e,
        email: payload.email,
        msg: 'newsletter welcome email failed',
      });
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
