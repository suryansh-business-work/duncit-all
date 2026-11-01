/// <reference types="cypress" />
import { runMarker } from '@duncit/utils';
import { expectRefused, revokeRunRoles, signInRunMember, type Refusal } from '../../../support/access-steps';
import { asRole, call, expectCallsRefused } from '../../../support/api-staff';
import { runAccount } from '../../../support/run-account';

/**
 * Marketing › Occasions (crm/marketing/occasions): the festive look every
 * Duncit app wears. occasionLive is public — the apps paint before sign-in —
 * and `preview` shows any look without changing it for anyone else; every
 * other operation is SUPER_ADMIN, CITY_ADMIN, MARKETING_MANAGER.
 *
 * The live mode is never changed here (setOccasionLive would repaint every app
 * for everyone). The only look written is the run's own CUSTOM look, saved
 * with its schedule off and never pinned, so no app ever wears it; its
 * invalid saves and schedules are refused in `lookFrom` / `scheduleFrom` before
 * any write, and it is deleted at the end (and swept again in after()).
 *
 * Scenario map: Marketing › Occasions.
 */

const LOOK = 'key name is_builtin is_archived schedule_enabled starts_at ends_at particles { colors shapes motion }';
const LIVE = `query E2eOccasionLive($preview: String) { occasionLive(preview: $preview) { mode source next_change_at theme { key } } }`;
const SETTINGS = call('occasionSettings', `query E2eOccasionSettings { occasionSettings { mode manual_key } }`);
const THEMES = call('occasionThemes', `query E2eOccasionThemes { occasionThemes(include_archived: true) { key name is_builtin is_archived } }`);
const ONE = `query E2eOccasionTheme($key: String!) { occasionTheme(key: $key) { ${LOOK} } }`;
const SAVE = `mutation E2eSaveLook($key: String, $input: OccasionThemeInput!) { saveOccasionTheme(key: $key, input: $input) { ${LOOK} } }`;
const SCHEDULE = `mutation E2eLookSchedule($key: String!, $input: OccasionScheduleInput!) { setOccasionSchedule(key: $key, input: $input) { key } }`;
const DELETE = `mutation E2eDeleteLook($key: String!) { deleteOccasionTheme(key: $key) }`;
const SET_LIVE = call('setOccasionLive', `mutation E2eSetLive { setOccasionLive(input: { mode: NORMAL }) { mode } }`);

const bad = (message: string): Refusal => ({ code: 'BAD_USER_INPUT', message });
const DAY = 24 * 60 * 60 * 1000;

interface Live {
  mode: 'NORMAL' | 'MANUAL' | 'SCHEDULE';
  source: 'MANUAL' | 'SCHEDULE' | 'PREVIEW' | 'NONE';
  theme: { key: string } | null;
}

