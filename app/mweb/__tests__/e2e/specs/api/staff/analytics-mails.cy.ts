/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { call, expectRolesRefused, NO_ID } from '../../../support/api-staff';

/**
 * Analytics › Analytics Mails — dashboard mail subscriptions and "send now"
 * are SUPER_ADMIN and ANALYTICS_MANAGER only
 * (platform/analytics/mail/analyticsMail.resolver.ts ANALYTICS_ROLES, first
 * statement). Scenario map: Staff › Analytics Mails "Subscribe to a dashboard
 * mail and send now with PDF" (role matrix: CITY_ADMIN and others denied).
 */

const REFUSED: readonly E2eStaffRole[] = ['CITY_ADMIN', 'COMMUNICATIONS_MANAGER'];

const MAIL_CALLS = [
  call('analyticsMailSubscriptions', `query E2eAnalyticsMailSubs { analyticsMailSubscriptions { __typename } }`),
  call('analyticsMailSettings', `query E2eAnalyticsMailSettings { analyticsMailSettings { __typename } }`),
  call('sendAnalyticsMailNow', `mutation E2eSendMailNow($id: ID!) { sendAnalyticsMailNow(id: $id) { __typename } }`, {
    id: NO_ID,
  }),
  call(
    'deleteAnalyticsMailSubscription',
    `mutation E2eDeleteMailSub($id: ID!) { deleteAnalyticsMailSubscription(id: $id) }`,
    { id: NO_ID },
  ),
];

describe('API · Analytics mails are for Analytics staff', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(REFUSED);
  });

  it('AM-01 CITY_ADMIN and COMMUNICATIONS_MANAGER are refused the subscriptions, settings, send-now and delete', () => {
    expectRolesRefused(REFUSED, MAIL_CALLS);
  });
});
