import { Types, isValidObjectId } from 'mongoose';
import { GraphQLError } from 'graphql';
import { getAppTimeZone } from '@utils/app-time';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { ClubModel } from '@modules/clubs/club/club.model';
import { userActor, withRun } from '../runs/marketingRun.service';
import { PodPromoModel, type PodPromoDoc } from './podPromo.model';
import { loadPromoSettings, pubSettings, savePromoSettings } from './podPromo.settings';
import { passesFilters, pickablePods } from './podPromo.eligibility';
import { generateCarousel } from './podPromo.generate';
import { aiCaption } from './podPromo.ai';
import { loadCopy } from './podPromo.copy';
import { collabHandle } from './podPromo.kit';
import { promotePod } from './podPromo.promote';
import { isEditable, postState, removePromoPost, rewritePromoPost } from './podPromo.post';
import { figuresFor } from './podPromo.figures';
import { postSlot } from './podPromo.schedule';
import { pubPromo } from './podPromo.pub';
import { loadPodBannerData } from './podPromo.pod';
import type { BannerSize, BannerStyle, SlideKind } from './podPromo.types';

/** What the resolvers call: reads, previews, one-pod actions and the settings. */
const TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['pod_title', 'club_name', 'city_name'],
  sortFields: { pod_start: 'pod_start', scheduled_at: 'scheduled_at', status: 'status', created_at: 'created_at', pod_title: 'pod_title' },
  filterFields: {
    status: { type: 'enum' },
    source: { type: 'enum' },
    club_id: { type: 'string' },
    city_id: { type: 'string' },
    scheduled_at: { type: 'date' },
    pod_start: { type: 'date' },
  },
  defaultSort: { pod_start: 1 },
};

const badInput = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
const notFound = () => new GraphQLError('Promotion not found', { extensions: { code: 'NOT_FOUND' } });

async function loadPromo(id: string): Promise<PodPromoDoc> {
  const doc = isValidObjectId(id) ? await PodPromoModel.findById(id).lean<PodPromoDoc>() : null;
  if (!doc) throw notFound();
  return doc;
}

const actorRun = async (name: string, user: { id: string; email?: string | null }) => ({
  workflow: 'POD_PROMO' as const,
  name,
  trigger: 'USER' as const,
  actor: await userActor(user),
});

interface PromoteArgs {
  pod_id: string;
  at?: string | null;
  account_ids?: string[] | null;
  collaborators?: string[] | null;
  style?: BannerStyle | null;
}

function parseAt(at: string | null | undefined): Date | null {
  if (!at) return null;
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) throw badInput('That date and time could not be read.');
  return date;
}

