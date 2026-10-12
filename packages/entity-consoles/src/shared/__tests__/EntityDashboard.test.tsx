import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../__tests__/testkit';
import EntityDashboard from '../EntityDashboard';
import { PODS_SPEC, VENUES_SPEC } from '../specs';
import type { DirectorySpec } from '../types';

const countsMock = (
  spec: DirectorySpec,
  totalFor: (index: number) => number | null,
): MockedResponse => ({
  request: { query: spec.countsDocument },
  result: {
    data: Object.fromEntries(
      spec.tiles.map((tile, index) => {
        const total = totalFor(index);
        return [
          tile.key,
          total === null ? null : { __typename: 'TablePage', total },
        ];
      }),
    ),
  },
});

describe('EntityDashboard', () => {
  it('shows each tile\'s own count, fetched in one request', async () => {
    renderWithProviders(<EntityDashboard spec={VENUES_SPEC} />, {
      mocks: [countsMock(VENUES_SPEC, (i) => (i + 1) * 11)],
    });

    for (let i = 0; i < VENUES_SPEC.tiles.length; i += 1) {
      expect(await screen.findByText(String((i + 1) * 11))).toBeInTheDocument();
    }
  });

  it('makes each tile a way into the list, filtered to what it counted', async () => {
    renderWithProviders(<EntityDashboard spec={PODS_SPEC} listPath="/pods" />, {
      mocks: [countsMock(PODS_SPEC, () => 3)],
    });

    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(PODS_SPEC.tiles.length));
    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(
      PODS_SPEC.tiles.map((tile) => (tile.listQuery ? `/pods?${tile.listQuery}` : '/pods')),
    );
  });

  it('reports numbers without links while the console has no list route yet', async () => {
    renderWithProviders(<EntityDashboard spec={VENUES_SPEC} />, {
      mocks: [countsMock(VENUES_SPEC, () => 5)],
    });
    expect((await screen.findAllByText('5')).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('counts zero for a tile whose bucket the server did not return', async () => {
    renderWithProviders(<EntityDashboard spec={VENUES_SPEC} />, {
      mocks: [countsMock(VENUES_SPEC, (i) => (i === 0 ? null : 7))],
    });
    await waitFor(() => expect(screen.getAllByText('7').length).toBe(VENUES_SPEC.tiles.length - 1));
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('surfaces the server\'s error instead of silently showing zeros', async () => {
    renderWithProviders(<EntityDashboard spec={VENUES_SPEC} />, {
      mocks: [{ request: { query: VENUES_SPEC.countsDocument }, error: new GraphQLError('counts down') }],
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('counts down');
  });
});
