import { Types } from 'mongoose';
import { getUrlConfigs } from '@config/url-configs';
import { PodModel } from '@modules/pods/pod/pod.model';
import { resolvePodPlace } from '@modules/pods/pod/pod.place';
import { ClubModel } from '@modules/clubs/club/club.model';
import { UserModel } from '@modules/access/user/user.model';
import { PostModel } from '@modules/engagement/post/post.model';
import { PodIdeaModel } from '@modules/pods/podIdea/podIdea.model';
import { GiftCardModel } from '@modules/finance/giftcard/giftcard.model';
import { ReferralCodeModel } from '@modules/engagement/referral/referral.model';
import { utmSlug } from './shortLink.codes';

/**
 * Share links — the automatic half of Short Links.
 *
 * Every link a member hands out of mWeb or the app (a pod, a club, a profile,
 * a post, a pod idea, a gift card, their referral code, a pod's rating form)
 * and every external link we write into a shared message (the venue's map) is
 * minted as a duncit.com short link under a fixed campaign, so the traffic it
 * brings back is measured like any other campaign traffic instead of arriving
 * as anonymous direct hits.
 *
 * THE DESTINATION IS NEVER TAKEN FROM THE REQUEST. The caller says WHAT is
 * being shared — a target and the id of the thing — and this module looks the
 * thing up and builds the URL. An id that resolves to nothing mints nothing,
 * which is what keeps an unauthenticated mutation from being a link factory
 * pointed wherever the caller likes.
 */
export const SHARE_LINK_TARGETS = [
  'POD',
  'POD_LOCATION',
  'POD_FEEDBACK',
  'CLUB',
  'PROFILE',
  'POST',
  'POD_IDEA',
  'GIFT_CARD',
  'REFERRAL',
] as const;

export type ShareLinkTarget = (typeof SHARE_LINK_TARGETS)[number];

/**
 * The campaign each kind of share is filed under. Defined here rather than in
 * the database because these are the platform's own campaigns: a marketer
 * renaming one would change the utm tagging of links already in circulation,
 * and the whole point of a frozen utm_campaign is that it cannot.
 */
const CAMPAIGN_NAMES: Record<ShareLinkTarget, string> = {
  POD: 'Pod Shares',
  POD_LOCATION: 'External Links',
  POD_FEEDBACK: 'Pod Rating Shares',
  CLUB: 'Club Shares',
  PROFILE: 'Profile Shares',
  POST: 'Post Shares',
  POD_IDEA: 'Pod Idea Shares',
  GIFT_CARD: 'Gift Card Shares',
  REFERRAL: 'Referral Shares',
};

export interface ShareCampaign {
  campaign_id: string;
  name: string;
  utm_campaign: string;
}

/** `share_` prefixed so a share campaign id can never be mistaken for — or
 * collide with — a marketing campaign uuid. */
export function shareCampaignFor(target: ShareLinkTarget): ShareCampaign {
  const name = CAMPAIGN_NAMES[target];
  const slug = utmSlug(name);
  return { campaign_id: `share_${slug}`, name, utm_campaign: slug };
}

