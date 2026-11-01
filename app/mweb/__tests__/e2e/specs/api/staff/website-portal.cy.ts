/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { expectRefused, revokeRunRoles, signInRunMember, SIGNED_OUT, type Refusal } from '../../../support/access-steps';
import { expectPortalRefused } from '../../../support/api-partners';
import { asRole, call, expectCallsRefused, expectRead, expectTableRead, NO_ID } from '../../../support/api-staff';

/**
 * The Website console (portal key `website-app`, sign-in role WEBSITE_MANAGER)
 * and its inboxes. The CMS is SUPER_ADMIN + WEBSITE_MANAGER only
 * (content/cms/cms.constants.ts CMS_ROLES); the rest also admits the platform
 * admins: contact submissions and newsletter subscribers take CITY_ADMIN
 * (crm/contact, crm/newsletter ADMIN_ROLES), job applications, content,
 * navigation and reels take CITY_ADMIN and ZONAL_ADMIN (content/jobApplication,
 * websiteContent WRITE_ROLES, websiteNav, websiteReel ADMIN_ROLES); the content
 * list alone also lets SUPPORT_USER read.
 *
 * Nothing here changes a real submission or application: a status change is
 * aimed at an id no row has. Scenario map: Website Portal › Dashboard, Contact
 * submissions, Job applications, Newsletter subscribers.
 */

const ROLES: readonly E2eStaffRole[] = ['CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER'];

const CMS_WRITE = call(
  'createCmsSite',
  `mutation E2eCreateCmsSite { createCmsSite(input: { key: "e2e-refused", name: "e2e refused", domains: [] }) { id } }`,
);
const CONTACTS = call('contactSubmissionsTable', `query E2eContacts { contactSubmissionsTable(query: { page_size: 1 }) { total } }`);
const CONTACT_PAGE = call(
  'contactSubmissionsTable',
  `query E2eContactPage { contactSubmissionsTable(query: { page_size: 20 }) {
    total rows { id email status attachments created_at }
  } }`,
);
const JOBS = call('jobApplicationsTable', `query E2eJobs { jobApplicationsTable(query: { page_size: 1 }) { total } }`);
const JOB_PAGE = call(
  'jobApplicationsTable',
  `query E2eJobPage { jobApplicationsTable(query: { page_size: 20 }) {
    total rows { id role_title email status created_at }
  } }`,
);
const SUBSCRIBER_PAGE = call(
  'newsletterSubscribersTable',
  `query E2eSubscribers { newsletterSubscribersTable(query: { page_size: 1 }) { total } }`,
);
const SUBSCRIBERS = call(
  'newsletterSubscribers',
  `query E2eSubscriberKpis { newsletterSubscribers { id email source unsubscribed_at } }`,
);
const CONTENT_WRITE = call(
  'createWebsiteContent',
  `mutation E2eCreateContent { createWebsiteContent(input: { type: BLOG, title: "e2e refused", is_published: false }) { id } }`,
);
const REEL_WRITE = call(
  'createWebsiteReel',
  `mutation E2eCreateReel { createWebsiteReel(input: { site: MAIN, video_url: "https://duncit.com/e2e.mp4", is_active: false }) { id } }`,
);
const CONTACT_STATUS = `mutation E2eContactStatus($id: ID!) { updateContactStatus(contact_id: $id, status: IN_PROGRESS) { id } }`;
const JOB_STATUS = `mutation E2eJobStatus($id: ID!) { updateJobApplicationStatus(application_id: $id, status: SHORTLISTED) { id } }`;

const CONTACT_STATUSES = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'];
const JOB_STATUSES = ['NEW', 'SHORTLISTED', 'REJECTED', 'HIRED'];
const SOURCES = ['WEBSITE_FOOTER', 'WEBSITE_PAGE', 'MWEB', 'ADMIN', 'OTHER'];

const notFound = (message: string): Refusal => ({ code: 'NOT_FOUND', message });

/** Newest first, as the inbox lists them. */
function expectNewestFirst(rows: Array<{ created_at: string }>, what: string): void {
  rows.forEach((row, i) => {
    if (i > 0) expect(Date.parse(row.created_at), `${what} newest first`).to.be.at.most(Date.parse(rows[i - 1].created_at));
  });
}

