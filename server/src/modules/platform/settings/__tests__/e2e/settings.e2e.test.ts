import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

const CREATE_FLAG = gql`
  mutation Create($input: CreateFeatureFlagInput!) {
    createFeatureFlag(input: $input) {
      id
      key
      enabled
    }
  }
`;

describe('settings e2e', () => {
  it('exposes public app settings and branding without auth', async () => {
    const pub = server.client();
    const settings = await pub.request<{ publicAppSettings: { date_format: string } }>(
      gql`query { publicAppSettings { date_format time_format } }`
    );
    expect(settings.publicAppSettings.date_format).toBeTruthy();

    const branding = await pub.request<{ branding: { app_name: string } }>(
      gql`query { branding { app_name } }`
    );
    expect(branding.branding.app_name).toBe('Duncit');
  });

  it('lets a super admin create a feature flag but forbids a normal user', async () => {
    const admin = server.client(signToken({ roles: ['SUPER_ADMIN'] }));
    const created = await admin.request<{ createFeatureFlag: { key: string } }>(CREATE_FLAG, {
      input: { key: 'beta_mode', name: 'Beta Mode', enabled: true },
    });
    expect(created.createFeatureFlag.key).toBe('beta_mode');

    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(CREATE_FLAG, { input: { key: 'x', name: 'x' } })).rejects.toThrow();
  });
});
