import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import usePodEditorState, { type UsePodEditorStateArgs } from '../../src/editor/usePodEditorState';
import { blankPodFormValues, type PodFormValues } from '../../src/types';
import { makeConfig } from './helpers';

const baseArgs = (over: Partial<UsePodEditorStateArgs> = {}): UsePodEditorStateArgs => ({
  config: makeConfig({ showVenueSlot: true, showIsActive: true }),
  submitCreate: vi.fn().mockResolvedValue({ id: 'new' }),
  submitUpdate: vi.fn().mockResolvedValue({ id: 'up' }),
  onSaved: vi.fn(),
  ...over,
});

const values = (over: Partial<PodFormValues> = {}): PodFormValues => ({
  ...blankPodFormValues,
  pod_title: 'Pod',
  club_id: 'c1',
  pod_mode: 'PHYSICAL',
  venue_id: 'v1',
  venue_slot_id: 's1',
  media_text: 'https://a.com/x.jpg',
  ...over,
});

/** The server's refusal of a pod write, as Apollo hands it to the portal. */
const contentRejection = () =>
  Object.assign(new Error('Your pod content violates the community guidelines'), {
    graphQLErrors: [
      {
        message: 'Your pod content violates the community guidelines',
        extensions: {
          code: 'POD_CONTENT_REJECTED',
          violations: [{ field: 'pod_title', message: 'Hate speech', evidence: 'bad word' }],
        },
      },
    ],
  });

