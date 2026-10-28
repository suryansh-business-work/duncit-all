import type { LiteMe } from '../../shared/graphql/documents';
import type { LiteAdminSettings, LiteAdminStats } from '../graphql/admin';
import type { LiteAdminCalendarRow } from '../graphql/calendars';
import type { LiteAdminCategory, LiteAdminCity } from '../graphql/catalogue';
import type { LiteEmailLogRow, LiteEmailTemplate } from '../graphql/email';
import type { LiteEnvCategoryDef, LiteEnvEntry } from '../graphql/environment';
import type { LiteAdminEventRow } from '../graphql/events';
import type { LiteLocale, LiteTranslationRow } from '../graphql/localization';
import type { LiteAdminRegistrationRow } from '../graphql/registrations';

/**
 * The fixtures as the API answers them: every object carries `__typename`, so
 * Apollo's cache matches the documents' fragments and normalises by id the
 * way it does in production.
 */

type Typed<T> = T & { __typename: string };

const typed = <T extends object>(typename: string, value: T): Typed<T> => ({ __typename: typename, ...value });

export const gqlSettings = (s: LiteAdminSettings) => typed('LiteAdminSettings', s);
export const gqlStats = (s: LiteAdminStats) => typed('LiteAdminStats', s);
export const gqlCity = (c: LiteAdminCity) => typed('LiteCity', c);
export const gqlCategory = (c: LiteAdminCategory) => typed('LiteCategory', c);
export const gqlLocale = (l: LiteLocale) => typed('LiteLocale', l);
export const gqlTranslation = (r: LiteTranslationRow) => typed('LiteTranslation', r);
export const gqlTemplate = (tpl: LiteEmailTemplate) => typed('LiteEmailTemplate', tpl);
export const gqlEmailLog = (log: LiteEmailLogRow) => typed('LiteEmailLog', log);

export const gqlEnvEntry = (e: LiteEnvEntry) =>
  typed('LiteEnvEntry', {
    ...e,
    config: e.config.map((pair) => typed('LiteEnvConfigPair', pair)),
    secrets: e.secrets.map((flag) => typed('LiteEnvSecretFlag', flag)),
  });

export const gqlEnvCategory = (def: LiteEnvCategoryDef) =>
  typed('LiteEnvCategoryDef', { ...def, fields: def.fields.map((field) => typed('LiteEnvFieldDef', field)) });

export const gqlEventRow = (row: LiteAdminEventRow) => typed('LiteEvent', { ...row, stats: typed('LiteEventStats', row.stats) });

export const gqlUser = (user: LiteMe) => typed('LiteUser', { ...user, social: typed('LiteSocialLinks', user.social) });

export const gqlRegistration = (row: LiteAdminRegistrationRow) =>
  typed('LiteRegistration', {
    ...row,
    ticket: typed('LiteTicket', row.ticket),
    user: typed('LiteUser', row.user),
    event: typed('LiteEvent', row.event),
  });

export const gqlCalendar = (row: LiteAdminCalendarRow) => typed('LiteCalendar', { ...row, owner: typed('LiteUser', row.owner) });

/** One page of a server table, the shape every `<name>Table` query answers. */
export const tablePage = <T>(typename: string, rows: readonly T[]) => ({ __typename: typename, rows, total: rows.length, page: 1, page_size: 25 });

/** A table query is matched whatever page, sort or search the grid asked for. */
export const anyVariables = (): boolean => true;
