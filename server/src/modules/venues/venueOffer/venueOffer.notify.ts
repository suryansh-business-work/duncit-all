/**
 * Telling the other side there are terms to answer — in the app, by email and
 * on WhatsApp — with the WHOLE offer in each: the window, the guests, the price
 * model and the money, the points asked of the venue, the note, when it must be
 * answered by, and the venue chat link where it is answered.
 *
 *   - the venue hears of a host's offer and of every host counter
 *     (VENUE_OFFER_RECEIVED / venue-offer-received);
 *   - every host hears of a venue's counter
 *     (HOST_VENUE_COUNTER_OFFER / host-venue-counter-offer).
 *
 * Until Meta approves the detailed venue template, a host's FIRST offer that
 * cannot go out on it falls back to the shorter message that already runs
 * (VENUE_SLOT_REQUESTED), so a venue is never left without a WhatsApp for a new
 * offer. Everything here is best-effort and never throws.
 */
import { UserModel } from '@modules/access/user/user.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import type { IVenueSlot } from '@modules/venues/venueSlot/venueSlot.model';
import { CONTACT_FIELDS, contactName } from '@modules/pods/podChangeRequest/podChangeRequest.common';
import { podImageAssets } from '@modules/platform/whatsapp/whatsapp.assets';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { emailTranslationVars, recipientLocale } from '@services/email/email-i18n';
import { notifyEvent } from '@services/notify/notify.service';
import { getUrlConfigs } from '@config/url-configs';
import { trimTrailingSlash } from '@utils/url';
import { escapeHtml } from '@utils/html';
import { appDate, appDateTime, appTime } from '@utils/app-time';
import { logs } from '@observability/log';
import type { VenueOfferProposal } from './venueOffer.types';

type Translate = (key: string) => string;

/** The reader's own wording for a key, the English fallback beneath it. */
async function translatorFor(email: string): Promise<Translate> {
  const vars = await emailTranslationVars(await recipientLocale(email));
  return (key) => vars[`t:${key}`] ?? key;
}

const money = (symbol: string, value: number) =>
  `${symbol}${(Math.round(value * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const span = (symbol: string, low: number, high: number) =>
  low === high ? money(symbol, high) : `${money(symbol, low)}–${money(symbol, high)}`;

/** One line, for a WhatsApp value: Meta refuses line breaks and long runs of spaces inside one. */
const oneLine = (text: string) => text.replaceAll(/\s+/g, ' ').trim();

interface OfferFacts {
  podId: string;
  podTitle: string;
  hostIds: unknown[];
  assets: ReturnType<typeof podImageAssets>;
  venueName: string;
  ownerId: unknown;
  ownerEmail: string;
  ownerName: string;
  ownerPhone: string;
  symbol: string;
  date: string;
  time: string;
  replyBy: string;
}

/** Everything both directions read, in one set of lookups. Null when the pod or venue has gone. */
async function loadFacts(slot: Pick<IVenueSlot, 'venue_id' | 'start_at' | 'end_at' | 'offer'>, podId: string): Promise<OfferFacts | null> {
  const [pod, venue, finance] = await Promise.all([
    PodModel.findById(podId).select('pod_title pod_hosts_id pod_images_and_videos').lean(),
    VenueModel.findById(slot.venue_id).select('venue_name owner_user_id owner_email owner_name owner_phone').lean(),
    getFinanceSettings(),
  ]);
  if (!pod || !venue) return null;
  return {
    podId,
    podTitle: pod.pod_title ?? '',
    hostIds: pod.pod_hosts_id ?? [],
    assets: podImageAssets(pod.pod_images_and_videos),
    venueName: venue.venue_name ?? '',
    ownerId: venue.owner_user_id,
    ownerEmail: (venue.owner_email ?? '').trim(),
    ownerName: (venue.owner_name ?? '').trim(),
    ownerPhone: (venue.owner_phone ?? '').trim(),
    symbol: finance.currency_symbol || '₹',
    date: appDate(slot.start_at),
    time: `${appTime(slot.start_at)} – ${appTime(slot.end_at)}`,
    replyBy: slot.offer?.expires_at ? appDateTime(slot.offer.expires_at) : appDateTime(slot.start_at),
  };
}

/** The terms in the reader's words: "₹500 per guest", "8–20 guests". */
function termsText(t: Translate, symbol: string, terms: VenueOfferProposal, maxGuests: number) {
  const fewest = terms.min_guests || maxGuests;
  const guestsWord = t('email.venueOffer.guestRange');
  return {
    terms: `${money(symbol, terms.rate)} ${t(`email.venueOffer.model.${terms.model}`)}`.trim(),
    guests: fewest === maxGuests ? `${maxGuests} ${guestsWord}` : `${fewest}–${maxGuests} ${guestsWord}`,
  };
}

/** The ask, as one line for WhatsApp and as escaped HTML for the email. */
function askParts(t: Translate, terms: VenueOfferProposal) {
  const items = terms.offerings ?? [];
  const note = (terms.note ?? '').trim();
  const none = t('email.venueOffer.noRequest');
  return {
    offeringsLine: items.length ? oneLine(items.join('; ')) : none,
    requestLine: note ? oneLine(note) : none,
    offeringsHtml: items.length
      ? `<ul style="margin:0;padding-left:18px">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
      : escapeHtml(none),
    requestNote: escapeHtml(note || none),
  };
}

