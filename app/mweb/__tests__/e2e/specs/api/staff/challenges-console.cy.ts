/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { expectRefused, revokeRunRoles, signInRunMember, SIGNED_OUT, type Refusal } from '../../../support/access-steps';
import { expectPortalRefused } from '../../../support/api-partners';
import { asRole, call, expectCallsRefused, expectRead, NO_ID } from '../../../support/api-staff';

/**
 * The Challenges console (portal key `challenge`, sign-in role
 * CHALLENGE_MANAGER) and its Leaderboard pages.
 *
 * - Challenges, stats, tools and presets: RW = SUPER_ADMIN, CHALLENGE_MANAGER
 *   (engagement/challenge/challenge.resolver.ts, tools/challengeTool.resolver.ts);
 *   the challenge list and the category mappings also admit CITY_ADMIN, who
 *   edits them from Admin › Categories (READ, MAPPING_RW).
 * - Pod challenges: CHALLENGE_STAFF = SUPER_ADMIN, CHALLENGE_MANAGER (runtime/podChallenge.access.ts).
 * - Leaderboard: reads admit CITY_ADMIN, ZONAL_ADMIN, SUPPORT_USER and
 *   CHALLENGE_MANAGER; writes CITY_ADMIN and CHALLENGE_MANAGER
 *   (engagement/leaderboard/leaderboard.resolver.ts). leaderboardConfig is public.
 *
 * CHALLENGE_MANAGER cannot be granted to a run account, so challenges are never
 * created here. The one write a granted seat may reach — a category mapping —
 * is only ever sent with an input `challengeMapping.service.ts upsert` refuses
 * before its updateOne, and the mapping is read back unchanged.
 *
 * Scenario map: Challenges › Dashboard, Challenge management, Leaderboard
 * boards, Points Ledger, Settings and rewards.
 */

const ROLES: readonly E2eStaffRole[] = ['CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER'];

const CHALLENGE_DESK = [
  call('challengesTable', `query E2eChallengesTable { challengesTable(query: { page_size: 1 }) { total } }`),
  call('challengeStats', `query E2eChallengeStats { challengeStats { total active } }`),
  call('createChallenge', `mutation E2eCreateChallenge { createChallenge(input: { name: "e2e refused" }) { id } }`),
  call('deleteChallenge', `mutation E2eDeleteChallenge($id: ID!) { deleteChallenge(id: $id) }`, { id: NO_ID }),
  call(
    'updateChallengeTool',
    `mutation E2eUpdateTool($id: ID!) { updateChallengeTool(id: $id, input: { status: "INACTIVE" }) { id } }`,
    { id: NO_ID },
  ),
  call(
    'createChallengeToolPreset',
    `mutation E2eCreatePreset($id: ID!) { createChallengeToolPreset(input: { tool_id: $id, name: "e2e refused" }) { id } }`,
    { id: NO_ID },
  ),
  call('podChallengesTable', `query E2ePodChallenges { podChallengesTable(query: { page_size: 1 }) { total } }`),
];
const MAPPING_READS = [
  call('challenges', `query E2eChallengeList { challenges { id name is_active } }`),
  call('challengeTools', `query E2eChallengeTools { challengeTools { id status } }`),
  call('challengeCategoryMappings', `query E2eMappings { challengeCategoryMappings { category_id level } }`),
];
const UPDATE_SETTINGS = call(
  'updateLeaderboardSettings',
  `mutation E2eUpdateLeaderboard { updateLeaderboardSettings(input: {}) { updated_at } }`,
);
const SETTINGS = call(
  'leaderboardSettings',
  `query E2eLeaderboardSettings { leaderboardSettings {
    points_per_join points_per_host points_per_club_pod points_per_venue_pod points_per_product_sale
    rewards { category period rank_from rank_to title is_active }
  } }`,
);
const CONFIG = `query E2eLeaderboardConfig { leaderboardConfig {
  points_per_join points_per_host points_per_club_pod points_per_venue_pod points_per_product_sale
  rewards { category period rank_from rank_to title is_active }
} }`;
const LEDGER = call(
  'leaderboardPointsTable',
  `query E2eLedger { leaderboardPointsTable(query: { page_size: 20 }) { total page_size rows { category points source_type } } }`,
);
const STATS = call('leaderboardAdminStats', `query E2eBoardStats { leaderboardAdminStats { category total_points awards_count participants } }`);
const BOARD = `query E2eBoard($category: LeaderboardCategory!, $period: LeaderboardPeriod) {
  leaderboard(category: $category, period: $period) { category period my_points my_rank participants rows { rank points is_me } }
}`;
const CATEGORIES = `query E2eChallengeCategories($level: CategoryLevel) { categories(filter: { level: $level }) { id level } }`;
const UPSERT = `mutation E2eUpsertMapping($id: ID!, $input: ChallengeCategoryMappingInput!) {
  upsertChallengeCategoryMapping(category_id: $id, input: $input) { category_id }
}`;
const EFFECTIVE = `query E2eEffectiveMapping($id: ID!) {
  challengeCategoryMapping(category_id: $id) { id level inherited enabled allowed_tool_ids max_competitors }
}`;

