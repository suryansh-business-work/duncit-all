import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useClubAdminPodEditor from '../../src/club-admin/useClubAdminPodEditor';
import { CLUB_ADMIN_POD_CONFIG, getClubVenueIds } from '../../src/club-admin/config';
import { blankPodFormValues, type PodFormValues } from '../../src/types';

const { createPod, updatePod, query } = vi.hoisted(() => ({
  createPod: vi.fn().mockResolvedValue({ data: { clubAdminCreatePod: { id: 'new' } } }),
  updatePod: vi.fn().mockResolvedValue({ data: { clubAdminUpdatePod: { id: 'doc-1' } } }),
  query: vi.fn(),
}));

vi.mock('@apollo/client', () => ({
  gql: (s: TemplateStringsArray) => s.join(''),
}));
vi.mock('@duncit/pod-product-picker', () => ({ POD_PICKER_PRODUCT_FIELDS: '' }));
vi.mock('@apollo/client/react', () => ({
  useApolloClient: () => ({ query }),
  // The gql mock above leaves each document as its text, so the operation name
  // says which mutation the hook registered.
  useMutation: (document: string) => [
    document.includes('mutation ClubAdminUpdatePod') ? updatePod : createPod,
  ],
}));

const values = (over: Partial<PodFormValues> = {}): PodFormValues => ({
  ...blankPodFormValues,
  pod_title: 'Sunday Badminton',
  club_id: 'club-1',
  pod_mode: 'PHYSICAL',
  venue_id: 'v1',
  venue_slot_id: 's1',
  media_text: 'https://cdn.example.com/court.jpg',
  ...over,
});

describe('useClubAdminPodEditor', () => {
  it('pins every save to the club — create, then update — and reports the meta', async () => {
    const onSaved = vi.fn();
    const { result, rerender } = renderHook(
      (editingPod: any) => useClubAdminPodEditor({ clubId: 'club-1', editingPod, onSaved }),
      { initialProps: null },
    );
    expect(result.current.initialValues.club_id).toBe('club-1');
    expect(result.current.hostSeed).toEqual([]);

    await act(async () => {
      await result.current.submit(values({ club_id: 'other' }), { draft: false });
    });
    expect(createPod.mock.calls[0][0].variables.input.club_id).toBe('club-1');
    expect(onSaved).toHaveBeenCalledWith({ created: true, draft: false });

    rerender({ id: 'doc-1', venue_slot_id: 's1', pod_hosts_id: ['u1', 'u2'], host_names: ['Asha Rao'] });
    await act(async () => {
      await result.current.submit(values(), { draft: false });
    });
    const { variables } = updatePod.mock.calls[0][0];
    expect(variables.pod_doc_id).toBe('doc-1');
    expect(variables.input.club_id).toBe('club-1');
  });

  it('labels the preselected hosts from host_names and falls back to the id', () => {
    const { result } = renderHook(() =>
      useClubAdminPodEditor({
        clubId: 'club-1',
        editingPod: { id: 'doc-2', pod_hosts_id: ['u1', 'u2'], host_names: ['Asha Rao'] },
        onSaved: vi.fn(),
      }),
    );
    expect(result.current.hostSeed).toEqual([
      { user_id: 'u1', full_name: 'Asha Rao' },
      { user_id: 'u2', full_name: 'u2' },
    ]);
  });

  it('searches hosts through the club-scoped query and reads an empty answer as none', async () => {
    query.mockResolvedValueOnce({ data: { clubAdminHostSearch: [{ user_id: 'u1', full_name: 'Asha Rao' }] } });
    query.mockResolvedValueOnce({ data: undefined });
    const { result } = renderHook(() =>
      useClubAdminPodEditor({ clubId: 'club-1', onSaved: vi.fn() }),
    );
    await expect(result.current.searchHosts('asha')).resolves.toEqual([
      { user_id: 'u1', full_name: 'Asha Rao' },
    ]);
    expect(query.mock.calls[0][0].variables).toEqual({ search: 'asha' });
    await expect(result.current.searchHosts('')).resolves.toEqual([]);
    // A blank term asks for every host rather than for the empty string.
    expect(query.mock.calls[1][0].variables).toEqual({ search: undefined });
  });

  it('ships the native-parity config and the partner club venue accessor', () => {
    expect(CLUB_ADMIN_POD_CONFIG).toMatchObject({ showVenueSlot: true, showProducts: true, requireHosts: false });
    expect(getClubVenueIds({ meetup_venues_id: ['v1', 'v2'] })).toEqual(['v1', 'v2']);
    expect(getClubVenueIds(undefined)).toEqual([]);
  });
});
