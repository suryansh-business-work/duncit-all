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
import { createBuildSchema, defaultRefFor } from '../../src/pages/app-builds/create-build/create-build.types';

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

const open = async () => {
  renderWithProviders(<AppBuildsPage platform="ANDROID" />);
  await screen.findByText('duncit-2.4.0.apk');
  fireEvent.click(screen.getByRole('button', { name: 'Create build' }));
  return screen.findByRole('dialog');
};

describe('Create build dialog / edges', () => {
  it('shows a spinner and a disabled Create button until the GitHub config is read', async () => {
    ops.q.AppBuildTriggerConfig = { loading: true };
    const dialog = await open();

    expect(within(dialog).getByRole('progressbar')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Create build' })).toBeDisabled();
  });

  it('keeps a hand-typed branch when the environment changes afterwards', async () => {
    const dialog = await open();
    fireEvent.change(within(dialog).getByLabelText('Branch'), { target: { value: 'release/2.5' } });

    fireEvent.mouseDown(within(dialog).getByLabelText('Server and database'));
    fireEvent.click(await screen.findByRole('option', { name: 'Staging' }));

    await waitFor(() => expect(within(dialog).getByLabelText('Server and database')).toHaveTextContent('Staging'));
    expect(within(dialog).getByLabelText('Branch')).toHaveValue('release/2.5');
  });

  it('puts an unticked artifact back in the platform order', async () => {
    const dialog = await open();
    const apk = within(dialog).getByRole('checkbox', { name: 'APK' });
    fireEvent.click(apk);
    expect(apk).not.toBeChecked();

    fireEvent.click(apk);

    expect(apk).toBeChecked();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create build' }));
    await waitFor(() => expect(mutation('TriggerAppBuild')).toHaveBeenCalled());
    expect(mutation('TriggerAppBuild').mock.calls[0][0].variables.input.artifacts).toEqual(['APK', 'AAB']);
  });

  it('changes nothing when Google Play is switched off again', async () => {
    const dialog = await open();
    const play = within(dialog).getByRole('checkbox', { name: 'Submit AAB to Google Play' });
    fireEvent.click(play);
    await waitFor(() => expect(play).toBeChecked());

    fireEvent.click(play);

    await waitFor(() => expect(play).not.toBeChecked());
    expect(within(dialog).getByRole('checkbox', { name: 'AAB' })).toBeChecked();
    expect(within(dialog).getByRole('checkbox', { name: 'APK' })).toBeChecked();
  });

  it('shows the trigger button as busy while the build is being queued', async () => {
    let finish: (value: unknown) => void = () => undefined;
    ops.mut.TriggerAppBuild = vi.fn().mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const dialog = await open();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create build' }));

    expect(await within(dialog).findByRole('button', { name: 'Starting…' })).toBeDisabled();
    finish({ data: { triggerAppBuild: { build: { build_no: 'AND-0102' } } } });
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalled());
  });

  it('confirms a queued build even when the server names none', async () => {
    ops.mut.TriggerAppBuild = vi.fn().mockResolvedValue({ data: {} });
    const dialog = await open();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create build' }));

    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledTimes(1));
    expect(ops.notifySuccess.mock.calls[0][0]).not.toContain('AND-');
  });

  it('reports a trigger refusal that is not an Error as text', async () => {
    ops.mut.TriggerAppBuild = vi.fn().mockRejectedValue('GitHub is down');
    const dialog = await open();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create build' }));

    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('GitHub is down'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('create build schema', () => {
  const messages = {
    refFormat: 'bad ref',
    artifactsRequired: 'need one',
    playStoreRequiresAab: 'needs AAB',
    playStoreRequiresProduction: 'needs production',
  };
  const schema = createBuildSchema(messages);
  const base = { app_env: 'PRODUCTION', artifacts: ['APK', 'AAB'], submit_to_play_store: false, ref: 'main' } as const;
  const errorsOf = (values: unknown) =>
    Object.fromEntries(
      (schema.safeParse(values).error?.issues ?? []).map((issue) => [issue.path.join('.'), issue.message]),
    );

  it('accepts a production Android build with both artifacts', () => {
    expect(schema.safeParse(base).success).toBe(true);
  });

  it('refuses a Google Play push without the AAB, and one from staging', () => {
    expect(errorsOf({ ...base, submit_to_play_store: true, artifacts: ['APK'] })).toEqual({ artifacts: 'needs AAB' });
    expect(errorsOf({ ...base, submit_to_play_store: true, app_env: 'STAGING' })).toEqual({ app_env: 'needs production' });
    expect(errorsOf({ ...base, submit_to_play_store: true, app_env: 'STAGING', artifacts: ['APK'] })).toEqual({
      artifacts: 'needs AAB',
      app_env: 'needs production',
    });
  });

  it('does not check the Play rules when nothing is being pushed to Play', () => {
    expect(schema.safeParse({ ...base, app_env: 'STAGING', artifacts: ['APK'] }).success).toBe(true);
  });

  it.each(['/main', 'main/', '.hidden', 'a..b', 'has space', 'x:y'])('refuses the ref %j', (ref) => {
    expect(errorsOf({ ...base, ref })).toEqual({ ref: 'bad ref' });
  });

  it('picks the staging or production branch from the config', () => {
    const config = { production_ref: 'main', staging_ref: 'staging' };
    expect(defaultRefFor('STAGING', config)).toBe('staging');
    expect(defaultRefFor('PRODUCTION', config)).toBe('main');
  });
});
