import crypto from 'node:crypto';
import * as yup from 'yup';
import { GraphQLError } from 'graphql';
import { MarketingCampaignModel, type IMarketingCampaign } from './marketing.model';
import { UserModel } from '@modules/access/user/user.model';
import { NewsletterSubscriberModel } from '@modules/crm/newsletter/newsletter.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/pods/club/club.model';
import { settingsService } from '@modules/platform/settings/settings.service';
import { applyVars, detectVariables, renderMjml } from '@modules/content/emailTemplate/emailTemplate.service';
import { sendHtmlEmail } from '@services/email/email.service';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { getMailConfigs } from '@config/url-configs';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

const MAX_TIMER_DELAY = 2_147_483_647;
const timers = new Map<string, NodeJS.Timeout>();

const inputSchema = yup.object({
  name: yup.string().trim().min(3).max(120).required(),
  channel: yup.mixed<'EMAIL' | 'WHATSAPP'>().oneOf(['EMAIL', 'WHATSAPP']).required(),
  audience: yup
    .mixed<'ALL_USERS' | 'NEWSLETTER_SUBSCRIBERS'>()
    .oneOf(['ALL_USERS', 'NEWSLETTER_SUBSCRIBERS'])
    .required(),
  subject: yup.string().trim().min(3).max(180).required(),
  mjml: yup.string().trim().min(20).required(),
  card_type: yup.mixed<'POD' | 'CLUB'>().oneOf(['POD', 'CLUB']).nullable(),
  card_ref_id: yup.string().trim().nullable(),
  scheduled_at: yup.string().trim().nullable(),
  send_now: yup.boolean().default(false),
});

function toPub(doc: IMarketingCampaign) {
  return {
    campaign_id: doc.campaign_id,
    name: doc.name,
    channel: doc.channel,
    audience: doc.audience,
    subject: doc.subject,
    mjml: doc.mjml,
    rendered_html: doc.rendered_html ?? null,
    card: doc.card ?? null,
    scheduled_at: doc.scheduled_at ? doc.scheduled_at.toISOString() : null,
    sent_at: doc.sent_at ? doc.sent_at.toISOString() : null,
    status: doc.status,
    recipient_count: doc.recipient_count,
    error: doc.error ?? null,
    created_at: doc.created_at.toISOString(),
    updated_at: doc.updated_at.toISOString(),
  };
}

