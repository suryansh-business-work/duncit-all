import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import {
  DELETE_IG_LEAD,
  DRAFT_IG_LEAD_MESSAGE,
  IG_LEAD_SEARCHES,
  IG_LEAD_SETTINGS,
  MARK_IG_LEAD_SENT,
  SET_IG_LEAD_STATUS,
  START_IG_LEAD_SEARCH,
  UPDATE_IG_LEAD_SETTINGS,
  type IgLead,
  type IgLeadSearch,
  type IgLeadSettings,
  type IgLeadStatus,
} from '../../src/pages/instagram-leads-page/queries';

export const makeIgLead = (over: Partial<IgLead> = {}): IgLead => ({
  id: 'ig1',
  username: 'pawsome.blr',
  name: 'Pawsome Grooming',
  bio: 'Dog grooming in Indiranagar\nOpen daily',
  website: 'https://pawsome.in',
  followers: 12_500,
  media_count: 210,
  profile_picture_url: 'https://cdn.test/pawsome.jpg',
  profile_url: 'https://www.instagram.com/pawsome.blr/',
  emails: ['hi@pawsome.in'],
  phones: ['919876543210'],
  fit_score: 82,
  fit_reason: 'Runs group sessions for dog owners',
  status: 'NEW',
  draft: '',
  draft_step: null,
  messages: [],
  next_follow_up_at: null,
  last_contacted_at: null,
  created_at: '2026-10-30T10:00:00.000Z',
  ...over,
});

export const makeIgSettings = (over: Partial<IgLeadSettings> = {}): IgLeadSettings => ({
  max_follow_ups: 2,
  follow_up_gap_days: 3,
  daily_send_limit: 20,
  pitch: 'Host your sessions as Duncit pods',
  sent_today: 4,
  serper_ready: true,
  instagram_ready: true,
  ...over,
});

export const makeIgSearch = (over: Partial<IgLeadSearch> = {}): IgLeadSearch => ({
  id: 's1',
  brief: 'Dog trainers in Bangalore',
  summary: 'Pet trainers and groomers with 1k-50k followers',
  queries: ['dog trainer bangalore instagram', 'pet groomer bangalore'],
  status: 'DONE',
  found: 14,
  added: 9,
  skipped: 5,
  error: '',
  created_at: '2026-10-31T08:00:00.000Z',
  ...over,
});

/** The lead as Apollo carries it: every object with its __typename. */
export const typedIgLead = (lead: IgLead) => ({
  __typename: 'IgLead',
  ...lead,
  messages: lead.messages.map((message) => ({ __typename: 'IgLeadMessage', ...message })),
});

const typedSettings = (settings: IgLeadSettings) => ({ __typename: 'IgLeadSettings', ...settings });
const typedSearch = (search: IgLeadSearch) => ({ __typename: 'IgLeadSearch', ...search });
const rejection = (message: string) => ({ result: { errors: [new GraphQLError(message)] } });

/** `uses` covers the reads a send or a save triggers by refetching the settings. */
export const igSettingsMock = (settings: IgLeadSettings, uses = 1): MockedResponse => ({
  request: { query: IG_LEAD_SETTINGS },
  result: { data: { igLeadSettings: typedSettings(settings) } },
  maxUsageCount: uses,
});

export const igSettingsErrorMock = (message: string): MockedResponse => ({ request: { query: IG_LEAD_SETTINGS }, ...rejection(message) });

export const igSearchesMock = (searches: IgLeadSearch[], uses = 1): MockedResponse => ({
  request: { query: IG_LEAD_SEARCHES },
  result: { data: { igLeadSearches: searches.map(typedSearch) } },
  maxUsageCount: uses,
});

export const igSearchesErrorMock = (message: string): MockedResponse => ({ request: { query: IG_LEAD_SEARCHES }, ...rejection(message) });

export const startIgSearchMock = (brief: string, maxResults: number, search: IgLeadSearch): MockedResponse => ({
  request: { query: START_IG_LEAD_SEARCH, variables: { input: { brief, max_results: maxResults } } },
  result: { data: { startIgLeadSearch: typedSearch(search) } },
});

export const startIgSearchErrorMock = (brief: string, maxResults: number, message: string): MockedResponse => ({
  request: { query: START_IG_LEAD_SEARCH, variables: { input: { brief, max_results: maxResults } } },
  ...rejection(message),
});

type SettingsInput = Pick<IgLeadSettings, 'max_follow_ups' | 'follow_up_gap_days' | 'daily_send_limit' | 'pitch'>;

export const updateIgSettingsMock = (input: SettingsInput, settings: IgLeadSettings): MockedResponse => ({
  request: { query: UPDATE_IG_LEAD_SETTINGS, variables: { input } },
  result: { data: { updateIgLeadSettings: typedSettings(settings) } },
});

export const updateIgSettingsErrorMock = (input: SettingsInput, message: string): MockedResponse => ({
  request: { query: UPDATE_IG_LEAD_SETTINGS, variables: { input } },
  ...rejection(message),
});

/** `lead` null answers with no data at all — the call went through but brought nothing back. */
export const draftIgMessageMock = (id: string, lead: IgLead | null): MockedResponse => ({
  request: { query: DRAFT_IG_LEAD_MESSAGE, variables: { id } },
  result: { data: lead ? { draftIgLeadMessage: typedIgLead(lead) } : null },
});

export const draftIgMessageErrorMock = (id: string, message: string): MockedResponse => ({
  request: { query: DRAFT_IG_LEAD_MESSAGE, variables: { id } },
  ...rejection(message),
});

export const markIgSentMock = (id: string, text: string, lead: IgLead | null): MockedResponse => ({
  request: { query: MARK_IG_LEAD_SENT, variables: { id, text } },
  result: { data: lead ? { markIgLeadSent: typedIgLead(lead) } : null },
});

export const markIgSentErrorMock = (id: string, text: string, message: string): MockedResponse => ({
  request: { query: MARK_IG_LEAD_SENT, variables: { id, text } },
  ...rejection(message),
});

export const setIgStatusMock = (id: string, status: IgLeadStatus, lead: IgLead | null): MockedResponse => ({
  request: { query: SET_IG_LEAD_STATUS, variables: { id, status } },
  result: { data: lead ? { setIgLeadStatus: typedIgLead(lead) } : null },
});

export const setIgStatusErrorMock = (id: string, status: IgLeadStatus, message: string): MockedResponse => ({
  request: { query: SET_IG_LEAD_STATUS, variables: { id, status } },
  ...rejection(message),
});

export const deleteIgLeadMock = (id: string): MockedResponse => ({
  request: { query: DELETE_IG_LEAD, variables: { id } },
  result: { data: { deleteIgLead: true } },
});

export const deleteIgLeadErrorMock = (id: string, message: string): MockedResponse => ({
  request: { query: DELETE_IG_LEAD, variables: { id } },
  ...rejection(message),
});