const BOARDS = ['USER', 'HOST', 'CLUB_ADMIN', 'VENUE', 'BRAND'];
const POINT_FIELDS = ['points_per_join', 'points_per_host', 'points_per_club_pod', 'points_per_venue_pod', 'points_per_product_sale'];
const bad = (message: string): Refusal => ({ code: 'BAD_USER_INPUT', message });

type Settings = Record<string, number> & { rewards: Array<{ is_active: boolean } & Record<string, unknown>> };

describe('API · Challenges are the challenge desk’s; mappings and the leaderboard are shared with the admins', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('CHL-01 a member cannot sign in to the Challenges console or reach its desk; signed out is not authenticated', () => {
    expectPortalRefused('challenge');
    expectCallsRefused(memberToken, [...CHALLENGE_DESK, ...MAPPING_READS, SETTINGS, LEDGER, STATS, UPDATE_SETTINGS]);
    CHALLENGE_DESK.forEach((c) => {
      cy.gqlRaw(c.query, c.variables ?? {}, { token: null }).then((body) => expectRefused(c.field, body, SIGNED_OUT));
    });
  });

  it('CHL-02 CITY_ADMIN is turned away at the sign-in and refused challenges, tools, presets and pod challenges', () => {
    asRole('CITY_ADMIN', (token) => {
      expectPortalRefused('challenge');
      expectCallsRefused(token, CHALLENGE_DESK);
    });
  });

  it('CHL-03 CITY_ADMIN reads the challenge list, tools and mappings; a non-sub category is never mapped or inherited', () => {
    asRole('CITY_ADMIN', (token) => {
      MAPPING_READS.forEach((c) => expectRead<unknown[]>(token, c).then((rows) => expect(rows, c.field).to.be.an('array')));
      expectRead<Array<{ level: string }>>(token, MAPPING_READS[2]).then((rows) =>
        rows.forEach((row) => expect(row.level, 'only sub-categories carry a mapping row').to.equal('SUB')),
      );
      cy.gql<{ categories: Array<{ id: string }> }>(CATEGORIES, { level: 'SUPER' }, { token: null }).then(({ categories }) => {
        const [parent] = categories;
        expect(parent, 'staging needs a super category').to.exist;
        cy.gqlRaw(EFFECTIVE, { id: parent.id }, { token }).then((body) => {
          expect(body.errors).to.be.undefined;
          const mapping = body.data?.challengeCategoryMapping as { id: string | null; enabled: boolean; allowed_tool_ids: string[] };
          expect(mapping.id, 'a parent has no row of its own').to.be.null;
          expect(mapping.enabled, 'challenges are off for a parent').to.equal(false);
          expect(mapping.allowed_tool_ids, 'no tools reach a parent').to.be.empty;
        });
        cy.gqlRaw(UPSERT, { id: parent.id, input: { enabled: true } }, { token }).then((body) =>
          expectRefused('upsertChallengeCategoryMapping', body, bad('Challenge tools are chosen per sub-category')),
        );
      });
    });
  });

  it('CHL-04 CITY_ADMIN passes the mapping gate: an unknown category and a negative competitor cap are refused, nothing changes', () => {
    asRole('CITY_ADMIN', (token) => {
      cy.gqlRaw(UPSERT, { id: NO_ID, input: { enabled: true } }, { token }).then((body) =>
        expectRefused('upsertChallengeCategoryMapping', body, { code: 'NOT_FOUND', message: 'Category not found' }),
      );
      expectRead<Array<{ category_id: string }>>(token, MAPPING_READS[2]).then((rows) => {
        const mapped = new Set(rows.map((row) => row.category_id));
        cy.gql<{ categories: Array<{ id: string }> }>(CATEGORIES, { level: 'SUB' }, { token: null }).then(({ categories }) => {
          const sub = categories.find((category) => !mapped.has(category.id));
          expect(sub, 'staging needs a sub-category with no mapping row').to.exist;
          const id = String(sub?.id);
          cy.gqlRaw(UPSERT, { id, input: { max_competitors: -1 } }, { token }).then((body) =>
            expectRefused('upsertChallengeCategoryMapping', body, bad('Maximum competitors cannot be negative')),
          );
          cy.gqlRaw(EFFECTIVE, { id }, { token }).then((body) => {
            const mapping = body.data?.challengeCategoryMapping as { id: string | null; allowed_tool_ids: string[] };
            expect(mapping.id, 'still no row: nothing was written').to.be.null;
            expect(mapping.allowed_tool_ids, 'no tools inherited from its parent').to.be.empty;
          });
        });
      });
    });
  });

  it('CHL-05 the apps’ public config is the admin settings: same points per action, active rewards only', () => {
    asRole('SUPPORT_USER', (token) => {
      expectRead<Settings>(token, SETTINGS).then((settings) => {
        cy.gql<{ leaderboardConfig: Settings }>(CONFIG, {}, { token: null }).then(({ leaderboardConfig }) => {
          POINT_FIELDS.forEach((field) => {
            expect(leaderboardConfig[field], field).to.equal(settings[field]);
            expect(settings[field], `${field} is never negative`).to.be.at.least(0);
          });
          expect(leaderboardConfig.rewards, 'the apps show the active rewards').to.deep.equal(
            settings.rewards.filter((reward) => reward.is_active),
          );
          settings.rewards.forEach((reward) => {
            expect(Number(reward.rank_from), 'rank from').to.be.at.least(1);
            expect(String(reward.title).trim(), 'a stored reward has a title').to.not.equal('');
          });
        });
      });
    });
  });

  it('CHL-06 ZONAL_ADMIN and SUPPORT_USER read the leaderboard admin pages but cannot change the points or rewards', () => {
    (['ZONAL_ADMIN', 'SUPPORT_USER'] as const).forEach((role) =>
      asRole(role, (token) => {
        expectRead<unknown>(token, SETTINGS);
        expectCallsRefused(token, [UPDATE_SETTINGS, ...CHALLENGE_DESK.slice(0, 2)]);
      }),
    );
  });

  it('CHL-07 the points ledger and the board cards: one card per board, never more participants than awards', () => {
    asRole('CITY_ADMIN', (token) => {
      expectRead<{ total: number; page_size: number; rows: Array<{ category: string; points: number }> }>(token, LEDGER).then(
        (page) => {
          expect(page.rows.length, 'one page at most').to.be.at.most(page.page_size);
          page.rows.forEach((row) => expect(BOARDS, 'ledger board').to.include(row.category));
        },
      );
      expectRead<Array<{ category: string; awards_count: number; participants: number; total_points: number }>>(token, STATS).then(
        (cards) => {
          expect(cards.map((card) => card.category).sort(), 'one card per board').to.deep.equal([...BOARDS].sort());
          cards.forEach((card) => {
            expect(card.participants, `${card.category} participants`).to.be.at.most(card.awards_count);
            expect(card.awards_count, `${card.category} awards`).to.be.at.least(0);
          });
        },
      );
    });
  });

  it('CHL-08 a member reads each board for a window, ranked best first, with their own standing', () => {
    BOARDS.forEach((category) => {
      cy.gqlRaw(BOARD, { category, period: 'ALL' }, { token: memberToken }).then((body) => {
        expect(body.errors, `${category} board`).to.be.undefined;
        const board = body.data?.leaderboard as {
          category: string;
          period: string;
          my_points: number;
          participants: number;
          rows: Array<{ rank: number; points: number }>;
        };
        expect(board.category).to.equal(category);
        expect(board.period).to.equal('ALL');
        expect(board.my_points, 'the run account’s points').to.be.at.least(0);
        expect(board.rows.length, 'rows never exceed the participants').to.be.at.most(board.participants);
        board.rows.forEach((row, i) => {
          if (i > 0) expect(row.points, 'best first').to.be.at.most(board.rows[i - 1].points);
          expect(row.rank, 'rank').to.be.at.least(1);
        });
      });
    });
    cy.gqlRaw(BOARD, { category: 'USER' }, { token: memberToken }).then((body) => {
      expect((body.data?.leaderboard as { period: string }).period, 'the window defaults to this month').to.equal('MONTH');
    });
  });
});
