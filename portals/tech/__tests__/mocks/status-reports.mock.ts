import type { StatusReportRow } from '../../src/pages/status-reports-page/queries';

export const statusReportRow = (over: Partial<StatusReportRow> = {}): StatusReportRow => ({
  id: 'sr1',
  service_key: 'mweb',
  service_name: 'Duncit mWeb',
  service_url: 'https://app.example.test/home',
  impact: 'ERRORS',
  name: 'Ravi',
  email: 'ravi@example.test',
  page_url: 'https://app.example.test/pods/1',
  message: 'Checkout spins forever',
  image_urls: [],
  staff_image_urls: [],
  environment: 'production',
  status: 'NEW',
  ip: '203.0.113.7',
  user_agent: 'TestBrowser/1.0',
  user_id: 'u-77',
  note: '',
  created_at: '2026-02-01T08:00:00.000Z',
  updated_at: '2026-02-01T08:00:00.000Z',
  ...over,
});
