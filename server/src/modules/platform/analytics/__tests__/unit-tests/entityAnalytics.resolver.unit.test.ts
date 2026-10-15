/**
 * Who may read an Analytics page.
 *
 * Two dashboards are also mounted by another console, and that console's staff
 * read them too: Communications (the Communications console's Dashboard) and
 * Contacts (Marketing > Contacts). The grant is per page — a Communications
 * Manager gets Communications and nothing else, a Marketing Manager gets
 * Contacts and nothing else. The loader is mocked: what is asserted is the gate.
 */
jest.mock('../../entity/entityAnalytics.service', () => ({
  entityAnalyticsService: { load: jest.fn().mockResolvedValue({ entity: 'stub' }) },
}));

import { GraphQLError } from 'graphql';

import { makeContext } from '@test/harness';
import { entityAnalyticsResolvers, entityReaders } from '../../entity/entityAnalytics.resolver';
import { entityAnalyticsService } from '../../entity/entityAnalytics.service';
import { ANALYTICS_ENTITIES, ANALYTICS_MAIL_PAGES, isAnalyticsEntity } from '../../mail/analyticsMail.pages';
import type { AnalyticsEntity } from '../../entity/shapes';

const load = entityAnalyticsService.load as jest.Mock;
const read = (entity: AnalyticsEntity, roles: string[] | null) =>
  entityAnalyticsResolvers.Query.entityAnalytics(null, { entity, days: 30 }, makeContext(roles ? { roles } : null));

function codeOf(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(GraphQLError);
    return (error as GraphQLError).extensions.code;
  }
  return 'NO_ERROR';
}

describe('entityReaders', () => {
  it('every page is readable by the Analytics console staff', () => {
    for (const entity of ANALYTICS_ENTITIES) {
      expect(entityReaders(entity)).toEqual(expect.arrayContaining(['SUPER_ADMIN', 'ANALYTICS_MANAGER']));
    }
  });

  it('COMMUNICATIONS adds the Communications Manager, and only that page does', () => {
    expect(entityReaders('COMMUNICATIONS')).toContain('COMMUNICATIONS_MANAGER');
    const others = ANALYTICS_ENTITIES.filter((e) => e !== 'COMMUNICATIONS');
    for (const entity of others) expect(entityReaders(entity)).not.toContain('COMMUNICATIONS_MANAGER');
  });

  it('CONTACTS adds the Marketing Manager, and only that page does — not even MARKETING', () => {
    expect(entityReaders('CONTACTS')).toContain('MARKETING_MANAGER');
    const others = ANALYTICS_ENTITIES.filter((e) => e !== 'CONTACTS');
    for (const entity of others) expect(entityReaders(entity)).not.toContain('MARKETING_MANAGER');
  });
});

describe('entityAnalytics resolver gate', () => {
  it.each([
    ['COMMUNICATIONS', 'COMMUNICATIONS_MANAGER'],
    ['CONTACTS', 'MARKETING_MANAGER'],
    ['CONTACTS', 'ANALYTICS_MANAGER'],
    ['COMMUNICATIONS', 'SUPER_ADMIN'],
  ] as const)('%s is served to %s, with the period passed through', async (entity, role) => {
    await expect(read(entity, [role])).resolves.toEqual({ entity: 'stub' });
    expect(load).toHaveBeenCalledWith(entity, { days: 30 }, 'PRODUCTION');
  });

  it.each([
    ['CONTACTS', 'COMMUNICATIONS_MANAGER'],
    ['COMMUNICATIONS', 'MARKETING_MANAGER'],
    ['MARKETING', 'MARKETING_MANAGER'],
    ['USERS', 'COMMUNICATIONS_MANAGER'],
    ['CONTACTS', 'SUPPORT_USER'],
  ] as const)('%s is refused to %s before anything is loaded', (entity, role) => {
    expect(codeOf(() => read(entity, [role]))).toBe('FORBIDDEN');
    expect(load).not.toHaveBeenCalled();
  });

  it('refuses a caller with no session', () => {
    expect(codeOf(() => read('CONTACTS', null))).toBe('UNAUTHENTICATED');
    expect(load).not.toHaveBeenCalled();
  });
});

describe('analytics mail pages', () => {
  it('CONTACTS is a reportable page linking to Marketing > Contacts in the console', () => {
    expect(ANALYTICS_MAIL_PAGES.CONTACTS).toEqual({ path: '/growth/contacts', copy: 'contacts' });
    expect(isAnalyticsEntity('CONTACTS')).toBe(true);
    // Sidebar order: Contacts sits between Marketing and Communications.
    const order = ANALYTICS_ENTITIES.indexOf('CONTACTS');
    expect(ANALYTICS_ENTITIES[order - 1]).toBe('MARKETING');
    expect(ANALYTICS_ENTITIES[order + 1]).toBe('COMMUNICATIONS');
  });
});