describe('API · The Website console: the CMS is the website desk’s, the inboxes are shared with the admins', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('WP-01 a member cannot sign in or reach any inbox or write; signed out is not authenticated', () => {
    expectPortalRefused('website-app');
    expectCallsRefused(memberToken, [CMS_WRITE, CONTACTS, JOBS, SUBSCRIBER_PAGE, CONTENT_WRITE, REEL_WRITE]);
    [CMS_WRITE, CONTENT_WRITE, REEL_WRITE].forEach((c) => {
      cy.gqlRaw(c.query, {}, { token: null }).then((body) => expectRefused(c.field, body, SIGNED_OUT));
    });
  });

  it('WP-02 CITY_ADMIN is turned away at the Website sign-in and refused the CMS, though the inboxes open to it', () => {
    asRole('CITY_ADMIN', (token) => {
      expectPortalRefused('website-app');
      expectCallsRefused(token, [CMS_WRITE]);
      [CONTACTS, JOBS, SUBSCRIBER_PAGE].forEach((c) => expectTableRead(token, c));
    });
  });

  it('WP-03 SUPPORT_USER cannot add a reel or content, nor read the inboxes; ZONAL_ADMIN reads applications but not contacts', () => {
    asRole('SUPPORT_USER', (token) => expectCallsRefused(token, [REEL_WRITE, CONTENT_WRITE, CONTACTS, JOBS, SUBSCRIBER_PAGE]));
    asRole('ZONAL_ADMIN', (token) => {
      expectTableRead(token, JOBS);
      expectCallsRefused(token, [CONTACTS, SUBSCRIBER_PAGE, CMS_WRITE]);
    });
  });

  it('WP-04 the contact inbox lists submissions newest first with a known status; an unknown one cannot be triaged', () => {
    asRole('CITY_ADMIN', (token) => {
      expectRead<{ rows: Array<{ status: string; email: string; attachments: string[]; created_at: string }> }>(token, CONTACT_PAGE).then(
        (page) => {
          page.rows.forEach((row) => {
            expect(CONTACT_STATUSES, 'contact status').to.include(row.status);
            expect(row.email, 'sender').to.contain('@');
            row.attachments.forEach((url) => expect(url, 'attachment link').to.match(/^https?:\/\//));
          });
          expectNewestFirst(page.rows, 'contact submissions');
        },
      );
      cy.gqlRaw(CONTACT_STATUS, { id: NO_ID }, { token }).then((body) =>
        expectRefused('updateContactStatus', body, notFound('Contact submission not found')),
      );
    });
  });

  it('WP-05 job applications list newest first with a known status; an unknown or malformed id is refused', () => {
    asRole('CITY_ADMIN', (token) => {
      expectRead<{ rows: Array<{ status: string; created_at: string }> }>(token, JOB_PAGE).then((page) => {
        page.rows.forEach((row) => expect(JOB_STATUSES, 'application status').to.include(row.status));
        expectNewestFirst(page.rows, 'applications');
      });
      cy.gqlRaw(JOB_STATUS, { id: NO_ID }, { token }).then((body) =>
        expectRefused('updateJobApplicationStatus', body, notFound('Application not found')),
      );
      cy.gqlRaw(JOB_STATUS, { id: 'not-an-id' }, { token }).then((body) =>
        expectRefused('updateJobApplicationStatus', body, { code: 'BAD_USER_INPUT', message: 'Invalid application id' }),
      );
    });
  });

  it('WP-06 newsletter: every subscriber has a known source and a readable unsubscribe time, and the KPI list covers the table', () => {
    asRole('CITY_ADMIN', (token) => {
      // The table first: sign-ups only ever add rows, so the later full list can only hold as many or more.
      expectRead<{ total: number }>(token, SUBSCRIBER_PAGE).then((page) => {
        expectRead<Array<{ email: string; source: string; unsubscribed_at: string | null }>>(token, SUBSCRIBERS).then((all) => {
          expect(all.length, 'Total').to.be.at.least(page.total);
          all.forEach((row) => {
            expect(SOURCES, `source of ${row.email}`).to.include(row.source);
            if (row.unsubscribed_at !== null) expect(Number.isNaN(Date.parse(row.unsubscribed_at)), 'unsubscribe time').to.equal(false);
          });
        });
      });
    });
  });
});
