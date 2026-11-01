/// <reference types="cypress" />
import { runMarker } from '@duncit/utils';
import { expectRefused, revokeRunRoles, signInRunMember, type Refusal } from '../../../support/access-steps';
import { asRole, call, expectCallsRefused, expectRead, NO_ID } from '../../../support/api-staff';
import { runAccount } from '../../../support/run-account';

/**
 * Marketing › Social Accounts and Social Calendar (crm/marketing/social):
 * SUPER_ADMIN, CITY_ADMIN, MARKETING_MANAGER (social.resolver.ts,
 * social.publish.resolver.ts ROLES), driven as CITY_ADMIN.
 *
 * Nothing is ever posted to a network or connected: no OAuth is started, no
 * real account is synced or disconnected (only an id no account has), and the
 * one post written is a DRAFT with no account at all — the scheduler only ever
 * sends SCHEDULED posts, and a draft cannot be shared now or retried (both
 * refused below). The draft is read on the calendar, edited and deleted.
 *
 * Scenario map: Marketing › Social Accounts, Social Calendar.
 */

const PROVIDERS = call('socialProviders', `query E2eSocialProviders { socialProviders { provider configured } }`);
const ACCOUNTS = call('socialAccounts', `query E2eSocialAccounts { socialAccounts { id provider platform status name } }`);
const POST_FIELDS = 'id text status scheduled_at media_url targets { account_id }';
const CREATE = `mutation E2eCreatePost($input: SocialScheduledPostInput!) { createScheduledSocialPost(input: $input) { ${POST_FIELDS} } }`;
const UPDATE = `mutation E2eUpdatePost($id: ID!, $input: SocialScheduledPostInput!) { updateScheduledSocialPost(id: $id, input: $input) { ${POST_FIELDS} } }`;
const DELETE = `mutation E2eDeletePost($id: ID!) { deleteScheduledSocialPost(id: $id) }`;
const ONE = `query E2ePost($id: ID!) { socialScheduledPost(id: $id) { id } }`;
const SHARE_NOW = `mutation E2eShareNow($id: ID!) { shareScheduledSocialPostNow(id: $id) { id } }`;
const RETRY = `mutation E2eRetry($id: ID!) { retryScheduledSocialPost(id: $id) { id } }`;
const DRAFTS = `query E2eDrafts { socialScheduledPosts(view: DRAFTS) { id text status } }`;
const CALENDAR = `query E2eCalendar($from: String!, $to: String!) { socialCalendar(from: $from, to: $to) { id kind status text at } }`;

const bad = (message: string): Refusal => ({ code: 'BAD_USER_INPUT', message });
const DAY = 24 * 60 * 60 * 1000;