/** Every share campaign, once each — two targets may share one campaign. */
export function shareCampaigns(): ShareCampaign[] {
  const byId = new Map<string, ShareCampaign>();
  for (const target of SHARE_LINK_TARGETS) {
    const campaign = shareCampaignFor(target);
    byId.set(campaign.campaign_id, campaign);
  }
  const list = [...byId.values()];
  list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

export const shareCampaignById = (id: string): ShareCampaign | null =>
  shareCampaigns().find((campaign) => campaign.campaign_id === id) ?? null;

export interface ShareDestination {
  url: string;
  /** What the marketing console calls this link in its list. */
  label: string;
}

/** Google Maps cross-platform search URL — the same one the apps write into a
 * shared pod message (packages/utils/src/pod-share.ts). It cannot be imported
 * from there: the server takes no @duncit/* dependency. */
const MAPS_SEARCH = 'https://www.google.com/maps/search/?api=1&query=';

const clip = (value: string, max = 90) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

const label = (kind: string, subject?: string | null) =>
  clip(`${kind} · ${String(subject || '').trim() || 'Duncit'}`, 120);

const byDocId = async (model: any, ref: string) =>
  Types.ObjectId.isValid(ref) ? model.findById(ref).lean().exec() : null;

/**
 * A pod is named by its document id and nothing else. Its `pod_id` slug is
 * unique only WITHIN a club, so resolving one by slug would sooner or later
 * hand a share of one club's pod the link to another club's.
 */
const findPod = (ref: string) => byDocId(PodModel, ref);

/** A club slug is unique platform-wide, so either address resolves safely —
 * the web addresses a club by slug, the apps by document id. */
const findClub = async (ref: string) =>
  (await byDocId(ClubModel, ref)) ?? ClubModel.findOne({ club_id: ref.toLowerCase() }).lean().exec();

/** The pod page, exactly as both apps address it: club-slug + pod-slug, or the
 * pod on its own when its club could not be resolved. */
async function podUrl(pod: any, base: string) {
  const club = pod.club_id
    ? await ClubModel.findById(pod.club_id).select('club_id').lean().exec()
    : null;
  const slug = (club as any)?.club_id;
  return slug ? `${base}/club/${slug}/pod/${pod.pod_id}` : `${base}/pod/${pod.pod_id}`;
}

type TargetResolver = (ref: string, base: string) => Promise<ShareDestination | null>;

const podResolver: TargetResolver = async (ref, base) => {
  const pod = await findPod(ref);
  if (!pod) return null;
  return { url: await podUrl(pod, base), label: label('Pod', pod.pod_title) };
};

/** The map link for the pod venue — an external destination, built here from
 * the pod own place so no caller can hand us a query to point it at. */
const podLocationResolver: TargetResolver = async (ref) => {
  const pod = await findPod(ref);
  if (!pod) return null;
  const place = await resolvePodPlace(pod, {});
  const query = [place.label, place.detail].filter(Boolean).join(', ').trim();
  if (!query) return null;
  return {
    url: `${MAPS_SEARCH}${encodeURIComponent(query)}`,
    label: label('Location', pod.pod_title),
  };
};

const podFeedbackResolver: TargetResolver = async (ref, base) => {
  const pod = await findPod(ref);
  if (!pod) return null;
  return {
    url: `${base}/pod/${String(pod._id)}/feedback`,
    label: label('Pod rating', pod.pod_title),
  };
};

const clubResolver: TargetResolver = async (ref, base) => {
  const club: any = await findClub(ref);
  if (!club) return null;
  return { url: `${base}/club/${club.club_id}`, label: label('Club', club.club_name) };
};

const profileResolver: TargetResolver = async (ref, base) => {
  const user: any = await byDocId(UserModel, ref);
  if (!user) return null;
  const name = `${user.profile?.first_name ?? ''} ${user.profile?.last_name ?? ''}`.trim();
  return { url: `${base}/u/${String(user._id)}`, label: label('Profile', name) };
};

const postResolver: TargetResolver = async (ref, base) => {
  const post: any = await byDocId(PostModel, ref);
  if (!post) return null;
  const subject = post.caption ?? String(post._id);
  return { url: `${base}/post/${String(post._id)}`, label: label('Post', subject) };
};

const podIdeaResolver: TargetResolver = async (ref, base) => {
  const idea: any = await byDocId(PodIdeaModel, ref);
  if (!idea) return null;
  return { url: `${base}/pod-ideas?id=${String(idea._id)}`, label: label('Pod idea', idea.title) };
};

const giftCardResolver: TargetResolver = async (ref, base) => {
  const code = ref.trim().toUpperCase();
  const card = await GiftCardModel.exists({ code });
  if (!card) return null;
  return { url: `${base}/gift-card/${encodeURIComponent(code)}`, label: label('Gift card', code) };
};

/** The referral link, in the one shape signup reads back
 * (packages/utils/src/referral.ts owns that shape for the clients). */
const referralResolver: TargetResolver = async (ref, base) => {
  const code = ref.trim().toUpperCase();
  const owner = await ReferralCodeModel.exists({ code });
  if (!owner) return null;
  return { url: `${base}/register?ref=${encodeURIComponent(code)}`, label: label('Referral', code) };
};

const RESOLVERS: Record<ShareLinkTarget, TargetResolver> = {
  POD: podResolver,
  POD_LOCATION: podLocationResolver,
  POD_FEEDBACK: podFeedbackResolver,
  CLUB: clubResolver,
  PROFILE: profileResolver,
  POST: postResolver,
  POD_IDEA: podIdeaResolver,
  GIFT_CARD: giftCardResolver,
  REFERRAL: referralResolver,
};

/**
 * Where a share of `ref` should land, or null when the thing being shared does
 * not exist — or, for a pod location, has no place to point at.
 */
export async function resolveShareDestination(
  target: ShareLinkTarget,
  ref: string,
): Promise<ShareDestination | null> {
  const base = (await getUrlConfigs()).mwebUrl.replace(/\/+$/, '');
  return RESOLVERS[target](ref.trim(), base);
}

/** One link per thing shared. Lower-cased so the same pod addressed by a
 * mixed-case id and by its slug cannot end up with two links. */
export const shareKey = (target: ShareLinkTarget, ref: string) =>
  `${target}:${ref.trim().toLowerCase()}`;
