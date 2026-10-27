import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { appBuild } from '../mocks/app-builds.mock';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
vi.mock('@duncit/table', async (io) => {
  const actual = await io<typeof import('@duncit/table')>();
  const { ops: o } = await import('../mocks/ops');
  return { ...actual, useApolloTableFetch: () => async () => ({ rows: o.tableRows, total: o.tableRows.length }) };
});

import AppBuildsPage from '../../src/pages/app-builds';

beforeEach(() => {
  resetOps();
  ops.q = {
    AppBuildTriggerConfig: {
      data: {
        appBuildTriggerConfig: {
          configured: true,
          repository: 'org/repo',
          production_ref: 'main',
          staging_ref: 'staging',
          reports_to: 'https://api.example.test',
        },
      },
    },
  };
});

const nameless = (over: Parameters<typeof appBuild>[0] = {}) =>
  appBuild({ build_name: '', build_no: 'AND-0777', ...over });

const mountRow = async (row = nameless()) => {
  ops.tableRows = [row];
  renderWithProviders(<AppBuildsPage platform="ANDROID" />);
  return (await screen.findByText(row.build_no)).closest('[role="row"]') as HTMLElement;
};

describe('App builds table / a build with no file name', () => {
  it('names the build by its number in the delete confirmation', async () => {
    ops.confirm.mockResolvedValue(false);
    const row = await mountRow();

    fireEvent.click(within(row).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(ops.confirm.mock.calls[0][0].message).toContain('AND-0777');
  });

  it('reports a delete refused with text rather than an Error', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.DeleteAppBuild = vi.fn().mockRejectedValue('locked by a release');
    const row = await mountRow();

    fireEvent.click(within(row).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('locked by a release'));
  });

  it('names the build by its number when pushing it to Google Play', async () => {
    ops.confirm.mockResolvedValue(false);
    const row = await mountRow();

    fireEvent.click(within(row).getByTestId('app-builds-play-internal-push'));

    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(ops.confirm.mock.calls[0][0].title).toContain('AND-0777');
    expect(mutation('PushAppBuildToPlayStore')).not.toHaveBeenCalled();
  });
});
