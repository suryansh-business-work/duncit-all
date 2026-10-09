/**
 * Every option the shared studio catalogue lists must open a real page here.
 *
 * The catalogue (@duncit/utils studio-options) gives each option a Partner
 * console path; a path this console has no route for falls through to the
 * `*` catch-all and silently bounces the partner to `/`. This walks the route
 * table itself, so an option added to the catalogue without its page fails
 * here rather than in front of a partner.
 */
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { createRoutesFromElements, matchRoutes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { STUDIO_OPTIONS_ENTRY, STUDIO_OPTION_LIST, type PartnerStudioMode } from '@duncit/utils';
import App from '../App';
import { sectionRoleFor } from '../config/partner-sections';

const routesElement = App() as ReactElement<{ children: ReactNode }>;
const routes = createRoutesFromElements(routesElement.props.children);

/** The route pattern a path lands on (search string dropped), or null. */
const patternFor = (path: string): string | null => {
  const [pathname] = path.split('?');
  const matches = matchRoutes(routes, pathname);
  return matches?.at(-1)?.route.path ?? null;
};

const MODES = Object.keys(STUDIO_OPTIONS_ENTRY) as PartnerStudioMode[];
const ROLE_OF: Record<PartnerStudioMode, string> = {
  VENUE: 'VENUE_OWNER',
  HOST: 'HOST',
  CLUB: 'CLUB_ADMIN',
  ECOMM: 'ECOMM_MANAGER',
};

describe('studio options routes', () => {
  it('reads the real route table', () => {
    expect(isValidElement(routesElement)).toBe(true);
    expect(patternFor('/no-such-page')).toBe('*');
  });

  it.each(MODES)('gives the %s Options page its own route, kept to the studio role', (mode) => {
    const { portal } = STUDIO_OPTIONS_ENTRY[mode];
    expect(patternFor(portal)).toBe(portal);
    expect(sectionRoleFor(portal)).toBe(ROLE_OF[mode]);
  });

  it.each(MODES)('opens a real page for every %s option', (mode) => {
    for (const option of STUDIO_OPTION_LIST[mode]) {
      const pattern = patternFor(option.portal);
      expect(pattern, `${mode} → ${option.key} (${option.portal})`).not.toBe('*');
      expect(pattern).not.toBeNull();
    }
  });

  it('keeps the named-venue availability link working beside the selected-venue one', () => {
    expect(patternFor('/venues/availability')).toBe('/venues/availability');
    expect(patternFor('/venues/venue-1/availability')).toBe('/venues/:venueId/availability');
  });
});
