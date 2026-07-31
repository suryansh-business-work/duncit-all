import type { TableFilterValue } from '@duncit/table';
import type { AudienceFilterState, TriState } from './types';

/** A number the server can use — blank and nonsense both mean "no bound". */
const bound = (raw: string): string | undefined => {
  const n = Number(raw);
  return raw.trim() !== '' && Number.isFinite(n) && n >= 0 ? String(Math.trunc(n)) : undefined;
};

const pushMulti = (out: TableFilterValue[], field: string, values: string[]) => {
  if (values.length > 0) out.push({ field, op: 'in', values });
};

const pushText = (out: TableFilterValue[], field: string, value: string) => {
  if (value.trim() !== '') out.push({ field, op: 'contains', value: value.trim() });
};

const pushEq = (out: TableFilterValue[], field: string, value: string) => {
  if (value !== '') out.push({ field, op: 'eq', value });
};

const pushTri = (out: TableFilterValue[], field: string, value: TriState) => {
  if (value === 'yes') out.push({ field, op: 'is_true' });
  if (value === 'no') out.push({ field, op: 'is_false' });
};

/** A date range as the engine's between/gte/lte, skipping an open end. */
const pushDateRange = (out: TableFilterValue[], field: string, from: string, to: string) => {
  if (from && to) out.push({ field, op: 'between', values: [from, to] });
  else if (from) out.push({ field, op: 'gte', value: from });
  else if (to) out.push({ field, op: 'lte', value: to });
};

/** Age is the one range the server translates rather than compares, so it is
 * emitted on the `age` field and turned into a birthdate range there. */
const pushAge = (out: TableFilterValue[], min?: string, max?: string) => {
  if (min && max) out.push({ field: 'age', op: 'between', values: [min, max] });
  else if (min) out.push({ field: 'age', op: 'gte', value: min });
  else if (max) out.push({ field: 'age', op: 'lte', value: max });
};

/**
 * The sidebar state as the server-side filter list. Pure, so the whole
 * translation is testable without rendering a single control.
 */
export function buildFilters(state: AudienceFilterState): TableFilterValue[] {
  const out: TableFilterValue[] = [];

  pushAge(out, bound(state.ageMin), bound(state.ageMax));

  pushMulti(out, 'country', state.country);
  pushMulti(out, 'state', state.state);
  pushMulti(out, 'city', state.city);
  pushMulti(out, 'zone', state.zone);
  pushText(out, 'pincode', state.pincode);

  pushEq(out, 'push_platform', state.push);
  pushTri(out, 'whatsapp', state.whatsapp);
  pushMulti(out, 'role', state.roles);
  pushMulti(out, 'interest_category', state.interests);

  pushEq(out, 'status', state.status);
  pushText(out, 'locale', state.locale);
  pushTri(out, 'email_verified', state.emailVerified);
  pushTri(out, 'phone_verified', state.phoneVerified);
  pushEq(out, 'last_login_provider', state.provider);
  pushEq(out, 'profile_visibility', state.visibility);
  pushTri(out, 'survey_completed', state.surveyCompleted);
  pushTri(out, 'first_time_user', state.firstTimeUser);

  pushDateRange(out, 'created_at', state.joinedFrom, state.joinedTo);
  pushDateRange(out, 'last_login_at', state.activeFrom, state.activeTo);

  return out;
}

/** How many filters are active — drives the "Filters (3)" badge. */
export const activeFilterCount = (state: AudienceFilterState): number =>
  buildFilters(state).length;
