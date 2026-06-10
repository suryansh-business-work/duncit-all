import type { PodForm, PodPlaceCharge } from './queries';

const fmt = (dt: Date) => dt.toISOString();

const sanitizeChips = (input: unknown): string[] | undefined => {
  if (!Array.isArray(input)) return undefined;
  return input
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)
    .slice(0, 20);
};

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

export function applyAiFillToForm(
  d: any,
  prev: PodForm,
  setValues: (v: PodForm) => void
) {
  const startsInDays = Number(d?.starts_in_days) || 3;
  const durationMinutes = Number(d?.duration_minutes) || 90;
  const start = new Date();
  start.setDate(start.getDate() + startsInDays);
  start.setHours(19, 0, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const offers = sanitizeChips(d?.what_this_pod_offers);
  const perks = sanitizeChips(d?.available_perks);
  const charges = sanitizeCharges(d?.place_charges);

  const next: PodForm = {
    ...prev,
    pod_title: d?.pod_title ?? prev.pod_title,
    pod_description: d?.pod_description ?? prev.pod_description,
    pod_hashtag_text: d?.pod_hashtag_text ?? prev.pod_hashtag_text,
    media_text: d?.media_text ?? prev.media_text,
    pod_info: d?.pod_info ?? prev.pod_info,
    no_of_spots: Number(d?.no_of_spots) || prev.no_of_spots,
    pod_amount: Number(d?.pod_amount) || prev.pod_amount,
    pod_type: typeof d?.pod_type === 'string' ? d.pod_type : prev.pod_type,
    pod_occurrence:
      typeof d?.pod_occurrence === 'string' ? d.pod_occurrence : prev.pod_occurrence,
    zone_name: d?.zone_name ?? prev.zone_name,
    pod_date_time: fmt(start),
    pod_end_date_time: fmt(end),
    payment_terms: typeof d?.payment_terms === 'string' ? d.payment_terms : prev.payment_terms,
    what_this_pod_offers: offers ?? prev.what_this_pod_offers,
    available_perks: perks ?? prev.available_perks,
    place_charges: charges ?? prev.place_charges,
  };

  if (next.pod_type && next.pod_type.includes('FREE')) next.pod_amount = 0;
  setValues(next);
}
