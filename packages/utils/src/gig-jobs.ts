/**
 * Gig Jobs — the contract every surface shares (rule 40): the GraphQL
 * documents, the row shapes, the LITERAL label keys and the form <-> input
 * conversion. Hosts, venue owners and brand owners post what an event or a
 * workshop needs; freelancers who joined from Earn with Duncit say they are
 * interested, which shares contacts both ways (free today). Copy is the
 * `gigJobs` namespace; the server is `server/src/modules/engagement/gigJob`.
 */

import { formatMoney } from './format-money';

export const GIG_JOBS_PATH = '/gigs';
export const GIG_POST_PATH = '/gigs/new';
export const MY_GIGS_PATH = '/gigs/mine';
/** The Earn with Duncit freelancer step lives on mWeb (and the app); the Partners console links here. */
export const FREELANCER_PROFILE_PATH = '/earn/freelancer';
export const gigJobPath = (id: string) => `${GIG_JOBS_PATH}/${encodeURIComponent(id)}`;
export const gigJobEditPath = (id: string) => `${gigJobPath(id)}/edit`;

export const GIG_POSTER_ROLES = ['HOST', 'VENUE_OWNER', 'ECOMM_MANAGER'] as const;
export type GigPosterRole = (typeof GIG_POSTER_ROLES)[number];
export const GIG_EVENT_TYPES = ['EVENT', 'WORKSHOP', 'OTHER'] as const;
export type GigEventType = (typeof GIG_EVENT_TYPES)[number];
export type GigJobStatus = 'OPEN' | 'CLOSED';

export interface GigCategory {
  id: string;
  title: string;
  examples: string[];
}

export interface GigContact {
  name: string;
  phone: string;
  email: string;
}

/** A gig as the board lists it. */
export interface GigJobRow {
  id: string;
  title: string;
  category_title: string;
  roles: string[];
  event_type: GigEventType;
  event_date?: string | null;
  city: string;
  budget?: number | null;
  openings: number;
  status: GigJobStatus;
  poster_role: GigPosterRole;
  poster_name: string;
  interest_count: number;
  is_mine: boolean;
  viewer_interested: boolean;
  created_at: string;
}

/** A gig as its own page shows it — the contact is null until the viewer may see it. */
export interface GigJob extends GigJobRow {
  description: string;
  category_id: string;
  location: string;
  /** Null (or absent) until the viewer may see it. */
  contact?: GigContact | null;
}

export interface GigJobPage<R = GigJobRow> {
  rows: R[];
  total: number;
}

export interface GigInterest {
  id: string;
  freelancer_name: string;
  skills: string[];
  message: string;
  contact: GigContact;
  created_at: string;
}

export interface FreelancerProfile {
  id: string;
  display_name: string;
  category_ids: string[];
  skills: string[];
  city: string;
  bio: string;
  portfolio_url: string;
  experience_years: number;
  contact_phone: string;
  contact_email: string;
  is_available: boolean;
}

export interface GigViewer {
  poster_roles: GigPosterRole[];
  is_freelancer: boolean;
  default_contact: GigContact;
}

export interface GigJobFilter {
  category_id?: string | null;
  city?: string | null;
  search?: string | null;
}

/* ------------------------------------------------------------------ *
 * Documents
 * ------------------------------------------------------------------ */

const ROW_FIELDS = `id title category_title roles event_type event_date city budget openings status poster_role
  poster_name interest_count is_mine viewer_interested created_at`;
const JOB_FIELDS = `${ROW_FIELDS} description category_id location contact { name phone email }`;
const PROFILE_FIELDS = `id display_name category_ids skills city bio portfolio_url experience_years contact_phone
  contact_email is_available`;

export const GIG_CATEGORIES_QUERY = `query GigCategories {
  gigCategories { id title examples }
}`;

export const GIG_VIEWER_QUERY = `query GigViewer {
  gigViewer { poster_roles is_freelancer default_contact { name phone email } }
}`;

