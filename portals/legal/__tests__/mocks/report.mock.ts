import type { MockedResponse } from '@apollo/client/testing';
import type { ContentReport } from '@duncit/gql-types';
import { REPORT_CATEGORIES_TABLE, UPDATE_CONTENT_REPORT_STATUS } from '../../src/graphql/reports';

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

/** The categories the queue's Reason filter lists — none, which is enough to render. */
export const reportCategoriesMock = (): MockedResponse => ({
  request: { query: REPORT_CATEGORIES_TABLE, variables: () => true },
  result: {
    data: { reportCategoriesTable: { __typename: 'ReportCategoryTablePage', total: 0, rows: [] } },
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
