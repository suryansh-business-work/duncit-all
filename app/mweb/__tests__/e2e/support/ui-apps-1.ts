/// <reference types="cypress" />
import { podPhase, withinHappeningNearbyWindow, DEFAULT_HAPPENING_NEARBY_DAYS } from '@duncit/utils';

/**
 * Shared steps for the mWeb UI scenario specs under specs/ui/ (first third of
 * the scenario map): what staging holds right now, read through the same public
 * queries the pages read, and the few browser stand-ins a page needs (the share
 * sheet and the clipboard). Nothing here stubs the API.
 *
 * Home and the pod lists are scoped by the header's city and the FIRST super
 * category (AppHeader.tsx picks `superCats[0]`; useHomeData.ts keeps a pod only
 * when its club belongs to that super category), so `homePods` applies exactly
 * those two rules to decide what the page must show.
 */

const WORLD_QUERY = `query E2eDiscoveryWorld {
  superCategories: categories(filter: { level: SUPER }) { id slug }
  categories { id level parent_id slug is_active }
  locations { id location_name is_launched state country }
  clubs(filter: { is_active: true }) { id club_id club_name category_id super_category_id location_id }
  pods(filter: { is_active: true }) {
    id pod_id pod_title pod_type pod_mode pod_date_time pod_end_date_time
    club_id club_slug location_id no_of_spots seats_available
    pod_attendees pod_hosts_id is_deleted
  }
  publicAppSettings { happening_nearby_days }
  me { user_id }
}`;

const SET_CITY_MUTATION = `mutation E2eSetMyCity($locationId: ID) {
  setMySelectedLocation(location_id: $locationId, zone_name: null) { user_id selected_location_id }
}`;

const MY_CITY_QUERY = `query E2eMyCity { me { selected_location_id } }`;

export interface WorldPod {
  id: string;
  pod_id: string;
  pod_title: string;
  pod_type: 'FREE' | 'PAID';
  pod_mode: 'PHYSICAL' | 'VIRTUAL';
  pod_date_time: string;
  pod_end_date_time: string | null;
  club_id: string;
  club_slug: string;
  location_id: string | null;
  no_of_spots: number;
  seats_available: number;
  pod_attendees: string[];
  pod_hosts_id: string[];
  is_deleted: boolean;
}

export interface WorldClub {
  id: string;
  club_id: string;
  club_name: string;
  category_id: string | null;
  super_category_id: string | null;
  location_id: string | null;
}

interface WorldCategory {
  id: string;
  level: 'SUPER' | 'CATEGORY' | 'SUB';
  parent_id: string | null;
  slug: string;
  is_active: boolean | null;
}

export interface WorldCity {
  id: string;
  location_name: string;
  is_launched: boolean | null;
  state: string | null;
  country: string | null;
}

/** The country and state chips the header's picker files a city under (utils/location-tree.ts). */
export const pickerPlace = (city: WorldCity): { country: string; state: string } => ({
  country: (city.country ?? '').trim() || 'Other',
  state: (city.state ?? '').trim() || 'Other',
});

interface WorldData {
  superCategories: Array<{ id: string; slug: string }>;
  categories: WorldCategory[];
  locations: WorldCity[];
  clubs: WorldClub[];
  pods: WorldPod[];
  publicAppSettings: { happening_nearby_days: number | null } | null;
  me: { user_id: string };
}

/** Staging as the run account sees it, at the moment a spec starts. */
export interface World {
  meId: string;
  nearbyDays: number;
  cities: WorldCity[];
  pods: WorldPod[];
  clubsById: Map<string, WorldClub>;
  /** True when the club is in the header's first super category (Home's own rule). */
  inHomeScope: (club: WorldClub) => boolean;
  /** The CATEGORY-level ancestor of a club's category — the vibe chip it sits under. */
  vibeOf: (club: WorldClub) => string | null;
}

