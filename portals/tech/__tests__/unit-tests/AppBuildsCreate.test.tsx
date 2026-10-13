import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { appBuild, appStoreRelease, playRelease } from '../mocks/app-builds.mock';

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
  ops.tableRows = [appBuild()];
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

const mount = async (platform: 'ANDROID' | 'IOS' = 'ANDROID', first = 'duncit-2.4.0.apk') => {
  renderWithProviders(<AppBuildsPage platform={platform} />);
  return (await screen.findByText(first)).closest('[role="row"]') as HTMLElement;
};

describe('Create build dialog', () => {
  const open = async () => {
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Create build' }));
    return screen.findByRole('dialog');
  };

  it('queues a build with the production ref and both Android artifacts', async () => {
    ops.mut.TriggerAppBuild = vi.fn().mockResolvedValue({ data: { triggerAppBuild: { build: { build_no: 'AND-0102' } } } });
    const dialog = await open();
    expect(within(dialog).getByLabelText('Branch')).toHaveValue('main');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create build' }));
    await waitFor(() => expect(mutation('TriggerAppBuild')).toHaveBeenCalled());
    expect(mutation('TriggerAppBuild').mock.calls[0][0].variables.input).toEqual({
      platform: 'ANDROID',
      app_env: 'PRODUCTION',
      artifacts: ['APK', 'AAB'],
      submit_to_play_store: false,
      ref: 'main',
    });
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledWith(expect.stringContaining('AND-0102')));
  });

  it('follows the environment for the default branch until the operator edits it', async () => {
    const dialog = await open();
    fireEvent.mouseDown(within(dialog).getByLabelText('Server and database'));
    fireEvent.click(await screen.findByRole('option', { name: 'Staging' }));
    await waitFor(() => expect(within(dialog).getByLabelText('Branch')).toHaveValue('staging'));
  });

  it('rejects a malformed ref and an empty artifact list', async () => {
    const dialog = await open();
    fireEvent.change(within(dialog).getByLabelText('Branch'), { target: { value: '../etc' } });
    for (const box of within(dialog).getAllByRole('checkbox', { name: /^(APK|AAB)$/ })) fireEvent.click(box);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create build' }));
    expect(await within(dialog).findByText('That is not a valid branch or tag name.')).toBeInTheDocument();
    expect(within(dialog).getByText('Pick at least one artifact to build.')).toBeInTheDocument();
    expect(mutation('TriggerAppBuild')).not.toHaveBeenCalled();
  });

  it('forces production and AAB when submitting to Google Play', async () => {
    const dialog = await open();
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'APK' }));
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Submit AAB to Google Play' }));
    await waitFor(() => expect(within(dialog).getByRole('checkbox', { name: 'AAB' })).toBeChecked());
  });

  it('warns and disables Create when GitHub is not configured', async () => {
    ops.q.AppBuildTriggerConfig = {
      data: { appBuildTriggerConfig: { configured: false, repository: '', production_ref: '', staging_ref: '', reports_to: '' } },
    };
    const dialog = await open();
    expect(within(dialog).getByRole('alert')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Create build' })).toBeDisabled();
  });

  it('shows a failed trigger and keeps the dialog open', async () => {
    ops.mut.TriggerAppBuild = vi.fn().mockRejectedValue(new Error('dispatch refused'));
    const dialog = await open();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create build' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('dispatch refused'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
