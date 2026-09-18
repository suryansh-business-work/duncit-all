import { SURFACE_BY_KEY } from '@modules/ai/askBot/askBot.surfaces';
import { surfaceUrl, type Environment } from '@modules/ai/askBot/askBot.links';
import { getStatusEnvironment } from '@observability/statusServices';
import type { EntityAnalyticsSections } from './shapes';

/**
 * Where an Analytics number is worked on — the console page a reader jumps to
 * for "more details".
 *
 * A loader names the page as a surface key (`finance`, `pods`, `tech`…, the
 * same keys the Ask Bot and the login gate use) plus a route. The absolute URL
 * is only built when the payload is answered, for the environment the reader
 * is in, so a link opened locally stays local and staging stays on staging.
 */
export type ConsoleLink = { surface: string; path: string } | { href: string };

export const consoleLink = (surface: string, path: string): ConsoleLink => ({ surface, path });

/** A page outside the Duncit consoles (SonarQube), already absolute — the same in every environment. */
export const externalLink = (href: string): ConsoleLink => ({ href });

/** The link as an absolute URL in `environment`, or null for no link / a surface with no address there. */
export function linkUrl(link: ConsoleLink | null | undefined, environment: Environment): string | null {
  if (!link) return null;
  if ('href' in link) return link.href;
  const surface = SURFACE_BY_KEY.get(link.surface);
  if (!surface) return null;
  return surfaceUrl(surface, environment, link.path) || null;
}

/** The environment this server runs as — for links built with no request to read (a scheduled mail). */
export const serverEnvironment = (): Environment =>
  getStatusEnvironment() === 'staging' ? 'STAGING' : 'PRODUCTION';

const withUrl = <T extends { link?: ConsoleLink | null }>(item: T, environment: Environment) => ({
  ...item,
  url: linkUrl(item.link, environment),
});

/** Every link on a page as the URL the API answers with, for the reader's environment. */
export function resolveLinks(sections: EntityAnalyticsSections, environment: Environment) {
  const { leaderboard } = sections;
  return {
    ...sections,
    details_url: linkUrl(sections.link, environment),
    kpis: sections.kpis.map((item) => withUrl(item, environment)),
    trends: sections.trends.map((item) => withUrl(item, environment)),
    breakdowns: sections.breakdowns.map((item) => withUrl(item, environment)),
    leaderboard: leaderboard
      ? { ...withUrl(leaderboard, environment), rows: leaderboard.rows.map((row) => withUrl(row, environment)) }
      : null,
  };
}
