import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
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

describe('usePodEditorState', () => {
  it('opens the create dialog with merged defaults', () => {
    const { result } = renderHook(() =>
      usePodEditorState(baseArgs({ createDefaults: { club_id: 'pinned' } })),
    );
    act(() => result.current.openCreate());
    expect(result.current.open).toBe(true);
    expect(result.current.editingPod).toBeNull();
    expect(result.current.initialValues.club_id).toBe('pinned');
    expect(result.current.opError).toBeNull();
  });

  it('opens the edit dialog with hydrated values', () => {
    const { result } = renderHook(() => usePodEditorState(baseArgs()));
    act(() => result.current.openEdit({ id: 'doc-1', pod_id: 'p1', pod_title: 'Existing' }));
    expect(result.current.open).toBe(true);
    expect(result.current.editingPod).toEqual({ id: 'doc-1', pod_id: 'p1', pod_title: 'Existing' });
    expect(result.current.initialValues.pod_title).toBe('Existing');
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
    expect(result.current.open).toBe(false);
    expect(result.current.busy).toBe(false);
  });

  it('updates a pod, strips venue_slot_id and keeps is_active authoritative', async () => {
    const submitUpdate = vi.fn().mockResolvedValue({ id: 'up' });
    const onSaved = vi.fn();
    const { result } = renderHook(() => usePodEditorState(baseArgs({ submitUpdate, onSaved })));
    act(() => result.current.openEdit({ id: 'doc-9' }));
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

  it('does not override is_active on a draft update', async () => {
    const submitUpdate = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => usePodEditorState(baseArgs({ submitUpdate })));
    act(() => result.current.openEdit({ id: 'doc-2' }));
    await act(async () => {
      await result.current.submit(values({ is_active: true }), { draft: true });
    });
    // buildPodInput sets is_active = !draft = false for a draft; no override applied
    expect(submitUpdate.mock.calls[0][1].is_active).toBe(false);
  });

  it('captures the submit error and clears busy', async () => {
    const submitCreate = vi.fn().mockRejectedValue(new Error('server down'));
    const { result } = renderHook(() => usePodEditorState(baseArgs({ submitCreate })));
    await act(async () => {
      await result.current.submit(values(), { draft: false });
    });
    expect(result.current.opError).toBe('server down');
    expect(result.current.busy).toBe(false);
    expect(result.current.open).toBe(false);
  });

  it('closes the dialog', () => {
    const { result } = renderHook(() => usePodEditorState(baseArgs()));
    act(() => result.current.openCreate());
    act(() => result.current.close());
    expect(result.current.open).toBe(false);
  });

  it('opens the deep-linked pod once', async () => {
    const resolveEditPod = vi.fn().mockResolvedValue({ id: 'deep', pod_title: 'Deep' });
    const { result, rerender } = renderHook(
      (args: UsePodEditorStateArgs) => usePodEditorState(args),
      { initialProps: baseArgs({ editId: 'e1', resolveEditPod }) },
    );
    await waitFor(() => expect(result.current.open).toBe(true));
    expect(result.current.editingPod).toEqual({ id: 'deep', pod_title: 'Deep' });
    // re-render with the same editId does not refetch
    rerender(baseArgs({ editId: 'e1', resolveEditPod }));
    expect(resolveEditPod).toHaveBeenCalledTimes(1);
  });

  it('ignores a deep-link that resolves to no pod', async () => {
    const resolveEditPod = vi.fn().mockResolvedValue(null);
    const { result } = renderHook(() =>
      usePodEditorState(baseArgs({ editId: 'e2', resolveEditPod })),
    );
    await waitFor(() => expect(resolveEditPod).toHaveBeenCalled());
    expect(result.current.open).toBe(false);
  });

  it('swallows a deep-link resolver error', async () => {
    const resolveEditPod = vi.fn().mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() =>
      usePodEditorState(baseArgs({ editId: 'e3', resolveEditPod })),
    );
    await waitFor(() => expect(resolveEditPod).toHaveBeenCalled());
    expect(result.current.open).toBe(false);
  });

  it('does nothing on mount without an editId', () => {
    const resolveEditPod = vi.fn();
    renderHook(() => usePodEditorState(baseArgs({ resolveEditPod })));
    expect(resolveEditPod).not.toHaveBeenCalled();
  });
});
