import type { ResultOf } from '@graphql-typed-document-node/core';

import type { CrmAppQualityAnalyticsDocument } from '@/graphql/leadQuality';

/** The Quality Analytics answer, and its parts, as the screen's sections read them. */
export type Analytics = ResultOf<typeof CrmAppQualityAnalyticsDocument>['crmLeadQualityAnalytics'];
export type TypeStats = Analytics['by_type'][number];