function stripText(value?: string | null, max = 220) {
  const text = String(value || '').replaceAll(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function escapeXml(value?: string | null) {
  return String(value || '')
    .replaceAll(/&/g, '&amp;')
    .replaceAll(/</g, '&lt;')
    .replaceAll(/>/g, '&gt;')
    .replaceAll(/"/g, '&quot;');
}

async function mwebUrl(pathname: string) {
  const base =
    (await getRuntimeEnvValue('MWEB_BASE_URL')) ||
    (await getRuntimeEnvValue('PUBLIC_APP_URL')) ||
    (await getRuntimeEnvValue('PUBLIC_SITE_URL')) ||
    '';
  return base ? `${base.replace(/\/+$/, '')}${pathname}` : pathname;
}

async function podCards() {
  const pods = await PodModel.find({ is_active: true })
    .sort({ pod_date_time: -1 })
    .limit(100)
    .lean()
    .exec();
  const clubIds = [...new Set(pods.map((pod) => String(pod.club_id)).filter(Boolean))];
  const clubs = await ClubModel.find({ _id: { $in: clubIds } }).select('club_id').lean().exec();
  const clubSlugById = new Map<string, string>(clubs.map((club: any) => [String(club._id), club.club_id]));
  return Promise.all(
    pods.map(async (pod: any) => {
      const clubSlug = clubSlugById.get(String(pod.club_id)) || '';
      return {
        id: String(pod._id),
        type: 'POD' as const,
        title: pod.pod_title,
        description: stripText(pod.pod_description),
        image_url: pod.pod_images_and_videos?.find((m: any) => m.type === 'IMAGE')?.url ?? null,
        cta_url: clubSlug ? await mwebUrl(`/club/${clubSlug}/pod/${pod.pod_id}`) : null,
        meta: pod.pod_date_time ? new Date(pod.pod_date_time).toLocaleString('en-IN') : null,
      };
    })
  );
}

async function clubCards() {
  const clubs = await ClubModel.find({ is_active: true })
    .sort({ club_name: 1 })
    .limit(100)
    .lean()
    .exec();
  return Promise.all(
    clubs.map(async (club: any) => ({
      id: String(club._id),
      type: 'CLUB' as const,
      title: club.club_name,
      description: stripText(club.club_description),
      image_url: club.club_feature_images_and_videos?.find((m: any) => m.type === 'IMAGE')?.url ?? null,
      cta_url: await mwebUrl(`/club/${club.club_id}`),
      meta: club.club_id,
    }))
  );
}

async function previewCards(type: 'POD' | 'CLUB') {
  return type === 'POD' ? podCards() : clubCards();
}

async function findPreviewCard(type?: 'POD' | 'CLUB' | null, refId?: string | null) {
  if (!type || !refId) return null;
  const cards = await previewCards(type);
  return cards.find((card) => card.id === refId) ?? null;
}

function cardMjml(card: Awaited<ReturnType<typeof findPreviewCard>>) {
  if (!card) return '';
  const image = card.image_url
    ? `<mj-image src="${escapeXml(card.image_url)}" alt="${escapeXml(card.title)}" border-radius="12px" />`
    : '';
  const button = card.cta_url
    ? `<mj-button href="${escapeXml(card.cta_url)}" background-color="#ff5757" border-radius="8px">View details</mj-button>`
    : '';
  return `
    <mj-section background-color="#ffffff" border-radius="14px" padding="18px">
      <mj-column>
        ${image}
        <mj-text font-size="22px" line-height="30px" font-weight="700" color="#111827">${escapeXml(card.title)}</mj-text>
        <mj-text font-size="15px" line-height="23px" color="#4b5563">${escapeXml(card.description)}</mj-text>
        ${button}
      </mj-column>
    </mj-section>
  `;
}

async function campaignVars(card: Awaited<ReturnType<typeof findPreviewCard>>) {
  const branding = await settingsService.getBranding().catch(() => null);
  return {
    app_name: branding?.app_name || 'Duncit',
    content_card: cardMjml(card),
    content_title: card?.title || '',
    content_description: card?.description || '',
    content_url: card?.cta_url || '',
    content_image: card?.image_url || '',
  };
}

async function renderCampaign(input: {
  subject: string;
  mjml: string;
  card_type?: 'POD' | 'CLUB' | null;
  card_ref_id?: string | null;
}) {
  const card = await findPreviewCard(input.card_type, input.card_ref_id);
  const vars = await campaignVars(card);
  const rendered = renderMjml(input.mjml, vars);
  return {
    subject: applyVars(input.subject, vars),
    html: rendered.html,
    errors: rendered.errors,
    detected_variables: detectVariables(input.mjml),
    card,
  };
}

async function validateInput(input: any) {
  try {
    const payload = await inputSchema.validate(input, { abortEarly: false, stripUnknown: true });
    if (payload.card_type && !payload.card_ref_id) throw new Error('Card selection is required');
    return payload;
  } catch (e: any) {
    throw new GraphQLError(e.errors?.join(', ') || e.message || 'Invalid campaign input', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

function parseSchedule(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new GraphQLError('Schedule date is invalid', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return date;
}

async function recipientsFor(audience: 'ALL_USERS' | 'NEWSLETTER_SUBSCRIBERS') {
  const docs =
    audience === 'ALL_USERS'
      ? await UserModel.find({
          'metadata.status': 'ACTIVE',
          'auth.email': { $exists: true, $ne: '' },
        })
          .select('auth.email')
          .lean()
          .exec()
      : await NewsletterSubscriberModel.find({ unsubscribed_at: null }).select('email').lean().exec();
  return [
    ...new Set(
      docs
        .map((doc: any) => String(doc?.auth?.email ?? doc?.email ?? '').toLowerCase().trim())
        .filter(Boolean)
    ),
  ];
}

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function sendCampaign(campaign_id: string) {
  const doc = await MarketingCampaignModel.findOne({ campaign_id }).exec();
  if (!doc) throw new GraphQLError('Campaign not found', { extensions: { code: 'NOT_FOUND' } });
  if (doc.status === 'SENT' || doc.status === 'SENDING') return toPub(doc);

  doc.status = 'SENDING';
  doc.error = null;
  await doc.save();

  try {
    const rendered = await renderCampaign({
      subject: doc.subject,
      mjml: doc.mjml,
      card_type: doc.card?.type ?? null,
      card_ref_id: doc.card?.ref_id ?? null,
    });
    if (rendered.errors.length) throw new Error(rendered.errors.join('; '));
    const recipients = await recipientsFor(doc.audience);
    if (!recipients.length) throw new Error('No recipients found for selected audience');
    const mailConfigs = await getMailConfigs();
    const campaignTo =
      (await getRuntimeEnvValue('CAMPAIGN_TO')) ||
      mailConfigs.from;
    for (const batch of chunk(recipients, 50)) {
      await sendHtmlEmail({ to: campaignTo, bcc: batch, subject: rendered.subject, html: rendered.html });
    }
    doc.status = 'SENT';
    doc.rendered_html = rendered.html;
    doc.recipient_count = recipients.length;
    doc.sent_at = new Date();
    doc.error = null;
  } catch (e: any) {
    doc.status = 'FAILED';
    doc.error = e.message || 'Campaign send failed';
  }
  await doc.save();
  return toPub(doc);
}

function scheduleDoc(doc: IMarketingCampaign) {
  if (!doc.scheduled_at || doc.status !== 'SCHEDULED') return;
  const existing = timers.get(doc.campaign_id);
  if (existing) clearTimeout(existing);
  const delay = doc.scheduled_at.getTime() - Date.now();
  const timer = setTimeout(() => {
    timers.delete(doc.campaign_id);
    if (delay > MAX_TIMER_DELAY) scheduleDoc(doc);
    else sendCampaign(doc.campaign_id).catch((e) => console.error('Campaign send failed', e));
  }, Math.max(0, Math.min(delay, MAX_TIMER_DELAY)));
  timers.set(doc.campaign_id, timer);
}

/** Allowlists for the shared table engine (marketingCampaignsTable — DUNCIT TABLE CONTRACT v1). */
const MARKETING_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['name', 'subject'],
  sortFields: {
    name: 'name',
    channel: 'channel',
    audience: 'audience',
    status: 'status',
    recipient_count: 'recipient_count',
    scheduled_at: 'scheduled_at',
    sent_at: 'sent_at',
    created_at: 'created_at',
  },
  filterFields: {
    channel: { type: 'enum' },
    audience: { type: 'enum' },
    status: { type: 'enum' },
    scheduled_at: { type: 'date' },
    sent_at: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

export const marketingService = {
  async list() {
    const docs = await MarketingCampaignModel.find().sort({ created_at: -1 }).exec();
    return docs.map(toPub);
  },

  /** Server-side table page (search/filter/sort/paginate) for the marketingCampaignsTable query. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IMarketingCampaign>(
      MarketingCampaignModel,
      {},
      input,
      MARKETING_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },
  previewCards,
  async renderPreview(input: any) {
    const payload = await yup
      .object({ subject: yup.string().required(), mjml: yup.string().required(), card_type: yup.string().nullable(), card_ref_id: yup.string().nullable() })
      .validate(input, { stripUnknown: true });
    const rendered = await renderCampaign(payload as any);
    return {
      subject: rendered.subject,
      html: rendered.html,
      errors: rendered.errors,
      detected_variables: rendered.detected_variables,
    };
  },
  async create(input: any, userId?: string | null) {
    const payload = await validateInput(input);
    const scheduleAt = parseSchedule(payload.scheduled_at);
    const rendered = await renderCampaign(payload as any);
    if (rendered.errors.length) {
      throw new GraphQLError(rendered.errors.join('; '), { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const sendNow = payload.send_now || !scheduleAt || scheduleAt.getTime() <= Date.now();
    const doc = await MarketingCampaignModel.create({
      campaign_id: crypto.randomUUID(),
      name: payload.name,
      channel: payload.channel,
      audience: payload.audience,
      subject: payload.subject,
      mjml: payload.mjml,
      rendered_html: rendered.html,
      card: rendered.card,
      scheduled_at: sendNow ? null : scheduleAt,
      status: sendNow ? 'DRAFT' : 'SCHEDULED',
      created_by: userId ?? null,
    });
    if (sendNow) return sendCampaign(doc.campaign_id);
    scheduleDoc(doc);
    return toPub(doc);
  },
  send: sendCampaign,
  async resumeSchedules() {
    const docs = await MarketingCampaignModel.find({ status: 'SCHEDULED' }).exec();
    docs.forEach(scheduleDoc);
  },
};