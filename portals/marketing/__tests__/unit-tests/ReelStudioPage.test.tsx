import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route } from 'react-router';
import { AI_PROMPTS } from '@duncit/ai-prompts';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { REEL_ANALYTICS, REEL_DRIVE_STATUS, REEL_PROJECT, SET_REEL_COVER, UPDATE_REEL_PROJECT } from '../../src/pages/reels/queries';
import ReelStudioPage from '../../src/pages/reels/studio';
import LazyReelStudioPage from '../../src/pages/reels/studio/lazy';
import type { ReelProject } from '../../src/pages/reels/types';
import { renderWithProviders } from '../testkit';
import { answerQuery, mutationOf, queryOptions, reelAnalytics, reelProject, reelScene, reelSpec, resetApollo } from '../mocks/reel-apollo-mock';

const renderer = vi.hoisted(() => ({ canRenderMediaOnWeb: vi.fn(), renderMediaOnWeb: vi.fn() }));
const upload = vi.hoisted(() => vi.fn());

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('../mocks/reel-apollo-mock')).hooks,
}));

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  useConfirm: () => vi.fn(),
}));

vi.mock('@duncit/logs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/logs')>();
  return { ...actual, logs: { ...actual.logs, portal: { ...actual.logs.portal, marketing: { error: vi.fn() } } } };
});

/** The signed-in marketer, for the guide kit's per-user tour record. */
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => ({ user: { user_id: 'u1' } }),
}));

vi.mock('@remotion/player', () => ({ Player: () => <div data-testid="reel-player" /> }));
vi.mock('@remotion/web-renderer', () => renderer);
vi.mock('../../src/pages/reels/composition/ReelComposition', () => ({ ReelComposition: () => null }));
vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  default: () => null,
  directUploadToImagekit: upload,
}));

/** The calendar's composer, as what it was opened with. */
vi.mock('../../src/pages/social-accounts-page/publish/ComposerDialog', () => ({
  default: ({
    request,
    accounts,
    onClose,
  }: {
    request: { text?: string; media_url?: string; reel_project_id?: string };
    accounts: unknown[];
    onClose: () => void;
  }) => (
    <div data-testid="reel-composer">
      <span data-testid="reel-composer-text">{request.text}</span>
      <span data-testid="reel-composer-media">{request.media_url}</span>
      <span data-testid="reel-composer-reel">{request.reel_project_id}</span>
      <span data-testid="reel-composer-accounts">{accounts.length}</span>
      <button type="button" data-testid="reel-composer-close" onClick={onClose} />
    </div>
  ),
}));
vi.mock('../../src/pages/social-accounts-page/useSocialSetup', () => ({
  useSocialSetup: () => ({ accounts: [{ id: 'acc-1' }, { id: 'acc-2' }], providers: [], loading: false, error: undefined, reload: vi.fn() }),
}));

const FOLDER_URL = 'https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp';

const project = (over: Partial<ReelProject> = {}): ReelProject =>
  reelProject({ duration_ms: 2000, spec: reelSpec({ scenes: [reelScene({ id: 's1', asset_id: '' })] }), ...over });

const mount = (page = <ReelStudioPage />, entry = '/studio/reels/DUN-REEL-1') =>
  renderWithProviders(page, {
    initialEntries: [entry],
    routes: (
      <>
        <Route path="/studio/reels" element={<div data-testid="list-route" />} />
        <Route path="/studio/reels/:projectId" element={page} />
        <Route path="/studio/reels-none" element={page} />
      </>
    ),
  });

beforeEach(() => {
  resetApollo();
  renderer.canRenderMediaOnWeb.mockReset();
  renderer.renderMediaOnWeb.mockReset();
  upload.mockReset();
  vi.mocked(notifyError).mockClear();
  vi.mocked(notifySuccess).mockClear();
  // The studio's tour has been seen: it does not open over the panes under test.
  localStorage.setItem('duncit.tours.completed.u1', '["marketing.reelStudio"]');
  answerQuery(AI_PROMPTS, { data: { aiPrompts: [] } });
  answerQuery(REEL_DRIVE_STATUS, { data: { reelDriveStatus: { configured: true, service_account_email: 'reels@duncit-drive.iam.gserviceaccount.com' } } });
});

