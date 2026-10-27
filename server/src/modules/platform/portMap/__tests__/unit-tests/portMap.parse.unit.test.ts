import { END_MARK, SITE_MARK, parsePortMap, resolveTarget, splitSites } from '../../portMap.parse';

describe('splitSites', () => {
  it('splits the dump per site, flags enabled ones and keeps spaces in names', () => {
    const dump = [
      'noise before any site',
      `${SITE_MARK}1 app.conf`,
      'server { listen 80; }',
      END_MARK,
      'stray line after end',
      `${SITE_MARK}0 my site.conf`,
      'upstream x { }',
      END_MARK,
    ].join('\n');
    expect(splitSites(dump)).toEqual([
      { name: 'app.conf', enabled: true, body: 'server { listen 80; }\n' },
      { name: 'my site.conf', enabled: false, body: 'upstream x { }\n' },
    ]);
  });

  it('returns nothing for an empty dump', () => {
    expect(splitSites('')).toEqual([]);
  });
});

describe('resolveTarget', () => {
  const upstreams = new Map([
    ['backend', '127.0.0.1:3000'],
    ['sock', 'unix:/run/app.sock'],
    ['bare', 'internal'],
    ['v6', '[::1]:9000'],
    ['weird', 'a:b:c'],
  ]);

  it('reads host and explicit port from a plain target', () => {
    expect(resolveTarget('http://127.0.0.1:2001/x', upstreams)).toEqual({ host: '127.0.0.1', port: 2001 });
  });

  it('falls back to the scheme default port, http when no scheme', () => {
    expect(resolveTarget('https://example.com', upstreams)).toEqual({ host: 'example.com', port: 443 });
    expect(resolveTarget('example.com/path', upstreams)).toEqual({ host: 'example.com', port: 80 });
    expect(resolveTarget('GRPCS://svc', upstreams)).toEqual({ host: 'svc', port: 443 });
  });

  it('gives a null port for an unknown scheme without an explicit port', () => {
    expect(resolveTarget('ftp://files', upstreams)).toEqual({ host: 'files', port: null });
  });

  it('resolves upstream names, sockets and ipv6', () => {
    expect(resolveTarget('http://backend/api', upstreams)).toEqual({ host: '127.0.0.1', port: 3000 });
    expect(resolveTarget('http://sock', upstreams)).toEqual({ host: 'unix:/run/app.sock', port: null });
    expect(resolveTarget('http://bare', upstreams)).toEqual({ host: 'internal', port: 80 });
    expect(resolveTarget('http://v6', upstreams)).toEqual({ host: '[::1]', port: 9000 });
  });

  it('keeps an unparseable address as the host with no port', () => {
    expect(resolveTarget('http://weird', upstreams)).toEqual({ host: 'a:b:c', port: null });
  });

  it('has no host or port for variables or an empty authority', () => {
    expect(resolveTarget('http://$upstream', upstreams)).toEqual({ host: null, port: null });
    expect(resolveTarget('http://', upstreams)).toEqual({ host: null, port: null });
  });
});

describe('parsePortMap', () => {
  const dump = [
    `${SITE_MARK}1 main.conf`,
    'upstream api { server 127.0.0.1:4000; }',
    'upstream empty { }',
    'server {',
    '  listen 443 ssl;',
    '  server_name b.example.com a.example.com _;',
    '  location / { proxy_pass http://api; }',
    '  location /ws { if ($x) { proxy_pass http://127.0.0.1:5000; } }',
    '  location /g { grpc_pass grpc://127.0.0.1:6000; }',
    '  location /none { return 404; }',
    '}',
    'server {',
    '  listen 80;',
    '  server_name a.example.com;',
    '  location / { proxy_pass http://api; }',
    '}',
    END_MARK,
    `${SITE_MARK}0 off.conf`,
    'server { listen 8443; server_name plain.example.com; location /a { proxy_pass http://127.0.0.1:7000; } }',
    'server { listen [::]:443; server_name v6.example.com; proxy_pass http://127.0.0.1:7001; }',
    'server { server_name nopass.example.com; }',
    'server;',
    'server { listen; server_name bare-listen.example.com; }',
    END_MARK,
  ].join('\n');

  it('lists every site with its distinct domain count', () => {
    const { sites } = parsePortMap(dump);
    expect(sites).toEqual([
      { name: 'main.conf', enabled: true, domain_count: 2 },
      { name: 'off.conf', enabled: false, domain_count: 2 },
    ]);
  });

  it('dedupes repeated routes, sorts by domain then location and flags tls per domain', () => {
    const { routes } = parsePortMap(dump);
    const summary = routes.map((r) => `${r.domain}${r.location}->${r.port}:${r.tls}:${r.enabled}`);
    expect(summary).toEqual([
      'a.example.com/->4000:true:true',
      'a.example.com/g->6000:true:true',
      'a.example.com/ws->5000:true:true',
      'b.example.com/->4000:true:true',
      'b.example.com/g->6000:true:true',
      'b.example.com/ws->5000:true:true',
      'plain.example.com/a->7000:false:false',
      'v6.example.com/->7001:true:false',
    ]);
    expect(routes[0]).toMatchObject({ site: 'main.conf', target: 'http://api', host: '127.0.0.1' });
  });

  it('returns empty lists for an empty dump', () => {
    expect(parsePortMap('')).toEqual({ sites: [], routes: [] });
  });
});