describe('usePodEditorState', () => {
  it('seeds the create form with the blank values merged over the defaults', () => {
    const { result } = renderHook(() =>
      usePodEditorState(baseArgs({ createDefaults: { club_id: 'pinned' } })),
    );
    expect(result.current.initialValues).toEqual({ ...blankPodFormValues, club_id: 'pinned' });
    expect(result.current.editingPodDocId).toBeUndefined();
    expect(result.current.busy).toBe(false);
    expect(result.current.opError).toBeNull();
  });

  it('seeds the edit form from the pod and exposes its document id', () => {
    const { result } = renderHook(() =>
      usePodEditorState(baseArgs({ editingPod: { id: 'doc-1', pod_id: 'p1', pod_title: 'Existing' } })),
    );
    expect(result.current.initialValues.pod_title).toBe('Existing');
    expect(result.current.initialValues.pod_id).toBe('p1');
    expect(result.current.editingPodDocId).toBe('doc-1');
  });

  it('collapses a legacy multi-host pod to its first host when singleHost is on', () => {
    const { result } = renderHook(() =>
      usePodEditorState(
        baseArgs({
          config: makeConfig({ showHosts: true, singleHost: true }),
          editingPod: { id: 'doc-3', pod_hosts_id: ['u1', 'u2'] },
        }),
      ),
    );
    expect(result.current.initialValues.pod_hosts_id).toEqual(['u1']);
  });

  it('keeps every host when singleHost is off', () => {
    const { result } = renderHook(() =>
      usePodEditorState(
        baseArgs({
          config: makeConfig({ showHosts: true }),
          editingPod: { id: 'doc-4', pod_hosts_id: ['u1', 'u2'] },
        }),
      ),
    );
    expect(result.current.initialValues.pod_hosts_id).toEqual(['u1', 'u2']);
  });

  it('re-seeds only when a different pod opens, never for a merely new defaults object', () => {
    const { result, rerender } = renderHook(
      (args: UsePodEditorStateArgs) => usePodEditorState(args),
      { initialProps: baseArgs({ createDefaults: { club_id: 'first' } }) },
    );
    const seeded = result.current.initialValues;
    // Callers build `createDefaults` inline, so it is a new object every render.
    rerender(baseArgs({ createDefaults: { club_id: 'second' } }));
    expect(result.current.initialValues).toBe(seeded);
    expect(result.current.initialValues.club_id).toBe('first');
    // A pod opening is a real change of subject.
    rerender(baseArgs({ editingPod: { id: 'doc-7', pod_title: 'Opened' } }));
    expect(result.current.initialValues.pod_title).toBe('Opened');
  });

  it('creates a pod and reports the save meta', async () => {
    const submitCreate = vi.fn().mockResolvedValue({ id: 'new' });
    const onSaved = vi.fn();
    const { result } = renderHook(() => usePodEditorState(baseArgs({ submitCreate, onSaved })));
    await act(async () => {
      await result.current.submit(values({ pod_id: 'wanted' }), { draft: false });
    });
    expect(submitCreate).toHaveBeenCalledTimes(1);
    expect(submitCreate.mock.calls[0][0].pod_id).toBe('wanted');
    expect(onSaved).toHaveBeenCalledWith({ created: true, draft: false });
    expect(result.current.busy).toBe(false);
  });

  it('leaves pod_id undefined on create when the form holds none', async () => {
    const submitCreate = vi.fn().mockResolvedValue({ id: 'new' });
    const { result } = renderHook(() => usePodEditorState(baseArgs({ submitCreate })));
    await act(async () => {
      await result.current.submit(values({ pod_id: '' }), { draft: true });
    });
    expect(submitCreate.mock.calls[0][0].pod_id).toBeUndefined();
    expect(submitCreate.mock.calls[0][0].is_active).toBe(false);
  });

  it('updates a pod, keeps an unchanged slot out of the input and is_active authoritative', async () => {
    const submitUpdate = vi.fn().mockResolvedValue({ id: 'up' });
    const onSaved = vi.fn();
    // The pod is already on slot s1, and the form still holds s1 — re-saving
    // must not release and re-request the venue's approval.
    const { result } = renderHook(() =>
      usePodEditorState(baseArgs({ submitUpdate, onSaved, editingPod: { id: 'doc-9', venue_slot_id: 's1' } })),
    );
    await act(async () => {
      await result.current.submit(values({ is_active: false }), { draft: false });
    });
    expect(submitUpdate).toHaveBeenCalledTimes(1);
    const [docId, input] = submitUpdate.mock.calls[0];
    expect(docId).toBe('doc-9');
    expect('venue_slot_id' in input).toBe(false);
    expect(input.is_active).toBe(false);
    expect(onSaved).toHaveBeenCalledWith({ created: false, draft: false });
  });

  it('sends a CHANGED slot on update — the portal re-route that rescues a rejected pod', async () => {
    const submitUpdate = vi.fn().mockResolvedValue({ id: 'up' });
    // The pod sits on the slot its venue rejected (none held); the form picks s1.
    const { result } = renderHook(() =>
      usePodEditorState(baseArgs({ submitUpdate, editingPod: { id: 'doc-9', venue_slot_id: null } })),
    );
    await act(async () => {
      await result.current.submit(values(), { draft: false });
    });
    expect(submitUpdate.mock.calls[0][1].venue_slot_id).toBe('s1');
  });

  it('never sends a slot for a virtual pod, which has none on either side', async () => {
    const submitUpdate = vi.fn().mockResolvedValue({ id: 'up' });
    const { result } = renderHook(() =>
      usePodEditorState(baseArgs({ submitUpdate, editingPod: { id: 'doc-v' } })),
    );
    await act(async () => {
      await result.current.submit(
        values({ pod_mode: 'VIRTUAL', meeting_url: 'https://meet.example.com/x' }),
        { draft: false },
      );
    });
    expect('venue_slot_id' in submitUpdate.mock.calls[0][1]).toBe(false);
  });

  it('does not override is_active on a draft update', async () => {
    const submitUpdate = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() =>
      usePodEditorState(baseArgs({ submitUpdate, editingPod: { id: 'doc-2' } })),
    );
    await act(async () => {
      await result.current.submit(values({ is_active: true }), { draft: true });
    });
    // buildPodInput sets is_active = !draft = false for a draft; no override applied
    expect(submitUpdate.mock.calls[0][1].is_active).toBe(false);
  });

  it('does not override is_active when the config hides the toggle', async () => {
    const submitUpdate = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() =>
      usePodEditorState(
        baseArgs({ submitUpdate, config: makeConfig({ showVenueSlot: true }), editingPod: { id: 'doc-5' } }),
      ),
    );
    await act(async () => {
      await result.current.submit(values({ is_active: false }), { draft: false });
    });
    // A publish is live; the hidden toggle's value never reaches the server.
    expect(submitUpdate.mock.calls[0][1].is_active).toBe(true);
  });

  it('captures the submit error and clears busy', async () => {
    const submitCreate = vi.fn().mockRejectedValue(new Error('server down'));
    const onSaved = vi.fn();
    const { result } = renderHook(() => usePodEditorState(baseArgs({ submitCreate, onSaved })));
    await act(async () => {
      await result.current.submit(values(), { draft: false });
    });
    expect(result.current.opError).toBe('server down');
    expect(result.current.busy).toBe(false);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('spells out a content refusal rule by rule instead of the bare headline', async () => {
    const submitCreate = vi.fn().mockRejectedValue(contentRejection());
    const { result } = renderHook(() => usePodEditorState(baseArgs({ submitCreate })));
    await act(async () => {
      await result.current.submit(values(), { draft: false });
    });
    expect(result.current.opError).toBe(
      'Your pod content violates the community guidelines\n• Hate speech ("bad word")',
    );
  });

  it('clears a previous error when the next submit starts', async () => {
    const submitCreate = vi
      .fn()
      .mockRejectedValueOnce(new Error('first'))
      .mockResolvedValueOnce({ id: 'new' });
    const { result } = renderHook(() => usePodEditorState(baseArgs({ submitCreate })));
    await act(async () => {
      await result.current.submit(values(), { draft: false });
    });
    expect(result.current.opError).toBe('first');
    await act(async () => {
      await result.current.submit(values(), { draft: false });
    });
    expect(result.current.opError).toBeNull();
  });
});