export const GIG_JOBS_QUERY = `query GigJobs($filter: GigJobFilter, $offset: Int, $limit: Int) {
  gigJobs(filter: $filter, offset: $offset, limit: $limit) { total rows { ${ROW_FIELDS} } }
}`;

export const MY_GIG_JOBS_QUERY = `query MyGigJobs($offset: Int, $limit: Int) {
  myGigJobs(offset: $offset, limit: $limit) { total rows { ${ROW_FIELDS} } }
}`;

export const GIG_JOB_QUERY = `query GigJob($id: ID!) {
  gigJob(id: $id) { ${JOB_FIELDS} }
}`;

export const GIG_JOB_INTERESTS_QUERY = `query GigJobInterests($job_id: ID!) {
  gigJobInterests(job_id: $job_id) { id freelancer_name skills message created_at contact { name phone email } }
}`;

export const MY_FREELANCER_PROFILE_QUERY = `query MyFreelancerProfile {
  myFreelancerProfile { ${PROFILE_FIELDS} }
}`;

export const CREATE_GIG_JOB_MUTATION = `mutation CreateGigJob($input: GigJobInput!) {
  createGigJob(input: $input) { ${JOB_FIELDS} }
}`;

export const UPDATE_GIG_JOB_MUTATION = `mutation UpdateGigJob($id: ID!, $input: GigJobInput!) {
  updateGigJob(id: $id, input: $input) { ${JOB_FIELDS} }
}`;

export const SET_GIG_JOB_STATUS_MUTATION = `mutation SetGigJobStatus($id: ID!, $status: GigJobStatus!) {
  setGigJobStatus(id: $id, status: $status) { ${JOB_FIELDS} }
}`;

export const EXPRESS_GIG_INTEREST_MUTATION = `mutation ExpressGigInterest($job_id: ID!, $message: String) {
  expressGigInterest(job_id: $job_id, message: $message) { ${JOB_FIELDS} }
}`;

export const SAVE_FREELANCER_PROFILE_MUTATION = `mutation SaveFreelancerProfile($input: FreelancerProfileInput!) {
  saveFreelancerProfile(input: $input) { ${PROFILE_FIELDS} }
}`;

/* ------------------------------------------------------------------ *
 * Labels — literal keys only (the translation gate greps for them)
 * ------------------------------------------------------------------ */

const POSTER_ROLE_KEY: Record<GigPosterRole, string> = {
  HOST: 'gigJobs.posterRole.HOST',
  VENUE_OWNER: 'gigJobs.posterRole.VENUE_OWNER',
  ECOMM_MANAGER: 'gigJobs.posterRole.ECOMM_MANAGER',
};

const EVENT_TYPE_KEY: Record<GigEventType, string> = {
  EVENT: 'gigJobs.eventType.EVENT',
  WORKSHOP: 'gigJobs.eventType.WORKSHOP',
  OTHER: 'gigJobs.eventType.OTHER',
};

const STATUS_KEY: Record<GigJobStatus, string> = {
  OPEN: 'gigJobs.status.OPEN',
  CLOSED: 'gigJobs.status.CLOSED',
};

const pick = <T extends string>(values: readonly T[], value: unknown, fallback: T): T =>
  values.includes(value as T) ? (value as T) : fallback;

export const gigPosterRoleKey = (role: unknown) => POSTER_ROLE_KEY[pick(GIG_POSTER_ROLES, role, 'HOST')];
export const gigEventTypeKey = (type: unknown) => EVENT_TYPE_KEY[pick(GIG_EVENT_TYPES, type, 'EVENT')];
export const gigStatusKey = (status: unknown) => STATUS_KEY[pick(['OPEN', 'CLOSED'] as const, status, 'OPEN')];

