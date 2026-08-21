import { formatMoney } from '@duncit/utils';
import { linesToMedia } from '../build-input';
import type { PodFormData, PodFormValues } from '../types';

export interface PodPreviewMedia {
  url: string;
  type: string;
}

/**
 * Everything the two preview surfaces render, derived ONCE from the live form
 * values so the card and the detail view can never disagree about a field.
 */
export interface PodPreviewModel {
  title: string;
  media: PodPreviewMedia[];
  isVirtual: boolean;
  modeText: string;
  isFree: boolean;
  priceText: string;
  whenText: string;
  spotsTotal: number;
  spotsText: string;
  placeText: string;
  clubName: string;
  hostNames: string[];
  description: string;
  info: string;
  offers: string[];
  perks: string[];
  hashtags: string[];
  charges: { label: string; amount: number; note: string }[];
  paymentTerms: string;
}

/** A pod with no title yet still needs a headline in the preview. */
const UNTITLED = 'Untitled pod';

const named = (list: any[], id: string, key: string): string => {
  const hit = list.find((item) => String(item?.id) === id);
  const value = hit?.[key];
  return typeof value === 'string' ? value : '';
};

/** Venue line as the apps show it: name first, then whatever locality exists. */
function venueLine(venues: any[], venueId: string): string {
  const venue = venues.find((item) => String(item?.id) === venueId);
  if (!venue) return '';
  return [venue.venue_name, venue.locality, venue.city].filter(Boolean).join(', ');
}

function hostLine(users: any[], ids: string[]): string[] {
  return ids
    .map((id) => {
      const user = users.find((item) => item?.user_id === id);
      return user?.full_name || user?.email || '';
    })
    .filter(Boolean);
}

/** Admin-configured date + time (rule 11) — never a raw toLocaleString. */
function whenLine(formatter: PodFormData['dateFormatter'], start: Date | null, end: Date | null): string {
  if (!start) return '';
  const day = `${formatter.formatDate(start)} · ${formatter.formatTime(start)}`;
  if (!end) return day;
  return `${day} – ${formatter.formatTime(end)}`;
}

function priceLine(isFree: boolean, amount: number, symbol: string | undefined): string {
  if (isFree) return 'Free';
  return formatMoney(Number(amount) || 0, { symbol: symbol || '₹' });
}

/** Spots as the card writes them: capacity, or the "not set yet" dash. */
function spotsLine(total: number): string {
  if (total > 0) return `${total} spots`;
  return 'Spots not set';
}

const hashtagsOf = (text: string): string[] =>
  text
    .split(/[\s,]+/)
    .map((tag) => tag.replace(/^#/, '').trim())
    .filter(Boolean);

/**
 * The one derivation both preview surfaces read. Pure so the portals can render
 * it without a network round-trip: everything comes from the form values plus
 * the lookup lists the form already holds.
 */
export function buildPodPreview(values: PodFormValues, data: PodFormData): PodPreviewModel {
  const isVirtual = values.pod_mode === 'VIRTUAL';
  const isFree = values.pod_type.includes('FREE');
  const spotsTotal = Number(values.no_of_spots) || 0;
  const virtualPlace = values.meeting_platform || 'Online meeting';

  return {
    title: values.pod_title.trim() || UNTITLED,
    media: linesToMedia(values.media_text),
    isVirtual,
    modeText: isVirtual ? 'Virtual' : 'Physical',
    isFree,
    priceText: priceLine(isFree, values.pod_amount, data.finance?.currency_symbol),
    whenText: whenLine(data.dateFormatter, values.pod_date_time, values.pod_end_date_time),
    spotsTotal,
    spotsText: spotsLine(spotsTotal),
    placeText: isVirtual ? virtualPlace : venueLine(data.venues, values.venue_id),
    clubName: named(data.clubs, values.club_id, 'club_name'),
    hostNames: hostLine(data.users, values.pod_hosts_id),
    description: values.pod_description.trim(),
    info: values.pod_info.trim(),
    offers: values.what_this_pod_offers.filter(Boolean),
    perks: values.available_perks.filter(Boolean),
    hashtags: hashtagsOf(values.pod_hashtag_text),
    charges: values.place_charges.filter((charge) => charge.label.trim()),
    paymentTerms: values.payment_terms.trim(),
  };
}