describe('API · Occasions: the live look is public, previews change nothing, a custom look round-trips unworn', { testIsolation: false }, () => {
  const name = (): string => `${runMarker(runAccount().stamp, 'mweb')} look`;
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    asRole('CITY_ADMIN', (token) =>
      cy.gql<{ occasionThemes: Array<{ key: string; name: string; is_builtin: boolean }> }>(THEMES.query, {}, { token }).then(
        ({ occasionThemes }) =>
          occasionThemes
            .filter((look) => !look.is_builtin && look.name.includes(runAccount().stamp))
            .forEach((look) => cy.gql(DELETE, { key: look.key }, { token })),
      ),
    );
    revokeRunRoles(['CITY_ADMIN', 'ZONAL_ADMIN']);
  });

  it('OCC-01 the live look is public and agrees with the stored mode', () => {
    cy.gql<{ occasionLive: Live }>(LIVE, {}, { token: null }).then(({ occasionLive: live }) => {
      if (live.mode === 'NORMAL') {
        expect(live.source, 'the house look').to.equal('NONE');
        expect(live.theme, 'no festive look').to.be.null;
      } else {
        expect(['NONE', live.mode], `source in ${live.mode} mode`).to.include(live.source);
        expect(live.theme === null, 'a look exactly when a source is on').to.equal(live.source === 'NONE');
      }
      asRole('CITY_ADMIN', (token) =>
        cy.gql<{ occasionSettings: { mode: string } }>(SETTINGS.query, {}, { token }).then(({ occasionSettings }) =>
          expect(occasionSettings.mode, 'the mode Marketing set').to.equal(live.mode),
        ),
      );
    });
  });

  it('OCC-02 a preview link shows that look to its viewer only, and the built-in festivals are all there', () => {
    asRole('CITY_ADMIN', (token) =>
      cy.gql<{ occasionThemes: Array<{ key: string; is_builtin: boolean; is_archived: boolean }> }>(THEMES.query, {}, { token }).then(
        ({ occasionThemes }) => {
          const builtins = occasionThemes.filter((look) => look.is_builtin);
          expect(builtins.length, 'built-in festivals').to.be.at.least(33);
          expect(builtins.map((look) => look.key)).to.include.members(['christmas', 'halloween', 'diwali']);
          const shown = builtins.find((look) => !look.is_archived);
          expect(shown, 'a built-in look that is not archived').to.exist;
          const key = String(shown?.key);
          cy.gql<{ occasionLive: Live }>(LIVE, {}, { token: null }).then(({ occasionLive: before }) => {
            cy.gql<{ occasionLive: Live }>(LIVE, { preview: key }, { token: null }).then(({ occasionLive: preview }) => {
              expect(preview.source).to.equal('PREVIEW');
              expect(preview.theme?.key).to.equal(key);
              expect(preview.mode, 'the stored mode is reported unchanged').to.equal(before.mode);
            });
            cy.gql<{ occasionLive: Live }>(LIVE, {}, { token: null }).then(({ occasionLive: after }) =>
              expect(after, 'what everyone else wears did not change').to.deep.equal(before),
            );
          });
        },
      ),
    );
  });

  it('OCC-03 a look with a bad colour, path data or no name is refused before it is saved', () => {
    asRole('CITY_ADMIN', (token) => {
      const layer = { shapes: ['STAR'], colors: ['#FFD54F'], motion: 'FALL' };
      cy.gqlRaw(SAVE, { input: { name: name(), particles: [{ ...layer, colors: ['red'] }] } }, { token }).then((body) =>
        expectRefused('saveOccasionTheme', body, bad('Particle layer 1: "red" is not a hex colour like #FFD54F')),
      );
      cy.gqlRaw(SAVE, { input: { name: name(), particles: [{ ...layer, custom_paths: ['M0 0 <script>'] }] } }, { token }).then((body) =>
        expectRefused('saveOccasionTheme', body, bad('Particle layer 1: path data may only hold SVG path commands and numbers')),
      );
      cy.gqlRaw(SAVE, { input: { name: '  ' } }, { token }).then((body) => expectRefused('saveOccasionTheme', body, bad('Give the look a name')));
      cy.gql<{ occasionThemes: Array<{ name: string }> }>(THEMES.query, {}, { token }).then(({ occasionThemes }) =>
        expect(occasionThemes.filter((look) => look.name.includes(runAccount().stamp)), 'nothing was saved').to.be.empty,
      );
    });
  });

  it('OCC-04 a custom look is saved unscheduled, previews, refuses a bad window, and deletes; a built-in cannot be deleted', () => {
    asRole('CITY_ADMIN', (token) => {
      const input = { name: name(), particles: [{ shapes: ['SNOWFLAKE'], colors: ['#FFFFFF', '#BBDEFB'], motion: 'FALL' }] };
      cy.gql<{ saveOccasionTheme: { key: string; is_builtin: boolean; schedule_enabled: boolean; particles: unknown[] } }>(
        SAVE,
        { input },
        { token },
      ).then(({ saveOccasionTheme: look }) => {
        expect(look.is_builtin, 'a look someone made').to.equal(false);
        expect(look.schedule_enabled, 'never live by itself').to.equal(false);
        expect(look.particles).to.deep.equal([{ shapes: ['SNOWFLAKE'], colors: ['#FFFFFF', '#BBDEFB'], motion: 'FALL' }]);
        cy.gql<{ occasionLive: Live }>(LIVE, { preview: look.key }, { token: null }).then(({ occasionLive }) => {
          expect(occasionLive.source).to.equal('PREVIEW');
          expect(occasionLive.theme?.key).to.equal(look.key);
        });
        const start = new Date(Date.now() + 10 * DAY).toISOString();
        const end = new Date(Date.now() + 9 * DAY).toISOString();
        cy.gqlRaw(SCHEDULE, { key: look.key, input: { starts_at: start, ends_at: end, schedule_enabled: false } }, { token }).then((body) =>
          expectRefused('setOccasionSchedule', body, bad('The look must end after it starts')),
        );
        cy.gqlRaw(SCHEDULE, { key: look.key, input: { schedule_enabled: true } }, { token }).then((body) =>
          expectRefused('setOccasionSchedule', body, bad('Set when the look starts and ends before switching its schedule on')),
        );
        cy.gql<{ occasionTheme: { schedule_enabled: boolean; starts_at: string | null } }>(ONE, { key: look.key }, { token }).then(
          ({ occasionTheme }) => {
            expect(occasionTheme.schedule_enabled, 'the refused windows left it off').to.equal(false);
            expect(occasionTheme.starts_at).to.be.null;
          },
        );
        cy.gql<{ deleteOccasionTheme: boolean }>(DELETE, { key: look.key }, { token }).its('deleteOccasionTheme').should('equal', true);
        cy.gql<{ occasionTheme: unknown }>(ONE, { key: look.key }, { token }).then(({ occasionTheme }) =>
          expect(occasionTheme, 'gone').to.be.null,
        );
      });
      cy.gqlRaw(DELETE, { key: 'christmas' }, { token }).then((body) =>
        expectRefused('deleteOccasionTheme', body, bad('Built-in looks cannot be deleted — archive it instead.')),
      );
    });
  });

  it('OCC-05 a member and ZONAL_ADMIN cannot read the looks, design one or switch what the apps wear', () => {
    const calls = [
      THEMES,
      SETTINGS,
      SET_LIVE,
      call('saveOccasionTheme', `mutation E2eRefusedLook { saveOccasionTheme(input: { name: "e2e refused" }) { key } }`),
    ];
    expectCallsRefused(memberToken, calls);
    asRole('ZONAL_ADMIN', (token) => expectCallsRefused(token, calls));
  });
});
