/// <reference types="cypress" />
import { FEEDBACK_CATEGORIES, REPORT_PROBLEM_CONFIG_SDL } from '@duncit/slack';

/**
 * What the support spec reads from the server around a scenario — the same data
 * the page reads, so a spec never guesses at what staging holds — and the one
 * precondition it sets through the API: a seat on a free pod, which SOS needs
 * and no support page offers. Anything staging must already hold fails with a
 * sentence that names it.
 */

const FAQ_GROUPS_QUERY = `query E2eFaqGroups {
  publicFaqGroups { super_category { id name } faqs { id question } }
}`;

const MY_SUPPORT_ITEMS_QUERY = `query E2eMySupportItems {
  myUnifiedSupportTickets { id ticket_no title source }
}`;

const OPEN_PODS_QUERY = `query E2eOpenPods {
  pods(filter: { is_active: true }) { id pod_type pod_date_time no_of_spots seats_available is_deleted }
}`;

const JOIN_FREE_POD_MUTATION = `mutation E2eJoinFreePod($pod_doc_id: ID!) {
  joinFreePod(pod_doc_id: $pod_doc_id) { id status }
}`;

/** How far ahead a pod must start to still be bookable when the SOS scenario reaches it. */
const BOOKABLE_LEAD_MS = 60 * 60 * 1000;

export interface FaqGroupRow {
  super_category: { id: string; name: string } | null;
  faqs: Array<{ id: string; question: string }>;
}

/** The FAQ groups, as FAQs and the hub's Topics read them. */
export const faqGroups = () =>
  cy.gql<{ publicFaqGroups: FaqGroupRow[] }>(FAQ_GROUPS_QUERY).then((data) => data.publicFaqGroups);

/** The id a group's Topics row and filter chip carry: its super category's, or GENERIC. */
export const faqGroupId = (group: FaqGroupRow): string => group.super_category?.id ?? 'GENERIC';

/** The first published question, which staging must have. */
export const firstFaq = () =>
  faqGroups().then((groups) => {
    const faq = groups.flatMap((group) => group.faqs)[0];
    if (!faq) throw new Error('Staging prerequisite: no active APP FAQ is published (Admin > FAQs).');
    return faq;
  });

/** A topic by its super category's name, with at least one question in it. */
export const faqGroupNamed = (name: string) =>
  faqGroups().then((groups) => {
    const group = groups.find((row) => row.super_category?.name === name && row.faqs.length > 0);
    if (!group) {
      throw new Error(`Staging prerequisite: no active APP FAQ under the super category "${name}" (Admin > FAQs).`);
    }
    return group;
  });

interface ReportProblemConfigData {
  reportProblemConfig: {
    categories: Array<{ label: string; is_active: boolean | null }>;
    message_min_length: number | null;
    allow_media: boolean | null;
  } | null;
}

export interface ReportProblemForm {
  category: string;
  minLength: number;
  allowMedia: boolean;
}

/** What `useReportProblemConfig` falls back to (its FALLBACK), when Support has configured nothing. */
const FALLBACK_MIN_LENGTH = 10;

/** The Report a Problem form as the page resolves it, fallback included. */
export const reportProblemForm = () =>
  cy.gql<ReportProblemConfigData>(REPORT_PROBLEM_CONFIG_SDL).then(({ reportProblemConfig: remote }): ReportProblemForm => {
    const active = (remote?.categories ?? []).filter((category) => category.is_active);
    if (!remote || active.length === 0) {
      return { category: FEEDBACK_CATEGORIES[0], minLength: FALLBACK_MIN_LENGTH, allowMedia: true };
    }
    return {
      category: active[0].label,
      minLength: remote.message_min_length || FALLBACK_MIN_LENGTH,
      allowMedia: remote.allow_media !== false,
    };
  });

export interface FiledTicket {
  id: string;
  /** The prefixed number the All Support Tickets rows and the grievance picker use: ST-A1B2C3. */
  ticket_no: string;
}

type SupportItem = FiledTicket & { title: string; source: string };

/** The support ticket this run filed under `subject`, as the member's own history lists it. */
export const filedTicket = (subject: string) =>
  cy.gql<{ myUnifiedSupportTickets: SupportItem[] }>(MY_SUPPORT_ITEMS_QUERY).then((data): FiledTicket => {
    const row = data.myUnifiedSupportTickets.find((item) => item.source === 'TICKET' && item.title === subject);
    if (!row) throw new Error(`No support ticket titled "${subject}" is on the run account.`);
    return { id: row.id, ticket_no: row.ticket_no };
  });

interface OpenPod {
  id: string;
  pod_type: string;
  pod_date_time: string;
  no_of_spots: number;
  seats_available: number;
  is_deleted: boolean;
}

/** Free, live, far enough ahead to book, and with a seat left (0 spots is unlimited). */
function isBookableFreePod(pod: Readonly<OpenPod>): boolean {
  const startsInTime = Date.parse(pod.pod_date_time) > Date.now() + BOOKABLE_LEAD_MS;
  const hasSeat = pod.no_of_spots === 0 || pod.seats_available > 0;
  return pod.pod_type === 'FREE' && !pod.is_deleted && startsInTime && hasSeat;
}

/**
 * Join a free upcoming pod as the run account and yield its id. The seat is
 * returned when the run account is purged (`pod_attendees` points at the user).
 */
export const joinFreePod = () =>
  cy
    .gql<{ pods: OpenPod[] }>(OPEN_PODS_QUERY)
    .then((data) => {
      const pod = data.pods.find(isBookableFreePod);
      if (!pod) {
        throw new Error(
          'Staging prerequisite: no live FREE pod starting more than an hour from now with a seat left, so SOS has no joined pod to raise on.',
        );
      }
      return pod.id;
    })
    .then((podId) => cy.gql(JOIN_FREE_POD_MUTATION, { pod_doc_id: podId }).then(() => podId));