function buildWorld(data: WorldData): World {
  const byId = new Map(data.categories.map((category) => [category.id, category]));
  const superOf = (id: string | null): string | null => {
    let current = id ? byId.get(id) : undefined;
    for (let guard = 0; current && guard < 16; guard += 1) {
      if (current.level === 'SUPER') return current.slug;
      current = current.parent_id ? byId.get(current.parent_id) : undefined;
    }
    return null;
  };
  const vibeOf = (club: WorldClub): string | null => {
    let current = club.category_id ? byId.get(club.category_id) : undefined;
    for (let guard = 0; current && guard < 16; guard += 1) {
      // An inactive category never becomes a Home chip (useHomeData.ts `isActiveCategory`).
      if (current.level === 'CATEGORY') return current.is_active === false ? null : current.id;
      current = current.parent_id ? byId.get(current.parent_id) : undefined;
    }
    return null;
  };
  const first = data.superCategories[0];
  if (!first) throw new Error('Staging prerequisite: no SUPER category exists, so Home has no vibe to show.');
  const inHomeScope = (club: WorldClub): boolean =>
    club.super_category_id ? club.super_category_id === first.id : superOf(club.category_id) === first.slug;
  return {
    meId: data.me.user_id,
    nearbyDays: data.publicAppSettings?.happening_nearby_days ?? DEFAULT_HAPPENING_NEARBY_DAYS,
    cities: data.locations,
    pods: data.pods.filter((pod) => !pod.is_deleted),
    clubsById: new Map(data.clubs.map((club) => [club.id, club])),
    inHomeScope,
    vibeOf,
  };
}

export const loadWorld = (): Cypress.Chainable<World> =>
  cy.gql<WorldData>(WORLD_QUERY).then((data) => buildWorld(data));

const launched = (city: WorldCity): boolean => city.is_launched !== false;
const startsInMoreThan = (pod: WorldPod, ms: number): boolean => Date.parse(pod.pod_date_time) > Date.now() + ms;

/** Neither hosting nor holding a seat: the booking bar is a stranger's. */
export const isStranger = (world: World, pod: WorldPod): boolean =>
  !pod.pod_attendees.includes(world.meId) && !pod.pod_hosts_id.includes(world.meId);

/** What Home lists for `cityId`: active pods of active clubs in the first super category. */
export function homePods(world: World, cityId: string): WorldPod[] {
  return world.pods.filter((pod) => {
    const club = world.clubsById.get(pod.club_id);
    return pod.location_id === cityId && !!club && world.inHomeScope(club);
  });
}

/** Home's upcoming pods for `cityId`, earliest first (the Happening nearby order). */
export const upcomingHomePods = (world: World, cityId: string): WorldPod[] =>
  homePods(world, cityId)
    .filter((pod) => podPhase(pod.pod_date_time, pod.pod_end_date_time) === 'UPCOMING')
    .sort((a, b) => Date.parse(a.pod_date_time) - Date.parse(b.pod_date_time));

/** Home's previous pods for `cityId`, newest first (PreviousPodsRail's order). */
export const previousHomePods = (world: World, cityId: string): WorldPod[] =>
  homePods(world, cityId)
    .filter((pod) => podPhase(pod.pod_date_time, pod.pod_end_date_time) === 'PREVIOUS')
    .sort((a, b) => Date.parse(b.pod_date_time) - Date.parse(a.pod_date_time));

/** The Happening nearby list: upcoming, within the admin's window (Pods > Pod Settings). */
export const nearbyHomePods = (world: World, cityId: string): WorldPod[] =>
  withinHappeningNearbyWindow(upcomingHomePods(world, cityId), world.nearbyDays);