describe('ReelStudioPage — which reel', () => {
  it('goes back to the list when the address names no reel', () => {
    mount(undefined, '/studio/reels-none');
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

  it('lays out footage, the reel, the conversation and the intro on one screen', () => {
    mount();
    expect(screen.getByTestId('reel-sources-panel')).toBeInTheDocument();
    expect(screen.getByTestId('reel-preview-pane')).toBeInTheDocument();
    expect(screen.getByTestId('reel-chat-panel')).toBeInTheDocument();
    expect(screen.getByTestId('reel-player')).toBeInTheDocument();
    expect(screen.getByTestId('page-intro')).toBeInTheDocument();
    expect(screen.queryByTestId('portal-tour')).not.toBeInTheDocument();
  });

  it('opens the tour from the intro and walks its anchors', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Start tour' }));
    expect(screen.getByTestId('portal-tour')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent('Chat, Create, Edit');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Sources');
  });

  it('offers Chat, Create and Edit on the right, and opens a selected scene in Edit', () => {
    mount();
    expect(screen.getByTestId('reel-timeline')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Create' }));
    expect(screen.getByTestId('reel-create-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('reel-chat-panel')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Edit' }));
    // Nothing selected: the reel's own settings.
    expect(screen.getByTestId('reel-settings-section')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('reel-timeline-scene-s1'));
    expect(screen.getByTestId('reel-scene-form')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Edit' })).toHaveAttribute('aria-selected', 'true');
    // Back to the reel's settings from the item's own heading.
    fireEvent.click(screen.getByTestId('reel-inspector-settings'));
    expect(screen.getByTestId('reel-settings-section')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Chat' }));
    expect(screen.getByTestId('reel-chat-panel')).toBeInTheDocument();
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

  it('makes the frame under the playhead the cover', async () => {
    mount();
    fireEvent.click(screen.getByTestId('reel-studio-cover'));
    await waitFor(() => expect(mutationOf(SET_REEL_COVER)).toHaveBeenCalledWith({ variables: { project_id: 'DUN-REEL-1', at_ms: 0 } }));
    expect(notifySuccess).toHaveBeenCalledTimes(1);
  });

  it('opens each tool from the toolbar and closes it again', async () => {
    answerQuery(REEL_ANALYTICS, { data: { reelAnalytics: reelAnalytics() } });
    mount();
    fireEvent.click(screen.getByTestId('reel-studio-validate'));
    expect(await screen.findByTestId('reel-validate-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reel-validate-close'));
    await waitFor(() => expect(screen.queryByTestId('reel-validate-dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByTestId('reel-studio-variants'));
    expect(await screen.findByTestId('reel-variants-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reel-variants-close'));
    await waitFor(() => expect(screen.queryByTestId('reel-variants-dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByTestId('reel-studio-history'));
    expect(await screen.findByTestId('reel-history-drawer')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reel-history-close'));
    await waitFor(() => expect(screen.queryByTestId('reel-history-drawer')).not.toBeInTheDocument());

    fireEvent.click(screen.getByTestId('reel-studio-analytics'));
    expect(await screen.findByTestId('reel-analytics-drawer')).toBeInTheDocument();
    expect(screen.getByTestId('reel-analytics-views')).toHaveTextContent('1,200');
    fireEvent.click(screen.getByTestId('reel-analytics-close'));
    await waitFor(() => expect(screen.queryByTestId('reel-analytics-drawer')).not.toBeInTheDocument());
  });

  it('exports from the toolbar, and shows the dialog when the browser cannot encode the file', async () => {
    renderer.canRenderMediaOnWeb.mockResolvedValue({ canRender: false, issues: [{ severity: 'error', message: 'No H.264 encoder.' }] });
    mount();
    fireEvent.click(screen.getByTestId('reel-studio-export'));
    expect(await screen.findByTestId('reel-export-error')).toHaveTextContent('No H.264 encoder.');
    fireEvent.click(screen.getByTestId('reel-export-close'));
    await waitFor(() => expect(screen.queryByTestId('reel-export-dialog')).not.toBeInTheDocument());
  });

  it('posts a rendered reel to social: uploads it, then opens the composer on it and the reel’s id', async () => {
    renderer.canRenderMediaOnWeb.mockResolvedValue({ canRender: true, issues: [] });
    renderer.renderMediaOnWeb.mockResolvedValue({ getBlob: async () => new Blob(['mp4']) });
    upload.mockImplementation(async (_client: unknown, _file: File, _folder: string, onProgress: (pct: number) => void) => {
      onProgress(40);
      return 'https://ik.imagekit.io/duncit/marketing/reels/jam-night-recap.mp4';
    });
    mount();
    fireEvent.click(screen.getByTestId('reel-studio-export'));
    expect(await screen.findByTestId('reel-export-ready')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('reel-export-post'));
    expect(await screen.findByTestId('reel-composer')).toBeInTheDocument();
    expect(upload).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: 'jam-night-recap.mp4', type: 'video/mp4' }),
      '/marketing/reels',
      expect.any(Function),
      'PORTALS'
    );
    // The export is over; the composer carries the reel's name, the uploaded file, the reel's id and the calendar's accounts.
    expect(screen.queryByTestId('reel-export-dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('reel-composer-text')).toHaveTextContent('Jam night recap');
    expect(screen.getByTestId('reel-composer-media')).toHaveTextContent('https://ik.imagekit.io/duncit/marketing/reels/jam-night-recap.mp4');
    expect(screen.getByTestId('reel-composer-reel')).toHaveTextContent('DUN-REEL-1');
    expect(screen.getByTestId('reel-composer-accounts')).toHaveTextContent('2');
    expect(screen.getByTestId('reel-studio')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('reel-composer-close'));
    await waitFor(() => expect(screen.queryByTestId('reel-composer')).not.toBeInTheDocument());
  });

  it('keeps the rendered reel when the upload fails, so it can still be saved', async () => {
    renderer.canRenderMediaOnWeb.mockResolvedValue({ canRender: true, issues: [] });
    renderer.renderMediaOnWeb.mockResolvedValue({ getBlob: async () => new Blob(['mp4']) });
    upload.mockRejectedValue(new Error('Upload is not available right now'));
    mount();
    fireEvent.click(screen.getByTestId('reel-studio-export'));
    fireEvent.click(await screen.findByTestId('reel-export-post'));
    expect(await screen.findByTestId('reel-export-error')).toHaveTextContent('The reel could not be posted: Upload is not available right now');
    expect(screen.queryByTestId('reel-composer')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('reel-export-close'));
    expect(await screen.findByTestId('reel-export-save')).toBeInTheDocument();
  });
});

describe('the lazy studio route', () => {
  it('fetches the studio when a reel is opened', async () => {
    answerQuery(REEL_PROJECT, { data: { reelProject: project() } });
    mount(<LazyReelStudioPage />);
    expect(await screen.findByTestId('reel-studio')).toBeInTheDocument();
  });
});
