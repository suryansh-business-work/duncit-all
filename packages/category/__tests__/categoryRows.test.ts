import { describe, expect, it } from 'vitest';
import { categoryRowsMessage, duplicateCategoryRows, isCompleteCategory } from '../src/categoryRows';

describe('isCompleteCategory', () => {
  it('is true only when Super, Category and Sub are all chosen', () => {
    expect(isCompleteCategory({ super_id: 's1', category_id: 'c1', sub_id: 'u1' })).toBe(true);
    expect(isCompleteCategory({ super_id: '', category_id: 'c1', sub_id: 'u1' })).toBe(false);
    expect(isCompleteCategory({ super_id: 's1', category_id: '', sub_id: 'u1' })).toBe(false);
    expect(isCompleteCategory({ super_id: 's1', category_id: 'c1', sub_id: '' })).toBe(false);
  });

  it('treats a missing row as incomplete', () => {
    expect(isCompleteCategory(null)).toBe(false);
    expect(isCompleteCategory(undefined)).toBe(false);
  });
});

describe('duplicateCategoryRows', () => {
  it('flags every later row that repeats a sub category, never the first to name it', () => {
    const rows = [{ sub_id: 'u1' }, { sub_id: 'u2' }, { sub_id: 'u1' }, { sub_id: 'u1' }];
    expect([...duplicateCategoryRows(rows)]).toEqual([2, 3]);
  });

  it('never calls two rows with no sub category chosen duplicates of each other', () => {
    expect(duplicateCategoryRows([{ sub_id: '' }, { sub_id: '' }]).size).toBe(0);
  });

  it('finds nothing in a list of distinct sub categories, or an empty list', () => {
    expect(duplicateCategoryRows([{ sub_id: 'u1' }, { sub_id: 'u2' }]).size).toBe(0);
    expect(duplicateCategoryRows([]).size).toBe(0);
  });
});

describe('categoryRowsMessage', () => {
  it('reads the list-level message a field array files under root', () => {
    expect(categoryRowsMessage({ root: { message: 'Add at least one category' } })).toBe('Add at least one category');
  });

  it('reads the message of a plain field error', () => {
    expect(categoryRowsMessage({ message: 'Too many categories' })).toBe('Too many categories');
  });

  it('prefers the root message when both are present', () => {
    expect(categoryRowsMessage({ root: { message: 'root' }, message: 'plain' })).toBe('root');
  });

  it('is empty for per-row errors, a non-text message and no error at all', () => {
    expect(categoryRowsMessage([{ message: 'row 0 is incomplete' }])).toBe('');
    expect(categoryRowsMessage({ message: 42 })).toBe('');
    expect(categoryRowsMessage(undefined)).toBe('');
    expect(categoryRowsMessage(null)).toBe('');
    expect(categoryRowsMessage('nope')).toBe('');
  });
});