/** A launched city whose Home shows at least one pod in Happening nearby — the busiest one. */
export function homeCity(world: World): WorldCity {
  const ranked = world.cities
    .filter(launched)
    .map((city) => ({ city, count: nearbyHomePods(world, city.id).length }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
  if (!ranked[0]) {
    throw new Error(
      'Staging prerequisite: no launched city has an upcoming pod inside the Happening nearby window ' +
        'for the first super category, so Home has nothing to browse.',
    );
  }
  return ranked[0].city;
}

/** A launched city whose Home has no upcoming pod at all (the empty Home). */
export function emptyHomeCity(world: World): WorldCity {
  const city = world.cities.find((row) => launched(row) && upcomingHomePods(world, row.id).length === 0);
  if (!city) throw new Error('Staging prerequisite: every launched city has upcoming pods — no empty Home to open.');
  return city;
}

/** The first pod `pick` accepts, or a failure naming what staging lacks. */
export function podWhere(world: World, what: string, pick: (pod: WorldPod) => boolean): WorldPod {
  const pod = world.pods.find(pick);
  if (!pod) throw new Error(`Staging prerequisite: no live pod is ${what}.`);
  return pod;
}

/** A physical, upcoming FREE pod in a launched city with a seat left, a stranger's, starting over an hour away. */
export function joinableFreePod(world: World): WorldPod {
  const launchedIds = new Set(world.cities.filter(launched).map((city) => city.id));
  return podWhere(world, 'a FREE physical pod in a launched city, over an hour away, with a seat left', (pod) =>
    pod.pod_type === 'FREE' &&
    pod.pod_mode === 'PHYSICAL' &&
    !!pod.location_id &&
    launchedIds.has(pod.location_id) &&
    startsInMoreThan(pod, 60 * 60 * 1000) &&
    (pod.no_of_spots === 0 || pod.seats_available > 0) &&
    isStranger(world, pod),
  );
}

/** Two launched cities, each with a physical upcoming pod: where the header sits, and where a link points. */
export function twoCities(world: World): { home: WorldCity; away: WorldPod } {
  const home = homeCity(world);
  const launchedIds = new Set(world.cities.filter(launched).map((city) => city.id));
  const away = podWhere(world, 'a physical upcoming pod in a second launched city', (pod) =>
    pod.pod_mode === 'PHYSICAL' &&
    !!pod.location_id &&
    pod.location_id !== home.id &&
    launchedIds.has(pod.location_id) &&
    podPhase(pod.pod_date_time, pod.pod_end_date_time) === 'UPCOMING',
  );
  return { home, away };
}

export const cityName = (world: World, id: string | null): string =>
  world.cities.find((city) => city.id === id)?.location_name ?? '';

/**
 * Make `cityId` the run account's saved header city. The header applies the
 * saved city at boot (useHeaderLocation.ts), so the next `visitApp` opens there
 * — and a pod page in that city never asks to switch.
 */
export function useCity(cityId: string): void {
  cy.gql(SET_CITY_MUTATION, { locationId: cityId });
}

export const savedCity = () =>
  cy.gql<{ me: { selected_location_id: string | null } }>(MY_CITY_QUERY).then((data) => data.me.selected_location_id);

/** The pod's own page, by the slugs its links carry, loaded. */
export function openPodPage(pod: Pick<WorldPod, 'club_slug' | 'pod_id'>): void {
  cy.interceptOperation('PodDetails');
  cy.visitApp(`/club/${pod.club_slug}/pod/${pod.pod_id}`);
  cy.wait('@PodDetails');
  cy.byTestId('pod-details-screen').should('be.visible');
}

/** The browser share sheet, answered at once — aliased `@share`. Installed on the loaded page. */
export function stubShareSheet(): void {
  cy.window({ log: false }).then((win) => {
    const share = cy.stub().as('share').resolves();
    Object.defineProperty(win.navigator, 'share', { value: share, configurable: true });
  });
}

/** The clipboard, answered at once — aliased `@clipboard`. Installed on the loaded page. */
export function stubClipboard(): void {
  cy.window({ log: false }).then((win) => {
    cy.stub(win.navigator.clipboard, 'writeText').as('clipboard').resolves();
  });
}

/** Each test id exists, and they sit in the page in this order. */
export function expectInOrder(testIds: readonly string[]): void {
  const nodes: HTMLElement[] = [];
  testIds.forEach((testId) => {
    cy.byTestId(testId).first().then(($el) => {
      nodes.push($el[0]);
    });
  });
  cy.then(() => {
    for (let index = 1; index < nodes.length; index += 1) {
      const follows = nodes[index - 1].compareDocumentPosition(nodes[index]) & Node.DOCUMENT_POSITION_FOLLOWING;
      expect(follows, `${testIds[index]} comes after ${testIds[index - 1]}`).to.be.greaterThan(0);
    }
  });
}
