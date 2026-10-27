import { screen } from '@testing-library/react-native';

import type { ClubPodHostRow } from '@/hooks/useClubPodDetail';
import { renderWithProviders } from '@/utils/test-utils';
import { PodDetailHosts } from '../PodDetailHosts';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

const host = (patch: Partial<ClubPodHostRow> = {}): ClubPodHostRow => ({
  userId: 'u1',
  name: 'Asha Rao',
  photo: null,
  email: 'asha@example.com',
  phone: '+91 99999 00000',
  hostNo: 'H-12',
  status: 'APPROVED',
  ...patch,
});

describe('PodDetailHosts', () => {
  it('shows the section with a count and a line per host', () => {
    renderWithProviders(
      <PodDetailHosts hosts={[host(), host({ userId: 'u2', name: 'Bo Singh' })]} />,
    );
    expect(
      screen.getByRole('heading', { name: 'podDetailsPanel.podHostsCard.hosts' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('2')).toBeOnTheScreen();
    expect(screen.getByText('Asha Rao')).toBeOnTheScreen();
    expect(screen.getByText('Bo Singh')).toBeOnTheScreen();
  });

  it('shows email, phone and host number together', () => {
    renderWithProviders(<PodDetailHosts hosts={[host()]} />);
    expect(screen.getByText('asha@example.com · +91 99999 00000 · H-12')).toBeOnTheScreen();
  });

  it('shows only the contact details that exist', () => {
    renderWithProviders(<PodDetailHosts hosts={[host({ email: null, hostNo: null })]} />);
    expect(screen.getByText('+91 99999 00000')).toBeOnTheScreen();
  });

  it('says there is no contact when none is on file', () => {
    renderWithProviders(
      <PodDetailHosts hosts={[host({ email: null, phone: null, hostNo: null })]} />,
    );
    expect(screen.getByText('podDetailsPanel.podHostsCard.noContact')).toBeOnTheScreen();
  });

  it('marks only the first host as primary', () => {
    renderWithProviders(<PodDetailHosts hosts={[host(), host({ userId: 'u2', name: 'Bo' })]} />);
    expect(screen.getByTestId('club-pod-detail-host-u1-primary')).toHaveTextContent(
      'podDetailsPanel.podHostsCard.primary',
    );
    expect(screen.queryByTestId('club-pod-detail-host-u2-primary')).toBeNull();
  });

  it('shows the host profile status when there is one', () => {
    renderWithProviders(<PodDetailHosts hosts={[host(), host({ userId: 'u2', status: null })]} />);
    expect(screen.getByTestId('club-pod-detail-host-u1-status')).toHaveTextContent('APPROVED');
    expect(screen.queryByTestId('club-pod-detail-host-u2-status')).toBeNull();
  });

  it('names a host with no name by the generic sentence', () => {
    renderWithProviders(<PodDetailHosts hosts={[host({ name: '' })]} />);
    expect(screen.getByText('mweb.studioPods.hostsNone')).toBeOnTheScreen();
  });

  it('says the pod has no hosts', () => {
    renderWithProviders(<PodDetailHosts hosts={[]} />);
    expect(screen.getByTestId('club-pod-detail-hosts-empty')).toHaveTextContent(
      'podDetailsPanel.podHostsCard.noHosts',
    );
  });

  it('shows no empty sentence when there are hosts', () => {
    renderWithProviders(<PodDetailHosts hosts={[host()]} />);
    expect(screen.queryByTestId('club-pod-detail-hosts-empty')).toBeNull();
  });
});
