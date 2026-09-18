import { resolveWindow, type AnalyticsWindow } from './window';
import { podAnalytics } from './pods.analytics';
import { clubAnalytics } from './clubs.analytics';
import { clubAdminAnalytics } from './clubAdmins.analytics';
import { hostAnalytics } from './hosts.analytics';
import { userAnalytics } from './users.analytics';
import type { AnalyticsEntity, EntityAnalyticsSections } from './shapes';

const LOADERS: Record<AnalyticsEntity, (window: AnalyticsWindow) => Promise<EntityAnalyticsSections>> = {
  USERS: userAnalytics,
  PODS: podAnalytics,
  CLUBS: clubAnalytics,
  CLUB_ADMINS: clubAdminAnalytics,
  HOSTS: hostAnalytics,
};

export const entityAnalyticsService = {
  async load(entity: AnalyticsEntity, days?: number | null) {
    const window = resolveWindow(days);
    const sections = await LOADERS[entity](window);
    return {
      entity,
      period: {
        days: window.days,
        from: window.from.toISOString(),
        to: window.to.toISOString(),
        granularity: window.granularity,
      },
      ...sections,
    };
  },
};
