import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Editor } from 'grapesjs';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useEditorLabels } from '../../src/pages/cms/editor/useEditorLabels';
import { useEditorSave, type EditorTarget } from '../../src/pages/cms/editor/useEditorSave';
import { PUBLISH_CMS_PAGE, SAVE_CMS_PAGE_DRAFT } from '../../src/pages/cms/queries/pages';
import { PUBLISH_CMS_FRAGMENT, SAVE_CMS_FRAGMENT_DRAFT } from '../../src/pages/cms/queries/fragments';
import { en } from '../en';
import { mutationOf, resetApollo } from '../hooks-mock';

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('../hooks-mock')).hooks,
}));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

describe('useEditorLabels', () => {
  it('words the canvas stand-ins in the shipped copy, with the name filled in', () => {
    const { components } = renderHook(() => useEditorLabels()).result.current;
    expect(components.block('newsletter')).toBe(en('websiteApp.cms.editor.live.block', { name: 'newsletter' }));
    expect(components.fragment('Hero')).toBe(en('websiteApp.cms.editor.live.fragment', { name: 'Hero' }));
    expect(components.missingFragment('hero')).toBe(en('websiteApp.cms.editor.live.missingFragment', { key: 'hero' }));
    expect(components.field('Entry title')).toBe(en('websiteApp.cms.editor.live.field', { name: 'Entry title' }));
    expect(components.list('rows')).toBe(en('websiteApp.cms.editor.live.list', { variant: 'rows' }));
    expect(components.openFragment).toBe(en('websiteApp.cms.editor.live.openFragment'));
    expect(components.defaultText).toBe(en('websiteApp.cms.editor.props.defaultText'));
  });

  it('labels each block prop, falling back to the raw key for one it does not know', () => {
    const { components } = renderHook(() => useEditorLabels()).result.current;
    expect(components.prop('heading')).toBe(en('websiteApp.cms.editor.props.heading'));
    expect(components.prop('baseUrl')).toBe(en('websiteApp.cms.editor.props.baseUrl'));
    expect(components.prop('headingMuted')).toBe(en('websiteApp.cms.editor.props.headingMuted'));
    expect(components.prop('stores')).toBe('stores');
  });

  it('names the block categories and the entry fields the collection blocks offer', () => {
    const { blocks, fields } = renderHook(() => useEditorLabels()).result.current;
    expect(blocks.categories.fragments).toBe(en('websiteApp.cms.editor.blocks.fragments'));
    expect(blocks.names.reelSlider).toBe(en('websiteApp.cms.editor.blocks.reelSlider'));
    expect(blocks.placeholders.button).toBe(en('websiteApp.cms.editor.blocks.placeholderButton'));
    expect(fields.map((field) => field.id)).toEqual(['title', 'summary', 'body_html', 'cover_image', 'published_at', 'category', 'author_name']);
    expect(fields[2].label).toBe(en('websiteApp.cms.editor.blocks.entryBody'));
  });
});

/** What a save sends for this editor (snapshot in useGrapesEditor). */
const PROJECT = { pages: [{ id: 'p' }] };
const editor = {
  getProjectData: () => PROJECT,
  getWrapper: () => ({ getInnerHTML: () => '<section>Hi</section>' }),
  getCss: () => '.a{color:red}',
} as unknown as Editor;
const SNAPSHOT = { project: JSON.stringify(PROJECT), html: '<section>Hi</section>', css: '.a{color:red}' };

const serverError = (code: string, message: string) => Object.assign(new Error(message), { errors: [{ message, extensions: { code } }] });

const mountSave = (target: EditorTarget = 'pages', loadedAt: string | null = 't0') => {
  const markSaved = vi.fn();
  const hook = renderHook(({ at }: { at: string | null }) => useEditorSave(target, 'doc-1', at, markSaved), { initialProps: { at: loadedAt } });
  return { ...hook, markSaved };
};