/** "₹15,000", or null when the poster left the budget to be discussed. */
export const gigBudgetText = (budget: number | null | undefined): string | null =>
  typeof budget === 'number' ? formatMoney(budget) : null;

/* ------------------------------------------------------------------ *
 * Rules the screens share
 * ------------------------------------------------------------------ */

export const canPostGigs = (viewer: Pick<GigViewer, 'poster_roles'> | null | undefined): boolean =>
  (viewer?.poster_roles.length ?? 0) > 0;

/** What the viewer's button on a gig is: theirs to manage, already shared, join first, or "I'm interested". */
export type GigViewerAction = 'MANAGE' | 'CONTACT_SHARED' | 'JOIN_AS_FREELANCER' | 'CLOSED' | 'INTEREST';

export function gigViewerAction(
  job: Pick<GigJob, 'is_mine' | 'viewer_interested' | 'status'>,
  viewer: Pick<GigViewer, 'is_freelancer'> | null | undefined
): GigViewerAction {
  if (job.is_mine) return 'MANAGE';
  if (job.viewer_interested) return 'CONTACT_SHARED';
  if (job.status !== 'OPEN') return 'CLOSED';
  return viewer?.is_freelancer ? 'INTEREST' : 'JOIN_AS_FREELANCER';
}

/** The gig roles a post in this category may ask for. */
export const gigRoleOptions = (categories: readonly GigCategory[], categoryId: string): string[] =>
  categories.find((category) => category.id === categoryId)?.examples ?? [];

/** How long the board's typed boxes (search, city) wait for typing to stop before they query. */
export const GIG_FILTER_SETTLE_MS = 350;

/**
 * The filter to query once typing settles, or null when the typed search and
 * city already match it — so a settled box that changed nothing fires nothing.
 */
export function settledGigFilter(filter: GigJobFilter, search: string, city: string): GigJobFilter | null {
  if (search === (filter.search ?? '') && city === (filter.city ?? '')) return null;
  return { ...filter, search, city };
}

/**
 * The roles a post keeps after its category changed: the ones the new category
 * still offers. Null = nothing to change — no category picked yet (or one no
 * longer listed), or every pick is still on offer.
 */
export function prunedGigRoles(
  categories: readonly GigCategory[],
  categoryId: string,
  roles: readonly string[]
): string[] | null {
  const offered = gigRoleOptions(categories, categoryId);
  if (offered.length === 0) return null;
  const kept = roles.filter((role) => offered.includes(role));
  return kept.length === roles.length ? null : kept;
}

/** A freelancer's skill picks: every role across the categories they chose, once each. */
export const freelancerSkillOptions = (categories: readonly GigCategory[], categoryIds: readonly string[]): string[] =>
  Array.from(
    new Set(categories.filter((category) => categoryIds.includes(category.id)).flatMap((category) => category.examples))
  );

const digitsOf = (phone: string) => phone.replace(/\D/g, '');

/** Links for a shared contact — dial, WhatsApp and mail. Null where the contact has no such detail. */
export function gigContactLinks(contact: GigContact) {
  const digits = digitsOf(contact.phone);
  return {
    call: digits ? `tel:+${digits}` : null,
    whatsapp: digits ? `https://wa.me/${digits}` : null,
    email: contact.email ? `mailto:${contact.email}` : null,
  };
}

/** What the server stores: the number as dialled, spaces and dashes taken out. */
const compactPhone = (phone: string) => phone.replace(/[\s-]/g, '');

/* ------------------------------------------------------------------ *
 * Forms <-> inputs
 * ------------------------------------------------------------------ */

export interface GigJobFormValues {
  poster_role: GigPosterRole | '';
  category_id: string;
  title: string;
  description: string;
  roles: string[];
  event_type: GigEventType;
  /** yyyy-MM-dd, or '' for "no fixed date yet". */
  event_date: string;
  city: string;
  location: string;
  /** Whole rupees as typed; '' = to be discussed. */
  budget: string;
  openings: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
}

