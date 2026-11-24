import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { appBuild } from '../mocks/app-builds.mock';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
const fetchArgs = vi.hoisted(() => ({ document: null as unknown, variables: null as unknown }));
vi.mock('@duncit/table', async (io) => {
  const actual = await io<typeof import('@duncit/table')>();
  const { ops: o } = await import('../mocks/ops');
  return {
    ...actual,
    useApolloTableFetch: (_client: unknown, document: unknown, _field: string, options: { extraVariables: unknown }) => {
      fetchArgs.document = document;
      fetchArgs.variables = options.extraVariables;
      return async () => ({ rows: o.tableRows, total: o.tableRows.length });
    },
  };
});

import AppBuildsPage from '../../src/pages/app-builds';
import { APP_BUILDS_TABLE_CRM } from '../../src/pages/app-builds/queries';

/** Tech → App Builds → Duncit CRM: the internal CRM app's builds, beside the member app's. */

beforeEach(() => {
  resetOps();
  ops.tableRows = [appBuild({ build_name: 'duncit-crm-android-v1.0.0.apk' })];
  ops.q = {
    AppBuildTriggerConfig: {
      data: {
        appBuildTriggerConfig: { configured: true, repository: 'org/repo', production_ref: 'main', staging_ref: 'staging', reports_to: 'https://api.example.test' },
      },
    },
  };
});

describe('Duncit CRM builds', () => {
  it('lists only CRM builds, under its own title, with no store column', async () => {
    renderWithProviders(<AppBuildsPage platform="ANDROID" app="CRM" />);
    expect(await screen.findByRole('heading', { name: 'Duncit CRM Builds' })).toBeInTheDocument();
    expect(fetchArgs.document).toBe(APP_BUILDS_TABLE_CRM);
    expect(fetchArgs.variables).toEqual({ platform: 'ANDROID', app_env: null });
    expect(screen.queryByRole('columnheader', { name: /Google Play/i })).toBeNull();
  });

  it('creates a CRM build: an APK, never for a store, with no artifact or Play choices', async () => {
    ops.mut.TriggerAppBuild = vi.fn().mockResolvedValue({ data: { triggerAppBuild: { build: { build_no: 'DUN-BLD-9' } } } });
    renderWithProviders(<AppBuildsPage platform="ANDROID" app="CRM" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Create build' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByRole('checkbox', { name: 'AAB' })).toBeNull();
    expect(within(dialog).queryByRole('checkbox', { name: /Google Play/i })).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create build' }));
    await waitFor(() => expect(mutation('TriggerAppBuild')).toHaveBeenCalled());
    expect(mutation('TriggerAppBuild').mock.calls[0][0].variables.input).toEqual({
      platform: 'ANDROID',
      app: 'CRM',
      app_env: 'PRODUCTION',
      artifacts: ['APK'],
      submit_to_play_store: false,
      ref: 'main',
    });
  });
});