beforeEach(() => {
  resetApollo();
  vi.mocked(notifyError).mockClear();
  vi.mocked(notifySuccess).mockClear();
});

describe('useEditorSave — save draft', () => {
  it("saves the page with the updated_at it loaded, then the server's new one", async () => {
    const savePage = mutationOf(SAVE_CMS_PAGE_DRAFT).mockResolvedValue({ data: { saveCmsPageDraft: { updated_at: 't1' } } });
    const { result, markSaved } = mountSave();

    await act(() => result.current.save(editor));
    expect(savePage).toHaveBeenLastCalledWith({ variables: { id: 'doc-1', input: { ...SNAPSHOT, base_updated_at: 't0' } } });
    expect(markSaved).toHaveBeenCalledTimes(1);
    expect(notifySuccess).toHaveBeenCalledWith(en('websiteApp.cms.editor.saved'));
    expect(result.current.busy).toBeNull();

    await act(() => result.current.save(editor));
    expect(savePage).toHaveBeenLastCalledWith({ variables: { id: 'doc-1', input: { ...SNAPSHOT, base_updated_at: 't1' } } });
    expect(mutationOf(SAVE_CMS_FRAGMENT_DRAFT)).not.toHaveBeenCalled();
  });

  it('saves a component through its own mutation, keeping the old lock when the server returns nothing', async () => {
    const saveFragment = mutationOf(SAVE_CMS_FRAGMENT_DRAFT).mockResolvedValue({ data: undefined });
    const { result, markSaved } = mountSave('fragments');

    await act(() => result.current.save(editor));
    await act(() => result.current.save(editor));
    expect(saveFragment).toHaveBeenLastCalledWith({ variables: { id: 'doc-1', input: { ...SNAPSHOT, base_updated_at: 't0' } } });
    expect(markSaved).toHaveBeenCalledTimes(2);
    expect(mutationOf(SAVE_CMS_PAGE_DRAFT)).not.toHaveBeenCalled();
  });

  it('takes the first updated_at the document arrives with, and never a later one', async () => {
    const savePage = mutationOf(SAVE_CMS_PAGE_DRAFT).mockResolvedValue({ data: undefined });
    const { result, rerender } = mountSave('pages', null);
    rerender({ at: 't5' });
    rerender({ at: 't9' });

    await act(() => result.current.save(editor));
    expect(savePage).toHaveBeenLastCalledWith({ variables: { id: 'doc-1', input: { ...SNAPSHOT, base_updated_at: 't5' } } });
  });

  it('shows the save as busy until it settles', async () => {
    let finish: (value: unknown) => void = () => undefined;
    mutationOf(SAVE_CMS_PAGE_DRAFT).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = mountSave();

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.save(editor);
    });
    await waitFor(() => expect(result.current.busy).toBe('save'));
    await act(async () => {
      finish({ data: undefined });
      await pending;
    });
    expect(result.current.busy).toBeNull();
  });

  it('flags a conflict and says why when someone else saved first', async () => {
    mutationOf(SAVE_CMS_PAGE_DRAFT).mockRejectedValue(serverError('CONFLICT', 'Someone else saved this page.'));
    const { result, markSaved } = mountSave();

    await act(() => result.current.save(editor));
    expect(result.current.conflict).toBe(true);
    expect(notifyError).toHaveBeenCalledWith('Someone else saved this page.');
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(markSaved).not.toHaveBeenCalled();
    expect(result.current.busy).toBeNull();
  });

  it('falls back to its own words for a failure the server did not explain', async () => {
    mutationOf(SAVE_CMS_PAGE_DRAFT).mockRejectedValue(new Error('Failed to fetch'));
    const { result } = mountSave();

    await act(() => result.current.save(editor));
    expect(result.current.conflict).toBe(false);
    expect(notifyError).toHaveBeenCalledWith(en('websiteApp.cms.editor.saveFailed'));
  });
});

