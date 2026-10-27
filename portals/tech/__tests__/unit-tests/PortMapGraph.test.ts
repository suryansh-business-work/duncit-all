import { describe, expect, it } from 'vitest';
import type { PortMapRoute } from '@duncit/gql-types';
import { buildPortMapGraph } from '../../src/pages/domain/port-mapping/port-map-graph';

const route = (over: Partial<PortMapRoute> = {}): PortMapRoute => ({
  __typename: 'PortMapRoute',
  site: 'duncit',
  enabled: true,
  domain: 'api.example.test',
  location: '/',
  target: 'http://127.0.0.1:2001',
  host: '127.0.0.1',
  port: 2001,
  tls: true,
  ...over,
});

describe('buildPortMapGraph', () => {
  it('draws nothing for no routes', () => {
    expect(buildPortMapGraph([])).toEqual({ nodes: [], edges: [] });
  });

  it('puts each domain in the left column and each port in the right, one row apart', () => {
    const { nodes } = buildPortMapGraph([
      route({ domain: 'a.example.test', port: 2001 }),
      route({ domain: 'b.example.test', port: 2002, host: '127.0.0.1', target: 'http://127.0.0.1:2002' }),
    ]);
    const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));

    expect(byId['domain:a.example.test'].position).toEqual({ x: 0, y: 0 });
    expect(byId['domain:b.example.test'].position).toEqual({ x: 0, y: 64 });
    expect(byId['port:127.0.0.1:2001'].position).toEqual({ x: 460, y: 0 });
    expect(byId['port:127.0.0.1:2002'].position).toEqual({ x: 460, y: 64 });
    expect(byId['port:127.0.0.1:2001'].data).toEqual({ address: '127.0.0.1:2001', port: 2001 });
  });

  it('seats a shared port at the average row of the domains that reach it', () => {
    const { nodes } = buildPortMapGraph([
      route({ domain: 'a.example.test' }),
      route({ domain: 'b.example.test', location: '/ws' }),
      route({ domain: 'c.example.test' }),
    ]);
    const ports = nodes.filter((node) => node.type === 'port');

    expect(ports).toHaveLength(1);
    expect(ports[0].position.y).toBe(64);
  });

  it('pushes a port down just enough not to overlap the one above', () => {
    const { nodes } = buildPortMapGraph([
      route({ domain: 'a.example.test', port: 2001, target: 'http://127.0.0.1:2001' }),
      route({ domain: 'a.example.test', location: '/admin', port: 2002, target: 'http://127.0.0.1:2002' }),
    ]);
    const rows = nodes.filter((node) => node.type === 'port').map((node) => node.position.y);

    // Both want row 0; the second lands one row below the first.
    expect(rows).toEqual([0, 64]);
  });

  it('reads a domain as HTTPS and enabled when any of its routes is', () => {
    const { nodes } = buildPortMapGraph([
      route({ domain: 'a.example.test', tls: false, enabled: false }),
      route({ domain: 'a.example.test', location: '/b', tls: true, enabled: false, port: 2002, target: 'x:2002' }),
      route({ domain: 'plain.example.test', tls: false, enabled: false, port: 2003, target: 'x:2003' }),
    ]);
    const data = (id: string) => nodes.find((node) => node.id === id)?.data;

    expect(data('domain:a.example.test')).toMatchObject({ tls: true, enabled: false });
    expect(data('domain:plain.example.test')).toMatchObject({ tls: false, enabled: false });
  });

  it('keeps the raw target for a route with no port, such as a unix socket', () => {
    const { nodes, edges } = buildPortMapGraph([
      route({ port: null, host: null, target: 'http://unix:/run/app.sock' }),
    ]);
    const port = nodes.find((node) => node.type === 'port');

    expect(port?.id).toBe('port:http://unix:/run/app.sock');
    expect(port?.data).toEqual({ address: 'http://unix:/run/app.sock', port: null });
    expect(edges[0].target).toBe('port:http://unix:/run/app.sock');
  });

  it('draws one arrow per route, labelled with its location unless it is the root', () => {
    const { edges } = buildPortMapGraph([
      route({ location: '/' }),
      route({ location: '/socket.io', enabled: false }),
    ]);

    expect(edges).toEqual([
      {
        id: 'duncit|api.example.test|/|http://127.0.0.1:2001',
        source: 'domain:api.example.test',
        target: 'port:127.0.0.1:2001',
        label: undefined,
        data: { enabled: true },
      },
      {
        id: 'duncit|api.example.test|/socket.io|http://127.0.0.1:2001',
        source: 'domain:api.example.test',
        target: 'port:127.0.0.1:2001',
        label: '/socket.io',
        data: { enabled: false },
      },
    ]);
  });
});
