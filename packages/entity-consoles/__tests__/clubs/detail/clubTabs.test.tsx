import { describe, expect, it, vi } from 'vitest';
import { renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { renderWithProviders } from '../../testkit';
import { CLUB_ADMIN_RECORD_IDS } from '../../../src/clubs/detail/queries';
import { useClubAdminPath } from '../../../src/clubs/detail/useClubAdminPath';
import ClubOverviewTab from '../../../src/clubs/detail/ClubOverviewTab';
import ClubHostsTab from '../../../src/clubs/detail/ClubHostsTab';
import ClubPodsTab from '../../../src/clubs/detail/ClubPodsTab';
import type { ClubDetail } from '../../../src/clubs/detail/types';

const recordsTab = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }));
const podsTab = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }));

vi.mock('../../../src/shared/EntityRecordsTab', () => ({
  default: (props: Record<string, unknown>) => {
    recordsTab.props = props;
    return <div data-testid="records-tab" />;
  },
}));
vi.mock('../../../src/shared/EntityPodsTab', () => ({
  default: (props: Record<string, unknown>) => {
    podsTab.props = props;
    return <div data-testid="pods-tab" />;
  },
}));
vi.mock('../../../src/clubs/detail/ClubOverviewCard', () => ({
  default: ({ podCount }: { podCount: number }) => <div data-testid="card">{`pods:${podCount}`}</div>,
}));
vi.mock('../../../src/clubs/detail/ClubContentSections', () => ({
  default: () => <div data-testid="content" />,
}));
vi.mock('../../../src/shared/MediaGallery', () => ({
  default: ({ title, items }: { title: string; items: unknown[] }) => (
    <div data-testid="gallery">{`${title}:${items.length}`}</div>
  ),
}));
vi.mock('../../../src/clubs/detail/ClubAdminsCard', () => ({
  default: ({
    admins,
    adminPath,
  }: {
    admins: { id: string; name: string }[];
    adminPath: (admin: { id: string; name: string }) => string | undefined;
  }) => (
    <ul data-testid="admins">
      {admins.map((admin) => (
        <li key={admin.id}>{`${admin.name}=${adminPath(admin) ?? 'none'}`}</li>
      ))}
    </ul>
  ),
}));

const ADMINS = [
  { id: 'u1', name: 'Asha' },
  { id: 'u2', name: 'Ben' },
];

const idsMock = (userIds: string[], rows: { id: string; user_id: string }[]): MockedResponse => ({
  request: {
    query: CLUB_ADMIN_RECORD_IDS,
    variables: {
      query: {
        page_size: userIds.length,
        filters: [{ field: 'user_id', op: 'in', values: userIds }],
      },
    },
  },
  result: {
    data: {
      clubAdminProfilesTable: {
        __typename: 'ClubAdminProfilesTablePage',
        rows: rows.map((row) => ({ __typename: 'ClubAdminProfile', ...row })),
      },
    },
  },
});

describe('useClubAdminPath', () => {
  const wrapperFor = (mocks: MockedResponse[]) =>
    function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
      return (
        <MockedProvider mocks={mocks} mockLinkDefaultOptions={{ delay: 0 }}>
          {children}
        </MockedProvider>
      );
    };

  it('resolves each admin to their record inside the club, from one read', async () => {
    const { result } = renderHook(() => useClubAdminPath('club-1', ADMINS), {
      wrapper: wrapperFor([idsMock(['u1', 'u2'], [{ id: 'rec-1', user_id: 'u1' }])]),
    });

    await waitFor(() => expect(result.current(ADMINS[0])).toBe('/clubs/club-1/club-admins/rec-1'));
    // u2 has no Club Admin record yet, so its name stays plain text.
    expect(result.current(ADMINS[1])).toBeUndefined();
  });

  it('does not query at all for a club without admins', () => {
    const { result } = renderHook(() => useClubAdminPath('club-1', []), {
      wrapper: wrapperFor([]),
    });
    expect(result.current({ id: 'u1', name: 'Asha' })).toBeUndefined();
  });
});

describe('ClubHostsTab', () => {
  it('scopes the hosts console table to the club\'s host accounts and opens a host inside the club', () => {
    renderWithProviders(<ClubHostsTab clubId="club-1" hostUserIds={['hu-1', 'hu-2']} />);

    const props = recordsTab.props as {
      filter: unknown;
      resultKey: string;
      rowPath: (row: { id: string }) => string;
      columns: unknown[];
    };
    expect(screen.getByTestId('records-tab')).toBeInTheDocument();
    expect(props.resultKey).toBe('hostsTable');
    expect(props.filter).toEqual({ field: 'user_id', op: 'in', values: ['hu-1', 'hu-2'] });
    expect(props.columns.length).toBeGreaterThan(0);
    expect(props.rowPath({ id: 'h-9' })).toBe('/clubs/club-1/hosts/h-9');
  });
});

describe('ClubPodsTab', () => {
  it('filters the pods engine by this club', () => {
    renderWithProviders(<ClubPodsTab clubId="club-1" />);

    expect(screen.getByTestId('pods-tab')).toBeInTheDocument();
    expect(podsTab.props).toMatchObject({
      filterField: 'club_id',
      filterValue: 'club-1',
      tableId: 'clubs-console-pods',
    });
  });
});

describe('ClubOverviewTab', () => {
  const club = {
    id: 'club-1',
    club_feature_images_and_videos: [{ url: 'a.jpg' }],
    club_moments: [{ url: 'b.jpg' }, { url: 'c.jpg' }],
    club_admins: ADMINS,
  } as unknown as ClubDetail;

  it('shows the club, both galleries and the admins with links resolved to their records', async () => {
    renderWithProviders(<ClubOverviewTab club={club} podCount={7} />, {
      mocks: [idsMock(['u1', 'u2'], [{ id: 'rec-2', user_id: 'u2' }])],
    });

    expect(screen.getByTestId('card')).toHaveTextContent('pods:7');
    const galleries = screen.getAllByTestId('gallery');
    expect(galleries).toHaveLength(2);
    expect(galleries[0].textContent).toMatch(/:1$/);
    expect(galleries[1].textContent).toMatch(/:2$/);
    expect(screen.getByTestId('content')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('Ben=/clubs/club-1/club-admins/rec-2')).toBeInTheDocument(),
    );
    expect(screen.getByText('Asha=none')).toBeInTheDocument();
  });
});
