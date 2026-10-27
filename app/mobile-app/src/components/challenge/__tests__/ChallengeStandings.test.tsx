import { screen } from '@testing-library/react-native';

import { ChallengeStandings } from '@/components/challenge/ChallengeStandings';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});

const STANDINGS = [
  { competitor_id: 'c1', name: 'Team Red', rank: 1, total: 30 },
  { competitor_id: 'c2', name: 'Team Blue', rank: 2, total: 20 },
  { competitor_id: 'c3', name: 'Team Green', rank: 2, total: 20 },
  { competitor_id: 'c4', name: 'Team Gold', rank: 4, total: 5 },
];

describe('ChallengeStandings', () => {
  it('says there are no standings yet', () => {
    renderWithProviders(<ChallengeStandings standings={[]} />);
    expect(screen.getByText('mweb.challenge.noStandings')).toBeOnTheScreen();
  });

  it('lists competitors in the order the server ranked them, ties sharing a rank', () => {
    renderWithProviders(<ChallengeStandings standings={STANDINGS} />);
    expect(screen.getByLabelText('mweb.challenge.standings')).toBeOnTheScreen();
    expect(screen.getAllByLabelText(/^mweb.challenge.rank/)).toHaveLength(4);
    expect(
      screen.getByLabelText('mweb.challenge.rank|2, Team Blue, mweb.challenge.score|20'),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText('mweb.challenge.rank|2, Team Green, mweb.challenge.score|20'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Team Gold')).toBeOnTheScreen();
    expect(screen.getByText('30')).toBeOnTheScreen();
  });

  it('shows a trophy for the first three ranks and the number from fourth place', () => {
    renderWithProviders(<ChallengeStandings standings={STANDINGS} />);
    // Rank 4 is the only row that prints its rank as text (its total is 5).
    expect(screen.getByText('4')).toBeOnTheScreen();
    expect(screen.queryByText('1')).toBeNull();
    expect(screen.queryByText('3')).toBeNull();
  });

  it('shows only the first rows when limited', () => {
    renderWithProviders(<ChallengeStandings standings={STANDINGS} limit={2} />);
    expect(screen.getAllByLabelText(/^mweb.challenge.rank/)).toHaveLength(2);
    expect(screen.queryByText('Team Green')).toBeNull();
  });

  it('shows every row when the limit is zero or not given', () => {
    renderWithProviders(<ChallengeStandings standings={STANDINGS} limit={0} />);
    expect(screen.getAllByLabelText(/^mweb.challenge.rank/)).toHaveLength(4);
  });

  it('draws larger for the full-screen view', () => {
    renderWithProviders(<ChallengeStandings standings={STANDINGS} large />);
    expect(screen.UNSAFE_getByProps({ children: 'Team Red' }).props.fontSize).toBe(20);
  });

  it('draws at the regular size by default and emphasises only the leader', () => {
    renderWithProviders(<ChallengeStandings standings={STANDINGS} />);
    expect(screen.UNSAFE_getByProps({ children: 'Team Red' }).props.fontSize).toBe(15);
    expect(screen.UNSAFE_getByProps({ children: 'Team Red' }).props.fontWeight).toBe('800');
    expect(screen.UNSAFE_getByProps({ children: 'Team Blue' }).props.fontWeight).toBe('500');
  });

  it('prints a large rank number at the large size', () => {
    renderWithProviders(<ChallengeStandings standings={STANDINGS} large />);
    expect(screen.UNSAFE_getByProps({ children: 4 }).props.fontSize).toBe(20);
  });
});
