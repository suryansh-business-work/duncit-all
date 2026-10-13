import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { ops, resetOps } from '../mocks/ops';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));

import SslLiveCheckList from '../../src/pages/ssl/SslLiveCheckList';
import SslCertificatesTable from '../../src/pages/ssl/SslCertificatesTable';
import {
  compareBySeverity,
  dependencyRowSearchText,
  dependencySearchText,
  groupDependencies,
  kindLabel,
  packageSearchText,
  updateTypeLabel,
  type DependencyKind,
  type PackageUpdate,
  type UpdateType,
} from '../../src/pages/package-updates/queries';

beforeEach(() => resetOps());

describe('SslLiveCheckList', () => {
  it('shows nothing but the guard while the first read is in flight', () => {
    ops.q.SslLiveCheck = { loading: true };
    renderWithProviders(<SslLiveCheckList name="api" />);
    expect(screen.queryByTestId('ssl-live-check')).not.toBeInTheDocument();
  });

  it('shows the error message when the live check fails', () => {
    ops.q.SslLiveCheck = { error: new Error('dial tcp timed out') };
    renderWithProviders(<SslLiveCheckList name="api" />);
    expect(screen.getByText('dial tcp timed out')).toBeInTheDocument();
  });

  it('renders an empty list when the server returned no hosts', () => {
    ops.q.SslLiveCheck = { data: { sslLiveCheck: null } };
    renderWithProviders(<SslLiveCheckList name="api" />);
    expect(screen.getByTestId('ssl-live-check')).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('keeps the list on screen while a refresh is loading over existing data', () => {
    ops.q.SslLiveCheck = {
      loading: true,
      data: {
        sslLiveCheck: [
          { domain: 'a.example.test', checked: false, reachable: false, trusted: false, serving_this: false, valid_to: null, error: null },
        ],
      },
    };
    renderWithProviders(<SslLiveCheckList name="api" />);
    expect(screen.getByText('a.example.test')).toBeInTheDocument();
  });
});

const sslCert = (over: Record<string, unknown>) => ({
  name: 'cert',
  common_name: null,
  domains: ['a.example.test'],
  coverage: 'SINGLE',
  key_type: 'ECDSA',
  issuer: null,
  serial_number: 'S1',
  fingerprint_sha256: 'F',
  valid_from: '2026-01-01T00:00:00.000Z',
  valid_to: '2026-04-01T00:00:00.000Z',
  days_remaining: 50,
  renewal_due_at: '2026-03-01T00:00:00.000Z',
  authenticator: null,
  installer: null,
  production_ca: true,
  ...over,
});

describe('SslCertificatesTable search', () => {
  it('filters rows on name, hosts, key type and issuer', async () => {
    const certs = [
      sslCert({ name: 'alpha-cert', domains: ['alpha.example.test'], issuer: 'Lets Encrypt' }),
      sslCert({ name: 'beta-cert', domains: ['beta.example.test'], issuer: null, key_type: 'RSA' }),
    ];
    renderWithProviders(<SslCertificatesTable certificates={certs as never} onDetails={vi.fn()} />);
    expect(await screen.findByTestId('ssl-details-alpha-cert')).toBeInTheDocument();
    expect(screen.getByTestId('ssl-details-beta-cert')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search name, host, key type or issuer'), {
      target: { value: 'beta.example' },
    });
    await waitFor(() =>
      expect(screen.queryByTestId('ssl-details-alpha-cert')).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId('ssl-details-beta-cert')).toBeInTheDocument();
  });
});

const pkg = (path: string, deps: PackageUpdate['dependencies']): PackageUpdate => ({
  name: path,
  path,
  private: false,
  total: deps.length,
  outdated: 0,
  major: 0,
  minor: 0,
  patch: 0,
  dependencies: deps,
});
const dep = (
  name: string,
  range: string,
  updateType: UpdateType,
  latest: string | null,
  kind: DependencyKind = 'dependencies',
) => ({ name, kind, range, latest, updateType });

describe('package-updates helpers', () => {
  const t = (key: string) => `t:${key}`;

  it('falls back to the unknown label for an unrecognised update type', () => {
    expect(updateTypeLabel(t, 'MAJOR')).toBe('t:tech.packageUpdates.major');
    expect(updateTypeLabel(t, 'WHATEVER' as UpdateType)).toBe('t:tech.packageUpdates.unknown');
  });

  it('falls back to the runtime label for an unrecognised dependency kind', () => {
    expect(kindLabel(t, 'devDependencies')).toBe('t:tech.packageUpdates.kindDev');
    expect(kindLabel(t, 'weird' as DependencyKind)).toBe('t:tech.packageUpdates.kindRuntime');
  });

  it('sorts worst first, then by name', () => {
    const rows = [
      { updateType: 'PATCH' as const, name: 'b' },
      { updateType: 'MAJOR' as const, name: 'z' },
      { updateType: 'PATCH' as const, name: 'a' },
    ];
    expect([...rows].sort(compareBySeverity).map((r) => r.name)).toEqual(['z', 'a', 'b']);
  });

  it('merges a dependency across manifests keeping the worst type, all ranges and the first known latest', () => {
    const groups = groupDependencies([
      pkg('apps/a/package.json', [dep('react', '^18.0.0', 'MINOR', null)]),
      pkg('apps/b/package.json', [dep('react', '^17.0.0', 'MAJOR', '19.0.0'), dep('zod', '^3', 'UP_TO_DATE', '3.0.0')]),
      pkg('apps/c/package.json', [dep('react', '^18.0.0', 'PATCH', '20.0.0')]),
    ]);
    const react = groups.find((g) => g.name === 'react');
    expect(react).toEqual({
      name: 'react',
      latest: '19.0.0',
      updateType: 'MAJOR',
      ranges: '^17.0.0, ^18.0.0',
      usedIn: 3,
      paths: 'apps/a/package.json\napps/b/package.json\napps/c/package.json',
    });
    expect(groups.map((g) => g.name)).toEqual(['react', 'zod']);
  });

  it('builds the search text each table filters on', () => {
    expect(packageSearchText(pkg('apps/a/package.json', []))).toBe('apps/a/package.json apps/a/package.json');
    expect(
      dependencySearchText({ name: 'react', latest: null, updateType: 'MAJOR', ranges: '^18', usedIn: 1, paths: '' }),
    ).toBe('react ^18 ');
    expect(dependencyRowSearchText(dep('react', '^18', 'MAJOR', '19.0.0'))).toBe('react ^18 19.0.0');
    expect(dependencyRowSearchText(dep('react', '^18', 'MAJOR', null))).toBe('react ^18 ');
  });
});
