import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));

import PackageUpdatesPage from '../../src/pages/package-updates';

const report = {
  checkedAt: '2026-01-01T10:00:00.000Z',
  registry: 'https://registry.example.test',
  totalPackages: 0,
  totalDependencies: 0,
  uniqueDependencies: 0,
  outdated: 0,
  major: 0,
  minor: 0,
  patch: 0,
  error: null,
  packages: [],
};

beforeEach(() => {
  resetOps();
  ops.q = { TechPackageUpdates: { data: { techPackageUpdates: report } } };
});

describe('Package updates refresh edge cases', () => {
  it('shows a spinner and no report while the first load is in flight', () => {
    ops.q.TechPackageUpdates = { loading: true };
    const { container } = renderWithProviders(<PackageUpdatesPage />);
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).toBeNull();
  });

  it('stringifies a non-Error rejection from the re-check and re-enables the button', async () => {
    mutation('TechRefreshPackageUpdates').mockRejectedValueOnce('registry exploded');
    renderWithProviders(<PackageUpdatesPage />);
    const button = await screen.findByRole('button', { name: 'Check now' });
    fireEvent.click(button);
    expect(await screen.findByText('registry exploded')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Check now' })).toBeEnabled());
  });

  it('dismisses the refresh error from its close button', async () => {
    mutation('TechRefreshPackageUpdates').mockRejectedValueOnce(new Error('boom'));
    renderWithProviders(<PackageUpdatesPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Check now' }));
    await screen.findByText('boom');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('boom')).toBeNull());
  });
});