export function emptyGigJobValues(viewer?: Pick<GigViewer, 'poster_roles' | 'default_contact'> | null): GigJobFormValues {
  const roles = viewer?.poster_roles ?? [];
  return {
    // Preselected only when there is nothing to choose between.
    poster_role: roles.find(() => roles.length === 1) ?? '',
    category_id: '',
    title: '',
    description: '',
    roles: [],
    event_type: 'EVENT',
    event_date: '',
    city: '',
    location: '',
    budget: '',
    openings: '1',
    contact_name: viewer?.default_contact.name ?? '',
    contact_phone: viewer?.default_contact.phone ?? '',
    contact_email: viewer?.default_contact.email ?? '',
  };
}

export const gigJobToValues = (job: GigJob): GigJobFormValues => ({
  poster_role: job.poster_role,
  category_id: job.category_id,
  title: job.title,
  description: job.description,
  roles: [...job.roles],
  event_type: job.event_type,
  event_date: job.event_date ? job.event_date.slice(0, 10) : '',
  city: job.city,
  location: job.location,
  budget: typeof job.budget === 'number' ? String(job.budget) : '',
  openings: String(job.openings),
  contact_name: job.contact?.name ?? '',
  contact_phone: job.contact?.phone ?? '',
  contact_email: job.contact?.email ?? '',
});

/** The mutation input — call on values the form's schema already accepted. */
export const toGigJobInput = (values: GigJobFormValues) => ({
  poster_role: values.poster_role,
  category_id: values.category_id,
  title: values.title.trim(),
  description: values.description.trim(),
  roles: values.roles,
  event_type: values.event_type,
  event_date: values.event_date || null,
  city: values.city.trim(),
  location: values.location.trim(),
  budget: values.budget.trim() === '' ? null : Number(values.budget),
  openings: Number(values.openings),
  contact_name: values.contact_name.trim(),
  contact_phone: compactPhone(values.contact_phone),
  contact_email: values.contact_email.trim(),
});

export interface FreelancerFormValues {
  display_name: string;
  category_ids: string[];
  skills: string[];
  city: string;
  bio: string;
  portfolio_url: string;
  experience_years: string;
  contact_phone: string;
  contact_email: string;
  is_available: boolean;
}

/** The form's starting values: the saved profile, else the account's own contact. */
export function freelancerToValues(
  profile: FreelancerProfile | null | undefined,
  fallback?: GigContact | null
): FreelancerFormValues {
  if (!profile) {
    return {
      display_name: fallback?.name ?? '',
      category_ids: [],
      skills: [],
      city: '',
      bio: '',
      portfolio_url: '',
      experience_years: '0',
      contact_phone: fallback?.phone ?? '',
      contact_email: fallback?.email ?? '',
      is_available: true,
    };
  }
  return {
    display_name: profile.display_name,
    category_ids: [...profile.category_ids],
    skills: [...profile.skills],
    city: profile.city,
    bio: profile.bio,
    portfolio_url: profile.portfolio_url,
    experience_years: String(profile.experience_years),
    contact_phone: profile.contact_phone,
    contact_email: profile.contact_email,
    is_available: profile.is_available,
  };
}

/** The mutation input. Skills that no chosen category offers any more are dropped. */
export function toFreelancerInput(values: FreelancerFormValues, categories: readonly GigCategory[]) {
  const offered = new Set(freelancerSkillOptions(categories, values.category_ids));
  return {
    display_name: values.display_name.trim(),
    category_ids: values.category_ids,
    skills: values.skills.filter((skill) => offered.has(skill)),
    city: values.city.trim(),
    bio: values.bio.trim(),
    portfolio_url: values.portfolio_url.trim(),
    experience_years: Number(values.experience_years || 0),
    contact_phone: compactPhone(values.contact_phone),
    contact_email: values.contact_email.trim(),
    is_available: values.is_available,
  };
}
