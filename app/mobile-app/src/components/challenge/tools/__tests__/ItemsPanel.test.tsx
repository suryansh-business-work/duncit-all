import { screen } from '@testing-library/react-native';

import { ItemsPanel } from '@/components/challenge/tools/ItemsPanel';
import type { PanelProps } from '@/components/challenge/tools/ToolCard';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});

const ITEMS = [
  { key: 'a', label: 'Find the flag', points: 10 },
  { key: 'b', label: 'Cross the bridge', points: 20 },
];

const tool = (patch: Record<string, unknown> = {}, items: unknown[] = ITEMS) =>
  ({
    instance_id: 'i1',
    label: 'Quest',
    input_kind: 'CHECK',
    config_json: JSON.stringify({ items }),
    state_json: JSON.stringify({ done: { c1: ['a'], c2: ['a', 'b'] } }),
    ...patch,
  }) as unknown as PanelProps['tool'];

const challengeOf = (mine: string | null) =>
  ({
    id: 'ch1',
    status: 'LIVE',
    competitors: [
      { competitor_id: 'c1', name: 'Team Red' },
      { competitor_id: 'c2', name: 'Team Blue' },
      { competitor_id: 'c3', name: 'Team Green' },
    ],
    viewer: { my_competitor_id: mine, my_votes: [] },
  }) as unknown as PanelProps['challenge'];

const mount = (mine: string | null, t = tool()) =>
  renderWithProviders(<ItemsPanel challenge={challengeOf(mine)} tool={t} />);

describe('ItemsPanel', () => {
  it('shows how far every competitor has got', () => {
    mount(null);
    expect(screen.getByText('Quest')).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.tools.itemsProgress|Team Red,1,2')).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.tools.itemsProgress|Team Blue,2,2')).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.tools.itemsProgress|Team Green,0,2')).toBeOnTheScreen();
  });

  it('shows a spectator no personal list', () => {
    mount(null);
    expect(screen.queryByText('Find the flag')).toBeNull();
    expect(screen.queryByText('mweb.challenge.tools.checkpointHint')).toBeNull();
  });

  it('shows a competitor their own list with points, marking what is done', () => {
    mount('c1');
    expect(screen.getByText('Find the flag')).toBeOnTheScreen();
    expect(screen.getByText('Cross the bridge')).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.score|10')).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.score|20')).toBeOnTheScreen();
    expect(screen.getAllByLabelText('mweb.challenge.tools.itemDone')).toHaveLength(1);
    expect(screen.getAllByLabelText('mweb.challenge.tools.itemPending')).toHaveLength(1);
  });

  it('marks nothing done for a competitor who has done nothing', () => {
    mount('c3');
    expect(screen.queryByLabelText('mweb.challenge.tools.itemDone')).toBeNull();
    expect(screen.getAllByLabelText('mweb.challenge.tools.itemPending')).toHaveLength(2);
  });

  it('hints at scanning the QR code for a competitor at a checkpoint tool', () => {
    mount('c1', tool({ input_kind: 'CHECKPOINT' }));
    expect(screen.getByText('mweb.challenge.tools.checkpointHint')).toBeOnTheScreen();
  });

  it('gives no hint for a checklist the host ticks', () => {
    mount('c1');
    expect(screen.queryByText('mweb.challenge.tools.checkpointHint')).toBeNull();
  });

  it('shows zero progress, not a crash, when the tool has no items', () => {
    mount('c1', tool({}, []));
    expect(screen.getByText('mweb.challenge.tools.itemsProgress|Team Red,1,0')).toBeOnTheScreen();
  });
});
