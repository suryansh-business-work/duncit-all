import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import { VENUE_DETAIL } from '../../../src/venues/detail/queries';
import { VENUE_ID, calls, configMock, loadedEdit, mount } from './useVenueEditor.kit';

/** Loading one venue: the record, the option catalogues, and the schema they bound. */
const session = vi.hoisted(() => ({ roles: ['SUPER_ADMIN'] as string[] }));

vi.mock('@duncit/user-context', () => ({
  useUserData: () => ({ user: { roles: session.roles } }),
}));

beforeEach(() => {
  calls.log.length = 0;
  session.roles = ['SUPER_ADMIN'];
});

describe('useVenueEditor / loading', () => {
  it('starts blank, with no category row and no cap, while registering a venue', () => {
    const { result } = mount('/venues/new', '', []);
    const { editor } = result.current;

    expect(editor.isEdit).toBe(false);
    expect(editor.venue).toBeNull();
    expect(editor.loading).toBe(false);
    expect(editor.form.getValues('categories')).toEqual([]);
    expect(editor.config.category_limit).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('hydrates the form from the stored venue, one row per category', async () => {
    const { result } = await loadedEdit([]);

    expect(result.current.editor.isEdit).toBe(true);
    await waitFor(() =>
      expect(result.current.editor.form.getValues('categories').map((row) => row.sub_name)).toEqual([
        'Catan Night',
        'Pub Quiz',
      ]),
    );
  });

  it('reads the option catalogues, the category cap among them, from the server', async () => {
    const { result } = await loadedEdit([], configMock({ category_limit: 3 }));
    await waitFor(() => expect(result.current.editor.config.category_limit).toBe(3));
    expect(result.current.editor.config.venue_types).toEqual(['Cafe', 'Turf']);
  });

  it('holds the form to the cap the server states', async () => {
    // The stored venue has two categories; a cap of one must refuse the list.
    const { result } = await loadedEdit([], configMock({ category_limit: 1 }));
    await waitFor(() => expect(result.current.editor.config.category_limit).toBe(1));
    await waitFor(() => expect(result.current.editor.form.getValues('categories')).toHaveLength(2));

    let passed = true;
    await act(async () => {
      passed = await result.current.editor.form.trigger('categories');
    });

    expect(passed).toBe(false);
    const { error } = result.current.editor.form.getFieldState('categories');
    expect(error?.root?.message ?? error?.message).toBe('A venue can have only 1 category.');
  });

  it('reports a failed read as the query error', async () => {
    const view = mount(`/venues/${VENUE_ID}/edit`, VENUE_ID, [
      {
        request: { query: VENUE_DETAIL, variables: { venue_doc_id: VENUE_ID } },
        result: { errors: [new GraphQLError('Forbidden')] },
      },
      configMock(),
    ]);
    await waitFor(() => expect(view.result.current.editor.error?.message).toBe('Forbidden'));
  });
});
