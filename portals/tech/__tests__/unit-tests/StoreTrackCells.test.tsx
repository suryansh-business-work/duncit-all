import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { appBuild, appStoreRelease, playRelease } from '../mocks/app-builds.mock';
import { makeAppStoreColumn } from '../../src/pages/app-builds/appStoreCells';
import { makePlayStoreColumn } from '../../src/pages/app-builds/playStoreCells';
import { makeAppBuildColumns } from '../../src/pages/app-builds/appBuildColumns';
import type { AppBuildRow } from '../../src/pages/app-builds/queries';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key} ${Object.values(options.vars).join('|')}` : key;

const ipa = { kind: 'IPA' as const, name: 'a.ipa', url: 'https://files.example.test/a.ipa', file_id: 'f', size_mb: 80, error: '' };
const iosBuild = (over: Partial<AppBuildRow> = {}) =>
  appBuild({ platform: 'IOS', artifacts: [ipa], build_number: '88', app_env: 'PRODUCTION', status: 'SUCCESS', ...over });

type CellColumn = { cellRenderer: (row: AppBuildRow) => React.ReactNode };

const onPush = vi.fn().mockResolvedValue(undefined);

beforeEach(() => onPush.mockClear());

describe('App Store column', () => {
  const column = makeAppStoreColumn(t as never, onPush) as unknown as CellColumn;

  it('offers a push to each track of a signed build, and sends the one pressed', async () => {
    const row = iosBuild();
    render(column.cellRenderer(row));

    fireEvent.click(screen.getByTestId('app-builds-app-store-testflight-push'));
    fireEvent.click(screen.getByTestId('app-builds-app-store-app_store-push'));

    await waitFor(() => expect(onPush).toHaveBeenCalledTimes(2));
    expect(onPush).toHaveBeenNthCalledWith(1, row, 'TESTFLIGHT');
    expect(onPush).toHaveBeenNthCalledWith(2, row, 'APP_STORE');
  });

  it('shows a track that landed as done, with who pushed it and when', () => {
    render(
      column.cellRenderer(
        iosBuild({
          app_store_releases: [
            appStoreRelease({ track: 'TESTFLIGHT', status: 'RELEASED' }),
            appStoreRelease({ track: 'APP_STORE', status: 'RELEASED', started_at: '2026-01-02T10:00:00.000Z', finished_at: null }),
          ],
        }),
      ),
    );

    expect(screen.getByTestId('app-builds-app-store-testflight-released')).toBeInTheDocument();
    expect(screen.getByTestId('app-builds-app-store-app_store-released')).toBeInTheDocument();
  });

  it('shows a push in flight with its stage, and a failed one that can be retried or read', () => {
    render(
      column.cellRenderer(
        iosBuild({
          app_store_releases: [
            appStoreRelease({ track: 'TESTFLIGHT', status: 'PUSHING', stage: 'Processing', finished_at: null }),
            appStoreRelease({ track: 'APP_STORE', status: 'FAILED', error: 'Missing compliance', log: ['step 1'] } as never),
          ],
        }),
      ),
    );

    expect(screen.getByTestId('app-builds-app-store-testflight-pushing')).toBeInTheDocument();
    expect(screen.getByTestId('app-builds-app-store-app_store-push')).toBeInTheDocument();
    expect(screen.getByTestId('app-builds-app-store-app_store-logs')).toBeInTheDocument();
  });

  it('explains why a build that cannot be pushed has no button', () => {
    render(column.cellRenderer(iosBuild({ build_number: '' })));
    expect(screen.getByTestId('app-builds-app-store-testflight-push')).toBeDisabled();
  });
});

describe('Google Play column', () => {
  const column = makePlayStoreColumn(t as never, onPush) as unknown as CellColumn;

  it('shows a push in flight to a track', () => {
    render(
      column.cellRenderer(
        appBuild({ play_releases: [playRelease({ track: 'INTERNAL', status: 'PUSHING', finished_at: null, started_at: new Date().toISOString() })] }),
      ),
    );
    expect(screen.getByTestId('app-builds-play-internal-pushing')).toBeInTheDocument();
  });
});

describe('app build columns / hidden fields', () => {
  const columns = makeAppBuildColumns(t as never, 'ANDROID', vi.fn(), vi.fn() as never, vi.fn() as never);
  const getter = (field: string) => {
    const column = columns.find((c) => c.field === field);
    return (row: AppBuildRow) => (column as unknown as { valueGetter: (r: AppBuildRow) => unknown }).valueGetter(row);
  };

  it('gives the branch and the reporter of a build for sorting and export, with a dash when unknown', () => {
    expect(getter('branch')(appBuild())).toBe('main');
    expect(getter('branch')(appBuild({ branch: '' }))).toBe('—');
    expect(getter('reported_by')(appBuild())).toBe('ci');
    expect(getter('reported_by')(appBuild({ reported_by: '' }))).toBe('—');
  });
});
