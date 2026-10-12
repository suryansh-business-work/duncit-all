import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import {
  compareBySeverity,
  groupDependencies,
  type PackageUpdate,
} from '../../src/pages/package-updates/queries';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));

import PackageUpdatesPage from '../../src/pages/package-updates';

const pkg = (over: Partial<PackageUpdate> = {}): PackageUpdate => ({
  name: '@duncit/shell',
  path: 'packages/shell',
  private: true,
  total: 3,
  outdated: 2,
  major: 1,
  minor: 1,
  patch: 0,
  dependencies: [
    { name: 'react', kind: 'dependencies', range: '^18.0.0', latest: '19.0.0', updateType: 'MAJOR' },
    { name: 'lodash', kind: 'devDependencies', range: '^4.17.0', latest: '4.17.21', updateType: 'PATCH' },
    { name: '@duncit/ui', kind: 'dependencies', range: 'workspace:*', latest: null, updateType: 'INTERNAL' },
  ],
  ...over,
});

const report = (over: Record<string, unknown> = {}) => ({
  checkedAt: '2026-01-01T10:00:00.000Z',
  registry: 'https://registry.example.test',
  totalPackages: 2,
  totalDependencies: 5,
  uniqueDependencies: 4,
  outdated: 3,
  major: 1,
  minor: 1,
  patch: 1,
  error: null,
  packages: [
    pkg(),
    pkg({
      name: 'mweb',
      path: 'app/mweb',
      private: false,
      outdated: 0,
      major: 0,
      minor: 0,
      patch: 0,
      dependencies: [{ name: 'react', kind: 'dependencies', range: '^19.0.0', latest: '19.0.0', updateType: 'UP_TO_DATE' }],
    }),
  ],
  ...over,
});

beforeEach(() => {
  resetOps();
  ops.q = { TechPackageUpdates: { data: { techPackageUpdates: report() } } };
});

describe('Package update helpers', () => {
  it('groups one dependency across manifests, keeping the most severe update and every range', () => {
    const groups = groupDependencies(report().packages);
    const react = groups.find((g) => g.name === 'react');
    expect(react).toMatchObject({ updateType: 'MAJOR', usedIn: 2, latest: '19.0.0', ranges: '^18.0.0, ^19.0.0' });
    expect(groups[0].updateType).toBe('MAJOR');
  });

  it('orders by severity then name', () => {
    const sorted = [
      { name: 'b', updateType: 'PATCH' as const },
      { name: 'a', updateType: 'PATCH' as const },
      { name: 'z', updateType: 'MAJOR' as const },
    ].sort(compareBySeverity);
    expect(sorted.map((d) => d.name)).toEqual(['z', 'a', 'b']);
  });
});

describe('Package updates page', () => {
  it('summarises the sweep and lists manifests, with private ones marked', async () => {
    renderWithProviders(<PackageUpdatesPage />);
    const row = (await screen.findByText('@duncit/shell')).closest('[role="row"]') as HTMLElement;
    expect(within(row).getByText('packages/shell')).toBeInTheDocument();
    expect(within(row).getByText('Private')).toBeInTheDocument();
    expect(screen.getByText(/Outdated: 3/)).toBeInTheDocument();
    expect(screen.getByText(/registry.example.test/)).toBeInTheDocument();
  });

  it('opens a manifest with its dependencies, worst first', async () => {
    renderWithProviders(<PackageUpdatesPage />);
    fireEvent.click((await screen.findByText('@duncit/shell')).closest('[role="row"]') as HTMLElement);
    const dialog = await screen.findByRole('dialog');
    const rows = await within(dialog).findAllByRole('row');
    expect(within(dialog).getByText('react')).toBeInTheDocument();
    expect(within(dialog).getByText('4.17.21')).toBeInTheDocument();
    expect(rows.length).toBeGreaterThan(3);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('switches to the grouped dependency view and filters by update type', async () => {
    renderWithProviders(<PackageUpdatesPage />);
    await screen.findByText('@duncit/shell');
    fireEvent.click(screen.getByRole('tab', { name: 'By dependency' }));
    expect(await screen.findByText('react')).toBeInTheDocument();
    expect(screen.getByText('lodash')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByLabelText('Type'));
    fireEvent.click(await screen.findByRole('option', { name: 'Patch' }));
    await waitFor(() => expect(screen.queryByText('react')).not.toBeInTheDocument());
    expect(screen.getByText('lodash')).toBeInTheDocument();
  });

  it('re-checks npm, and shows the failure when it cannot', async () => {
    mutation('TechRefreshPackageUpdates').mockRejectedValueOnce(new Error('npm unreachable'));
    renderWithProviders(<PackageUpdatesPage />);
    await screen.findByText('@duncit/shell');
    fireEvent.click(screen.getByRole('button', { name: 'Check now' }));
    expect(await screen.findByText('npm unreachable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Check now' }));
    await waitFor(() => expect(mutation('TechRefreshPackageUpdates')).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('npm unreachable')).not.toBeInTheDocument());
  });

  it('warns that the registry was unreachable, and says it was never checked', async () => {
    ops.q.TechPackageUpdates = {
      data: { techPackageUpdates: report({ error: 'ETIMEDOUT', checkedAt: null, outdated: 0 }) },
    };
    renderWithProviders(<PackageUpdatesPage />);
    expect(await screen.findByText(/ETIMEDOUT/)).toBeInTheDocument();
    expect(screen.getByText(/The registry has not been asked yet/)).toBeInTheDocument();
  });

  it('shows the query error', async () => {
    ops.q.TechPackageUpdates = { error: new Error('report unreadable') };
    renderWithProviders(<PackageUpdatesPage />);
    expect(await screen.findByText('report unreadable')).toBeInTheDocument();
  });
});
