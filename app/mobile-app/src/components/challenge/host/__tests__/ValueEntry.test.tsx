import { fireEvent, screen } from '@testing-library/react-native';

import { ValueEntry } from '@/components/challenge/host/ValueEntry';
import type { HostChallengeActions } from '@/hooks/useHostChallengeActions';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

const tool = {
  instance_id: 't1',
  label: 'Distance',
} as unknown as PodChallengeView['tools'][number];

const actionsOf = (busy = false) =>
  ({ busy, score: jest.fn().mockResolvedValue(true) }) as unknown as HostChallengeActions & {
    score: jest.Mock;
  };

const mount = (actions = actionsOf()) => {
  renderWithProviders(<ValueEntry tool={tool} competitorId="c1" actions={actions} />);
  return actions;
};

const input = () => screen.getByTestId('field-challenge-value-t1-c1');
const record = () => screen.getByTestId('challenge-record-t1-c1');

describe('ValueEntry', () => {
  it('starts empty with nothing to record', () => {
    mount();
    expect(screen.getByText('Distance')).toBeOnTheScreen();
    expect(input().props.value).toBe('');
    expect(record()).toBeDisabled();
  });

  it('records the typed number for the competitor and clears the box', () => {
    const actions = mount();
    fireEvent.changeText(input(), '12.5');
    expect(record()).toBeEnabled();
    fireEvent.press(record());
    expect(actions.score).toHaveBeenCalledWith('t1', 'c1', 12.5);
    expect(input().props.value).toBe('');
    expect(record()).toBeDisabled();
  });

  it('accepts zero', () => {
    const actions = mount();
    fireEvent.changeText(input(), '0');
    fireEvent.press(record());
    expect(actions.score).toHaveBeenCalledWith('t1', 'c1', 0);
  });

  it.each([
    ['blank spaces', '   '],
    ['text', 'abc'],
    ['a negative number', '-3'],
    ['infinity', 'Infinity'],
  ])('will not record %s', (_label, text) => {
    mount();
    fireEvent.changeText(input(), text);
    expect(record()).toBeDisabled();
  });

  it('will not record while an action is in flight', () => {
    mount(actionsOf(true));
    fireEvent.changeText(input(), '5');
    expect(record()).toBeDisabled();
  });
});
