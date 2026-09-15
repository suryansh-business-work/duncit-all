import type React from 'react';
import type {
  ICellRendererParams,
  ITooltipParams,
  SuppressHeaderKeyboardEventParams,
  ValueGetterParams,
} from 'ag-grid-community';
import { describe, expect, it } from 'vitest';
import { actionsColumn } from '../src/cells';
import { buildColDefs, isColumnHidden, TRUNCATE_CELL_CLASS } from '../src/columnDefs';
import { ColumnHeader } from '../src/header/ColumnHeader';
import { fallbackT } from '../src/i18n';
import type { DuncitColumn } from '../src/types';

type Row = { id: string; name: string; score: number };

const columns: DuncitColumn<Row>[] = [
  { field: 'name', headerName: 'Name', type: 'text', flex: 1, minWidth: 120 },
  { field: 'score', headerName: 'Score', type: 'number', width: 90, sortable: false, hide: true },
];

describe('isColumnHidden', () => {
  it('override beats declared hide in both directions', () => {
    expect(isColumnHidden(columns[0], {})).toBe(false);
    expect(isColumnHidden(columns[1], {})).toBe(true); // declared hide
    expect(isColumnHidden(columns[1], { score: false })).toBe(false); // override un-hides
    expect(isColumnHidden(columns[0], { name: true })).toBe(true); // override hides
  });
});

