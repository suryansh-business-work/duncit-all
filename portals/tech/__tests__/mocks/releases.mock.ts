import type {
  StoreReleaseAdvice,
  StoreReleaseIssue,
  StoreReleasePage,
  StoreReleaseRow,
} from '../../src/pages/app-builds/releases/queries';

export const releaseAdvice = (over: Partial<StoreReleaseAdvice> = {}): StoreReleaseAdvice => ({
  summary: 'Add a demo account for the reviewer',
  causes: ['No login supplied'],
  steps: ['Create a demo account', 'Resubmit'],
  next_time: ['Fill the review notes'],
  confidence: 'HIGH',
  model: 'test-model',
  generated_at: '2026-01-02T10:00:00.000Z',
  error: '',
  ...over,
});

export const releaseIssue = (over: Partial<StoreReleaseIssue> = {}): StoreReleaseIssue => ({
  id: 'iss1',
  store: 'APP_STORE',
  kind: 'REJECTION',
  source: 'STORE',
  version: '2.4.0',
  build_number: '88',
  state: 'REJECTED',
  review_state: 'UNRESOLVED_ISSUES',
  reviewer_message: 'We could not sign in to your app.',
  store_ref: 'ref1',
  detected_at: '2026-01-02T09:00:00.000Z',
  detected_by: 'sync',
  resolved_at: null,
  resolved_reason: '',
  advice: releaseAdvice(),
  notified_at: '2026-01-02T09:05:00.000Z',
  notify_error: '',
  reminder_count: 0,
  last_reminded_at: null,
  resubmitted_build_no: '',
  resubmitted_by: '',
  resubmitted_at: null,
  ...over,
});

export const releaseRow = (over: Partial<StoreReleaseRow> = {}): StoreReleaseRow => ({
  id: 'rel1',
  store: 'APP_STORE',
  version: '2.4.0',
  build_number: '88',
  state: 'REJECTED',
  status: 'REJECTED',
  track: '',
  review_state: 'UNRESOLVED_ISSUES',
  created_at: '2026-01-01T09:00:00.000Z',
  submitted_at: '2026-01-01T09:30:00.000Z',
  rollout_pct: null,
  store_ref: 'ref1',
  build_no: 'B-100',
  issue: releaseIssue(),
  ...over,
});

export const releasePage = (over: Partial<StoreReleasePage> = {}): StoreReleasePage => ({
  store: 'APP_STORE',
  rows: [releaseRow()],
  fetched_at: '2026-01-02T10:00:00.000Z',
  store_url: 'https://store.example.test/console',
  app_name: 'Duncit',
  configured: true,
  error: '',
  ...over,
});
