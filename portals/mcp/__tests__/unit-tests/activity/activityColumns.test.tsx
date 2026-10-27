import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fallbackT } from '@duncit/shell';
import type { DuncitColumn } from '@duncit/table';
import { buildActivityColumns } from '../../../src/pages/activity/activityColumns';
import type { ToolCallRow } from '../../../src/pages/activity/queries';
import { toolCall } from '../../mocks/fixtures';

const row: ToolCallRow = toolCall();
const build = (manager: boolean) =>
  buildActivityColumns({ t: fallbackT, locale: 'en-US', formatDateTime: (date) => `at ${date.toISOString()}`, manager });
const column = (columns: DuncitColumn<ToolCallRow>[], field: string) => {
  const found = columns.find((entry) => entry.field === field);
  if (!found) throw new Error(`no column ${field}`);
  return found;
};

describe('buildActivityColumns', () => {
  it('gives managers a Person column and leaves it out for everyone else', () => {
    expect(build(true).map((entry) => entry.field)).toContain('user_email');
    expect(build(false).map((entry) => entry.field)).not.toContain('user_email');
  });

  it('lists the call’s time, app, connector, tool, risk, outcome, reason, duration, tokens and cost', () => {
    expect(build(false).map((entry) => entry.field)).toEqual([
      'created_at',
      'client_name',
      'endpoint',
      'tool',
      'category',
      'risk',
      'status',
      'reason',
      'duration_ms',
      'input_tokens',
      'output_tokens',
      'cost',
    ]);
  });

  it('reads each cell the way the reader sees it', () => {
    const columns = build(true);
    expect(column(columns, 'created_at').valueGetter?.(row)).toBe('at 2026-10-26T09:30:00.000Z');
    expect(column(columns, 'user_email').valueGetter?.(row)).toBe('asha@duncit.com');
    expect(column(columns, 'status').valueGetter?.(row)).toBe('OK');
    expect(column(columns, 'risk').valueGetter?.(row)).toBe('Write');
    expect(column(columns, 'duration_ms').valueGetter?.(row)).toBe('412 ms');
    expect(column(columns, 'input_tokens').valueGetter?.(row)).toBe('1,200');
    expect(column(columns, 'cost').valueGetter?.(row)).toBe('$0.0042');
  });

  it('fills the gaps a call can have with something readable', () => {
    const columns = build(true);
    const bare = toolCall({ user_email: null, reason: null });
    expect(column(columns, 'user_email').valueGetter?.(bare)).toBe('Unknown');
    expect(column(columns, 'reason').valueGetter?.(bare)).toBe('—');
  });

  it('draws the outcome and the risk as chips in words', () => {
    const columns = build(false);
    render(
      <>
        {column(columns, 'status').cellRenderer?.(toolCall({ status: 'BLOCKED' }))}
        {column(columns, 'risk').cellRenderer?.(toolCall({ risk: 'DESTRUCTIVE' }))}
      </>,
    );
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText('Destructive')).toBeInTheDocument();
  });

  it('only offers the sorts and filters the server answers', () => {
    const columns = build(true);
    expect(column(columns, 'reason')).toMatchObject({ sortable: false, filterable: false });
    expect(column(columns, 'risk')).toMatchObject({ sortable: false, type: 'enum' });
    expect(column(columns, 'endpoint').sortable).toBe(false);
    expect(column(columns, 'category').sortable).toBe(false);
    expect(column(columns, 'cost').filterable).toBe(false);
    expect(column(columns, 'status')).toMatchObject({
      type: 'enum',
      options: [
        { value: 'OK', label: 'OK' },
        { value: 'ERROR', label: 'Error' },
        { value: 'DENIED', label: 'Denied' },
        { value: 'BLOCKED', label: 'Blocked' },
        { value: 'INVALID', label: 'Invalid' },
      ],
    });
  });
});