describe('useEditorSave — publish', () => {
  it('saves what is on screen first, publishes it, and locks on the published updated_at', async () => {
    const savePage = mutationOf(SAVE_CMS_PAGE_DRAFT).mockResolvedValue({ data: { saveCmsPageDraft: { updated_at: 't1' } } });
    const publishPage = mutationOf(PUBLISH_CMS_PAGE).mockResolvedValue({ data: { publishCmsPage: { updated_at: 't2' } } });
    const { result, markSaved } = mountSave();

    await act(() => result.current.publish(editor));
    expect(savePage).toHaveBeenCalledWith({ variables: { id: 'doc-1', input: { ...SNAPSHOT, base_updated_at: 't0' } } });
    expect(publishPage).toHaveBeenCalledWith({ variables: { id: 'doc-1' } });
    expect(markSaved).toHaveBeenCalledTimes(1);
    expect(notifySuccess).toHaveBeenCalledWith(en('websiteApp.cms.pages.publishedToast'));
    expect(notifySuccess).not.toHaveBeenCalledWith(en('websiteApp.cms.editor.saved'));
    expect(result.current.busy).toBeNull();

    await act(() => result.current.save(editor));
    expect(savePage).toHaveBeenLastCalledWith({ variables: { id: 'doc-1', input: { ...SNAPSHOT, base_updated_at: 't2' } } });
  });

  it('publishes a component through its own mutation, keeping the saved lock when the server returns nothing', async () => {
    const saveFragment = mutationOf(SAVE_CMS_FRAGMENT_DRAFT).mockResolvedValue({ data: { saveCmsFragmentDraft: { updated_at: 't1' } } });
    const publishFragment = mutationOf(PUBLISH_CMS_FRAGMENT).mockResolvedValue({ data: undefined });
    const { result } = mountSave('fragments');

    await act(() => result.current.publish(editor));
    expect(publishFragment).toHaveBeenCalledWith({ variables: { id: 'doc-1' } });
    expect(mutationOf(PUBLISH_CMS_PAGE)).not.toHaveBeenCalled();
    expect(notifySuccess).toHaveBeenCalledWith(en('websiteApp.cms.pages.publishedToast'));

    await act(() => result.current.save(editor));
    expect(saveFragment).toHaveBeenLastCalledWith({ variables: { id: 'doc-1', input: { ...SNAPSHOT, base_updated_at: 't1' } } });
  });

  it('publishes nothing when the save before it fails', async () => {
    mutationOf(SAVE_CMS_PAGE_DRAFT).mockRejectedValue(new Error('down'));
    const publishPage = mutationOf(PUBLISH_CMS_PAGE);
    const { result } = mountSave();

    await act(() => result.current.publish(editor));
    expect(publishPage).not.toHaveBeenCalled();
    expect(notifyError).toHaveBeenCalledTimes(1);
    expect(notifyError).toHaveBeenCalledWith(en('websiteApp.cms.editor.saveFailed'));
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(result.current.busy).toBeNull();
  });

  it("reports a refused publish in the server's words, and any other failure in its own", async () => {
    mutationOf(SAVE_CMS_PAGE_DRAFT).mockResolvedValue({ data: undefined });
    const publishPage = mutationOf(PUBLISH_CMS_PAGE).mockRejectedValueOnce(serverError('BAD_USER_INPUT', 'This path is already taken.'));
    const { result } = mountSave();

    await act(() => result.current.publish(editor));
    expect(notifyError).toHaveBeenLastCalledWith('This path is already taken.');

    publishPage.mockRejectedValueOnce(serverError('INTERNAL_SERVER_ERROR', 'stack trace'));
    await act(() => result.current.publish(editor));
    expect(notifyError).toHaveBeenLastCalledWith(en('websiteApp.cms.pages.publishFailed'));
    expect(notifySuccess).not.toHaveBeenCalledWith(en('websiteApp.cms.pages.publishedToast'));
    expect(result.current.busy).toBeNull();
  });
});
