import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { appBuild } from '../mocks/app-builds.mock';
import BuildFacts from '../../src/pages/app-builds/BuildFacts';
import BuildProgress from '../../src/pages/app-builds/BuildProgress';
import { makeAppBuildColumns } from '../../src/pages/app-builds/appBuildColumns';
import {
  makeEnvOptions,
  makeRenderEnv,
  makeRenderLinks,
  makeRenderSlack,
  makeRenderStatus,
  makeRenderTriggeredBy,
  renderBuild,
  renderCommit,
} from '../../src/pages/app-builds/cells';
import {
  changesLabel,
  durationLabel,
  isStaleRunning,
  runningMinutes,
  sizeLabel,
  type AppBuildRow,
} from '../../src/pages/app-builds/queries';

const NOW = new Date('2026-01-01T12:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

const statusLabels = {
  QUEUED: 'Queued',
  RUNNING: 'Running',
  SUCCESS: 'Success',
  FAILED: 'Failed',
  stale: 'Looks stuck',
  elapsed: (minutes: string) => `Running for ${minutes} min`,
};

describe('build size, changes and duration labels', () => {
  it('shows a dash for a build with no sized artifact', () => {
    expect(sizeLabel(appBuild({ artifacts: [] }))).toBe('—');
    expect(
      sizeLabel(appBuild({ artifacts: [{ kind: 'APK', name: 'a', url: '', file_id: '', size_mb: null, error: 'x' }] })),
    ).toBe('—');
  });

  it('shows one size alone, and several as kind and size', () => {
    const [apk, aab] = appBuild().artifacts;
    expect(sizeLabel(appBuild({ artifacts: [apk] }))).toBe('40.2 MB');
    expect(sizeLabel(appBuild({ artifacts: [apk, aab] }))).toBe('APK 40.2 MB · AAB 30.0 MB');
    // An artifact that never stored has no size and is left out of the list.
    expect(sizeLabel(appBuild({ artifacts: [apk, { ...aab, size_mb: null }] }))).toBe('40.2 MB');
  });

  it('reads the change range, with zero for a count the runner did not report', () => {
    expect(changesLabel(appBuild({ files_changed: null }))).toBe('—');
    expect(changesLabel(appBuild())).toBe('+20 / -5 (3 files)');
    expect(changesLabel(appBuild({ insertions: null, deletions: null }))).toBe('+0 / -0 (3 files)');
  });

  it('reads the duration as minutes and seconds, or a dash', () => {
    expect(durationLabel(appBuild({ duration_seconds: null }))).toBe('—');
    expect(durationLabel(appBuild({ duration_seconds: 754 }))).toBe('12m 34s');
  });
});

describe('live build timing', () => {
  it('counts whole minutes since the build was created, never below zero, and zero without a start', () => {
    expect(runningMinutes(appBuild({ created_at: '2026-01-01T11:53:30.000Z' }))).toBe(6);
    expect(runningMinutes(appBuild({ created_at: '2026-01-01T12:30:00.000Z' }))).toBe(0);
    expect(runningMinutes(appBuild({ created_at: null }))).toBe(0);
  });

  it('calls a live build stale only past 130 minutes, and never a finished or undated one', () => {
    const running = (created_at: string | null, status: AppBuildRow['status'] = 'RUNNING') =>
      isStaleRunning(appBuild({ status, created_at }));

    expect(running('2026-01-01T09:49:00.000Z')).toBe(true);
    expect(running('2026-01-01T09:51:00.000Z')).toBe(false);
    expect(running(null)).toBe(false);
    expect(running('2026-01-01T08:00:00.000Z', 'SUCCESS')).toBe(false);
  });
});

describe('BuildFacts', () => {
  const facts = (build: AppBuildRow) => {
    renderWithProviders(<BuildFacts build={build} />);
    return (label: string) => screen.getByText(label).nextElementSibling?.textContent;
  };

  it('lists a fully reported build', () => {
    const fact = facts(appBuild());

    expect(fact('Version')).toBe('2.4.0');
    expect(fact('Branch')).toBe('main');
    expect(fact('Commit')).toBe('abcdef1234567');
    expect(fact('Reported by')).toBe('ci');
    expect(fact('Slack')).toBe('Posted · #builds');
  });

  it('shows a dash for everything the runner did not report', () => {
    const fact = facts(
      appBuild({
        version: '',
        bundle_id: '',
        created_at: null,
        branch: '',
        commit_sha: '',
        reported_by: '',
        slack_ts: null,
        slack_error: null,
        requested_artifacts: undefined,
      } as Partial<AppBuildRow>),
    );

    expect(fact('Version')).toBe('—');
    expect(fact('Bundle ID')).toBe('—');
    expect(fact('Branch')).toBe('—');
    expect(fact('Commit')).toBe('—');
    expect(fact('Reported by')).toBe('—');
    expect(screen.queryByText('Requested')).not.toBeInTheDocument();
  });

  it('says why Slack was skipped, or that it was simply not posted', () => {
    const { unmount } = renderWithProviders(<BuildFacts build={appBuild({ slack_ts: null, slack_error: 'channel_not_found' })} />);
    expect(screen.getByText('channel_not_found')).toBeInTheDocument();
    unmount();

    renderWithProviders(<BuildFacts build={appBuild({ slack_ts: null, slack_error: undefined } as Partial<AppBuildRow>)} />);
    expect(screen.getByText('Skipped')).toBeInTheDocument();
  });

  it('shows an empty Slack channel after a post without one', () => {
    const fact = facts(appBuild({ slack_channel: undefined } as Partial<AppBuildRow>));
    expect(fact('Slack')).toBe('Posted · ');
  });
});

describe('BuildFacts / who triggered it', () => {
  it('says which stack the build talks to', () => {
    const { unmount } = renderWithProviders(<BuildFacts build={appBuild({ app_env: 'STAGING' })} />);
    expect(screen.getByText('Environment').nextElementSibling?.textContent).toBe('Staging');
    unmount();

    renderWithProviders(<BuildFacts build={appBuild({ app_env: 'PRODUCTION' })} />);
    expect(screen.getByText('Environment').nextElementSibling?.textContent).toBe('Production');
  });

  it('names the person and the way for a portal build, and only the way for a merge', () => {
    const { unmount } = renderWithProviders(<BuildFacts build={appBuild()} />);
    expect(screen.getByText('Started by').nextElementSibling).toHaveTextContent('ops@example.test · Tech portal');
    unmount();

    renderWithProviders(<BuildFacts build={appBuild({ triggered_by: '', trigger_source: 'PUSH' })} />);
    expect(screen.getByText('Started by').nextElementSibling?.textContent).toBe('Merge to main');
  });
});

describe('BuildProgress', () => {
  it('draws nothing for a build that reported no stages', () => {
    const { container } = renderWithProviders(<BuildProgress build={appBuild({ stages: [] })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('treats a missing stage list as no stages', () => {
    const { container } = renderWithProviders(
      <BuildProgress build={appBuild({ stages: undefined } as Partial<AppBuildRow>)} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('marks the last stage as running only while the build is live', () => {
    renderWithProviders(<BuildProgress build={appBuild({ status: 'RUNNING', created_at: '2026-01-01T11:50:00.000Z' })} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('3 min')).toBeInTheDocument();
    expect(screen.queryByText(/ended/i)).not.toBeInTheDocument();
  });

  it('shows no running stage once the build has stopped', () => {
    renderWithProviders(<BuildProgress build={appBuild({ status: 'SUCCESS' })} />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText('Checkout')).toBeInTheDocument();
  });
});

describe('build cells', () => {
  it('names a build by its file, or a dash with the number below', () => {
    const { unmount } = render(renderBuild(appBuild()));
    expect(screen.getByText('duncit-2.4.0.apk')).toHaveAttribute('title', 'duncit-2.4.0.apk');
    unmount();

    render(renderBuild(appBuild({ build_name: '' })));
    expect(screen.getByText('—')).toHaveAttribute('title', 'AND-0101');
    expect(screen.getByText('AND-0101')).toBeInTheDocument();
  });

  it('shows the short commit and its subject, or a dash', () => {
    const { unmount } = render(renderCommit(appBuild()));
    expect(screen.getByText('abcdef1')).toBeInTheDocument();
    expect(screen.getByText('Fix login')).toBeInTheDocument();
    unmount();

    render(renderCommit(appBuild({ commit_sha: '', commits: [] })));
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('Fix login')).not.toBeInTheDocument();
  });

  it('colours staging, labels both environments, and keeps an unknown one as it is', () => {
    const renderEnv = makeRenderEnv({ PRODUCTION: 'Production', STAGING: 'Staging' });
    const { unmount } = render(renderEnv(appBuild({ app_env: 'STAGING' })));
    expect(screen.getByText('Staging').closest('.MuiChip-root')).toHaveClass('MuiChip-colorWarning');
    unmount();
    const second = render(renderEnv(appBuild({ app_env: 'PRODUCTION' })));
    expect(screen.getByText('Production').closest('.MuiChip-root')).toHaveClass('MuiChip-colorDefault');
    second.unmount();

    render(renderEnv(appBuild({ app_env: 'QA' as AppBuildRow['app_env'] })));
    expect(screen.getByText('QA')).toBeInTheDocument();
  });

  it('lists both environments in the filter, falling back to their keys', () => {
    expect(makeEnvOptions({ PRODUCTION: 'Production', STAGING: 'Staging' })).toEqual([
      { value: 'PRODUCTION', label: 'Production' },
      { value: 'STAGING', label: 'Staging' },
    ]);
  });

  it('shows who triggered a build and how, with a dash when nobody is recorded', () => {
    const renderTriggered = makeRenderTriggeredBy({ PUSH: 'Push', PORTAL: 'Portal' });
    const { unmount } = render(renderTriggered(appBuild()));
    expect(screen.getByText('ops@example.test')).toBeInTheDocument();
    expect(screen.getByText('Portal')).toBeInTheDocument();
    unmount();
    const second = render(renderTriggered(appBuild({ triggered_by: '', trigger_source: 'PUSH' })));
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('Push')).toBeInTheDocument();
    second.unmount();

    render(renderTriggered(appBuild({ trigger_source: 'CRON' as AppBuildRow['trigger_source'] })));
    expect(screen.getByText('CRON')).toBeInTheDocument();
  });

  it('shows Slack as posted, or skipped with the reason as its tooltip', () => {
    const renderSlack = makeRenderSlack('Posted', 'Skipped');
    const { unmount } = render(renderSlack(appBuild()));
    expect(screen.getByText('Posted')).toBeInTheDocument();
    unmount();
    const second = render(renderSlack(appBuild({ slack_ts: null, slack_error: 'no token' })));
    expect(screen.getByText('Skipped')).toBeInTheDocument();
    second.unmount();

    render(renderSlack(appBuild({ slack_ts: null, slack_error: null })));
    expect(screen.getByText('Skipped')).toBeInTheDocument();
  });

  it('shows a finished build as its status, with the failure as the tooltip', () => {
    const renderStatus = makeRenderStatus(statusLabels);
    const { unmount } = render(renderStatus(appBuild({ status: 'FAILED', error_message: 'Compile error' })));
    expect(screen.getByText('Failed').closest('.MuiChip-root')).toHaveClass('MuiChip-colorError');
    unmount();
    const second = render(renderStatus(appBuild({ status: 'SUCCESS' })));
    expect(screen.getByText('Success').closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
    second.unmount();

    const { container } = render(renderStatus(appBuild({ status: 'ABORTED' as AppBuildRow['status'] })));
    // A status this client has no colour for is shown as an error rather than as nothing.
    expect(container.querySelector('.MuiChip-root')).toHaveClass('MuiChip-colorError');
  });

  it('shows a live build with its elapsed time, and the stage in the tooltip when there is one', () => {
    const renderStatus = makeRenderStatus(statusLabels);
    const { unmount } = render(renderStatus(appBuild({ status: 'RUNNING', created_at: '2026-01-01T11:54:00.000Z', stage: 'Compile' })));
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    unmount();

    render(renderStatus(appBuild({ status: 'QUEUED', created_at: '2026-01-01T11:54:00.000Z', stage: '' })));
    expect(screen.getByText('Queued')).toBeInTheDocument();
  });

  it('shows a live build older than 130 minutes as stale', () => {
    const renderStatus = makeRenderStatus(statusLabels);
    render(renderStatus(appBuild({ status: 'RUNNING', created_at: '2026-01-01T08:00:00.000Z' })));
    expect(screen.getByText('Running').closest('.MuiChip-root')).toHaveClass('MuiChip-colorWarning');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  const linkLabels = {
    download: (kind: string) => `Download ${kind}`,
    run: 'Open run',
    delete: 'Delete build',
    noArtifact: 'No file stored',
  };

  it('offers each stored file and the run, and says why a file is missing', () => {
    const [apk, aab] = appBuild().artifacts;
    const onDelete = vi.fn();
    const row = appBuild({
      artifacts: [apk, { ...aab, url: '', error: 'upload failed' }, { ...aab, kind: 'IPA', url: '', error: '' }],
    });
    render(makeRenderLinks(linkLabels, onDelete)(row));

    expect(screen.getByRole('link', { name: 'Download APK' })).toHaveAttribute('href', apk.url);
    expect(screen.getByRole('link', { name: 'Open run' })).toHaveAttribute('href', row.workflow_run_url);
    expect(screen.getAllByRole('img')).toHaveLength(2);
    screen.getByRole('button', { name: 'Delete build' }).click();
    expect(onDelete).toHaveBeenCalledWith(row);
  });

  it('leaves the run link out when the build has none', () => {
    render(makeRenderLinks(linkLabels, vi.fn())(appBuild({ workflow_run_url: '' })));
    expect(screen.queryByRole('link', { name: 'Open run' })).not.toBeInTheDocument();
  });
});

describe('app build columns', () => {
  const columns = makeAppBuildColumns(
    (key: string) => key,
    'ANDROID',
    vi.fn(),
    vi.fn() as never,
    vi.fn() as never,
  );
  const getter = (field: string) => {
    const column = columns.find((c) => c.field === field);
    return (row: AppBuildRow) => (column as unknown as { valueGetter: (r: AppBuildRow) => unknown }).valueGetter(row);
  };

  it('sorts and filters a build by its file, falling back to its number', () => {
    expect(getter('build_name')(appBuild())).toBe('duncit-2.4.0.apk');
    expect(getter('build_name')(appBuild({ build_name: '' }))).toBe('AND-0101');
  });

  it('offers the App Store push column on the iOS table instead of the Play one', () => {
    const android = columns.map((c) => c.field);
    const ios = makeAppBuildColumns((key: string) => key, 'IOS', vi.fn(), vi.fn() as never, vi.fn() as never).map(
      (c) => c.field,
    );

    expect(ios).toHaveLength(android.length);
    expect(ios).not.toEqual(android);
  });

  it('shows a dash for a build nobody triggered', () => {
    expect(getter('triggered_by')(appBuild())).toBe('ops@example.test');
    expect(getter('triggered_by')(appBuild({ triggered_by: '' }))).toBe('—');
  });
});

