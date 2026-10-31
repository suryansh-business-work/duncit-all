/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { asRole, call, expectCallsRefused, expectOutsidersRefused, expectRead } from '../../../support/api-staff';

/**
 * Admin › Localization Locales, Translations and Auto-translate, read from the
 * seats that may read them (platform/localization/localization.resolver.ts
 * ADMIN_READ = SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, SUPPORT_USER, TECH_MANAGER,
 * LOCALIZATION_MANAGER). Writes are ADMIN_WRITE = SUPER_ADMIN, TECH_MANAGER,
 * LOCALIZATION_MANAGER — none of which a run account can hold, so nothing is
 * written here; the reader refusals for upsertTranslation, deleteTranslation,
 * upsertLocale and startAiTranslation are in read-vs-write.cy.ts RW-06.
 *
 * What the reader sees must agree with itself: the default language is the
 * marked default among the active locales, else the first active one by sort
 * order (localization.service.ts defaultLocaleCode); coverage and the
 * namespace counts carry one entry per ACTIVE locale; the auto-translate dialog's
 * counts grow with its scope (aiTranslate.scope.ts MISSING ⊂ OUTDATED ⊂ ALL); and
 * the default language is refused as a target before any count or job.
 * Scenario map: Staff › Admin: Localization Locales, Translations, Auto-translate.
 */

const ROLES: readonly E2eStaffRole[] = ['SUPPORT_USER'];

interface Locale {
  code: string;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
}

const LOCALES = call('locales', `query E2eLocales { locales { code is_active is_default sort_order } }`);
const COVERAGE = call('localeCoverage', `query E2eCoverage { localeCoverage { locale total_keys translated_keys outdated_keys } }`);
const GROUPS = call(
  'translationGroups',
  `query E2eGroups { translationGroups(query: { page_size: 50 }) { total rows { id surface page key_count locales { locale translated } } } }`,
);
const PENDING_FIELD = 'aiTranslationPending';
const pending = (locales: string[]) =>
  call(PENDING_FIELD, `query E2ePending($input: AiTranslationInput!) { aiTranslationPending(input: $input) { locale keys } }`, {
    input: { locales, scope: 'MISSING' },
  });
const SCOPES = `query E2ePendingScopes($m: AiTranslationInput!, $o: AiTranslationInput!, $a: AiTranslationInput!) {
  missing: aiTranslationPending(input: $m) { keys }
  outdated: aiTranslationPending(input: $o) { keys }
  all: aiTranslationPending(input: $a) { keys }
}`;
const WRITES = [
  call('deleteLocale', `mutation E2eDeleteLocale { deleteLocale(code: "e2e-never-added") }`),
  call(
    'importTranslationKeys',
    `mutation E2eImportKeys { importTranslationKeys(locale: "en", entries: [{ key: "e2e.never.imported", value: "E2E" }]) }`,
  ),
];

const byOrder = (a: Locale, b: Locale) => a.sort_order - b.sort_order || (a.code < b.code ? -1 : 1);
const activeOf = (locales: Locale[]) => locales.filter((l) => l.is_active).sort(byOrder);
const defaultOf = (locales: Locale[]) => {
  const active = activeOf(locales);
  return (active.find((l) => l.is_default) ?? active[0]).code;
};

/** The reader's locales, checked, then handed on. */
const readLocales = (token: string) =>
  expectRead<Locale[]>(token, LOCALES).then((locales) => {
    const codes = locales.map((l) => l.code);
    expect(new Set(codes).size, 'locale codes are unique').to.equal(codes.length);
    expect(locales.filter((l) => l.is_default).length, 'at most one default locale').to.be.at.most(1);
    expect(activeOf(locales), 'at least one active locale').to.not.be.empty;
    return locales;
  });

