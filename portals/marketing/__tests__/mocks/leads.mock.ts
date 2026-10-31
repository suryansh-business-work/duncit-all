import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import {
  ADD_MARKETING_LEAD_NOTE,
  ASSIGN_MARKETING_LEAD_OWNER,
  CREATE_MARKETING_LEAD,
  IMPORT_MARKETING_LEADS,
  MARKETING_LEAD,
  MARKETING_LEAD_SUMMARY,
  PROMOTE_MARKETING_LEAD,
  SET_MARKETING_LEAD_STAGE,
  type MarketingLeadCrmKind,
  type MarketingLeadDetail,
  type MarketingLeadImportMapping,
  type MarketingLeadImportResult,
  type MarketingLeadInput,
  type MarketingLeadNote,
  type MarketingLeadRow,
  type MarketingLeadStage,
  type MarketingLeadSummary,
  type MarketingLeadTimelineEntry,
} from '../../src/pages/leads-page/queries';

export const makeLeadRow = (over: Partial<MarketingLeadRow> = {}): MarketingLeadRow => ({
  id: 'l1',
  name: 'Blue Cafe',
  company: 'Blue Cafe Pvt',
  pipeline: 'VENUE',
  stage: 'NEW',
  source: 'INSTAGRAM',
  emails: ['hi@bluecafe.in'],
  phones: ['919876543210'],
  website: 'bluecafe.in',
  instagram_handle: 'bluecafe',
  instagram_url: 'https://www.instagram.com/bluecafe/',
  city: 'Pune',
  score: 82,
  score_reason: 'Hosts brunches',
  owner_user_id: 'me',
  owner_name: 'Asha Rao',
  tags: ['coffee'],
  crm_ref: null,
  created_at: '2026-10-30T09:00:00.000Z',
  updated_at: '2026-10-30T10:00:00.000Z',
  ...over,
});

export const makeLeadNote = (over: Partial<MarketingLeadNote> = {}): MarketingLeadNote => ({
  at: '2026-10-30T10:00:00.000Z',
  by_user_id: 'me',
  by_name: 'Asha Rao',
  text: 'Spoke to the owner',
  ...over,
});

export const makeTimelineEntry = (over: Partial<MarketingLeadTimelineEntry> = {}): MarketingLeadTimelineEntry => ({
  at: '2026-10-30T09:00:00.000Z',
  kind: 'CREATED',
  text: 'Added from INSTAGRAM',
  by_name: 'System',
  ...over,
});

export const makeLeadDetail = (over: Partial<MarketingLeadDetail> = {}): MarketingLeadDetail => ({
  ...makeLeadRow(),
  notes: [makeLeadNote()],
  timeline: [makeTimelineEntry()],
  source_ref: { ig_lead_id: 'ig1', search_id: 's1', import_id: '' },
  ...over,
});

export const makeLeadSummary = (over: Partial<MarketingLeadSummary> = {}): MarketingLeadSummary => ({
  total: 12,
  stages: [
    { stage: 'NEW', count: 5 },
    { stage: 'CONTACTED', count: 3 },
    { stage: 'REPLIED', count: 1 },
    { stage: 'QUALIFIED', count: 2 },
    { stage: 'CONVERTED', count: 1 },
    { stage: 'LOST', count: 0 },
  ],
  pipelines: [
    { pipeline: 'VENUE', count: 7 },
    { pipeline: 'HOST', count: 5 },
  ],
  ...over,
});

/** The row fields as the server sends them: every object carries its GraphQL type name. */
export const typedLeadRow = (lead: MarketingLeadRow) => ({
  __typename: 'MarketingLead',
  id: lead.id,
  name: lead.name,
  company: lead.company,
  pipeline: lead.pipeline,
  stage: lead.stage,
  source: lead.source,
  emails: lead.emails,
  phones: lead.phones,
  website: lead.website,
  instagram_handle: lead.instagram_handle,
  instagram_url: lead.instagram_url,
  city: lead.city,
  score: lead.score,
  score_reason: lead.score_reason,
  owner_user_id: lead.owner_user_id,
  owner_name: lead.owner_name,
  tags: lead.tags,
  crm_ref: lead.crm_ref ? { __typename: 'MarketingLeadCrmRef', ...lead.crm_ref } : null,
  created_at: lead.created_at,
  updated_at: lead.updated_at,
});

/** The whole lead as the drawer's query receives it. */
export const typedLeadDetail = (lead: MarketingLeadDetail) => ({
  ...typedLeadRow(lead),
  notes: lead.notes.map((note) => ({ __typename: 'MarketingLeadNote', ...note })),
  timeline: lead.timeline.map((entry) => ({ __typename: 'MarketingLeadTimelineEntry', ...entry })),
  source_ref: { __typename: 'MarketingLeadSourceRef', ...lead.source_ref },
});

const rejection = (message: string) => ({ result: { errors: [new GraphQLError(message)] } });

/** `uses` lets one mock answer the drawer's refetch after an action as well as its first load. */
export const marketingLeadMock = (lead: MarketingLeadDetail, uses = 1): MockedResponse => ({
  request: { query: MARKETING_LEAD, variables: { id: lead.id } },
  result: { data: { marketingLead: typedLeadDetail(lead) } },
  maxUsageCount: uses,
});

