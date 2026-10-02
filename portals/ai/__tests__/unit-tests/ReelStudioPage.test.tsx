import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route } from 'react-router';
import { AI_PROMPTS } from '@duncit/ai-prompts';
import { notifyError } from '@duncit/dialogs';
import { REEL_DRIVE_STATUS, REEL_PROJECT, UPDATE_REEL_PROJECT } from '../../src/pages/reels/queries';
import ReelStudioPage from '../../src/pages/reels/studio';
import LazyReelStudioPage from '../../src/pages/reels/studio/lazy';
import type { ReelProject } from '../../src/pages/reels/types';
import { renderWithProviders } from '../testkit';
import { answerQuery, mutationOf, queryOptions, resetApollo } from './reel-apollo-mock';

const renderer = vi.hoisted(() => ({ canRenderMediaOnWeb: vi.fn(), renderMediaOnWeb: vi.fn() }));

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('./reel-apollo-mock')).hooks,
}));

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  useConfirm: () => vi.fn(),
}));

vi.mock('@duncit/logs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/logs')>();
  return { ...actual, logs: { ...actual.logs, portal: { ...actual.logs.portal, ai: { error: vi.fn() } } } };
});

vi.mock('@remotion/player', () => ({ Player: () => <div data-testid="reel-player" /> }));
vi.mock('@remotion/web-renderer', () => renderer);
vi.mock('../../src/pages/reels/composition/ReelComposition', () => ({ ReelComposition: () => null }));
vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  default: () => null,
}));

const FOLDER_URL = 'https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp';

const project = (over: Partial<ReelProject> = {}): ReelProject =>
  ({
    id: 'DUN-REEL-1',
    name: 'Jam night recap',
    drive_url: '',
    drive_folder_id: '',
    duration_ms: 2000,
    assets: [],
    messages: [],
    spec: {
      fps: 30,
      width: 1080,
      height: 1920,
      background: '#000000',
      music: null,
      scenes: [{ id: 's1', asset_id: '', duration_ms: 2000, transition_ms: 0, transition: 'NONE', overlays: [], texts: [] }],
    },
    ...over,
  }) as unknown as ReelProject;

const mount = (page = <ReelStudioPage />, entry = '/reels/DUN-REEL-1') =>
  renderWithProviders(page, {
    initialEntries: [entry],
    routes: (
      <>
        <Route path="/reels" element={<div data-testid="list-route" />} />
        <Route path="/reels/:projectId" element={page} />
        <Route path="/studio" element={page} />
      </>
    ),
  });

beforeEach(() => {
  resetApollo();
  renderer.canRenderMediaOnWeb.mockReset();
  renderer.renderMediaOnWeb.mockReset();
  vi.mocked(notifyError).mockClear();
  answerQuery(AI_PROMPTS, { data: { aiPrompts: [] } });
  answerQuery(REEL_DRIVE_STATUS, { data: { reelDriveStatus: { configured: true, service_account_email: 'reels@duncit-drive.iam.gserviceaccount.com' } } });
});

describe('ReelStudioPage — which reel', () => {
  it('goes back to the list when the address names no reel', () => {
    mount(undefined, '/studio');
    expect(screen.getByTestId('list-route')).toBeInTheDocument();
    expect(queryOptions.get(REEL_PROJECT)?.skip).toBe(true);
  });

  it('waits for the reel, and reads it by the id in the address', () => {
    answerQuery(REEL_PROJECT, { loading: true });
    mount();
    expect(screen.queryByTestId('reel-studio')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reel-studio-not-found')).not.toBeInTheDocument();
    expect(queryOptions.get(REEL_PROJECT)?.variables).toEqual({ id: 'DUN-REEL-1' });
  });

  it('says so when the reel no longer exists', () => {
    answerQuery(REEL_PROJECT, { data: { reelProject: null } });
    mount();
    expect(screen.getByTestId('reel-studio-not-found')).toBeInTheDocument();
  });

  it('reports a reel that could not be read', () => {
    answerQuery(REEL_PROJECT, { error: new Error('Access Denied') });
    mount();
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByTestId('reel-studio')).not.toBeInTheDocument();
  });

  it('keeps showing the reel it has while a newer copy is on its way', () => {
    answerQuery(REEL_PROJECT, { loading: true, data: { reelProject: project() } });
    mount();
    expect(screen.getByTestId('reel-studio')).toBeInTheDocument();
  });
});

describe('ReelStudioPage — the studio', () => {
  beforeEach(() => {
    answerQuery(REEL_PROJECT, { data: { reelProject: project() } });
  });

  it('lays out footage, the reel and the conversation on one screen', () => {
    mount();
    expect(screen.getByTestId('reel-sources-panel')).toBeInTheDocument();
    expect(screen.getByTestId('reel-preview-pane')).toBeInTheDocument();
    expect(screen.getByTestId('reel-chat-panel')).toBeInTheDocument();
    expect(screen.getByTestId('reel-player')).toBeInTheDocument();
  });

  it('renames the reel from the toolbar and closes the dialog once it is saved', async () => {
    mount();
    fireEvent.click(screen.getByTestId('reel-studio-edit-details'));
    expect(await screen.findByTestId('reel-project-name')).toHaveValue('Jam night recap');

    fireEvent.change(screen.getByTestId('reel-project-name'), { target: { value: 'Final cut' } });
    await waitFor(() => expect(screen.getByTestId('reel-project-submit')).toBeEnabled());
    fireEvent.submit(screen.getByTestId('reel-project-form'));

    await waitFor(() => expect(screen.queryByTestId('reel-project-form')).not.toBeInTheDocument());
    expect(mutationOf(UPDATE_REEL_PROJECT)).toHaveBeenCalledWith({
      variables: { id: 'DUN-REEL-1', input: { name: 'Final cut', drive_url: '' } },
    });
  });

  it('keeps the dialog open when the details could not be saved', async () => {
    mutationOf(UPDATE_REEL_PROJECT).mockRejectedValue(new Error('A reel name is at most 80 characters.'));
    mount();
    // The same dialog, reached from the footage pane's "add a folder link".
    fireEvent.click(screen.getByTestId('reel-drive-add-link'));
    fireEvent.change(await screen.findByTestId('reel-project-drive-url'), { target: { value: FOLDER_URL } });
    await waitFor(() => expect(screen.getByTestId('reel-project-submit')).toBeEnabled());
    fireEvent.submit(screen.getByTestId('reel-project-form'));

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('A reel name is at most 80 characters.'));
    expect(screen.getByTestId('reel-project-form')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('reel-project-cancel'));
    await waitFor(() => expect(screen.queryByTestId('reel-project-form')).not.toBeInTheDocument());
  });

  it('exports from the toolbar, and shows the dialog when the browser cannot encode the file', async () => {
    renderer.canRenderMediaOnWeb.mockResolvedValue({ canRender: false, issues: [{ severity: 'error', message: 'No H.264 encoder.' }] });
    mount();
    fireEvent.click(screen.getByTestId('reel-studio-export'));
    expect(await screen.findByTestId('reel-export-error')).toHaveTextContent('No H.264 encoder.');
    fireEvent.click(screen.getByTestId('reel-export-close'));
    await waitFor(() => expect(screen.queryByTestId('reel-export-dialog')).not.toBeInTheDocument());
  });
});

describe('the lazy studio route', () => {
  it('fetches the studio when a reel is opened', async () => {
    answerQuery(REEL_PROJECT, { data: { reelProject: project() } });
    mount(<LazyReelStudioPage />);
    expect(await screen.findByTestId('reel-studio')).toBeInTheDocument();
  });
});
