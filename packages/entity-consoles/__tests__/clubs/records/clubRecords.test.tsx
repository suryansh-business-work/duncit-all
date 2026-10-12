import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route } from 'react-router';
import type { MockedResponse } from '@apollo/client/testing';
import { POD_DETAIL } from '@duncit/pod-details';
import { renderWithProviders } from '../../testkit';
import ClubAdminInClubPage from '../../../src/clubs/records/ClubAdminInClubPage';
import HostInClubPage from '../../../src/clubs/records/HostInClubPage';
import PodEditorInClubPage from '../../../src/clubs/records/PodEditorInClubPage';
import PodInClubPage from '../../../src/clubs/records/PodInClubPage';

// The page reads only `club_id` off the shared pod document; the full document
// selects ~100 fields, so the suite swaps in a slim one with the same contract
// (variables `{ id }`, result `pod.club_id`).
vi.mock('@duncit/pod-details', async () => {
  const { gql } = await import('@apollo/client');
  return {
    POD_DETAIL: gql`
      query SlimPodDetail($id: ID!) {
        pod(pod_doc_id: $id) {
          id
          club_id
        }
      }
    `,
  };
});

// The record pages are owned by their own consoles; these wrappers only decide
// where Back goes, which is exactly what the stand-ins print.
vi.mock('../../../src/club-admins/detail/ClubAdminDetailsPage', () => ({
  default: ({ backTo }: { backTo: string }) => <div data-testid="admin-page">{backTo}</div>,
}));
vi.mock('../../../src/hosts/detail/HostDetailsPage', () => ({
  default: ({ backTo }: { backTo: string }) => <div data-testid="host-page">{backTo}</div>,
}));
vi.mock('../../../src/pods/list/pod-editor-page', () => ({
  default: ({ backTo, backLabel }: { backTo: string; backLabel: string }) => (
    <div data-testid="editor-page">{`${backTo}|${backLabel}`}</div>
  ),
}));
vi.mock('../../../src/pods/detail/PodDetailsPage', () => ({
  default: ({ backTo, backLabel }: { backTo: string; backLabel: string }) => (
    <div data-testid="pod-page">{`${backTo}|${backLabel}`}</div>
  ),
}));

describe('ClubAdminInClubPage', () => {
  it('returns Back to the overview tab of the club the admin was opened from', () => {
    renderWithProviders(<></>, {
      initialEntries: ['/clubs/club-9/club-admins/ca-1'],
      routes: (
        <Route path="/clubs/:clubId/club-admins/:clubAdminId" element={<ClubAdminInClubPage />} />
      ),
    });
    expect(screen.getByTestId('admin-page').textContent).toMatch(/^\/clubs\/club-9\?.*overview$/);
  });
});

describe('HostInClubPage', () => {
  it('returns Back to the hosts tab of the club the host was opened from', () => {
    renderWithProviders(<></>, {
      initialEntries: ['/clubs/club-9/hosts/h-1'],
      routes: <Route path="/clubs/:clubId/hosts/:hostId" element={<HostInClubPage />} />,
    });
    expect(screen.getByTestId('host-page').textContent).toMatch(/^\/clubs\/club-9\?.*hosts$/);
  });
});

describe('PodEditorInClubPage', () => {
  it('returns to the pod being edited', () => {
    renderWithProviders(<></>, {
      initialEntries: ['/pods/pod-7/edit'],
      routes: <Route path="/pods/:id/edit" element={<PodEditorInClubPage />} />,
    });
    expect(screen.getByTestId('editor-page').textContent?.startsWith('/pods/pod-7|')).toBe(true);
  });
});

describe('PodInClubPage', () => {
  const podMock = (pod: unknown): MockedResponse => ({
    request: { query: POD_DETAIL, variables: { id: 'pod-1' } },
    result: { data: { pod } },
  });

  const renderPod = (mocks: MockedResponse[]) =>
    renderWithProviders(<></>, {
      mocks,
      initialEntries: ['/pods/pod-1'],
      routes: <Route path="/pods/:id" element={<PodInClubPage />} />,
    });

  it('sends Back to the pods tab of the pod\'s own club once the pod has loaded', async () => {
    renderPod([podMock({ __typename: 'Pod', id: 'pod-1', club_id: 'club-3' })]);
    const target = await screen.findByText(/^\/clubs\/club-3\?/);
    expect(target.textContent).toMatch(/pods\|/);
  });

  it('falls back to the clubs list while the pod is unresolved', () => {
    renderPod([]);
    expect(screen.getByTestId('pod-page').textContent?.startsWith('/clubs|')).toBe(true);
  });
});
