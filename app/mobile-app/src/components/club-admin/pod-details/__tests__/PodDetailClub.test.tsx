import { fireEvent, screen } from '@testing-library/react-native';

import type { ClubPodDetail } from '@/hooks/useClubPodDetail';
import { renderWithProviders } from '@/utils/test-utils';
import { PodDetailClub } from '../PodDetailClub';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
const mockOpenClub = jest.fn();
jest.mock('@/hooks/useDetailNav', () => ({ useDetailNav: () => ({ openClub: mockOpenClub }) }));
const mockCards = jest.fn();
jest.mock('@/components/pod-pending', () => ({
  ClubAdminCard: (props: { admin: { name: string }; caption: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    mockCards(props);
    return <Text testID={`admin-${props.admin.name}`}>{props.admin.name}</Text>;
  },
}));

type PodClub = NonNullable<ClubPodDetail['club']>;
const clubOf = (admins: unknown[]) =>
  ({ club_id: 'smash-club', club_name: 'Smash Club', club_admins: admins }) as unknown as PodClub;

const admin = (id: string, name: string, patch: Record<string, unknown> = {}) => ({
  id,
  name,
  avatar_url: `https://cdn/${id}.jpg`,
  email: `${id}@x.com`,
  phone: '+91 1',
  whatsapp: '+91 2',
  ...patch,
});

beforeEach(() => jest.clearAllMocks());

describe('PodDetailClub', () => {
  it('says no club is linked when the pod has none', () => {
    renderWithProviders(<PodDetailClub club={null} />);
    expect(screen.getByTestId('club-pod-detail-club-empty')).toHaveTextContent(
      'podDetailsPanel.common.noClubLinked',
    );
    expect(screen.queryByTestId('club-pod-detail-club-name')).toBeNull();
    expect(screen.queryByTestId('club-pod-detail-club-admins')).toBeNull();
  });

  it('shows the club name and slug', () => {
    renderWithProviders(<PodDetailClub club={clubOf([])} />);
    expect(screen.getByTestId('club-pod-detail-club-name')).toHaveTextContent('Smash Club');
    expect(screen.getByText('/smash-club')).toBeOnTheScreen();
  });

  it('opens the club page', () => {
    renderWithProviders(<PodDetailClub club={clubOf([])} />);
    fireEvent.press(screen.getByTestId('club-pod-detail-view-club'));
    expect(mockOpenClub).toHaveBeenCalledWith('smash-club');
  });

  it('says the club has no admins', () => {
    renderWithProviders(<PodDetailClub club={clubOf([])} />);
    expect(screen.getByTestId('club-pod-detail-club-admins-empty')).toHaveTextContent(
      'podDetailsPanel.podClubAdminsCard.noClubAdmins',
    );
  });

  it('treats a club with no admin list as having no admins', () => {
    renderWithProviders(
      <PodDetailClub club={{ club_id: 'c', club_name: 'C' } as unknown as PodClub} />,
    );
    expect(screen.getByTestId('club-pod-detail-club-admins-empty')).toBeOnTheScreen();
  });

  it('shows each admin on the shared contact card, with the contact fields mapped across', () => {
    renderWithProviders(
      <PodDetailClub club={clubOf([admin('a1', 'Asha'), admin('a2', 'Bo', { phone: null })])} />,
    );
    expect(screen.getByTestId('admin-Asha')).toBeOnTheScreen();
    expect(screen.getByTestId('admin-Bo')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-pod-detail-club-admins-empty')).toBeNull();
    expect(mockCards.mock.calls[0][0]).toEqual({
      caption: 'podDetailsPanel.podClubAdminsCard.clubAdminDetails',
      admin: {
        name: 'Asha',
        profile_photo: 'https://cdn/a1.jpg',
        email: 'a1@x.com',
        phone: '+91 1',
        whatsapp: '+91 2',
      },
    });
    expect(mockCards.mock.calls[1][0].admin.phone).toBeNull();
  });
});
