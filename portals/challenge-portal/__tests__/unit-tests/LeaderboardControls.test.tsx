import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import BoardViewer from '../../src/pages/leaderboard/BoardViewer';
import RewardRowFields from '../../src/pages/leaderboard/RewardRowFields';
import { CATEGORIES, PERIODS, REWARD_PERIODS } from '../../src/pages/leaderboard/labels';
import type { LeaderboardReward } from '../../src/pages/leaderboard/queries';

const q = vi.hoisted(() => ({
  calls: [] as { variables: { category: string; period: string } }[],
  state: { data: undefined as unknown, loading: false, error: undefined as unknown },
}));

vi.mock('@apollo/client/react', async (io) => ({
  ...(await io<typeof import('@apollo/client/react')>()),
  useQuery: (_doc: unknown, options: { variables: { category: string; period: string } }) => {
    q.calls.push(options);
    return q.state;
  },
}));

const lastVariables = () => q.calls[q.calls.length - 1].variables;

beforeEach(() => {
  q.calls = [];
  q.state = { data: { leaderboard: { rows: [] } }, loading: false, error: undefined };
});

describe('BoardViewer controls', () => {
  it('starts on the user board for the month', () => {
    render(<BoardViewer />);
    expect(lastVariables()).toEqual({ category: 'USER', period: 'MONTH' });
    expect(screen.getByText('No points on this board yet.')).toBeInTheDocument();
  });

  it('re-reads the board for the chosen category', () => {
    render(<BoardViewer />);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options).toHaveLength(CATEGORIES.length);
    fireEvent.click(options[1]);
    expect(lastVariables()).toEqual({ category: CATEGORIES[1], period: 'MONTH' });
  });

  it('re-reads the board for the chosen window and ignores a click on the active one', () => {
    render(<BoardViewer />);
    const toggles = within(screen.getByTestId('leaderboard-period')).getAllByRole('button');
    expect(toggles).toHaveLength(PERIODS.length);
    fireEvent.click(toggles[1]);
    expect(lastVariables()).toEqual({ category: 'USER', period: PERIODS[1] });
    // Clicking the selected window would deselect it; the board must keep one.
    fireEvent.click(screen.getAllByRole('button', { pressed: true })[0]);
    expect(lastVariables().period).toBe(PERIODS[1]);
  });

  it('shows the load error instead of the table', () => {
    q.state = { data: undefined, loading: false, error: new Error('down') };
    render(<BoardViewer />);
    expect(screen.getByRole('alert')).toHaveTextContent('could not');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows a spinner while the first load runs', () => {
    q.state = { data: undefined, loading: true, error: undefined };
    render(<BoardViewer />);
    expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('RewardRowFields', () => {
  // The only plain text inputs in a row are the prize title and its description.
  const titleField = () => screen.getAllByRole('textbox')[0];

  const row: LeaderboardReward = {
    category: 'USER',
    period: 'MONTHLY',
    rank_from: 1,
    rank_to: 3,
    title: 'Gold hamper',
    description: 'For the top three',
    is_active: true,
  } as LeaderboardReward;

  const setup = (over: Partial<LeaderboardReward> = {}) => {
    const onChange = vi.fn();
    const onRemove = vi.fn();
    render(<RewardRowFields row={{ ...row, ...over }} index={2} onChange={onChange} onRemove={onRemove} />);
    return { onChange, onRemove };
  };

  it('changes the board category', () => {
    const { onChange } = setup();
    fireEvent.mouseDown(screen.getAllByRole('combobox')[0]);
    fireEvent.click(within(screen.getByRole('listbox')).getAllByRole('option')[1]);
    expect(onChange).toHaveBeenCalledWith(2, { category: CATEGORIES[1] });
  });

  it('changes the reward window', () => {
    const { onChange } = setup();
    fireEvent.mouseDown(screen.getAllByRole('combobox')[1]);
    fireEvent.click(within(screen.getByRole('listbox')).getAllByRole('option')[1]);
    expect(onChange).toHaveBeenCalledWith(2, { period: REWARD_PERIODS[1] });
  });

  it('keeps ranks as whole numbers of at least 1', () => {
    const { onChange } = setup();
    const [from, to] = screen.getAllByRole('spinbutton');
    fireEvent.change(from, { target: { value: '5' } });
    expect(onChange).toHaveBeenLastCalledWith(2, { rank_from: 5 });
    fireEvent.change(to, { target: { value: '12' } });
    expect(onChange).toHaveBeenLastCalledWith(2, { rank_to: 12 });
    fireEvent.change(from, { target: { value: '0' } });
    expect(onChange).toHaveBeenLastCalledWith(2, { rank_from: 1 });
    fireEvent.change(to, { target: { value: '-7' } });
    expect(onChange).toHaveBeenLastCalledWith(2, { rank_to: 1 });
    // A cleared field snaps back to 1 rather than NaN.
    fireEvent.change(from, { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith(2, { rank_from: 1 });
  });

  it('edits the prize copy', () => {
    const { onChange } = setup();
    fireEvent.change(titleField(), { target: { value: 'Silver' } });
    expect(onChange).toHaveBeenLastCalledWith(2, { title: 'Silver' });
    fireEvent.change(screen.getByDisplayValue('For the top three'), { target: { value: 'Next three' } });
    expect(onChange).toHaveBeenLastCalledWith(2, { description: 'Next three' });
  });

  it('flags an empty title', () => {
    setup({ title: '   ' });
    expect(titleField()).toBeInvalid();
  });

  it('does not flag a titled reward', () => {
    setup();
    expect(titleField()).toBeValid();
  });

  it('toggles the reward on and off', () => {
    const { onChange } = setup();
    const toggle = screen.getByTestId('leaderboard-reward-active').querySelector('input') as HTMLInputElement;
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(2, { is_active: false });
  });

  it('removes the row by its index', () => {
    const { onRemove } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Remove reward' }));
    expect(onRemove).toHaveBeenCalledWith(2);
  });
});