export const marketingLeadErrorMock = (id: string, message: string): MockedResponse => ({
  request: { query: MARKETING_LEAD, variables: { id } },
  ...rejection(message),
});

export const leadSummaryMock = (summary: MarketingLeadSummary): MockedResponse => ({
  request: { query: MARKETING_LEAD_SUMMARY },
  result: {
    data: {
      marketingLeadSummary: {
        __typename: 'MarketingLeadSummary',
        total: summary.total,
        stages: summary.stages.map((row) => ({ __typename: 'MarketingLeadStageCount', ...row })),
        pipelines: summary.pipelines.map((row) => ({ __typename: 'MarketingLeadPipelineCount', ...row })),
      },
    },
  },
  maxUsageCount: 2,
});

export const leadSummaryErrorMock = (message: string): MockedResponse => ({
  request: { query: MARKETING_LEAD_SUMMARY },
  ...rejection(message),
});

export const createLeadMock = (input: MarketingLeadInput, lead: MarketingLeadDetail, merged = false): MockedResponse => ({
  request: { query: CREATE_MARKETING_LEAD, variables: { input } },
  result: { data: { createMarketingLead: { __typename: 'MarketingLeadUpsert', merged, lead: typedLeadDetail(lead) } } },
});

export const createLeadErrorMock = (input: MarketingLeadInput, message: string): MockedResponse => ({
  request: { query: CREATE_MARKETING_LEAD, variables: { input } },
  ...rejection(message),
});

export const setLeadStageMock = (lead: MarketingLeadDetail, stage: MarketingLeadStage, note: string | null = null): MockedResponse => ({
  request: { query: SET_MARKETING_LEAD_STAGE, variables: { id: lead.id, stage, note } },
  result: { data: { setMarketingLeadStage: typedLeadDetail({ ...lead, stage }) } },
});

export const setLeadStageErrorMock = (id: string, stage: MarketingLeadStage, note: string | null, message: string): MockedResponse => ({
  request: { query: SET_MARKETING_LEAD_STAGE, variables: { id, stage, note } },
  ...rejection(message),
});

export const assignLeadOwnerMock = (lead: MarketingLeadDetail, ownerUserId: string | null, ownerName: string | null): MockedResponse => ({
  request: { query: ASSIGN_MARKETING_LEAD_OWNER, variables: { id: lead.id, owner_user_id: ownerUserId } },
  result: { data: { assignMarketingLeadOwner: typedLeadDetail({ ...lead, owner_user_id: ownerUserId, owner_name: ownerName }) } },
});

export const addLeadNoteMock = (lead: MarketingLeadDetail, text: string): MockedResponse => ({
  request: { query: ADD_MARKETING_LEAD_NOTE, variables: { id: lead.id, text } },
  result: { data: { addMarketingLeadNote: typedLeadDetail({ ...lead, notes: [...lead.notes, makeLeadNote({ text })] }) } },
});

export const addLeadNoteErrorMock = (id: string, text: string, message: string): MockedResponse => ({
  request: { query: ADD_MARKETING_LEAD_NOTE, variables: { id, text } },
  ...rejection(message),
});

export const promoteLeadMock = (lead: MarketingLeadDetail, kind: MarketingLeadCrmKind, crmId = 'crm-1'): MockedResponse => ({
  request: { query: PROMOTE_MARKETING_LEAD, variables: { id: lead.id, kind } },
  result: {
    data: {
      promoteMarketingLeadToCrm: typedLeadDetail({
        ...lead,
        crm_ref: { kind, id: crmId, promoted_at: '2026-10-31T10:00:00.000Z', promoted_by: 'boss' },
      }),
    },
  },
});

export const promoteLeadErrorMock = (id: string, kind: MarketingLeadCrmKind, message: string): MockedResponse => ({
  request: { query: PROMOTE_MARKETING_LEAD, variables: { id, kind } },
  ...rejection(message),
});

export const makeImportResult = (over: Partial<MarketingLeadImportResult> = {}): MarketingLeadImportResult => ({
  added: 1,
  merged: 1,
  skipped: 1,
  run_id: 'run-9',
  rows: [
    { row: 1, outcome: 'ADDED', reason: '', lead_id: 'l1' },
    { row: 2, outcome: 'MERGED', reason: '', lead_id: 'l2' },
    { row: 3, outcome: 'SKIPPED', reason: '"12" is not a phone number', lead_id: '' },
  ],
  ...over,
});

export const importLeadsMock = (rows: string[][], mapping: MarketingLeadImportMapping, result: MarketingLeadImportResult): MockedResponse => ({
  request: { query: IMPORT_MARKETING_LEADS, variables: { rows, mapping } },
  result: {
    data: {
      importMarketingLeads: {
        __typename: 'MarketingLeadImportResult',
        added: result.added,
        merged: result.merged,
        skipped: result.skipped,
        run_id: result.run_id,
        rows: result.rows.map((row) => ({ __typename: 'MarketingLeadImportRowResult', ...row })),
      },
    },
  },
});

export const importLeadsErrorMock = (rows: string[][], mapping: MarketingLeadImportMapping, message: string): MockedResponse => ({
  request: { query: IMPORT_MARKETING_LEADS, variables: { rows, mapping } },
  ...rejection(message),
});