const phoneOf = (user: { auth?: { phone?: { extension?: string | null; number?: string | null } | null } | null } | null) => {
  const number = user?.auth?.phone?.number?.trim();
  return number ? `${user?.auth?.phone?.extension ?? ''}${number}` : '';
};

/**
 * The venue has terms to answer: a host's first offer, or a host's counter.
 * `round` keys each message to its own move, so a counter is never swallowed
 * by the duplicate guard as a repeat of the offer before it.
 */
export async function tellVenueOfOffer(args: { slot: IVenueSlot; podId: string; terms: VenueOfferProposal; round: number; actorHostId?: string | null }) {
  try {
    const facts = await loadFacts(args.slot, args.podId);
    if (!facts) return;
    const [owner, host] = await Promise.all([
      UserModel.findById(facts.ownerId).select(CONTACT_FIELDS).lean(),
      UserModel.findById(args.actorHostId ?? facts.hostIds[0]).select(CONTACT_FIELDS).lean(),
    ]);
    const to = facts.ownerEmail || String(owner?.auth?.email ?? '').trim();
    const name = facts.ownerName || contactName(owner) || facts.venueName;
    const t = await translatorFor(to);
    const words = termsText(t, facts.symbol, args.terms, args.slot.offer?.pax ?? 0);
    const ask = askParts(t, args.terms);
    // Every WhatsApp value must be filled — a host with no name is still "Host".
    const hostName = contactName(host) || t('email.field.host');
    const { partnersUrl } = await getUrlConfigs();
    const chatUrl = `${trimTrailingSlash(partnersUrl)}/venues/pods/${facts.podId}/chat`;
    const receives = span(facts.symbol, (args.terms.quote_min ?? args.terms.quote).venue_payout, args.terms.quote.venue_payout);
    const params = [name, facts.podTitle, facts.date, facts.time, hostName, words.terms, words.guests, receives, ask.offeringsLine, ask.requestLine, facts.replyBy, chatUrl];
    const entityId = `${String(args.slot._id)}:r${args.round}`;
    const outcome = await notifyEvent({
      event: 'VENUE_OFFER_RECEIVED',
      entityId,
      user: owner,
      name,
      email: to,
      assets: facts.assets,
      params,
      vars: {
        pod: escapeHtml(facts.podTitle),
        host: escapeHtml(hostName),
        offerings: escapeHtml(ask.offeringsLine),
        request: escapeHtml(ask.requestLine),
        venue_name: escapeHtml(facts.venueName),
        offerings_html: ask.offeringsHtml,
        request_note: ask.requestNote,
        contact_phone: escapeHtml(phoneOf(host) || '—'),
        contact_email: escapeHtml(String(host?.auth?.email ?? '') || '—'),
      },
    });
    // The detailed template is not live yet: a NEW offer still reaches the
    // venue on the short message every venue already receives.
    if (args.round === 1 && outcome.wa.status === 'FAILED') {
      await whatsappService.send({
        event: 'VENUE_SLOT_REQUESTED',
        entityId: String(args.slot._id),
        user: owner,
        name,
        assets: facts.assets,
        params: [name, facts.podTitle, facts.date, appTime(args.slot.start_at), hostName, chatUrl],
      });
    }
  } catch (error) {
    logs.server.error('venueOffer', 'tellVenueOfOffer', { error, pod_id: args.podId, slot_id: String(args.slot._id) });
  }
}

