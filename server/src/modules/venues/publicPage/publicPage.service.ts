import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import QRCode from 'qrcode';
import type { AuthUser } from '@context';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { UserModel } from '@modules/access/user/user.model';
import { shortLinkService } from '@modules/crm/marketing/shortLink.service';
import { shortLinkClickService } from '@modules/crm/marketing/shortLinkClick.service';
import { shortLinkJourneyService } from '@modules/crm/marketing/shortLinkJourney.service';
import { resolveShareDestination, type HostPageAccount, type ShareLinkTarget } from '@modules/crm/marketing/shortLink.share';
import { renderPublicPagePoster, type PosterCopy } from './publicPage.poster';
import { renderVenueTableLabel, renderVenueTableStickers } from './publicPage.tableLabel';

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
  /** The page also shows a food menu — the poster then says so, and a table label can be made. */
  offers_food: boolean;
  /** The venue's table labels — one per-table QR sticker each. Empty for a host. */
  food_tables: string[];
}

const fail = (message: string, code: string) =>
  new GraphQLError(message, { extensions: { code } });

const joined = (...parts: Array<string | null | undefined>) =>
  parts.map((part) => (part ?? '').trim()).filter(Boolean).join(', ') || null;

/**
 * The venue the caller owns and may publish. Someone else's venue answers
 * exactly like a missing one, so the error cannot be used to probe ids.
 * `anyVenue` is a Venues console editor's pass (checked by the resolver),
 * which reaches every venue.
 */
async function venueSubject(user: AuthUser, venueId?: string | null, anyVenue = false): Promise<Subject> {
  const venue = venueId && Types.ObjectId.isValid(venueId)
    ? await VenueModel.findById(venueId).lean().exec()
    : null;
  if (!venue || (!anyVenue && String(venue.owner_user_id) !== user.id)) {
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
    offers_food: venue.offers_food === true,
    food_tables: venue.food_tables ?? [],
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
    offers_food: false,
    food_tables: [],
  };
}

const subjectFor = (kind: PublicPageKind, user: AuthUser, refId?: string | null) =>
  kind === 'VENUE' ? venueSubject(user, refId) : hostSubject(user);

const qrDataUrl = (url: string) => QRCode.toDataURL(url, { width: 512, margin: 1 });

const POSTER_COPY_MAX = 120;

/** The word printed before a numeric table label ("Table" 5). */
const TABLE_HEADING_MAX = 30;

/**
 * The query parameter a per-table QR carries. Mirrors `FOOD_TABLE_PARAM` in
 * `@duncit/utils` (server/src imports no @duncit/* package) — the guest's
 * checkout reads it to fill in the table.
 */
export const FOOD_TABLE_PARAM = 'table';

/** What a sticker prints under its QR: "Table 5" for a numbered table, the owner's own name otherwise ("Patio"). */
export const tableCaption = (heading: string, table: string): string =>
  /^\d/.test(table) && heading ? `${heading} ${table}` : table;

/**
 * The menu address one table's QR opens: the venue menu with the table on it,
 * and the share link's code as `dl`, so the landing page counts the scan
 * against the menu link exactly as a redirect through it would be.
 */
export function tableMenuUrl(menuUrl: string, table: string, code: string | null): string {
  const url = new URL(menuUrl);
  url.searchParams.set(FOOD_TABLE_PARAM, table);
  if (code) url.searchParams.set('dl', code);
  return url.toString();
}

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
    if (!link) return { published: false, offers_food: subject.offers_food, link: null, stats: null, funnel: null };
    const [qr, stats, funnel] = await Promise.all([
      qrDataUrl(link.url),
      shortLinkClickService.stats(link.id, Math.max(0, days)),
      shortLinkJourneyService.funnel(link.id),
    ]);
    return {
      published: true,
      offers_food: subject.offers_food,
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

  /**
   * A venue's table label as base64: the scan panel alone, the venue's name
   * under it. A venue that serves food gets its own table link — it opens the
   * menu and its scans are counted apart from the poster's; any other venue's
   * label carries the page link the poster does.
   */
  async tableLabelPdfBase64(user: AuthUser, venueId: string | null | undefined, headline: string) {
    const words = headline.trim().slice(0, POSTER_COPY_MAX);
    if (!words) throw fail('Label text is required', 'BAD_USER_INPUT');
    const subject = await venueSubject(user, venueId);
    const target: ShareLinkTarget = subject.offers_food ? 'VENUE_MENU' : subject.target;
    const link = await shortLinkService.share(target, subject.ref, user.id);
    const pdf = await renderVenueTableLabel({ title: subject.title, url: link.url, headline: words });
    return pdf.toString('base64');
  },

  /**
   * Every table's QR sticker in one PDF, a page each. Each QR opens the menu
   * with its table filled in at checkout; scans count against the venue's
   * menu link. Only a venue that serves food and has listed its tables has any.
   * The owner prints them; so may a Venues console editor (`anyVenue`).
   */
  async tableStickersPdfBase64(
    user: AuthUser,
    venueId: string | null | undefined,
    copy: { headline: string; tableHeading: string },
    anyVenue = false,
  ) {
    const { headline, tableHeading } = copy;
    const words = headline.trim().slice(0, POSTER_COPY_MAX);
    if (!words) throw fail('Label text is required', 'BAD_USER_INPUT');
    const heading = tableHeading.trim().slice(0, TABLE_HEADING_MAX);
    const subject = await venueSubject(user, venueId, anyVenue);
    if (!subject.offers_food) throw fail('Turn on food at this venue first', 'FAILED_PRECONDITION');
    if (subject.food_tables.length === 0) throw fail('Add your tables first', 'FAILED_PRECONDITION');
    const [link, destination] = await Promise.all([
      shortLinkService.share('VENUE_MENU', subject.ref, user.id),
      resolveShareDestination('VENUE_MENU', subject.ref),
    ]);
    if (!destination) throw fail('Venue not found', 'NOT_FOUND');
    const pdf = await renderVenueTableStickers({
      url: link.url,
      headline: words,
      stickers: subject.food_tables.map((table) => ({
        caption: tableCaption(heading, table),
        qrUrl: tableMenuUrl(destination.url, table, link.code),
      })),
    });
    return pdf.toString('base64');
  },
};
