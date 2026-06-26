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
    const settings = await pub.request<{ publicAppSettings: { date_format: string; time_zone: string } }>(
      gql`query { publicAppSettings { date_format time_format time_zone } }`
    );
    expect(settings.publicAppSettings.date_format).toBeTruthy();
    expect(settings.publicAppSettings.time_zone).toBe('Asia/Kolkata');

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

  it('runs the feature-flag lifecycle (toggle, public read, delete) over HTTP', async () => {
    const admin = server.client(signToken({ roles: ['SUPER_ADMIN'] }));
    const created: any = await admin.request(CREATE_FLAG, { input: { key: 'gamma', name: 'Gamma', enabled: false } });
    const id = created.createFeatureFlag.id;

    const toggled: any = await admin.request(
      gql`mutation ($id: ID!) { setFeatureFlag(flag_id: $id, enabled: true) { id enabled } }`,
      { id }
    );
    expect(toggled.setFeatureFlag.enabled).toBe(true);

    const pub: any = await server.client().request(gql`query { publicFeatureFlags { key enabled } }`);
    expect(pub.publicFeatureFlags.find((f: any) => f.key === 'gamma')?.enabled).toBe(true);

    const del: any = await admin.request(gql`mutation ($id: ID!) { deleteFeatureFlag(flag_id: $id) }`, { id });
    expect(del.deleteFeatureFlag).toBe(true);
  });

  it('updates app settings + branding and forbids non-admins', async () => {
    const admin = server.client(signToken({ roles: ['SUPER_ADMIN'] }));
    const settings: any = await admin.request(
      gql`mutation ($i: UpdateAppSettingsInput!) { updateAppSettings(input: $i) { date_format time_zone } }`,
      { i: { date_format: 'yyyy-MM-dd', time_zone: 'Asia/Dubai' } }
    );
    expect(settings.updateAppSettings.date_format).toBe('yyyy-MM-dd');
    expect(settings.updateAppSettings.time_zone).toBe('Asia/Dubai');

    const branding: any = await admin.request(
      gql`mutation ($i: UpdateBrandingInput!) { updateBranding(input: $i) { support_phone } }`,
      { i: { support_phone: '+911234567890' } }
    );
    expect(branding.updateBranding.support_phone).toBe('+911234567890');

    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(
      user.request(gql`mutation ($i: UpdateBrandingInput!) { updateBranding(input: $i) { app_name } }`, { i: { app_name: 'Hax' } })
    ).rejects.toThrow();
  });

  it('no longer exposes the removed environment-variable fields', async () => {
    const admin = server.client(signToken({ roles: ['SUPER_ADMIN'] }));
    await expect(admin.request(gql`query { environmentVariables { key } }`)).rejects.toThrow();
  });
});
