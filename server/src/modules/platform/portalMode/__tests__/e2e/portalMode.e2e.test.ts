import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

const SET = gql`
  mutation ($key: String!, $mode: PortalModeState!, $note: String) {
    setPortalMode(key: $key, mode: $mode, note: $note) { key mode note }
  }
`;
const PUBLIC = gql`query ($key: String!) { portalMode(key: $key) { key mode } }`;

describe('portalMode e2e', () => {
  it('lets anyone read a public portal mode (defaults to LIVE)', async () => {
    const anon = server.client();
    const res: any = await anon.request(PUBLIC, { key: 'tech' });
    expect(res.portalMode.mode).toBe('LIVE');
  });

  it('forbids a normal user from listing or setting modes', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(gql`query { portalModes { key } }`)).rejects.toThrow();
    await expect(user.request(SET, { key: 'tech', mode: 'MAINTENANCE' })).rejects.toThrow();
  });

  it('drives the full maintenance ↔ development ↔ live flow', async () => {
    const tech = server.client(signToken({ roles: ['TECH_MANAGER'] }));
    const anon = server.client();

    const list: any = await tech.request(gql`query { portalModes { key mode url } }`);
    expect(list.portalModes.length).toBeGreaterThan(10);
    // Every portal exposes a public URL (shown as a link on the Maintenance page).
    expect(list.portalModes.every((p: any) => /^https?:\/\//.test(p.url))).toBe(true);
    expect(list.portalModes.find((p: any) => p.key === 'tech').url).toContain('tech.duncit.com');

    let res: any = await tech.request(SET, { key: 'crm', mode: 'MAINTENANCE', note: 'db migration' });
    expect(res.setPortalMode.mode).toBe('MAINTENANCE');
    expect(res.setPortalMode.note).toBe('db migration');
    expect((await anon.request<any>(PUBLIC, { key: 'crm' })).portalMode.mode).toBe('MAINTENANCE');

    // Switching to development is mutually exclusive (single enum).
    res = await tech.request(SET, { key: 'crm', mode: 'DEVELOPMENT' });
    expect(res.setPortalMode.mode).toBe('DEVELOPMENT');
    expect((await anon.request<any>(PUBLIC, { key: 'crm' })).portalMode.mode).toBe('DEVELOPMENT');

    res = await tech.request(SET, { key: 'crm', mode: 'LIVE' });
    expect((await anon.request<any>(PUBLIC, { key: 'crm' })).portalMode.mode).toBe('LIVE');
  });

  it('rejects an unknown portal key', async () => {
    const tech = server.client(signToken({ roles: ['TECH_MANAGER'] }));
    await expect(tech.request(SET, { key: 'ghost-portal', mode: 'MAINTENANCE' })).rejects.toThrow();
  });
});
