/**
 * Who may read, edit and govern each directory console's entity.
 *
 * The five `ALL_*_ACCESS` roles used to gate the portal LOGIN and nothing else:
 * every query behind those consoles still asked for SUPER_ADMIN / CITY_ADMIN /
 * ZONAL_ADMIN (or ONBOARDING_MANAGER), so somebody granted venues.duncit.com
 * signed in and saw an empty screen. That was fine while the consoles were
 * read-only brochures of a table they could not read either; it is not fine now
 * that the record is edited there.
 *
 * Three levels, because "can use this console" and "can approve a partner or set
 * their commission" are different jobs:
 *
 *  - READ    the list, the record, its change log.
 *  - EDIT    the record's OWN details — name, address, photos, documents,
 *            contact, operating hours, categories.
 *  - GOVERN  approve and reject, the commission and share percentages, and the
 *            live on/off switch. Deliberately NOT granted by a console role:
 *            handing somebody venues.duncit.com should not hand them the power
 *            to set a venue's commission or flip a live venue dark.
 *
 * One module rather than a list per resolver, so the answer to "who can do this"
 * is in one place and a new console is one more row (rule 34).
 */

/** The entities a directory console is built over. */
export type ConsoleEntity = 'VENUE' | 'HOST' | 'CLUB' | 'CLUB_ADMIN' | 'POD' | 'REGION';

/** Duncit staff who administer the platform itself. */
const PLATFORM = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'];

/** The onboarding desk, which reviews partners of every kind. */
const ONBOARDING = 'ONBOARDING_MANAGER';

/** The per-console access role, granted from Admin → Users. */
const CONSOLE_ROLE: Record<ConsoleEntity, string> = {
  VENUE: 'ALL_VENUES_ACCESS',
  HOST: 'ALL_HOSTS_ACCESS',
  CLUB: 'ALL_CLUBS_ACCESS',
  CLUB_ADMIN: 'ALL_CLUB_ADMINS_ACCESS',
  POD: 'ALL_PODS_ACCESS',
  REGION: 'ALL_CLUB_ADMINS_ACCESS',
};

/** Which entities the onboarding desk reviews (a club is not an application). */
const ONBOARDED: ConsoleEntity[] = ['VENUE', 'HOST', 'CLUB_ADMIN'];

const governors = (entity: ConsoleEntity): string[] =>
  ONBOARDED.includes(entity) ? [...PLATFORM, ONBOARDING] : [...PLATFORM];

/**
 * Approving, money and the live switch. The console role is absent on purpose.
 */
export const consoleGovernors = (entity: ConsoleEntity): string[] => governors(entity);

/** Editing the record's own details — the console role is included. */
export const consoleEditors = (entity: ConsoleEntity): string[] => [
  ...governors(entity),
  CONSOLE_ROLE[entity],
];

/** Reading the list, the record and its history — same audience as editing. */
export const consoleReaders = (entity: ConsoleEntity): string[] => consoleEditors(entity);
