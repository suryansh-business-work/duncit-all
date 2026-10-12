import type { MockedResponse } from '@apollo/client/testing';
import type { ContentReport, ReportCategory } from '@duncit/gql-types';
import {
  CREATE_REPORT_CATEGORY,
  DELETE_REPORT_CATEGORY,
  MARK_REPORTED_CONTENT_OK,
  REPORT_CATEGORIES_TABLE,
  SEND_CONTENT_REPORT_MAIL,
  TAKE_DOWN_REPORTED_CONTENT,
  UPDATE_CONTENT_REPORT_STATUS,
  UPDATE_REPORT_CATEGORY,
} from '../../src/graphql/reports';

/**
 * Content-report mocks: the `ContentReportFields` projection the Legal queue
 * and its detail dialog read, typed from the generated schema.
 */
const ISO = '2026-03-04T09:30:00.000Z';

export type ContentReportMock = Pick<
  ContentReport,
  | 'id'
  | 'report_no'
  | 'target_type'
  | 'target_id'
  | 'club_id'
  | 'target_preview_url'
  | 'target_caption'
  | 'reason'
  | 'reason_label'
  | 'details'
  | 'reporter_name'
  | 'target_owner_name'
  | 'status'
  | 'resolution'
  | 'resolved_at'
  | 'handled_by_name'
  | 'target_live'
  | 'target_removed_at'
  | 'report_count'
  | 'history'
  | 'created_at'
  | 'updated_at'
> & { __typename: 'ContentReport' };

export const makeContentReport = (over: Partial<ContentReportMock> = {}): ContentReportMock => ({
  __typename: 'ContentReport',
  id: 'rpt-1',
  report_no: 'RPT-000123',
  target_type: 'STORY',
  target_id: 'story-77',
  club_id: 'club-9',
  target_preview_url: 'https://ik.imagekit.io/duncit/stories/court-2.jpg',
  target_caption: 'Saturday doubles at Court 2',
  reason: 'SPAM',
  reason_label: 'Spam or misleading',
  details: 'Keeps posting the same promo link.',
  reporter_name: 'Asha Rao',
  target_owner_name: 'Rahul Mehta',
  status: 'IN_REVIEW',
  resolution: '',
  resolved_at: null,
  handled_by_name: '',
  target_live: true,
  target_removed_at: null,
  report_count: 1,
  history: [],
  created_at: ISO,
  updated_at: ISO,
  ...over,
});

/** The categories the queue's Reason filter lists; none by default, which is enough to render. */
export const reportCategoriesMock = (rows: ReportCategoryMock[] = []): MockedResponse => ({
  request: { query: REPORT_CATEGORIES_TABLE, variables: () => true },
  result: {
    data: {
      reportCategoriesTable: { __typename: 'ReportCategoryTablePage', total: rows.length, rows },
    },
  },
});

export const updateReportStatusMock = (
  report: ContentReportMock = makeContentReport(),
): MockedResponse => ({
  request: { query: UPDATE_CONTENT_REPORT_STATUS, variables: () => true },
  result: { data: { updateContentReportStatus: report } },
});

export const updateReportStatusErrorMock = (message: string): MockedResponse => ({
  request: { query: UPDATE_CONTENT_REPORT_STATUS, variables: () => true },
  result: { errors: [{ message }] },
});

/* ---- Report categories (the Settings tab) ---- */

export type ReportCategoryMock = Pick<
  ReportCategory,
  | 'id'
  | 'key'
  | 'label'
  | 'description'
  | 'requires_details'
  | 'sort_order'
  | 'is_active'
  | 'updated_at'
> & { __typename: 'ReportCategory' };

export const makeReportCategory = (over: Partial<ReportCategoryMock> = {}): ReportCategoryMock => ({
  __typename: 'ReportCategory',
  id: 'cat-1',
  key: 'SPAM',
  label: 'Spam or misleading',
  description: 'Promotions, scams or repeated links.',
  requires_details: false,
  sort_order: 2,
  is_active: true,
  updated_at: ISO,
  ...over,
});

/** A create that only answers when its variables pass `matches`. */
export const createReportCategoryMock = (
  matches: (variables: Record<string, unknown>) => boolean = () => true,
  fail?: string,
): MockedResponse => ({
  request: { query: CREATE_REPORT_CATEGORY, variables: matches },
  result: fail !== undefined
    ? { errors: [{ message: fail }] }
    : { data: { createReportCategory: makeReportCategory() } },
});

export const updateReportCategoryMock = (
  matches: (variables: Record<string, unknown>) => boolean = () => true,
): MockedResponse => ({
  request: { query: UPDATE_REPORT_CATEGORY, variables: matches },
  result: { data: { updateReportCategory: makeReportCategory() } },
});

export const deleteReportCategoryMock = (id = 'cat-1', fail?: string): MockedResponse => ({
  request: { query: DELETE_REPORT_CATEGORY, variables: { id } },
  result:
    fail === undefined
      ? { data: { deleteReportCategory: true } }
      : { errors: [{ message: fail }] },
});

/* ---- Verdicts and mails on a report ---- */

type Matches = (variables: Record<string, unknown>) => boolean;

const verdictMock = (
  query: MockedResponse['request']['query'],
  field: string,
  report: ContentReportMock,
  matches: Matches,
  fail?: string,
): MockedResponse => ({
  request: { query, variables: matches },
  result: fail === undefined ? { data: { [field]: report } } : { errors: [{ message: fail }] },
});

export const takeDownReportMock = (
  report: ContentReportMock = makeContentReport(),
  matches: Matches = () => true,
  fail?: string,
): MockedResponse =>
  verdictMock(TAKE_DOWN_REPORTED_CONTENT, 'takeDownReportedContent', report, matches, fail);

export const markReportOkMock = (
  report: ContentReportMock = makeContentReport(),
  matches: Matches = () => true,
  fail?: string,
): MockedResponse =>
  verdictMock(MARK_REPORTED_CONTENT_OK, 'markReportedContentOk', report, matches, fail);

export const sendReportMailMock = (
  matches: Matches = () => true,
  fail?: string,
): MockedResponse =>
  verdictMock(SEND_CONTENT_REPORT_MAIL, 'sendContentReportMail', makeContentReport(), matches, fail);
