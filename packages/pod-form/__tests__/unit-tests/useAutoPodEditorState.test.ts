import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useAutoPodEditorState, {
  type UseAutoPodEditorStateArgs,
} from '../../src/editor/useAutoPodEditorState';
import type { AutoPodTemplateRow } from '../../src/build-input';
import { blankAutoPodFormValues, AUTO_POD_TYPE, type PodFormValues } from '../../src/types';

const baseArgs = (over: Partial<UseAutoPodEditorStateArgs> = {}): UseAutoPodEditorStateArgs => ({
  submitCreate: vi.fn().mockResolvedValue({ id: 'new' }),
  submitUpdate: vi.fn().mockResolvedValue({ id: 'up' }),
  onSaved: vi.fn(),
  ...over,
});

const values = (over: Partial<PodFormValues> = {}): PodFormValues => ({
  ...blankAutoPodFormValues,
  pod_title: 'Morning Badminton',
  sub_category_id: 'sub-badminton',
  pod_amount: 500,
  no_of_spots: 8,
  media_text: 'https://cdn.example.com/court.jpg',
  ...over,
});

const TEMPLATE: AutoPodTemplateRow & { id: string } = {
  id: 'auto-1',
  pod_title: 'Evening Chess',
  pod_description: 'Blitz rounds at the club.',
  pod_images_and_videos: [{ url: 'https://cdn.example.com/board.jpg', type: 'IMAGE' }],
  super_category_id: 'sup-games',
  sub_category_id: 'sub-chess',
  pod_amount: 300,
  no_of_spots: 12,
};

describe('useAutoPodEditorState', () => {
  it('seeds a create with the paid template defaults merged over createDefaults', () => {
    const { result } = renderHook(() =>
      useAutoPodEditorState(baseArgs({ createDefaults: { sub_category_id: 'sub-fixed' } })),
    );
    expect(result.current.initialValues.sub_category_id).toBe('sub-fixed');
    expect(result.current.initialValues.pod_type).toBe(AUTO_POD_TYPE);
    expect(result.current.initialValues.pod_amount).toBe(1);
    expect(result.current.initialValues.no_of_spots).toBe(2);
    expect(result.current.busy).toBe(false);
    expect(result.current.opError).toBeNull();
  });

  it('seeds an edit from the Auto Pod row', () => {
    const { result } = renderHook(() =>
      useAutoPodEditorState(baseArgs({ editingAutoPod: TEMPLATE })),
    );
    expect(result.current.initialValues.pod_title).toBe('Evening Chess');
    expect(result.current.initialValues.sub_category_id).toBe('sub-chess');
    expect(result.current.initialValues.media_text).toBe('https://cdn.example.com/board.jpg');
  });

  it('re-seeds on a different row, never on a merely new defaults object', () => {
    const { result, rerender } = renderHook(
      (args: UseAutoPodEditorStateArgs) => useAutoPodEditorState(args),
      { initialProps: baseArgs({ createDefaults: { sub_category_id: 'first' } }) },
    );
    const seeded = result.current.initialValues;
    rerender(baseArgs({ createDefaults: { sub_category_id: 'second' } }));
    expect(result.current.initialValues).toBe(seeded);
    rerender(baseArgs({ editingAutoPod: TEMPLATE }));
    expect(result.current.initialValues.pod_title).toBe('Evening Chess');
  });

  it('creates a template and reports the save meta', async () => {
    const submitCreate = vi.fn().mockResolvedValue({ id: 'new' });
    const onSaved = vi.fn();
    const { result } = renderHook(() => useAutoPodEditorState(baseArgs({ submitCreate, onSaved })));
    await act(async () => {
      await result.current.submit(values());
    });
    expect(submitCreate).toHaveBeenCalledTimes(1);
    expect(submitCreate.mock.calls[0][0].pod_title).toBe('Morning Badminton');
    expect(submitCreate.mock.calls[0][0].sub_category_id).toBe('sub-badminton');
    expect(onSaved).toHaveBeenCalledWith({ created: true });
    expect(result.current.busy).toBe(false);
  });

  it('updates the open template through its document id', async () => {
    const submitUpdate = vi.fn().mockResolvedValue({ id: 'up' });
    const onSaved = vi.fn();
    const { result } = renderHook(() =>
      useAutoPodEditorState(baseArgs({ submitUpdate, onSaved, editingAutoPod: TEMPLATE })),
    );
    await act(async () => {
      await result.current.submit(values({ pod_title: 'Renamed' }));
    });
    const [docId, input] = submitUpdate.mock.calls[0];
    expect(docId).toBe('auto-1');
    expect(input.pod_title).toBe('Renamed');
    expect(onSaved).toHaveBeenCalledWith({ created: false });
  });

  it('captures a submit error, clears busy and skips onSaved', async () => {
    const submitCreate = vi.fn().mockRejectedValue(new Error('server down'));
    const onSaved = vi.fn();
    const { result } = renderHook(() => useAutoPodEditorState(baseArgs({ submitCreate, onSaved })));
    await act(async () => {
      await result.current.submit(values());
    });
    expect(result.current.opError).toBe('server down');
    expect(result.current.busy).toBe(false);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('spells out a content refusal rule by rule, and clears it on the next submit', async () => {
    const refusal = Object.assign(new Error('Your pod content violates the community guidelines'), {
      extensions: {
        code: 'POD_CONTENT_REJECTED',
        violations: [{ field: 'pod_description', message: 'Contact details are not allowed' }],
      },
    });
    const submitCreate = vi.fn().mockRejectedValueOnce(refusal).mockResolvedValueOnce({ id: 'new' });
    const { result } = renderHook(() => useAutoPodEditorState(baseArgs({ submitCreate })));
    await act(async () => {
      await result.current.submit(values());
    });
    expect(result.current.opError).toBe(
      'Your pod content violates the community guidelines\n• Contact details are not allowed',
    );
    await act(async () => {
      await result.current.submit(values());
    });
    expect(result.current.opError).toBeNull();
  });
});
