import type React from 'react';
import type { ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
import { describe, expect, it } from 'vitest';
import { buildColDefs, isColumnHidden } from '../src/columnDefs';
import type { DuncitColumn } from '../src/types';

type Row = { id: string; name: string; score: number };

const columns: DuncitColumn<Row>[] = [
  { field: 'name', headerName: 'Name', flex: 1, minWidth: 120 },
  { field: 'score', headerName: 'Score', width: 90, sortable: false, hide: true },
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
  it('maps fields, sizing, sortable default and hidden overrides', () => {
    const defs = buildColDefs(columns, { score: false }, null, 'asc');
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

  it('controlled sort lands on the right column only', () => {
    const defs = buildColDefs(columns, {}, 'score', 'desc');
    expect(defs[0].sort).toBeNull();
    expect(defs[1].sort).toBe('desc');
  });

  it('valueGetter falls back to the field, uses the custom fn when given', () => {
    const withGetter: DuncitColumn<Row>[] = [
      { field: 'name', headerName: 'Name' },
      { field: 'score', headerName: 'Score', valueGetter: (row) => row.score * 2 },
    ];
    const defs = buildColDefs(withGetter, {}, null, 'asc');
    const row: Row = { id: '1', name: 'Alice', score: 3 };
    const getterOf = (i: number) => defs[i].valueGetter as (p: ValueGetterParams<Row>) => unknown;
    expect(getterOf(0)({ data: row } as ValueGetterParams<Row>)).toBe('Alice');
    expect(getterOf(1)({ data: row } as ValueGetterParams<Row>)).toBe(6);
    expect(getterOf(0)({ data: undefined } as ValueGetterParams<Row>)).toBeUndefined();
  });

  it('wraps cellRenderer to receive the row; absent renderer stays undefined', () => {
    const withRenderer: DuncitColumn<Row>[] = [
      { field: 'name', headerName: 'Name', cellRenderer: (row) => <b>{row.name}</b> },
      { field: 'score', headerName: 'Score' },
    ];
    const defs = buildColDefs(withRenderer, {}, null, 'asc');
    const renderer = defs[0].cellRenderer as (p: ICellRendererParams<Row>) => React.ReactNode;
    const row: Row = { id: '1', name: 'Alice', score: 3 };
    expect(renderer({ data: row } as ICellRendererParams<Row>)).toEqual(<b>Alice</b>);
    expect(renderer({ data: undefined } as ICellRendererParams<Row>)).toBeNull();
    expect(defs[1].cellRenderer).toBeUndefined();
  });
});