/** Every host has the venue's counter to answer. */
export async function tellHostsOfCounter(args: { slot: IVenueSlot; podId: string; terms: VenueOfferProposal; round: number }) {
  try {
    const facts = await loadFacts(args.slot, args.podId);
    if (!facts) return;
    const hosts = await UserModel.find({ _id: { $in: facts.hostIds } }).select(CONTACT_FIELDS).lean();
    const owner = await UserModel.findById(facts.ownerId).select(CONTACT_FIELDS).lean();
    const { mwebUrl } = await getUrlConfigs();
    const chatUrl = `${trimTrailingSlash(mwebUrl)}/venue-chat/${facts.podId}`;
    const venuePhone = facts.ownerPhone || phoneOf(owner);
    const venueEmail = facts.ownerEmail || String(owner?.auth?.email ?? '');
    for (const host of hosts) {
      const to = String(host?.auth?.email ?? '').trim();
      // eslint-disable-next-line no-await-in-loop -- one reader's locale at a time; a pod has a handful of hosts
      const t = await translatorFor(to);
      const words = termsText(t, facts.symbol, args.terms, args.slot.offer?.pax ?? 0);
      const ask = askParts(t, args.terms);
      const name = contactName(host) || t('email.field.host');
      const pays = span(facts.symbol, (args.terms.quote_min ?? args.terms.quote).total, args.terms.quote.total);
      // eslint-disable-next-line no-await-in-loop -- AiSensy is rate-limited; the sends go one at a time anyway
      await notifyEvent({
        event: 'HOST_VENUE_COUNTER_OFFER',
        entityId: `${String(args.slot._id)}:r${args.round}`,
        user: host,
        name,
        email: to,
        assets: facts.assets,
        params: [name, facts.podTitle, facts.date, facts.time, facts.venueName, words.terms, words.guests, pays, ask.offeringsLine, ask.requestLine, facts.replyBy, chatUrl],
        vars: {
          pod: escapeHtml(facts.podTitle),
          venue: escapeHtml(facts.venueName),
          offerings: escapeHtml(ask.offeringsLine),
          request: escapeHtml(ask.requestLine),
          offerings_html: ask.offeringsHtml,
          request_note: ask.requestNote,
          contact_phone: escapeHtml(venuePhone || '—'),
          contact_email: escapeHtml(venueEmail || '—'),
        },
      });
    }
  } catch (error) {
    logs.server.error('venueOffer', 'tellHostsOfCounter', { error, pod_id: args.podId, slot_id: String(args.slot._id) });
  }
}

/** The in-app note beside the messages, opening the venue chat. */
export async function inAppOfferNote(targetUserIds: readonly unknown[], title: string, body: string, podId: string) {
  try {
    const { notificationService } = await import('@modules/engagement/notification/notification.service');
    await notificationService.create({
      title,
      body,
      scope: 'USER',
      target_user_ids: targetUserIds.map(String),
      link_url: `/venue-chat/${podId}`,
      silent: false,
    });
  } catch (error) {
    logs.server.error('venueOffer', 'inAppOfferNote', { error, pod_id: podId });
  }
}
