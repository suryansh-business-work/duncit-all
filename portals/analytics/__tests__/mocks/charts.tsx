/**
 * A stand-in for `react-chartjs-2`. jsdom has no canvas context, so Chart.js
 * can never draw — and it is Chart.js, not the console, that would call the
 * tooltip and tick callbacks. The stand-in records the `data` and `options`
 * each chart was given, so a suite can read the datasets and invoke those
 * callbacks exactly as Chart.js would.
 */

export interface RecordedChart {
  data: {
    labels?: unknown[];
    datasets: Array<Record<string, unknown> & { label?: string; data: unknown[] }>;
  };
  options: Record<string, unknown>;
  label: string;
}

export const charts: { line: RecordedChart | null; bar: RecordedChart | null } = { line: null, bar: null };

export function resetCharts(): void {
  charts.line = null;
  charts.bar = null;
}

interface ChartProps {
  data: RecordedChart['data'];
  options: RecordedChart['options'];
  'aria-label': string;
}

export function Line(props: Readonly<ChartProps>) {
  charts.line = { data: props.data, options: props.options, label: props['aria-label'] };
  return <canvas role="img" aria-label={props['aria-label']} data-testid="line-chart" />;
}

export function Bar(props: Readonly<ChartProps>) {
  charts.bar = { data: props.data, options: props.options, label: props['aria-label'] };
  return <canvas role="img" aria-label={props['aria-label']} data-testid="bar-chart" />;
}

/** Walks a dotted path through the recorded options, e.g. `plugins.tooltip.callbacks.label`. */
export function optionAt(chart: RecordedChart | null, dotted: string): unknown {
  let cursor: unknown = chart?.options;
  for (const key of dotted.split('.')) {
    cursor = (cursor as Record<string, unknown> | undefined)?.[key];
  }
  return cursor;
}