describe('API · Localization readers see a catalogue that agrees with itself', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('LZ-01 coverage has one row per active locale, all over the same key total, never more translated than there are keys', () => {
    asRole('SUPPORT_USER', (token) => {
      readLocales(token).then((locales) => {
        const active = activeOf(locales).map((l) => l.code);
        type Coverage = { locale: string; total_keys: number; translated_keys: number; outdated_keys: number };
        expectRead<Coverage[]>(token, COVERAGE).then((coverage) => {
          expect(coverage.map((c) => c.locale), 'coverage locales').to.deep.equal(active);
          coverage.forEach((c) => {
            expect(c.total_keys, `${c.locale} total`).to.equal(coverage[0].total_keys);
            expect(c.translated_keys, `${c.locale} translated`).to.be.within(0, c.total_keys);
            expect(c.outdated_keys, `${c.locale} outdated`).to.be.within(0, c.translated_keys);
          });
          const source = coverage.find((c) => c.locale === defaultOf(locales));
          expect(source?.outdated_keys, 'the default language is never out of date with itself').to.equal(0);
        });
      });
    });
  });

  it('LZ-02 every namespace is surface.page with a count per active locale no larger than its keys', () => {
    asRole('SUPPORT_USER', (token) => {
      readLocales(token).then((locales) => {
        const active = activeOf(locales).map((l) => l.code);
        type Group = { id: string; surface: string; page: string; key_count: number; locales: Array<{ locale: string; translated: number }> };
        expectRead<{ total: number; rows: Group[] }>(token, GROUPS).then((page) => {
          expect(page.total, 'namespaces').to.be.at.least(page.rows.length);
          page.rows.forEach((group) => {
            expect(group.id, 'namespace id').to.equal(`${group.surface}.${group.page}`);
            expect(group.key_count, `${group.id} keys`).to.be.at.least(1);
            expect(group.locales.map((l) => l.locale), `${group.id} locales`).to.deep.equal(active);
            group.locales.forEach((l) => expect(l.translated, `${group.id} ${l.locale}`).to.be.within(0, group.key_count));
          });
        });
      });
    });
  });

  it('LZ-03 auto-translate counts grow with the scope, and the default language or no language is refused as a target', () => {
    asRole('SUPPORT_USER', (token) => {
      readLocales(token).then((locales) => {
        const source = defaultOf(locales);
        const target = activeOf(locales).find((l) => l.code !== source)?.code ?? 'hi';
        const input = (scope: string) => ({ locales: [target], scope });
        cy.gqlRaw(SCOPES, { m: input('MISSING'), o: input('OUTDATED'), a: input('ALL') }, { token }).then((body) => {
          expect(body.errors, 'pending counts errors').to.be.undefined;
          const keys = (alias: string) => (body.data?.[alias] as Array<{ keys: number }>)[0].keys;
          expect(keys('missing'), 'MISSING').to.be.at.least(0);
          expect(keys('missing'), 'MISSING within OUTDATED').to.be.at.most(keys('outdated'));
          expect(keys('outdated'), 'OUTDATED within ALL').to.be.at.most(keys('all'));
        });
        expectBadInput(token, pending([source]), 'The default language is the source everything is translated from');
        expectBadInput(token, pending(['  ']), 'Choose at least one language');
      });
    });
  });

  it('LZ-04 a reader is refused removing a locale and importing app keys', () => {
    asRole('SUPPORT_USER', (token) => expectCallsRefused(token, WRITES));
  });

  it('LZ-05 a signed-out caller and a member are refused every admin read and write', () => {
    expectOutsidersRefused(memberToken, [LOCALES, COVERAGE, GROUPS, pending(['hi']), ...WRITES]);
  });

  it('LZ-06 the public language list offers active locales only, and the default language’s catalogue has one value per key', () => {
    cy.gqlRaw(`query E2ePublicLocales { publicLocales { code is_active } }`, {}, { token: null }).then((body) => {
      expect(body.errors, 'publicLocales errors').to.be.undefined;
      const offered = body.data?.publicLocales as Array<{ code: string; is_active: boolean }>;
      expect(offered, 'publicLocales').to.not.be.empty;
      offered.forEach((l) => expect(l.is_active, `${l.code} is offered, so active`).to.equal(true));
      cy.gqlRaw(
        `query E2ePublicCatalogue($locale: String!) { publicTranslations(locale: $locale) { key value } }`,
        { locale: offered[0].code },
        { token: null },
      ).then((catalogue) => {
        expect(catalogue.errors, 'publicTranslations errors').to.be.undefined;
        const entries = catalogue.data?.publicTranslations as Array<{ key: string; value: string }>;
        const keys = entries.map((e) => e.key);
        expect(new Set(keys).size, 'one value per key').to.equal(keys.length);
      });
    });
  });
});

/** The reader's own read refused as bad input — before any count is taken. */
function expectBadInput(token: string, c: ReturnType<typeof call>, message: string): void {
  cy.gqlRaw(c.query, c.variables ?? {}, { token }).then((body) => {
    const [error] = body.errors ?? [];
    expect(error?.extensions?.code, `${message} code`).to.equal('BAD_USER_INPUT');
    expect(error?.message, 'refusal').to.equal(message);
    expect(body.data?.[c.field] ?? null, 'no counts').to.be.null;
  });
}
