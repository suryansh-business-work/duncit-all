import type { Edge, Node } from '@xyflow/react';
import type { PortMapRoute } from '@duncit/gql-types';

export interface DomainNodeData extends Record<string, unknown> {
  domain: string;
  tls: boolean;
  enabled: boolean;
}

export interface PortNodeData extends Record<string, unknown> {
  /** `127.0.0.1:2001`, or the raw target when it has no port. */
  address: string;
  port: number | null;
}

export type PortMapNode = Node<DomainNodeData, 'domain'> | Node<PortNodeData, 'port'>;

/** Layout constants of the two-column graph (React Flow canvas units, not theme spacing). */
const DOMAIN_X = 0;
const PORT_X = 460;
const ROW = 64;

const addressOf = (route: PortMapRoute) => (route.port == null ? route.target : `${route.host}:${route.port}`);

/** Each port sits beside the domains that reach it, pushed down just enough not to overlap the one above. */
function portRows(routes: PortMapRoute[], domainRow: Map<string, number>): Map<string, number> {
  const sums = new Map<string, { total: number; count: number }>();
  for (const route of routes) {
    const address = addressOf(route);
    const entry = sums.get(address) ?? { total: 0, count: 0 };
    entry.total += domainRow.get(route.domain) ?? 0;
    entry.count += 1;
    sums.set(address, entry);
  }
  const wanted = [...sums].map(([address, { total, count }]) => ({ address, y: total / count }));
  wanted.sort((a, b) => a.y - b.y);
  const rows = new Map<string, number>();
  let floor = -Infinity;
  for (const { address, y } of wanted) {
    const placed = Math.max(y, floor + ROW);
    rows.set(address, placed);
    floor = placed;
  }
  return rows;
}

/** Domains on the left, local ports on the right, one arrow per (domain, location) route. */
export function buildPortMapGraph(routes: PortMapRoute[]): { nodes: PortMapNode[]; edges: Edge[] } {
  const domains = [...new Set(routes.map((route) => route.domain))];
  const domainRow = new Map(domains.map((domain, i) => [domain, i * ROW]));
  const portRow = portRows(routes, domainRow);

  const domainNodes: PortMapNode[] = domains.map((domain) => {
    const own = routes.filter((route) => route.domain === domain);
    return {
      id: `domain:${domain}`,
      type: 'domain',
      position: { x: DOMAIN_X, y: domainRow.get(domain) ?? 0 },
      data: { domain, tls: own.some((route) => route.tls), enabled: own.some((route) => route.enabled) },
    };
  });
  const portNodes: PortMapNode[] = [...portRow].map(([address, y]) => ({
    id: `port:${address}`,
    type: 'port',
    position: { x: PORT_X, y },
    data: { address, port: routes.find((route) => addressOf(route) === address)?.port ?? null },
  }));
  const edges: Edge[] = routes.map((route) => ({
    id: `${route.site}|${route.domain}|${route.location}|${route.target}`,
    source: `domain:${route.domain}`,
    target: `port:${addressOf(route)}`,
    label: route.location === '/' ? undefined : route.location,
    data: { enabled: route.enabled },
  }));
  return { nodes: [...domainNodes, ...portNodes], edges };
}