describe('API · Social accounts and calendar: read the networks, keep a draft that never posts', { testIsolation: false }, () => {
  const text = (): string => `${runMarker(runAccount().stamp, 'mweb')} draft post`;
  let memberToken = '';
  const at = new Date(Date.now() + 30 * DAY);
  at.setUTCHours(10, 0, 0, 0);
  const draft = (overrides: Record<string, unknown> = {}) => ({
    text: text(),
    account_ids: [],
    mode: 'DRAFT',
    scheduled_at: at.toISOString(),
    ...overrides,
  });

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    asRole('CITY_ADMIN', (token) =>
      cy.gql<{ socialScheduledPosts: Array<{ id: string; text: string }> }>(DRAFTS, {}, { token }).then(({ socialScheduledPosts }) =>
        socialScheduledPosts
          .filter((post) => post.text.includes(runAccount().stamp))
          .forEach((post) => cy.gql(DELETE, { id: post.id }, { token })),
      ),
    );
    revokeRunRoles(['CITY_ADMIN', 'ZONAL_ADMIN']);
  });

  it('MSO-01 CITY_ADMIN reads which networks Tech has set up and the connected accounts; an unknown account cannot be synced or disconnected', () => {
    asRole('CITY_ADMIN', (token) => {
      expectRead<Array<{ provider: string; configured: boolean }>>(token, PROVIDERS).then((providers) => {
        expect(providers.map((p) => p.provider).sort(), 'one row per network').to.deep.equal(['LINKEDIN', 'META', 'X', 'YOUTUBE']);
        providers.forEach((p) => expect(p.configured, `${p.provider} configured`).to.be.a('boolean'));
      });
      expectRead<Array<{ id: string }>>(token, ACCOUNTS).then((accounts) => expect(accounts).to.be.an('array'));
      const missing: Refusal = { code: 'NOT_FOUND', message: 'Social account not found' };
      cy.gqlRaw(`mutation E2eSync($id: ID!) { syncSocialAccount(id: $id) { id } }`, { id: NO_ID }, { token }).then((body) =>
        expectRefused('syncSocialAccount', body, missing),
      );
      cy.gqlRaw(`mutation E2eDisconnect($id: ID!) { disconnectSocialAccount(id: $id) }`, { id: NO_ID }, { token }).then((body) =>
        expectRefused('disconnectSocialAccount', body, missing),
      );
    });
  });

  it('MSO-02 a post is refused without an account to schedule to, with a gone account, or with media from outside Duncit', () => {
    asRole('CITY_ADMIN', (token) => {
      cy.gqlRaw(CREATE, { input: draft({ mode: 'SCHEDULE' }) }, { token }).then((body) =>
        expectRefused('createScheduledSocialPost', body, bad('Pick at least one account to post to.')),
      );
      cy.gqlRaw(CREATE, { input: draft({ account_ids: [NO_ID] }) }, { token }).then((body) =>
        expectRefused('createScheduledSocialPost', body, bad('One of the chosen accounts is no longer connected.')),
      );
      cy.gqlRaw(CREATE, { input: draft({ media_url: 'https://example.com/e2e.jpg', media_type: 'IMAGE' }) }, { token }).then((body) =>
        expectRefused(
          'createScheduledSocialPost',
          body,
          bad('Pick the image or video with the media picker — only Duncit’s own media can be posted.'),
        ),
      );
      cy.gqlRaw(CREATE, { input: draft({ scheduled_at: 'not a date' }) }, { token }).then((body) =>
        expectRefused('createScheduledSocialPost', body, bad('That date and time could not be read.')),
      );
      cy.gqlRaw(CALENDAR, { from: at.toISOString(), to: new Date(at.getTime() - DAY).toISOString() }, { token }).then((body) =>
        expectRefused('socialCalendar', body, bad('That date range could not be read.')),
      );
    });
  });

  it('MSO-03 a dated draft sits on the calendar, edits in place, cannot be shared now or retried, and deletes', () => {
    asRole('CITY_ADMIN', (token) => {
      cy.gql<{ createScheduledSocialPost: { id: string; status: string; scheduled_at: string; targets: unknown[] } }>(
        CREATE,
        { input: draft() },
        { token },
      ).then(({ createScheduledSocialPost: post }) => {
        expect(post.status).to.equal('DRAFT');
        expect(post.scheduled_at).to.equal(at.toISOString());
        expect(post.targets, 'no network to post to').to.be.empty;
        const range = { from: new Date(at.getTime() - DAY).toISOString(), to: new Date(at.getTime() + DAY).toISOString() };
        cy.gql<{ socialCalendar: Array<{ id: string; kind: string; status: string; at: string }> }>(CALENDAR, range, { token }).then(
          ({ socialCalendar }) => {
            const item = socialCalendar.find((entry) => entry.id === post.id);
            expect(item, 'on its date').to.deep.include({ kind: 'PLANNED', status: 'DRAFT', at: at.toISOString() });
          },
        );
        cy.gql<{ updateScheduledSocialPost: { text: string; scheduled_at: string; status: string } }>(
          UPDATE,
          { id: post.id, input: draft({ text: `${text()} edited` }) },
          { token },
        ).then(({ updateScheduledSocialPost }) => {
          expect(updateScheduledSocialPost.text).to.equal(`${text()} edited`);
          expect(updateScheduledSocialPost.scheduled_at, 'same time').to.equal(at.toISOString());
          expect(updateScheduledSocialPost.status).to.equal('DRAFT');
        });
        cy.gqlRaw(SHARE_NOW, { id: post.id }, { token }).then((body) =>
          expectRefused('shareScheduledSocialPostNow', body, bad('Only a scheduled post can be shared now.')),
        );
        cy.gqlRaw(RETRY, { id: post.id }, { token }).then((body) =>
          expectRefused('retryScheduledSocialPost', body, bad('Only a post that failed somewhere can be retried.')),
        );
        cy.gql<{ deleteScheduledSocialPost: boolean }>(DELETE, { id: post.id }, { token }).its('deleteScheduledSocialPost').should('equal', true);
        cy.gqlRaw(ONE, { id: post.id }, { token }).then((body) =>
          expectRefused('socialScheduledPost', body, { code: 'NOT_FOUND', message: 'Post not found' }),
        );
      });
    });
  });

  it('MSO-04 a member and ZONAL_ADMIN cannot read the social accounts or the calendar, nor write a post', () => {
    const calls = [
      PROVIDERS,
      ACCOUNTS,
      call('socialScheduledPosts', DRAFTS),
      call('createScheduledSocialPost', CREATE, { input: draft() }),
      call('disconnectSocialAccount', `mutation E2eRefusedDisconnect($id: ID!) { disconnectSocialAccount(id: $id) }`, { id: NO_ID }),
    ];
    expectCallsRefused(memberToken, calls);
    asRole('ZONAL_ADMIN', (token) => expectCallsRefused(token, calls));
  });
});
