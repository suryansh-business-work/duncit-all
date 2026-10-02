import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { AI_PROMPTS, CREATE_AI_PROMPT, DELETE_AI_PROMPT, type AiPrompt } from '@duncit/ai-prompts';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { downloadBlob } from '@duncit/utils';
import {
  ADD_REEL_DRIVE_ASSETS,
  REEL_DRIVE_FOLDER,
  REMOVE_REEL_ASSET,
  RESTORE_REEL_VERSION,
  SEND_REEL_MESSAGE,
  UPDATE_REEL_PROJECT,
} from '../../src/pages/reels/queries';
import { useReelChat } from '../../src/pages/reels/studio/chat/useReelChat';
import { useSavedPrompts } from '../../src/pages/reels/studio/chat/useSavedPrompts';
import { useReelExport } from '../../src/pages/reels/studio/export/useReelExport';
import { useDriveFolder } from '../../src/pages/reels/studio/sources/useDriveFolder';
import { useReelActions } from '../../src/pages/reels/studio/useReelActions';
import type { ReelDriveEntry, ReelProject } from '../../src/pages/reels/types';
import { answerQuery, mutationOf, queryOptions, resetApollo } from './reel-apollo-mock';

const confirm = vi.hoisted(() => vi.fn());
const renderer = vi.hoisted(() => ({ canRenderMediaOnWeb: vi.fn(), renderMediaOnWeb: vi.fn() }));

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('./reel-apollo-mock')).hooks,
}));

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  useConfirm: () => confirm,
}));

vi.mock('@duncit/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/utils')>()),
  downloadBlob: vi.fn(),
}));

vi.mock('@duncit/logs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/logs')>();
  return { ...actual, logs: { ...actual.logs, portal: { ...actual.logs.portal, ai: { error: vi.fn() } } } };
});

vi.mock('@remotion/web-renderer', () => renderer);

// The composition is only handed to the renderer here, never drawn.
vi.mock('../../src/pages/reels/composition/ReelComposition', () => ({ ReelComposition: () => null }));

const PROJECT_ID = 'DUN-REEL-1';
const failure = new Error('The server refused.');

beforeEach(() => {
  resetApollo();
  confirm.mockReset();
  renderer.canRenderMediaOnWeb.mockReset();
  renderer.renderMediaOnWeb.mockReset();
  vi.mocked(notifyError).mockClear();
  vi.mocked(notifySuccess).mockClear();
  vi.mocked(downloadBlob).mockClear();
});

