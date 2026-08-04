import {
  OCCURRENCES,
  POD_MODES,
  POD_TYPES,
  type PodFormValues,
  type PodMode,
  type PodPlaceCharge,
} from '@duncit/pod-form';
import { MEETING_PLATFORMS } from './meeting-platforms';
import { aiChips, aiOneOf, aiText } from '../../components/aiFillSanitize';

const POD_TYPE_VALUES = POD_TYPES.map((option) => option.value);
const OCCURRENCE_VALUES = OCCURRENCES.map((option) => option.value);
const POD_MODE_VALUES = POD_MODES.map((option) => option.value as PodMode);
const MEETING_PLATFORM_VALUES = MEETING_PLATFORMS.map((option) => option.value);

const sanitizeCharges = (input: unknown): PodPlaceCharge[] | undefined => {
  if (!Array.isArray(input)) return undefined;
  return input
    .map((row: any) => ({
      label: typeof row?.label === 'string' ? row.label.trim() : '',
      amount: Number(row?.amount) || 0,
      note: typeof row?.note === 'string' ? row.note.trim() : '',
    }))
    .filter((row) => row.label)
    .slice(0, 10);
};

/** A VIRTUAL pod needs its meeting trio; a PHYSICAL one must not carry one
 * (CascadeEffect clears it anyway, and a stale link fails validation). */
function meetingFieldsFor(d: any, mode: PodMode, prev: PodFormValues) {
  if (mode !== 'VIRTUAL') return { meeting_platform: '', meeting_url: '', meeting_notes: '' };
  return {
    meeting_platform: aiOneOf(d?.meeting_platform, MEETING_PLATFORM_VALUES) ?? prev.meeting_platform,
    meeting_url: aiText(d?.meeting_url) ?? prev.meeting_url,
    meeting_notes: aiText(d?.meeting_notes) ?? prev.meeting_notes,
  };
}

export function applyAiFillToForm(
  d: any,
  prev: PodFormValues,
  setValues: (v: PodFormValues) => void
) {
  const startsInDays = Number(d?.starts_in_days) || 3;
  const durationMinutes = Number(d?.duration_minutes) || 90;
  const start = new Date();
  start.setDate(start.getDate() + startsInDays);
  start.setHours(19, 0, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const offers = aiChips(d?.what_this_pod_offers);
  const perks = aiChips(d?.available_perks);
  const charges = sanitizeCharges(d?.place_charges);
  const podMode = aiOneOf<PodMode>(d?.pod_mode, POD_MODE_VALUES) ?? prev.pod_mode;

  const next: PodFormValues = {
    ...prev,
    pod_title: d?.pod_title ?? prev.pod_title,
    pod_description: d?.pod_description ?? prev.pod_description,
    pod_hashtag_text: d?.pod_hashtag_text ?? prev.pod_hashtag_text,
    media_text: d?.media_text ?? prev.media_text,
    pod_info: d?.pod_info ?? prev.pod_info,
    no_of_spots: Number(d?.no_of_spots) || prev.no_of_spots,
    pod_amount: Number(d?.pod_amount) || prev.pod_amount,
    // Anything outside POD_TYPES/OCCURRENCES has no MenuItem to match, so the
    // Select would render blank — keep what the admin already had instead.
    pod_type: aiOneOf(d?.pod_type, POD_TYPE_VALUES) ?? prev.pod_type,
    pod_occurrence: aiOneOf(d?.pod_occurrence, OCCURRENCE_VALUES) ?? prev.pod_occurrence,
    pod_mode: podMode,
    ...meetingFieldsFor(d, podMode, prev),
    zone_name: d?.zone_name ?? prev.zone_name,
    pod_date_time: start,
    pod_end_date_time: end,
    payment_terms: typeof d?.payment_terms === 'string' ? d.payment_terms : prev.payment_terms,
    what_this_pod_offers: offers ?? prev.what_this_pod_offers,
    available_perks: perks ?? prev.available_perks,
    place_charges: charges ?? prev.place_charges,
  };

  if (next.pod_type?.includes('FREE')) next.pod_amount = 0;
  setValues(next);
}