describe('buildColDefs', () => {
  it('maps fields, sizing, sortable and hidden overrides', () => {
    const defs = buildColDefs(columns, { score: false }, null, 'asc', fallbackT);
    expect(defs[0]).toMatchObject({
      colId: 'name',
      headerName: 'Name',
      sortable: true,
      hide: false,
      flex: 1,
      minWidth: 120,
      sort: null,
    });
    expect(defs[1]).toMatchObject({ colId: 'score', sortable: false, hide: false, width: 90 });
  });

  it('never lets an actions column sort, and walks a number column largest first', () => {
    const defs = buildColDefs(
      [...columns, actionsColumn<Row>({ onEdit: () => undefined })],
      {},
      null,
      'asc',
      fallbackT,
    );
    expect(defs[0].sortingOrder).toEqual(['asc', 'desc', null]);
    expect(defs[1].sortingOrder).toEqual(['desc', 'asc', null]);
    expect(defs[2].sortable).toBe(false);
  });

  it('draws every header with ColumnHeader, handed the column it belongs to', () => {
    const defs = buildColDefs(columns, {}, null, 'asc', fallbackT);
    expect(defs[0].headerComponent).toBe(ColumnHeader);
    expect(defs[0].headerComponentParams).toEqual({ duncitColumn: columns[0] });
  });

  it('leaves keys on the header’s own sort and filter buttons to those buttons', () => {
    const [def] = buildColDefs(columns, {}, null, 'asc', fallbackT);
    const suppress = def.suppressHeaderKeyboardEvent as (params: SuppressHeaderKeyboardEventParams<Row>) => boolean;
    const keyOn = (target: unknown) =>
      suppress({ event: { target } } as unknown as SuppressHeaderKeyboardEventParams<Row>);

    const cell = document.createElement('div');
    cell.className = 'ag-header-cell';
    const filterButton = document.createElement('button');
    cell.append(filterButton);

    expect(keyOn(filterButton)).toBe(true);
    expect(keyOn(cell)).toBe(false);
    expect(keyOn(null)).toBe(false);
  });

  it('controlled sort lands on the right column only', () => {
    const defs = buildColDefs(columns, {}, 'score', 'desc', fallbackT);
    expect(defs[0].sort).toBeNull();
    expect(defs[1].sort).toBe('desc');
  });

  it('keeps the fetched order: the grid’s own comparator calls every pair equal', () => {
    const [def] = buildColDefs(columns, {}, 'name', 'asc', fallbackT);
    const compare = def.comparator as (a: unknown, b: unknown) => number;
    expect(compare('9 Sep 2026', '10 Sep 2026')).toBe(0);
  });

  it('valueGetter falls back to the field, uses the custom fn when given', () => {
    const withGetter: DuncitColumn<Row>[] = [
      { field: 'name', headerName: 'Name', type: 'text' },
      { field: 'score', headerName: 'Score', type: 'number', valueGetter: (row) => row.score * 2 },
    ];
    const defs = buildColDefs(withGetter, {}, null, 'asc', fallbackT);
    const row: Row = { id: '1', name: 'Alice', score: 3 };
    const getterOf = (i: number) => defs[i].valueGetter as (p: ValueGetterParams<Row>) => unknown;
    expect(getterOf(0)({ data: row } as ValueGetterParams<Row>)).toBe('Alice');
    expect(getterOf(1)({ data: row } as ValueGetterParams<Row>)).toBe(6);
    expect(getterOf(0)({ data: undefined } as ValueGetterParams<Row>)).toBeUndefined();
  });

  it('wraps cellRenderer to receive the row; absent renderer stays undefined', () => {
    const withRenderer: DuncitColumn<Row>[] = [
      { field: 'name', headerName: 'Name', type: 'text', cellRenderer: (row) => <b>{row.name}</b> },
      { field: 'score', headerName: 'Score', type: 'number' },
    ];
    const defs = buildColDefs(withRenderer, {}, null, 'asc', fallbackT);
    const renderer = defs[0].cellRenderer as (p: ICellRendererParams<Row>) => React.ReactNode;
    const row: Row = { id: '1', name: 'Alice', score: 3 };
    expect(renderer({ data: row } as ICellRendererParams<Row>)).toEqual(<b>Alice</b>);
    expect(renderer({ data: undefined } as ICellRendererParams<Row>)).toBeNull();
    expect(defs[1].cellRenderer).toBeUndefined();
  });

  it('truncates + tooltips only plain-text cells; renderers keep their own layout', () => {
    const mixed: DuncitColumn<Row>[] = [
      { field: 'name', headerName: 'Name', type: 'text' },
      { field: 'score', headerName: 'Score', type: 'number', cellRenderer: (row) => <b>{row.score}</b> },
    ];
    const defs = buildColDefs(mixed, {}, null, 'asc', fallbackT);
    // Plain-text column: truncation class + a stringified tooltip.
    expect(defs[0].cellClass).toBe(TRUNCATE_CELL_CLASS);
    const tooltipOf = (i: number) =>
      defs[i].tooltipValueGetter as ((p: ITooltipParams<Row>) => string | undefined) | undefined;
    const row: Row = { id: '1', name: 'Alice', score: 3 };
    expect(tooltipOf(0)?.({ data: row } as ITooltipParams<Row>)).toBe('Alice');
    expect(tooltipOf(0)?.({ data: undefined } as ITooltipParams<Row>)).toBeUndefined();
    // Renderer column: no truncation class, no tooltip (it owns its layout).
    expect(defs[1].cellClass).toBeUndefined();
    expect(defs[1].tooltipValueGetter).toBeUndefined();
  });

  it('tooltip reads a custom valueGetter, stringifies numbers, and drops non-primitives', () => {
    const cols: DuncitColumn<Row>[] = [
      { field: 'score', headerName: 'Score', type: 'number', valueGetter: (row) => row.score },
      { field: 'meta', headerName: 'Meta', type: 'text', valueGetter: () => ({ nested: true }) },
    ];
    const defs = buildColDefs(cols, {}, null, 'asc', fallbackT);
    const tooltipOf = (i: number) =>
      defs[i].tooltipValueGetter as (p: ITooltipParams<Row>) => string | undefined;
    const row: Row = { id: '1', name: 'Alice', score: 42 };
    // valueGetter path + number -> String(raw)
    expect(tooltipOf(0)({ data: row } as ITooltipParams<Row>)).toBe('42');
    // valueGetter returning an object -> undefined (non-primitive)
    expect(tooltipOf(1)({ data: row } as ITooltipParams<Row>)).toBeUndefined();
  });
});

describe('columnHeader through buildColDefs', () => {
  it('resolves headerKey through t and falls back to the field when nothing names the column', () => {
    const cols: DuncitColumn<Row>[] = [
      { field: 'name', headerKey: 'shell.common.created', type: 'date' },
      { field: 'score', type: 'number' },
    ];
    const defs = buildColDefs(cols, {}, null, 'asc', fallbackT);
    expect(defs[0].headerName).toBe('Created');
    expect(defs[1].headerName).toBe('score');
  });

  it('declares renderer cells never-equal so a row update always repaints them', () => {
    const cols: DuncitColumn<Row>[] = [
      { field: 'name', headerName: 'Name', type: 'text' },
      { field: 'score', headerName: 'Score', type: 'number', cellRenderer: (row) => <b>{row.score}</b> },
    ];
    const defs = buildColDefs(cols, {}, null, 'asc', fallbackT);
    // A plain-text cell IS its value, so AG Grid's `===` gate stays.
    expect(defs[0].equals).toBeUndefined();
    // A renderer draws from the whole row: identical values must still repaint.
    expect(defs[1].equals?.(3, 3)).toBe(false);
  });
});
