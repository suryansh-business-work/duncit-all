import { screen, within } from '@testing-library/react-native';
import { MaterialIcons } from '@expo/vector-icons';

import type { ClubPodDetail } from '@/hooks/useClubPodDetail';
import { renderWithProviders } from '@/utils/test-utils';
import { PodDetailLifecycle } from '../PodDetailLifecycle';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({ formatDateTime: (value: string) => `at ${value}` }),
}));

const CREATED = '2026-09-01T10:00:00.000Z';
const PAST = '2026-09-10T10:00:00.000Z';
const FUTURE = '2999-01-01T10:00:00.000Z';
const ENDED = '2026-09-10T13:00:00.000Z';

const podOf = (patch: Record<string, unknown> = {}) =>
  ({
    created_at: CREATED,
    pod_date_time: FUTURE,
    is_deleted: false,
    completed_at: null,
    deleted_at: null,
    ...patch,
  }) as unknown as ClubPodDetail;

const mount = (pod: ClubPodDetail) => renderWithProviders(<PodDetailLifecycle pod={pod} />);
const step = (key: string) => screen.getByTestId(`club-pod-detail-step-${key}`);
const glyphs = (key: string) =>
  within(step(key))
    .UNSAFE_queryAllByType(MaterialIcons)
    .map((icon) => icon.props.name);

describe('PodDetailLifecycle', () => {
  it('shows an upcoming pod as created only, with the other steps pending', () => {
    mount(podOf());
    expect(within(step('created')).getByText(`at ${CREATED}`)).toBeOnTheScreen();
    expect(glyphs('created')).toEqual(['check']);
    expect(within(step('date')).getByText(`at ${FUTURE}`)).toBeOnTheScreen();
    expect(glyphs('date')).toEqual([]);
    expect(within(step('end')).getByText('podDetailsPanel.common.completed')).toBeOnTheScreen();
    expect(
      within(step('end')).getByText('podDetailsPanel.podTimelineSection.pending'),
    ).toBeOnTheScreen();
    expect(glyphs('end')).toEqual([]);
  });

  it('ticks the pod date once the pod has started', () => {
    mount(podOf({ pod_date_time: PAST }));
    expect(glyphs('date')).toEqual(['check']);
    expect(glyphs('end')).toEqual([]);
  });

  it('shows a completed pod with its completion time', () => {
    mount(podOf({ pod_date_time: PAST, completed_at: ENDED }));
    expect(within(step('end')).getByText('podDetailsPanel.common.completed')).toBeOnTheScreen();
    expect(within(step('end')).getByText(`at ${ENDED}`)).toBeOnTheScreen();
    expect(glyphs('end')).toEqual(['check']);
  });

  it('shows a cancelled pod with a cross and when it was cancelled', () => {
    mount(podOf({ is_deleted: true, deleted_at: ENDED }));
    expect(within(step('end')).getByText('podDetailsPanel.common.cancelled')).toBeOnTheScreen();
    expect(within(step('end')).getByText(`at ${ENDED}`)).toBeOnTheScreen();
    expect(glyphs('end')).toEqual(['close']);
  });

  it('keeps a cancelled pod pending on time when the cancel time is not recorded', () => {
    mount(podOf({ is_deleted: true, deleted_at: null }));
    expect(glyphs('end')).toEqual(['close']);
    expect(
      within(step('end')).getByText('podDetailsPanel.podTimelineSection.pending'),
    ).toBeOnTheScreen();
  });

  it('keeps a completed pod pending on time when the completion time is not recorded', () => {
    mount(podOf({ pod_date_time: PAST, completed_at: ' ' }));
    expect(glyphs('end')).toEqual(['check']);
  });

  it('shows the three steps in order', () => {
    mount(podOf());
    expect(
      screen.getAllByTestId(/^club-pod-detail-step-/).map((node) => node.props.testID),
    ).toEqual([
      'club-pod-detail-step-created',
      'club-pod-detail-step-date',
      'club-pod-detail-step-end',
    ]);
  });
});
