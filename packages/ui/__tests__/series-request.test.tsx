import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  GroupedSlotRequests,
  SeriesRequestGroup,
  mwebSeriesRequestLabels,
  shellSeriesRequestLabels,
  type SeriesRequestLabels,
  type SeriesRequestTranslate,
} from '../src/series-request';

const t: SeriesRequestTranslate = (key, options) => {
  const vars = Object.values(options?.vars ?? {});
  return vars.length ? `[${key} ${vars.join(' ')}]` : `[${key}]`;
};

describe('series request labels', () => {
  it('reads every mWeb line from mweb.podSeries, with its numbers and dates', () => {
    const labels = mwebSeriesRequestLabels(t);
    expect(labels.summary(3, 'Sun', 'Sat')).toBe('[mweb.podSeries.requestSummary 3 Sun Sat]');
    expect(labels.acceptAll(3)).toBe('[mweb.podSeries.acceptAll 3]');
    expect(labels.declineAll(3)).toBe('[mweb.podSeries.declineAll 3]');
    expect(labels.declineAllShort).toBe('[mweb.podSeries.declineAllShort]');
    expect(labels.declineReason).toBe('[mweb.podSeries.declineReason]');
    expect(labels.cancel).toBe('[mweb.common.cancel]');
    expect(labels.answerEach).toBe('[mweb.podSeries.answerEach]');
  });

  it('reads every portal line from shell.podSeries', () => {
    const labels = shellSeriesRequestLabels(t);
    expect(labels.summary(2, 'a', 'b')).toBe('[shell.podSeries.requestSummary 2 a b]');
    expect(labels.acceptAll(2)).toBe('[shell.podSeries.acceptAll 2]');
    expect(labels.declineAll(2)).toBe('[shell.podSeries.declineAll 2]');
    expect(labels.declineAllShort).toBe('[shell.podSeries.declineAllShort]');
    expect(labels.declineReason).toBe('[shell.podSeries.declineReason]');
    expect(labels.cancel).toBe('[shell.common.cancel]');
    expect(labels.answerEach).toBe('[shell.podSeries.answerEach]');
  });
});

const labels: SeriesRequestLabels = {
  summary: (count, from, to) => `${count} dates, ${from} to ${to}`,
  acceptAll: (count) => `Accept all ${count}`,
  declineAll: (count) => `Decline all ${count}`,
  declineAllShort: 'Decline all',
  declineReason: 'Reason',
  cancel: 'Cancel',
  answerEach: 'Answer each',
};

const rows = [
  { slot_id: 's1', pod_title: 'Sunday Badminton', start_at: '2026-11-01', series_id: 'S' },
  { slot_id: 's2', pod_title: 'Sunday Badminton', start_at: '2026-11-08', series_id: 'S' },
];

const mount = (over: { busy?: boolean; rows?: typeof rows } = {}) => {
  const onApproveAll = vi.fn();
  const onDeclineAll = vi.fn();
  render(
    <SeriesRequestGroup
      rows={over.rows ?? rows}
      busy={over.busy ?? false}
      labels={labels}
      formatWhen={(iso) => `on ${iso}`}
      onApproveAll={onApproveAll}
      onDeclineAll={onDeclineAll}
      renderRow={(row) => <div key={row.slot_id}>{`card ${row.slot_id}`}</div>}
    />
  );
  return { onApproveAll, onDeclineAll };
};

describe('SeriesRequestGroup', () => {
  it('names the pod and its first and last date, and accepts every date at once', () => {
    const { onApproveAll } = mount();
    expect(screen.getByRole('heading', { name: 'Sunday Badminton' })).toBeInTheDocument();
    expect(screen.getByText('2 dates, on 2026-11-01 to on 2026-11-08')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Accept all 2' }));
    expect(onApproveAll).toHaveBeenCalledTimes(1);
  });

  it('asks for a reason before declining every date, and sends it trimmed', () => {
    const { onDeclineAll } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Decline all' }));
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: '  Closed for repairs  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Decline all 2' }));
    expect(onDeclineAll).toHaveBeenCalledWith('Closed for repairs');
  });

  it('can back out of declining without declining anything', () => {
    const { onDeclineAll } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Decline all' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onDeclineAll).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Accept all 2' })).toBeInTheDocument();
  });

  it('keeps each date answerable on its own card', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Answer each' }));
    expect(screen.getByText('card s1')).toBeInTheDocument();
    expect(screen.getByText('card s2')).toBeInTheDocument();
  });

  it('locks both answers while a decision is in flight', () => {
    mount({ busy: true });
    expect(screen.getByRole('button', { name: 'Accept all 2' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Decline all' })).toBeDisabled();
  });

  it('draws nothing for an empty series', () => {
    const { container } = render(
      <SeriesRequestGroup
        rows={[]}
        busy={false}
        labels={labels}
        formatWhen={(iso) => iso}
        onApproveAll={vi.fn()}
        onDeclineAll={vi.fn()}
        renderRow={() => null}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('GroupedSlotRequests', () => {
  const list = [
    { slot_id: 'one', pod_title: 'Board Games', start_at: '2026-11-02', series_id: null },
    ...rows,
  ];

  it('shows a one-time request as its own card and a series as one group', () => {
    render(
      <GroupedSlotRequests
        requests={list}
        busy={false}
        labels={labels}
        formatWhen={(iso) => iso}
        renderRow={(row) => <div key={row.slot_id}>{`card ${row.slot_id}`}</div>}
        onDecideSeries={vi.fn()}
      />
    );
    expect(screen.getByText('card one')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sunday Badminton' })).toBeInTheDocument();
    // The series' own dates stay folded until the venue opens them.
    expect(screen.getByRole('button', { name: 'Answer each' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('answers the whole series by its id', () => {
    const onDecideSeries = vi.fn();
    render(
      <GroupedSlotRequests
        requests={list}
        busy={false}
        labels={labels}
        formatWhen={(iso) => iso}
        renderRow={(row) => <div key={row.slot_id}>{row.slot_id}</div>}
        onDecideSeries={onDecideSeries}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Accept all 2' }));
    expect(onDecideSeries).toHaveBeenCalledWith('S', true);
    fireEvent.click(screen.getByRole('button', { name: 'Decline all' }));
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Closed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Decline all 2' }));
    expect(onDecideSeries).toHaveBeenCalledWith('S', false, 'Closed');
  });
});
