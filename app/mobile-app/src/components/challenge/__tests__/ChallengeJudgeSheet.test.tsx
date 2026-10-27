import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ChallengeJudgeSheet } from '@/components/challenge/ChallengeJudgeSheet';
import { JudgePodChallengeCompetitorDocument } from '@/graphql/challenges';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const request = jest.mocked(graphqlRequest) as unknown as jest.Mock;

const CRITERIA = [
  { key: 'style', label: 'Style', max: 10 },
  { key: 'tech', label: 'Technique', max: 5 },
];
const COMPETITORS = [
  { competitor_id: 'c1', name: 'Team Red' },
  { competitor_id: 'c2', name: 'Team Blue' },
];

const toolOf = (config: Record<string, unknown> = { criteria: CRITERIA }) =>
  ({
    instance_id: 'j1',
    label: 'Judging',
    config_json: JSON.stringify(config),
  }) as unknown as PodChallengeView['tools'][number];

const mount = ({ tool = toolOf(), competitors = COMPETITORS } = {}, onChanged = jest.fn()) => {
  renderWithProviders(
    <ChallengeJudgeSheet
      challenge={
        { id: 'ch1', competitors } as unknown as Pick<PodChallengeView, 'id' | 'competitors'>
      }
      tool={tool}
      onChanged={onChanged}
    />,
  );
  return { onChanged };
};

const mark = (label: string, value: string) =>
  fireEvent.changeText(screen.getByLabelText(label), value);
const submit = async () =>
  act(async () => {
    fireEvent.press(screen.getByTestId('challenge-judge-submit-j1'));
  });

beforeEach(() => {
  jest.clearAllMocks();
  request.mockResolvedValue({ judgePodChallengeCompetitor: { id: 'ch1', revision: 4 } });
});

describe('ChallengeJudgeSheet', () => {
  it('lists the competitors and a mark box per criterion with its maximum', () => {
    mount();
    expect(screen.getByRole('heading', { name: 'Judging' })).toBeOnTheScreen();
    expect(screen.getByLabelText('mweb.challenge.judgeCompetitor')).toBeOnTheScreen();
    expect(screen.getByText('Team Red')).toBeOnTheScreen();
    expect(screen.getByText('Team Blue')).toBeOnTheScreen();
    expect(screen.getByLabelText('mweb.challenge.criterionOutOf|Style,10')).toBeOnTheScreen();
    expect(screen.getByLabelText('mweb.challenge.criterionOutOf|Technique,5')).toBeOnTheScreen();
  });

  it('selects the first competitor to start with', () => {
    mount();
    expect(screen.getByLabelText('Team Red').props['aria-checked']).toBe(true);
    expect(screen.getByLabelText('Team Blue').props['aria-checked']).toBe(false);
  });

  it('moves the selection to another competitor', () => {
    mount();
    fireEvent.press(screen.getByLabelText('Team Blue'));
    expect(screen.getByLabelText('Team Blue').props['aria-checked']).toBe(true);
    expect(screen.getByLabelText('Team Red').props['aria-checked']).toBe(false);
  });

  it('submits the marks for the chosen competitor, hands the challenge up and clears the marks', async () => {
    const { onChanged } = mount();
    fireEvent.press(screen.getByLabelText('Team Blue'));
    mark('mweb.challenge.criterionOutOf|Style,10', '8.5');
    mark('mweb.challenge.criterionOutOf|Technique,5', '4');
    await submit();
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith({ id: 'ch1', revision: 4 }));
    expect(request).toHaveBeenCalledWith(
      JudgePodChallengeCompetitorDocument,
      {
        id: 'ch1',
        toolInstanceId: 'j1',
        candidateId: 'c2',
        scores: [
          { key: 'style', value: 8.5 },
          { key: 'tech', value: 4 },
        ],
      },
      { auth: true },
    );
    expect(await screen.findByText('mweb.challenge.judgeSaved')).toBeOnTheScreen();
    expect(screen.getByLabelText('mweb.challenge.criterionOutOf|Style,10').props.value).toBe('');
    // The sheet stays on the same competitor, ready for the next sheet.
    expect(screen.getByLabelText('Team Blue').props['aria-checked']).toBe(true);
  });

  it('accepts a mark of zero and a mark at the maximum', async () => {
    const { onChanged } = mount();
    mark('mweb.challenge.criterionOutOf|Style,10', '0');
    mark('mweb.challenge.criterionOutOf|Technique,5', '5');
    await submit();
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it.each([
    ['blank', ''],
    ['over the maximum', '11'],
    ['negative', '-1'],
    ['not a number', 'abc'],
  ])('refuses a %s mark and says so, sending nothing', async (_label, value) => {
    const { onChanged } = mount();
    mark('mweb.challenge.criterionOutOf|Style,10', value);
    mark('mweb.challenge.criterionOutOf|Technique,5', '3');
    await submit();
    expect(await screen.findByText('mweb.challenge.errors.mark|10')).toBeOnTheScreen();
    expect(request).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('shows why the server refused the scores and keeps the marks typed', async () => {
    request.mockRejectedValueOnce(new Error('Not a judge'));
    const { onChanged } = mount();
    mark('mweb.challenge.criterionOutOf|Style,10', '7');
    mark('mweb.challenge.criterionOutOf|Technique,5', '2');
    await submit();
    expect(await screen.findByText('Not a judge')).toBeOnTheScreen();
    expect(onChanged).not.toHaveBeenCalled();
    expect(screen.getByLabelText('mweb.challenge.criterionOutOf|Style,10').props.value).toBe('7');
    expect(screen.queryByText('mweb.challenge.judgeSaved')).toBeNull();
  });

  it('shows no mark boxes for a tool without criteria', () => {
    mount({ tool: toolOf({}) });
    expect(screen.queryByLabelText(/criterionOutOf/)).toBeNull();
    expect(screen.getByTestId('challenge-judge-submit-j1')).toBeOnTheScreen();
  });

  it('copes with a challenge that has no competitors yet', () => {
    mount({ competitors: [] });
    expect(screen.queryByLabelText('Team Red')).toBeNull();
    expect(screen.getByLabelText('mweb.challenge.criterionOutOf|Style,10')).toBeOnTheScreen();
  });
});