export const podPromoService = {
  settings: async () => pubSettings(await loadPromoSettings()),
  saveSettings: (input: unknown, userId: string) => savePromoSettings(input, userId),

  async table(query?: TableQueryInput | null) {
    const page = await runTableQuery<PodPromoDoc>(PodPromoModel, {}, query, TABLE_CONFIG);
    return { ...page, rows: page.docs.map(pubPromo) };
  },

  /** One promotion with its figures read fresh (and stored, so the table catches up). */
  async get(id: string) {
    const doc = await loadPromo(id);
    const figures = await figuresFor(doc);
    await PodPromoModel.updateOne({ _id: doc._id }, { $set: { figures } });
    return pubPromo({ ...doc, figures });
  },

  async summary() {
    const [row] = await PodPromoModel.aggregate<Record<string, number>>([
      {
        $group: {
          _id: null,
          planned: { $sum: { $cond: [{ $in: ['$status', ['PLANNED', 'BANNER_READY']] }, 1, 0] } },
          scheduled: { $sum: { $cond: [{ $eq: ['$status', 'SCHEDULED'] }, 1, 0] } },
          published: { $sum: { $cond: [{ $eq: ['$status', 'PUBLISHED'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } },
          clicks: { $sum: '$figures.clicks' },
          bookings: { $sum: '$figures.bookings' },
          payments: { $sum: '$figures.payments' },
          revenue: { $sum: '$figures.revenue' },
        },
      },
    ]);
    const pick = (key: string) => row?.[key] ?? 0;
    return { planned: pick('planned'), scheduled: pick('scheduled'), published: pick('published'), failed: pick('failed'), clicks: pick('clicks'), bookings: pick('bookings'), payments: pick('payments'), revenue: pick('revenue') };
  },

  async candidates(search?: string | null) {
    const pods = await pickablePods(new Date(), search);
    const [clubs, promos] = await Promise.all([
      ClubModel.find({ _id: { $in: pods.map((pod) => pod.club_id) } }).select('club_name').lean<{ _id: Types.ObjectId; club_name: string }[]>(),
      PodPromoModel.find({ pod_id: { $in: pods.map((pod) => pod._id) } }).select('pod_id status').lean<{ pod_id: Types.ObjectId; status: string }[]>(),
    ]);
    const clubName = new Map(clubs.map((club) => [String(club._id), club.club_name]));
    const promoStatus = new Map(promos.map((promo) => [String(promo.pod_id), promo.status]));
    return pods.map((pod) => ({
      id: String(pod._id),
      title: pod.pod_title,
      starts_at: pod.pod_date_time.toISOString(),
      club_name: clubName.get(String(pod.club_id)) ?? '',
      promo_status: promoStatus.get(String(pod._id)) ?? null,
    }));
  },

  async generate(args: { pod_id: string; style?: BannerStyle | null; size?: BannerSize | null; only?: SlideKind }, user: { id: string; email?: string | null }) {
    const settings = await loadPromoSettings();
    const pod = await loadPodBannerData(args.pod_id);
    const name = args.only ? `Banner slide ${args.only.toLowerCase()}: ${pod.title}` : `Banners: ${pod.title}`;
    return withRun(await actorRun(name, user), async (run) => {
      const made = await generateCarousel(
        { podId: args.pod_id, style: args.style ?? null, size: args.size ?? settings.banner_style, cta_text: settings.cta_text, utm_prefix: settings.utm_prefix, userId: user.id, only: args.only },
        run
      );
      return { made, run_id: run.id };
    });
  },

  async generateBanners(args: { pod_id: string; style?: BannerStyle | null; size?: BannerSize | null }, user: { id: string; email?: string | null }) {
    const { made, run_id } = await this.generate(args, user);
    return { pod_id: made.data.id, style: made.style, size: made.size, slides: made.slides, ai_copy: made.ai_copy, run_id };
  },

  async regenerateSlide(args: { pod_id: string; kind: SlideKind; style?: BannerStyle | null; size?: BannerSize | null }, user: { id: string; email?: string | null }) {
    const { made } = await this.generate({ ...args, only: args.kind }, user);
    const slide = made.slides.find((item) => item.kind === args.kind);
    if (!slide) throw badInput('This pod has nothing to show on that slide.');
    return slide;
  },

  async preview(args: { pod_id: string; style?: BannerStyle | null; size?: BannerSize | null }, user: { id: string; email?: string | null }) {
    const settings = await loadPromoSettings();
    const { made } = await this.generate(args, user);
    const caption = await aiCaption(made.data, made.copy, await loadCopy());
    const now = new Date();
    const slot = postSlot({ start: made.data.start, now, daysBefore: settings.days_before, postHour: settings.post_hour, zone: getAppTimeZone() });
    let reason = '';
    if (!slot) reason = 'The pod starts within a day; the planner does not promote it.';
    else if (!(await passesFilters(args.pod_id, settings, now))) reason = 'The pod is outside the settings filters, or not published and public.';
    const collaborators = [made.data.venue ? collabHandle(made.data.venue.kit) : null, made.data.host ? collabHandle(made.data.host.kit) : null].filter((handle): handle is string => !!handle);
    return {
      pod_id: made.data.id,
      pod_title: made.data.title,
      banner_url: made.slides[0]?.url ?? '',
      banner_style: made.size,
      style: made.style,
      slides: made.slides,
      collaborators,
      caption: caption.caption,
      hashtags: caption.hashtags,
      ai_caption: caption.ai,
      scheduled_at: slot ? slot.toISOString() : null,
      ineligible_reason: reason,
    };
  },

  /** Promote one pod now, as a person. Refused while a promotion of it is waiting or out. */
  async promote(args: PromoteArgs, user: { id: string; email?: string | null }) {
    const pod = await loadPodBannerData(args.pod_id);
    const existing = await PodPromoModel.findOne({ pod_id: new Types.ObjectId(pod.id) }).select('status').lean<{ status: string }>();
    if (existing && ['SCHEDULED', 'PUBLISHED'].includes(existing.status)) throw badInput('This pod already has a promotion scheduled or published.');
    const settings = await loadPromoSettings();
    const promo = await withRun(await actorRun(`Promote: ${pod.title}`, user), (run) =>
      promotePod(
        {
          podId: new Types.ObjectId(pod.id),
          podStart: pod.start,
          settings,
          source: 'MANUAL',
          userId: user.id,
          now: new Date(),
          restart: true,
          at: parseAt(args.at),
          account_ids: args.account_ids ?? null,
          collaborators: args.collaborators ?? null,
          style: args.style ?? null,
        },
        run
      )
    );
    if (!promo) throw badInput('This pod is being promoted right now — try again in a minute.');
    return pubPromo(promo);
  },

  /** A fresh carousel from the pod as it is now, put on the waiting post. */
  async regenerate(id: string, style: BannerStyle | null | undefined, user: { id: string; email?: string | null }) {
    const promo = await loadPromo(id);
    const state = await postState(promo.scheduled_post_id);
    if (promo.scheduled_post_id && !isEditable(state)) throw badInput('The post has already gone out; its banners cannot change.');
    const settings = await loadPromoSettings();
    const chosen = style ?? (promo.style_locked ? promo.style : null);
    const { made } = await this.generate({ pod_id: String(promo.pod_id), style: chosen, size: promo.banner_style }, user);
    if (state && promo.scheduled_post_id && state.scheduled_at) {
      await rewritePromoPost(
        String(promo.scheduled_post_id),
        state,
        { text: state.text, slides: made.slides, account_ids: state.account_ids, scheduled_at: state.scheduled_at, needs_approval: settings.needs_approval, pod_id: String(promo.pod_id), collaborators: promo.collaborators },
        user.id
      );
    }
    const doc = await PodPromoModel.findByIdAndUpdate(promo._id, { $set: { slides: made.slides, style: made.style, style_locked: !!style || promo.style_locked } }, { new: true }).lean<PodPromoDoc>();
    if (!doc) throw notFound();
    return pubPromo(doc);
  },

  async cancel(id: string) {
    const promo = await loadPromo(id);
    if (['PUBLISHED', 'CANCELLED'].includes(promo.status)) throw badInput('Only a promotion that has not gone out can be cancelled.');
    if (!(await removePromoPost(promo.scheduled_post_id))) throw badInput('The post is going out right now — wait for it to finish.');
    const doc = await PodPromoModel.findByIdAndUpdate(promo._id, { $set: { status: 'CANCELLED', post_status: '', locked_until: null, error: '' } }, { new: true }).lean<PodPromoDoc>();
    if (!doc) throw notFound();
    return pubPromo(doc);
  },
};