describe('useReelActions', () => {
  const mount = () => renderHook(() => useReelActions(PROJECT_ID)).result;

  it('adds Drive files to the reel', async () => {
    const actions = mount();
    await act(() => actions.current.addDriveFiles(['file-1', 'file-2']));
    expect(mutationOf(ADD_REEL_DRIVE_ASSETS)).toHaveBeenCalledWith({
      variables: { project_id: PROJECT_ID, file_ids: ['file-1', 'file-2'] },
    });
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('removes a clip from the reel', async () => {
    const actions = mount();
    await act(() => actions.current.removeAsset('asset-1'));
    expect(mutationOf(REMOVE_REEL_ASSET)).toHaveBeenCalledWith({ variables: { project_id: PROJECT_ID, asset_id: 'asset-1' } });
  });

  it('puts an earlier version back and says so', async () => {
    const actions = mount();
    await act(() => actions.current.restoreVersion('message-1'));
    expect(mutationOf(RESTORE_REEL_VERSION)).toHaveBeenCalledWith({ variables: { project_id: PROJECT_ID, message_id: 'message-1' } });
    expect(notifySuccess).toHaveBeenCalledTimes(1);
  });

  it('saves the reel’s details and answers true, so the dialog closes', async () => {
    const actions = mount();
    let saved = false;
    await act(async () => {
      saved = await actions.current.saveDetails({ name: 'Final cut', drive_url: '' });
    });
    expect(saved).toBe(true);
    expect(mutationOf(UPDATE_REEL_PROJECT)).toHaveBeenCalledWith({
      variables: { id: PROJECT_ID, input: { name: 'Final cut', drive_url: '' } },
    });
    expect(notifySuccess).toHaveBeenCalledTimes(1);
  });

  it('reports each failure instead of throwing, and answers false for a save', async () => {
    for (const document of [ADD_REEL_DRIVE_ASSETS, REMOVE_REEL_ASSET, RESTORE_REEL_VERSION, UPDATE_REEL_PROJECT]) {
      mutationOf(document).mockRejectedValue(failure);
    }
    const actions = mount();
    let saved = true;
    await act(async () => {
      await actions.current.addDriveFiles(['file-1']);
      await actions.current.removeAsset('asset-1');
      await actions.current.restoreVersion('message-1');
      saved = await actions.current.saveDetails({ name: 'Final cut', drive_url: '' });
    });
    expect(saved).toBe(false);
    expect(notifyError).toHaveBeenCalledTimes(4);
    expect(notifyError).toHaveBeenLastCalledWith('The server refused.');
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});

describe('useReelChat', () => {
  it('shows the request as pending while the editor works, then clears it', async () => {
    let finish: (value: unknown) => void = () => undefined;
    mutationOf(SEND_REEL_MESSAGE).mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useReelChat(PROJECT_ID));
    expect(result.current).toMatchObject({ pending: null, sending: false });

    let sent: Promise<boolean> = Promise.resolve(false);
    act(() => {
      sent = result.current.send('open on the drums', ['https://ik.imagekit.io/duncit/ai/reels/drum%20kit.png']);
    });
    expect(result.current.sending).toBe(true);
    expect(result.current.pending).toEqual({
      text: 'open on the drums',
      imageUrls: ['https://ik.imagekit.io/duncit/ai/reels/drum%20kit.png'],
    });

    await act(async () => {
      finish({ data: {} });
      await sent;
    });
    await expect(sent).resolves.toBe(true);
    expect(result.current.pending).toBeNull();
  });

  it('names each picture by its own file name, and falls back when the address has none', async () => {
    const { result } = renderHook(() => useReelChat(PROJECT_ID));
    await act(() =>
      result.current.send('use these', [
        'https://ik.imagekit.io/duncit/ai/reels/drum%20kit.png',
        'https://ik.imagekit.io/duncit/ai/reels/',
        'not an address',
      ])
    );
    expect(mutationOf(SEND_REEL_MESSAGE)).toHaveBeenCalledWith({
      variables: {
        input: {
          project_id: PROJECT_ID,
          text: 'use these',
          uploads: [
            { url: 'https://ik.imagekit.io/duncit/ai/reels/drum%20kit.png', name: 'drum kit.png' },
            { url: 'https://ik.imagekit.io/duncit/ai/reels/', name: 'image' },
            { url: 'not an address', name: 'image' },
          ],
        },
      },
    });
  });

  it('answers false and says why when the turn fails, so the composer keeps the request', async () => {
    mutationOf(SEND_REEL_MESSAGE).mockRejectedValue(failure);
    const { result } = renderHook(() => useReelChat(PROJECT_ID));
    let sent = true;
    await act(async () => {
      sent = await result.current.send('open on the drums', []);
    });
    expect(sent).toBe(false);
    expect(notifyError).toHaveBeenCalledWith('The server refused.');
    expect(result.current.pending).toBeNull();
  });
});

describe('useSavedPrompts', () => {
  const prompt = { id: 'p1', name: 'Teaser', content: 'cut a 15 second teaser' } as AiPrompt;

  it('reads the studio’s own category from the AI Library', () => {
    answerQuery(AI_PROMPTS, { data: { aiPrompts: [prompt] } });
    const { result } = renderHook(() => useSavedPrompts());
    expect(result.current.prompts).toEqual([prompt]);
    expect(queryOptions.get(AI_PROMPTS)?.variables).toEqual({ filter: { kind: 'AI', category: 'Reel Studio', is_active: true } });
  });

  it('is an empty list before the library answers', () => {
    const { result } = renderHook(() => useSavedPrompts());
    expect(result.current.prompts).toEqual([]);
  });

  it('saves a request under the studio’s category and reads the list again', async () => {
    const refetch = answerQuery(AI_PROMPTS, { data: { aiPrompts: [] } });
    const { result } = renderHook(() => useSavedPrompts());
    let saved = false;
    await act(async () => {
      saved = await result.current.save({ name: 'Teaser', content: 'cut a 15 second teaser' });
    });
    expect(saved).toBe(true);
    expect(mutationOf(CREATE_AI_PROMPT)).toHaveBeenCalledWith({
      variables: { input: { name: 'Teaser', content: 'cut a 15 second teaser', category: 'Reel Studio' } },
    });
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(notifySuccess).toHaveBeenCalledTimes(1);
  });

  it('answers false and says why when a request cannot be saved', async () => {
    mutationOf(CREATE_AI_PROMPT).mockRejectedValue(failure);
    const { result } = renderHook(() => useSavedPrompts());
    let saved = true;
    await act(async () => {
      saved = await result.current.save({ name: 'Teaser', content: 'cut a teaser' });
    });
    expect(saved).toBe(false);
    expect(notifyError).toHaveBeenCalledWith('The server refused.');
  });

  it('asks before deleting a saved request, and leaves it when the answer is no', async () => {
    confirm.mockResolvedValue(false);
    const { result } = renderHook(() => useSavedPrompts());
    await act(() => result.current.remove(prompt));
    expect(confirm.mock.calls[0][0]).toMatchObject({ destructive: true, message: expect.stringContaining('Teaser') });
    expect(mutationOf(DELETE_AI_PROMPT)).not.toHaveBeenCalled();
  });

  it('deletes a saved request and reads the list again', async () => {
    confirm.mockResolvedValue(true);
    const refetch = answerQuery(AI_PROMPTS, { data: { aiPrompts: [prompt] } });
    const { result } = renderHook(() => useSavedPrompts());
    await act(() => result.current.remove(prompt));
    expect(mutationOf(DELETE_AI_PROMPT)).toHaveBeenCalledWith({ variables: { id: 'p1' } });
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(notifySuccess).toHaveBeenCalledTimes(1);
  });

  it('says why when a saved request cannot be deleted', async () => {
    confirm.mockResolvedValue(true);
    mutationOf(DELETE_AI_PROMPT).mockRejectedValue(failure);
    const { result } = renderHook(() => useSavedPrompts());
    await act(() => result.current.remove(prompt));
    expect(notifyError).toHaveBeenCalledWith('The server refused.');
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});

describe('useDriveFolder', () => {
  const folder = (id: string, name: string) => ({ id, name, kind: 'FOLDER' }) as ReelDriveEntry;
  const current = () => queryOptions.get(REEL_DRIVE_FOLDER)?.variables?.folder;

  it('opens on the reel’s own folder', () => {
    answerQuery(REEL_DRIVE_FOLDER, { data: { reelDriveFolder: { id: 'root', name: 'Jam shoot', entries: [], truncated: false } } });
    const { result } = renderHook(() => useDriveFolder('root'));
    expect(result.current.folder).toMatchObject({ name: 'Jam shoot' });
    expect(result.current.trail).toEqual([]);
    expect(current()).toBe('root');
  });

  it('steps down into sub-folders and back up, never above the root', () => {
    const { result } = renderHook(() => useDriveFolder('root'));
    expect(result.current.folder).toBeNull();

    act(() => result.current.enter(folder('day-1', 'Day 1')));
    act(() => result.current.enter(folder('cam-a', 'Camera A')));
    expect(result.current.trail).toEqual([
      { id: 'day-1', name: 'Day 1' },
      { id: 'cam-a', name: 'Camera A' },
    ]);
    expect(current()).toBe('cam-a');

    act(() => result.current.goTo(0));
    expect(current()).toBe('day-1');
    act(() => result.current.goTo(-1));
    expect(result.current.trail).toEqual([]);
    expect(current()).toBe('root');
  });

  it('forgets the path when the reel is given a different folder', () => {
    const { result, rerender } = renderHook(({ root }) => useDriveFolder(root), { initialProps: { root: 'root' } });
    act(() => result.current.enter(folder('day-1', 'Day 1')));
    rerender({ root: 'other-shoot' });
    expect(result.current.trail).toEqual([]);
    expect(current()).toBe('other-shoot');
  });

  it('asks nothing of Drive while the reel has no folder', () => {
    renderHook(() => useDriveFolder(''));
    expect(queryOptions.get(REEL_DRIVE_FOLDER)?.skip).toBe(true);
  });

  it('reads the folder again on demand, without surfacing a failed read as a crash', async () => {
    const refetch = answerQuery(REEL_DRIVE_FOLDER, {});
    refetch.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useDriveFolder('root'));
    await act(async () => result.current.reload());
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});

describe('useReelExport', () => {
  const project = {
    id: PROJECT_ID,
    name: 'Jam Night — Recap #2!',
    assets: [],
    spec: { fps: 30, width: 1080, height: 1920, background: '#000000', music: null, scenes: [{ id: 's1', duration_ms: 2000, transition_ms: 0 }] },
  } as unknown as ReelProject;

  const canRender = { canRender: true, issues: [] };
  const rendered = { getBlob: async () => new Blob(['mp4']) };

  it('renders the reel in the browser and saves it under the reel’s name', async () => {
    renderer.canRenderMediaOnWeb.mockResolvedValue(canRender);
    renderer.renderMediaOnWeb.mockImplementation(async ({ onProgress }: { onProgress: (state: { progress: number }) => void }) => {
      onProgress({ progress: 0.5 });
      return rendered;
    });
    const { result } = renderHook(() => useReelExport(project));
    expect(result.current.state).toEqual({ phase: 'idle' });

    await act(() => result.current.start());

    expect(renderer.canRenderMediaOnWeb).toHaveBeenCalledWith({ container: 'mp4', videoCodec: 'h264', width: 1080, height: 1920 });
    expect(renderer.renderMediaOnWeb).toHaveBeenCalledWith(
      expect.objectContaining({
        composition: expect.objectContaining({ id: 'reel', width: 1080, height: 1920, fps: 30, durationInFrames: 60 }),
        inputProps: { spec: project.spec, assets: project.assets },
        container: 'mp4',
        videoCodec: 'h264',
      })
    );
    expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'jam-night-recap-2.mp4');
    expect(notifySuccess).toHaveBeenCalledTimes(1);
    expect(result.current.state).toEqual({ phase: 'idle' });
  });

  it('reports progress while the render runs', async () => {
    let finish: (value: unknown) => void = () => undefined;
    let report: (state: { progress: number }) => void = () => undefined;
    renderer.canRenderMediaOnWeb.mockResolvedValue(canRender);
    renderer.renderMediaOnWeb.mockImplementation(({ onProgress }: { onProgress: typeof report }) => {
      report = onProgress;
      return new Promise((resolve) => (finish = resolve));
    });
    const { result } = renderHook(() => useReelExport(project));
    let done: Promise<void> = Promise.resolve();
    act(() => {
      done = result.current.start();
    });
    await waitFor(() => expect(renderer.renderMediaOnWeb).toHaveBeenCalled());
    expect(result.current.state).toEqual({ phase: 'rendering', progress: 0 });
    act(() => report({ progress: 0.4 }));
    expect(result.current.state).toEqual({ phase: 'rendering', progress: 0.4 });
    await act(async () => {
      finish(rendered);
      await done;
    });
  });

  it('names an unnamed reel’s file “reel”', async () => {
    renderer.canRenderMediaOnWeb.mockResolvedValue(canRender);
    renderer.renderMediaOnWeb.mockResolvedValue(rendered);
    const { result } = renderHook(() => useReelExport({ ...project, name: '—' }));
    await act(() => result.current.start());
    expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'reel.mp4');
  });

  it.each([
    [[{ severity: 'warning', message: 'slow' }, { severity: 'error', message: 'This browser cannot encode H.264.' }], 'This browser cannot encode H.264.'],
    [[], undefined],
  ])('fails before drawing a frame when the browser cannot encode the file: %#', async (issues, reason) => {
    renderer.canRenderMediaOnWeb.mockResolvedValue({ canRender: false, issues });
    const { result } = renderHook(() => useReelExport(project));
    await act(() => result.current.start());
    expect(renderer.renderMediaOnWeb).not.toHaveBeenCalled();
    expect(result.current.state.phase).toBe('failed');
    if (reason) expect(result.current.state).toEqual({ phase: 'failed', message: reason });

    act(() => result.current.dismiss());
    expect(result.current.state).toEqual({ phase: 'idle' });
  });

  it('reports a render that threw something other than an error', async () => {
    renderer.canRenderMediaOnWeb.mockResolvedValue(canRender);
    renderer.renderMediaOnWeb.mockRejectedValue('encoder crashed');
    const { result } = renderHook(() => useReelExport(project));
    await act(() => result.current.start());
    expect(result.current.state.phase).toBe('failed');
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it('goes quietly back to idle when the operator cancels', async () => {
    renderer.canRenderMediaOnWeb.mockResolvedValue(canRender);
    renderer.renderMediaOnWeb.mockImplementation(
      ({ signal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))))
    );
    const { result } = renderHook(() => useReelExport(project));
    // Cancelling before anything started is a no-op.
    act(() => result.current.cancel());

    let done: Promise<void> = Promise.resolve();
    act(() => {
      done = result.current.start();
    });
    await waitFor(() => expect(renderer.renderMediaOnWeb).toHaveBeenCalled());
    await act(async () => {
      result.current.cancel();
      await done;
    });
    expect(result.current.state).toEqual({ phase: 'idle' });
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});
