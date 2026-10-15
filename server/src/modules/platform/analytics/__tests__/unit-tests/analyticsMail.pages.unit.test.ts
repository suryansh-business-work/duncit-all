const mockRegistry: { key: string; url: string }[] = [];
jest.mock('@modules/platform/portalMode/portalMode.registry', () => ({
  get PORTAL_REGISTRY() {
    return mockRegistry;
  },
}));
jest.mock('@observability/statusServices', () => ({ getStatusEnvironment: jest.fn() }));

import { getStatusEnvironment } from '@observability/statusServices';
import {
  ANALYTICS_ENTITIES,
  ANALYTICS_MAIL_PAGES,
  analyticsConsoleUrl,
  isAnalyticsEntity,
} from '../../mail/analyticsMail.pages';

const env = getStatusEnvironment as jest.Mock;

beforeEach(() => {
  mockRegistry.length = 0;
  mockRegistry.push({ key: 'analytics', url: 'https://analytics.example.test/' });
  env.mockReturnValue('production');
});

describe('analyticsConsoleUrl', () => {
  it('links to the registered console root in production', () => {
    expect(analyticsConsoleUrl()).toBe('https://analytics.example.test/');
  });

  it('appends the dashboard path', () => {
    expect(analyticsConsoleUrl('/growth/funnel')).toBe('https://analytics.example.test/growth/funnel');
  });

  it('points staging mails at the staging host', () => {
    env.mockReturnValue('staging');
    expect(analyticsConsoleUrl('/pods')).toBe('https://staging.analytics.example.test/pods');
  });

  it('falls back to the public console when the registry has no analytics entry', () => {
    mockRegistry.length = 0;
    expect(analyticsConsoleUrl('/users')).toBe('https://analytics.duncit.com/users');
  });
});

describe('isAnalyticsEntity', () => {
  it('accepts every dashboard key and rejects anything else', () => {
    expect(ANALYTICS_ENTITIES).toEqual(Object.keys(ANALYTICS_MAIL_PAGES));
    expect(isAnalyticsEntity('PODS')).toBe(true);
    expect(isAnalyticsEntity('pods')).toBe(false);
    expect(isAnalyticsEntity('')).toBe(false);
  });
});
