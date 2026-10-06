import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import QRCode from 'qrcode';
import type { AuthUser } from '@context';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { UserModel } from '@modules/access/user/user.model';
import { shortLinkService } from '@modules/crm/marketing/shortLink.service';
import { shortLinkClickService } from '@modules/crm/marketing/shortLinkClick.service';
import { shortLinkJourneyService } from '@modules/crm/marketing/shortLinkJourney.service';
import type { HostPageAccount, ShareLinkTarget } from '@modules/crm/marketing/shortLink.share';
import { renderPublicPagePoster, type PosterCopy } from './publicPage.poster';

/**
 * Public pages — a venue owner (or a host) publishes a page anyone can open
 * without signing in, and gets a tracked duncit.com link, its QR and a
 * printable poster for it.
 *
 * The link is an ordinary share link (target VENUE_PAGE / HOST_PAGE), so its
 * clicks, journeys and revenue are counted by the same machinery as every
 * other share, and a signed-in visitor stays signed in when they follow it.
 * Everything here is scoped to the caller: an owner reads the numbers of
 * their own venue, a host their own page, and nobody else's.
 */
export type PublicPageKind = 'VENUE' | 'HOST';

const TARGET: Record<PublicPageKind, ShareLinkTarget> = {
  VENUE: 'VENUE_PAGE',
  HOST: 'HOST_PAGE',
};

interface Subject {
  target: ShareLinkTarget;
  ref: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
}

const fail = (message: string, code: string) =>
  new GraphQLError(message, { extensions: { code } });

const joined = (...parts: Array<string | null | undefined>) =>
  parts.map((part) => (part ?? '').trim()).filter(Boolean).join(', ') || null;

/**
 * The venue the caller owns and may publish. Someone else's venue answers
 * exactly like a missing one, so the error cannot be used to probe ids.
 */
async function venueSubject(user: AuthUser, venueId?: string | null): Promise<Subject> {
  const venue = venueId && Types.ObjectId.isValid(venueId)
    ? await VenueModel.findById(venueId).lean().exec()
    : null;
  if (!venue || String(venue.owner_user_id) !== user.id) {
    throw fail('Venue not found', 'NOT_FOUND');
  }
  if (venue.status !== 'APPROVED' || venue.is_active === false) {
    throw fail('A venue can be published once it is approved and active', 'FAILED_PRECONDITION');
  }
  return {
    target: TARGET.VENUE,
    ref: String(venue._id),
    title: venue.venue_name,
    subtitle: joined(venue.locality, venue.city),
    image_url: venue.cover_image_url || venue.gallery?.[0] || null,
  };
}

/** The caller's own host page. Roles are read from the account, not the
 * token: a host approved after signing in still has a token without HOST. */
async function hostSubject(user: AuthUser): Promise<Subject> {
  const account = await UserModel.findById(user.id)
    .select('metadata.role_keys profile')
    .lean<HostPageAccount>()
    .exec();
  if (!account?.metadata?.role_keys?.includes('HOST')) {
    throw fail('Only an approved host can publish a host page', 'FORBIDDEN');
  }
  const profile = account.profile ?? {};
  return {
    target: TARGET.HOST,
    ref: user.id,
    title: `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim(),
    subtitle: joined(profile.username ? `@${profile.username}` : null, profile.city),
    image_url: profile.profile_photo || null,
  };
}

const subjectFor = (kind: PublicPageKind, user: AuthUser, refId?: string | null) =>
  kind === 'VENUE' ? venueSubject(user, refId) : hostSubject(user);

const qrDataUrl = (url: string) => QRCode.toDataURL(url, { width: 512, margin: 1 });

const POSTER_COPY_MAX = 120;

/** Poster words are printed as given, so they are bounded and must be present. */
function cleanCopy(copy: PosterCopy): PosterCopy {
  const headline = copy.headline.trim().slice(0, POSTER_COPY_MAX);
  const footer = copy.footer.trim().slice(0, POSTER_COPY_MAX);
  if (!headline || !footer) throw fail('Poster text is required', 'BAD_USER_INPUT');
  return { headline, footer };
}

export const publicPageService = {
  /** Publish (or re-fetch) the page's tracked link. Idempotent: one link per page. */
  async publish(user: AuthUser, kind: PublicPageKind, refId?: string | null) {
    const subject = await subjectFor(kind, user, refId);
    const link = await shortLinkService.share(subject.target, subject.ref, user.id);
    return { url: link.url, code: link.code, qr_data_url: await qrDataUrl(link.url) };
  },

  /** The page's link and its numbers, or `published: false` before the first publish. */
  async insights(user: AuthUser, kind: PublicPageKind, refId?: string | null, days = 0) {
    const subject = await subjectFor(kind, user, refId);
    const link = await shortLinkService.existingShare(subject.target, subject.ref);
    if (!link) return { published: false, link: null, stats: null, funnel: null };
    const [qr, stats, funnel] = await Promise.all([
      qrDataUrl(link.url),
      shortLinkClickService.stats(link.id, Math.max(0, days)),
      shortLinkJourneyService.funnel(link.id),
    ]);
    return {
      published: true,
      link: { url: link.url, code: link.code, qr_data_url: qr },
      stats,
      funnel,
    };
  },

  /** The A4 poster as base64, for the browser or the app to save or print. */
  async posterPdfBase64(
    user: AuthUser,
    kind: PublicPageKind,
    refId: string | null | undefined,
    copy: PosterCopy,
  ) {
    const words = cleanCopy(copy);
    const subject = await subjectFor(kind, user, refId);
    const link = await shortLinkService.share(subject.target, subject.ref, user.id);
    const pdf = await renderPublicPagePoster({
      title: subject.title,
      subtitle: subject.subtitle,
      image_url: subject.image_url,
      url: link.url,
      copy: words,
    });
    return pdf.toString('base64');
  },
};
