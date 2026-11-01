import { Types } from 'mongoose';
import { GraphQLError } from 'graphql';
import { getAppTimeZone } from '@utils/app-time';
import type { RunContext } from '../runs/marketingRun.service';
import { normalizeCollaborators } from '../social/social.collaborators';
import { PodPromoModel, type PodPromoDoc, type PodPromoSettingsDoc } from './podPromo.model';
import { claimPromo, releasePromo } from './podPromo.claim';
import { generateCarousel, type Generated } from './podPromo.generate';
import { aiCaption, postText } from './podPromo.ai';
import { loadCopy } from './podPromo.copy';
import { collabHandle } from './podPromo.kit';
import { createPromoPost } from './podPromo.post';
import { postSlot } from './podPromo.schedule';
import type { PodBannerData } from './podPromo.pod';
import type { BannerStyle, PodPromoSource } from './podPromo.types';

/**
 * Promote one pod: hold its row, make (or reuse) the tracking link and the
 * carousel, write the caption, work out the slot, and schedule the post. Each
 * piece is stored as soon as it exists, and the row is released with what
 * happened — SCHEDULED, SKIPPED (too close to start) or FAILED with the reason.
 */
export interface PromoteInput {
  podId: Types.ObjectId;
  podStart: Date;
  settings: PodPromoSettingsDoc;
  source: PodPromoSource;
  /** Who the post is filed under: the person, or whoever last saved the settings. */
  userId: string | null;
  now: Date;
  restart: boolean;
  /** Overrides a person gave; each falls back to the settings. */
  at?: Date | null;
  account_ids?: readonly string[] | null;
  collaborators?: readonly string[] | null;
  style?: BannerStyle | null;
}

/** How far ahead a manual promotion of a pod inside the planner's minimum lead is posted. */
const MANUAL_SOON_MS = 5 * 60_000;
const MANUAL_MIN_LEAD_MS = 2 * 3_600_000;

const badInput = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

/** The venue and host who opted in to collaborations, when nobody chose. */
function defaultCollaborators(data: PodBannerData): string[] {
  return [data.venue ? collabHandle(data.venue.kit) : null, data.host ? collabHandle(data.host.kit) : null].filter((handle): handle is string => !!handle);
}

function slotFor(input: PromoteInput, start: Date): Date | null {
  if (input.at) {
    if (input.at.getTime() <= input.now.getTime() || input.at.getTime() >= start.getTime()) throw badInput('Pick a time in the future, before the pod starts.');
    return input.at;
  }
  const slot = postSlot({ start, now: input.now, daysBefore: input.settings.days_before, postHour: input.settings.post_hour, zone: getAppTimeZone() });
  if (slot || input.source === 'AUTO') return slot;
  // A person promoting a pod the planner would call too close still gets it out — soon.
  return start.getTime() - input.now.getTime() > MANUAL_MIN_LEAD_MS ? new Date(input.now.getTime() + MANUAL_SOON_MS) : null;
}

const linkFields = (made: Generated) => ({
  pod_title: made.data.title,
  pod_start: made.data.start,
  club_id: made.data.club_id,
  club_name: made.data.club_name,
  city_id: made.data.city_id,
  city_name: made.data.city_name,
  pod_url: made.data.url,
  style: made.style,
  banner_style: made.size,
  slides: made.slides,
  short_link_id: new Types.ObjectId(made.link.id),
  short_code: made.link.code,
  tracking_url: made.link.short_url,
  utm_campaign: made.link.utm_campaign,
});

async function schedule(promo: PodPromoDoc, input: PromoteInput, run: RunContext, userId: string): Promise<Record<string, unknown>> {
  const prefix = String(input.podId);
  const made = await generateCarousel(
    {
      podId: prefix,
      style: input.style ?? (promo.style_locked ? promo.style : null),
      size: input.settings.banner_style,
      cta_text: input.settings.cta_text,
      utm_prefix: input.settings.utm_prefix,
      userId,
      stepPrefix: prefix,
    },
    run
  );
  await releasePromoKeepLock(promo._id, { ...linkFields(made), status: 'BANNER_READY', style_locked: !!input.style || promo.style_locked });
  const slot = slotFor(input, made.data.start);
  if (!slot) return { status: 'SKIPPED', error: 'The pod starts too soon to promote.' };
  const t = await loadCopy();
  const caption = await run.step(`${prefix}:caption`, 'Caption', () => aiCaption(made.data, made.copy, t), { tool: 'claude', summarize: (c) => (c.ai ? 'written by AI' : 'template') });
  const accounts = input.account_ids?.length ? [...input.account_ids] : input.settings.account_ids;
  if (accounts.length === 0) throw new Error('No account to post to — pick accounts in the Pod promotions settings.');
  const collaborators = normalizeCollaborators(input.collaborators ?? defaultCollaborators(made.data));
  const post = await run.step(
    `${prefix}:post`,
    'Schedule the post',
    () =>
      createPromoPost(
        {
          text: postText(caption, t('captionLink', { link: made.link.short_url })),
          slides: made.slides,
          account_ids: accounts,
          scheduled_at: slot,
          needs_approval: input.settings.needs_approval,
          pod_id: prefix,
          collaborators,
        },
        userId
      ),
    { tool: 'social.publish', summarize: (p) => `${p.status} for ${p.scheduled_at ?? ''}` }
  );
  return {
    status: 'SCHEDULED',
    caption: caption.caption,
    hashtags: caption.hashtags,
    ai_caption: caption.ai,
    collaborators,
    account_ids: input.account_ids?.length ? accounts : [],
    scheduled_post_id: new Types.ObjectId(post.id),
    post_status: post.status,
    scheduled_at: slot,
    error: '',
    attempts: 0,
  };
}

/** Store progress without letting go of the row. */
async function releasePromoKeepLock(id: Types.ObjectId, set: Record<string, unknown>) {
  await PodPromoModel.updateOne({ _id: id }, { $set: set });
}

/** Returns the row as released, or null when another worker holds the pod. Never throws for a failed step: the row says FAILED. */
export async function promotePod(input: PromoteInput, run: RunContext): Promise<PodPromoDoc | null> {
  const promo = await claimPromo({
    podId: input.podId,
    podStart: input.podStart,
    style: input.style ?? 'FESTIVE_BOLD',
    source: input.source,
    now: input.now,
    restart: input.restart,
    userId: input.userId,
  });
  if (!promo) return null;
  await releasePromoKeepLock(promo._id, { run_id: run.id });
  const userId = input.userId ?? (input.settings.updated_by ? String(input.settings.updated_by) : null);
  if (!userId) {
    return releasePromo(promo._id, { status: 'FAILED', error: 'Save the Pod promotions settings first — posts are filed under whoever saved them.' }, { attempts: 1 });
  }
  try {
    return await releasePromo(promo._id, await schedule(promo, input, run, userId));
  } catch (error) {
    const reason = (error instanceof Error ? error.message : String(error)).slice(0, 500);
    return releasePromo(promo._id, { status: 'FAILED', error: reason }, { attempts: 1 });
  }
}
