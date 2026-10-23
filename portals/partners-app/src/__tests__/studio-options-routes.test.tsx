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
import { createRoutesFromElements, matchRoutes, Navigate } from 'react-router';
import { describe, expect, it } from 'vitest';
import { STUDIO_OPTIONS_ENTRY, STUDIO_OPTION_LIST, type PartnerStudioMode } from '@duncit/utils';
import App from '../App';
import { sectionRoleFor } from '../config/partner-sections';
import { EventRequestsPage } from '@duncit/shell';
import WorkshopEventRequestsPage from '../pages/workshop-event-requests-page/WorkshopEventRequestsPage';

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

  it('opens each venue setup page on its own route, kept to the venue studio', () => {
    for (const path of [
      '/venues/calendar',
      '/venues/type-capacity',
      '/venues/amenities',
      '/venues/leaves',
      '/venues/fees',
      '/venues/price-rules',
      '/venues/food-settings',
    ]) {
      expect(patternFor(path)).toBe(path);
      expect(sectionRoleFor(path)).toBe('VENUE_OWNER');
    }
  });

  it('lands the old pricing and availability links on the venue’s fees', () => {
    for (const path of ['/venues/pricing', '/venues/venue-1/pricing', '/venues/availability', '/venues/venue-1/availability']) {
      const element = matchRoutes(routes, path)?.at(-1)?.route.element;
      expect(findElement(element, Navigate)?.props, path).toEqual({ to: '/venues/fees', replace: true });
    }
  });
});

/** The first element of `type` in a rendered-to-be tree, walking children only. */
const findElement = (node: ReactNode, type: unknown): ReactElement<Record<string, unknown>> | null => {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, type);
      if (found) return found;
    }
    return null;
  }
  if (!isValidElement<{ children?: ReactNode }>(node)) return null;
  if (node.type === type) return node as ReactElement<Record<string, unknown>>;
  return findElement(node.props.children, type);
};

describe('event requests routes', () => {
  it('opens /host/event-requests on the shared Event Requests page, scoped to the host’s own', () => {
    const path = '/host/event-requests';
    expect(patternFor(path)).toBe(path);
    // Kept to the studio it belongs to, like the rest of that studio's pages.
    expect(sectionRoleFor(path)).toBe('HOST');

    const route = matchRoutes(routes, path)?.at(-1)?.route;
    const page = findElement(route?.element, EventRequestsPage);
    // "owner" is the partner's own requests; the consoles mount it as "console".
    expect(page?.props).toEqual({ targetType: 'HOST', scope: 'owner' });
  });

  it('opens a venue’s requests on Workshop & Event Requests, and lands the old link there', () => {
    expect(sectionRoleFor('/venues/requests')).toBe('VENUE_OWNER');
    const merged = matchRoutes(routes, '/venues/requests')?.at(-1)?.route;
    expect(findElement(merged?.element, WorkshopEventRequestsPage)).not.toBeNull();

    const old = matchRoutes(routes, '/venues/event-requests')?.at(-1)?.route;
    expect(old?.path).toBe('/venues/event-requests');
    expect(findElement(old?.element, Navigate)?.props).toEqual({ to: '/venues/requests', replace: true });
  });
});
