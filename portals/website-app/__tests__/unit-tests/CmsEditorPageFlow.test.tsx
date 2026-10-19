import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, useLocation } from 'react-router';
import type { Editor } from 'grapesjs';
import { TAB_PARAM } from '@duncit/tabs';
import { fontCss, googleFontsHref, tokensCss, type CmsDesignFont } from '@duncit/brand/cms-design';
import CmsEditorRoute from '../../src/pages/cms/editor/CmsEditorRoute';
import type { useGrapesEditor } from '../../src/pages/cms/editor/useGrapesEditor';
import type { useEditorSave } from '../../src/pages/cms/editor/useEditorSave';
import { CMS_PAGE_DRAFT } from '../../src/pages/cms/queries/pages';
import { CMS_FRAGMENT_DRAFT, CMS_FRAGMENT_OPTIONS } from '../../src/pages/cms/queries/fragments';
import { CMS_SITE_DESIGN } from '../../src/pages/cms/queries/sites';
import { PLACEHOLDER_CSS } from '../../src/pages/cms/lib/preview';
import { makeCmsFragmentRow, makeCmsPageRow, makeSiteDesign } from '../mocks/cms.mock';
import { renderWithProviders, flush } from '../testkit';
import { en } from '../en';
import { answerQuery, queryOptions, resetApollo } from '../hooks-mock';

type GrapesArgs = Parameters<typeof useGrapesEditor>[0];

const editorState = vi.hoisted(() => ({
  grapes: { editor: null as unknown, dirty: false, error: null as string | null, markSaved: () => undefined },
  saver: { busy: null as 'save' | 'publish' | null, conflict: false, save: vi.fn(async () => undefined), publish: vi.fn(async () => undefined) },
  grapesArgs: undefined as unknown,
  saveArgs: [] as unknown[],
  confirm: vi.fn<(options: unknown) => Promise<boolean>>(async () => true),
}));

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('../hooks-mock')).hooks,
}));
// GrapesJS needs a real browser: the page is tested against what it hands the editor hook and what it does with the answer.
vi.mock('../../src/pages/cms/editor/useGrapesEditor', () => ({
  useGrapesEditor: (args: unknown) => {
    editorState.grapesArgs = args;
    return editorState.grapes;
  },
}));
vi.mock('../../src/pages/cms/editor/useEditorSave', () => ({
  useEditorSave: (...args: unknown[]) => {
    editorState.saveArgs = args;
    return editorState.saver;
  },
}));
vi.mock('@duncit/dialogs', async (importOriginal) => ({ ...(await importOriginal<typeof import('@duncit/dialogs')>()), useConfirm: () => editorState.confirm }));
vi.mock('../../src/pages/cms/lib/useCopyPreviewLink', () => ({ useCopyPreviewLink: () => ({ page: vi.fn(), component: vi.fn() }) }));
vi.mock('@duncit/media-picker', () => ({
  MediaPickerDialog: ({ open, title, onClose, onPicked }: { open: boolean; title: string; onClose: () => void; onPicked: (url: string) => void }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <button type="button" onClick={() => onPicked('https://ik.test/cms/photo.png')}>
          pick
        </button>
        <button type="button" onClick={onClose}>
          close
        </button>
      </div>
    ) : null,
}));

const grapesArgs = () => {
  if (!editorState.grapesArgs) throw new Error('the editor hook was not called');
  return editorState.grapesArgs as GrapesArgs;
};
const saveArgs = () => editorState.saveArgs as Parameters<typeof useEditorSave>;

const INTER: CmsDesignFont = { family: 'Inter', source: 'GOOGLE', weights: [400, 700], italic: false, role: 'HEADING', variable: '', fallback: '', files: [] };
const SITE = {
  ...makeSiteDesign(),
  domains: ['site.test', 'www.site.test'],
  custom_css: '.custom{color:blue}',
  design: { ...makeSiteDesign().design, fonts: [INTER], font_urls: ['https://fonts.test/extra.css'], base_css: 'body{margin:0}' },
};
const DRAFT = { project: '{"pages":[]}', html: '<p>About</p>', css: 'p{color:red}' };
const PAGE = { ...makeCmsPageRow({ id: 'page-1', title: 'About', kind: 'PAGE', updated_at: 't-page' }), draft: DRAFT };
const FRAGMENT = { ...makeCmsFragmentRow({ id: 'frag-1', key: 'promo', name: 'Promo banner', updated_at: 't-frag' }), draft: { ...DRAFT, scss: '', js: '' } };
const OPTIONS = [
  { ...makeCmsFragmentRow({ id: 'f-hero', key: 'hero', name: 'Hero', kind: 'SECTION', is_published: true }), published: { version: 1, published_at: null, html: '<h1>Hero</h1>', css: '.hero{}' } },
  { ...makeCmsFragmentRow({ id: 'f-draft', key: 'draft', name: 'Draft', kind: 'SECTION', is_published: false }), published: { version: 0, published_at: null, html: '', css: '.draft{}' } },
  { ...makeCmsFragmentRow({ id: 'f-head', key: 'header', name: 'Header', kind: 'HEADER', is_published: true }), published: { version: 1, published_at: null, html: '<nav></nav>', css: '.nav{}' } },
];

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

const openEditor = (path = '/sites/site-1/pages/page-1/design') =>
  renderWithProviders(<></>, {
    initialEntries: [path],
    routes: (
      <>
        <Route
          path="/sites/:siteId/:target/:docId/design"
          element={
            <>
              <CmsEditorRoute />
              <LocationProbe />
            </>
          }
        />
        <Route path="/sites/:siteId" element={<LocationProbe />} />
      </>
    ),
  });

const answerAll = ({ page = PAGE as unknown, fragment = FRAGMENT as unknown, site = SITE as unknown } = {}) => {
  answerQuery(CMS_PAGE_DRAFT, { data: { cmsPage: page } });
  answerQuery(CMS_FRAGMENT_DRAFT, { data: { cmsFragment: fragment } });
  answerQuery(CMS_SITE_DESIGN, { data: { cmsSite: site } });
  answerQuery(CMS_FRAGMENT_OPTIONS, { data: { cmsFragments: OPTIONS } });
};

const location = () => screen.getByTestId('location').textContent;
const fakeEditor = { getHtml: () => '' } as unknown as Editor;

beforeEach(() => {
  resetApollo();
  editorState.grapes = { editor: null, dirty: false, error: null, markSaved: () => undefined };
  editorState.saver = { busy: null, conflict: false, save: vi.fn(async () => undefined), publish: vi.fn(async () => undefined) };
  editorState.grapesArgs = undefined;
  editorState.saveArgs = [];
  editorState.confirm.mockReset().mockResolvedValue(true);
});

describe('CmsEditorPage — what the editor opens with', () => {
  it("hands GrapesJS the page's draft, the site's design system, its live-block address and the published sections", () => {
    answerAll();
    openEditor();

    const args = grapesArgs();
    expect(args.source).toEqual(DRAFT);
    expect(args.template).toBe(false);
    expect(args.selfKey).toBeUndefined();
    expect(args.fonts).toEqual([INTER]);
    expect(args.fragments).toEqual([{ id: 'f-hero', key: 'hero', name: 'Hero', html: '<h1>Hero</h1>' }]);
    expect(args.fontUrls).toEqual([googleFontsHref([INTER]), 'https://fonts.test/extra.css']);
    expect(args.canvasCss).toBe(
      ['body{margin:0}', tokensCss(SITE.design.tokens), fontCss([INTER]), '.custom{color:blue}', '.hero{}\n.draft{}\n.nav{}', PLACEHOLDER_CSS].join('\n'),
    );
    const frame = new URL(args.blockUrl('newsletter', {}) ?? '');
    expect(frame.host).toBe('site.test');
    expect(frame.pathname).toBe('/__block/newsletter');
    expect(frame.searchParams.get('origin')).toBe(globalThis.location.origin);

    expect(queryOptions.get(CMS_PAGE_DRAFT)).toMatchObject({ variables: { id: 'page-1' }, skip: false });
    expect(queryOptions.get(CMS_FRAGMENT_DRAFT)?.skip).toBe(true);
    expect(saveArgs()).toEqual(['pages', 'page-1', 't-page', editorState.grapes.markSaved]);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('About');
    expect(screen.getByRole('progressbar', { name: en('websiteApp.cms.editor.loading') })).toBeInTheDocument();
  });

  it('offers the collection blocks on a collection template', () => {
    answerAll({ page: { ...PAGE, kind: 'COLLECTION_LIST' } });
    openEditor();
    expect(grapesArgs().template).toBe(true);
  });

  it('opens a component as itself: its own key is never offered as a block of itself', () => {
    answerAll();
    openEditor('/sites/site-1/fragments/frag-1/design');

    expect(grapesArgs()).toMatchObject({ source: DRAFT, template: false, selfKey: 'promo' });
    expect(queryOptions.get(CMS_PAGE_DRAFT)?.skip).toBe(true);
    expect(queryOptions.get(CMS_FRAGMENT_DRAFT)).toMatchObject({ variables: { id: 'frag-1' }, skip: false });
    expect(saveArgs()).toEqual(['fragments', 'frag-1', 't-frag', editorState.grapes.markSaved]);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Promo banner');
  });

  it('builds nothing until the document and its site are loaded, and paints only the shared css meanwhile', () => {
    answerAll({ page: null, site: null });
    openEditor();

    const args = grapesArgs();
    expect(args.source).toBeNull();
    expect(args.fonts).toEqual([]);
    expect(args.fontUrls).toEqual([]);
    expect(args.blockUrl('newsletter', {})).toBeNull();
    expect(args.canvasCss).toBe(['', '', '', '', '.hero{}\n.draft{}\n.nav{}', PLACEHOLDER_CSS].join('\n'));
    expect(saveArgs()[2]).toBeNull();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('');
  });

  it('builds nothing while the fragment list is still loading', () => {
    answerAll();
    answerQuery(CMS_FRAGMENT_OPTIONS, { loading: true });
    openEditor();
    expect(grapesArgs().source).toBeNull();
    expect(grapesArgs().fragments).toEqual([]);
  });

  it.each([
    ['the page', CMS_PAGE_DRAFT, '/sites/site-1/pages/page-1/design'],
    ['the component', CMS_FRAGMENT_DRAFT, '/sites/site-1/fragments/frag-1/design'],
    ['the site design', CMS_SITE_DESIGN, '/sites/site-1/pages/page-1/design'],
    ['the fragment list', CMS_FRAGMENT_OPTIONS, '/sites/site-1/pages/page-1/design'],
  ])('says the editor could not open when %s fails to load', (_name, query, path) => {
    answerAll();
    answerQuery(query, { error: new Error('network down') });
    openEditor(path);
    expect(screen.getByRole('alert')).toHaveTextContent(en('websiteApp.cms.editor.loadFailed'));
    expect(screen.queryByTestId('cms-editor-save')).not.toBeInTheDocument();
  });
});

describe('CmsEditorPage — editor state', () => {
  it('says when GrapesJS failed to start instead of loading forever', () => {
    answerAll();
    editorState.grapes.error = 'Canvas unavailable';
    openEditor();
    expect(screen.getByRole('alert')).toHaveTextContent(en('websiteApp.cms.editor.loadFailed'));
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByTestId('cms-editor-save')).toBeDisabled();
  });

  it('warns about a save conflict', () => {
    answerAll();
    editorState.grapes.editor = fakeEditor;
    editorState.saver.conflict = true;
    openEditor();
    expect(screen.getByRole('alert')).toHaveTextContent(en('websiteApp.cms.editor.conflict'));
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('saves and publishes what the editor holds', () => {
    answerAll();
    editorState.grapes.editor = fakeEditor;
    openEditor();

    fireEvent.click(screen.getByTestId('cms-editor-save'));
    expect(editorState.saver.save).toHaveBeenCalledWith(fakeEditor);
    expect(editorState.saver.publish).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('cms-editor-publish'));
    expect(editorState.saver.publish).toHaveBeenCalledWith(fakeEditor);
  });
});

describe('CmsEditorPage — leaving', () => {
  const back = () => fireEvent.click(screen.getByRole('button', { name: en('websiteApp.cms.editor.back') }));
  const backTo = `/sites/site-1?${TAB_PARAM}=pages`;

  it("goes straight back to the site's pages tab when everything is saved", async () => {
    answerAll();
    openEditor();
    back();
    await waitFor(() => expect(location()).toBe(backTo));
    expect(editorState.confirm).not.toHaveBeenCalled();
  });

  it('asks before throwing unsaved work away, and leaves once confirmed', async () => {
    answerAll();
    editorState.grapes.dirty = true;
    openEditor();
    back();
    await waitFor(() => expect(location()).toBe(backTo));
    expect(editorState.confirm).toHaveBeenCalledWith({
      title: en('websiteApp.cms.editor.leaveTitle'),
      message: en('websiteApp.cms.editor.leaveText'),
      confirmLabel: en('websiteApp.cms.editor.leave'),
      destructive: true,
    });
  });

  it('stays when the editor keeps their work', async () => {
    answerAll();
    editorState.grapes.dirty = true;
    editorState.confirm.mockResolvedValue(false);
    openEditor();
    back();
    await act(flush);
    expect(editorState.confirm).toHaveBeenCalledTimes(1);
    expect(location()).toBe('/sites/site-1/pages/page-1/design');
  });

  it('still goes back when the question itself fails', async () => {
    answerAll();
    editorState.grapes.dirty = true;
    editorState.confirm.mockRejectedValue(new Error('dialog unavailable'));
    openEditor('/sites/site-1/fragments/frag-1/design');
    back();
    await waitFor(() => expect(location()).toBe(`/sites/site-1?${TAB_PARAM}=fragments`));
  });
});

describe('CmsEditorPage — opening a placed component', () => {
  const placed = { id: 'f-hero', key: 'hero', name: 'Hero', html: '<h1>Hero</h1>' };
  const heroEditor = '/sites/site-1/fragments/f-hero/design';

  it('opens it in a fresh editor of its own', async () => {
    answerAll();
    openEditor();
    act(() => grapesArgs().onOpenFragment(placed));
    await waitFor(() => expect(location()).toBe(heroEditor));
    expect(queryOptions.get(CMS_FRAGMENT_DRAFT)).toMatchObject({ variables: { id: 'f-hero' }, skip: false });
    expect(editorState.confirm).not.toHaveBeenCalled();
  });

  it('stays on the page when the editor keeps their unsaved work', async () => {
    answerAll();
    editorState.grapes.dirty = true;
    editorState.confirm.mockResolvedValue(false);
    openEditor();
    act(() => grapesArgs().onOpenFragment(placed));
    await act(flush);
    expect(location()).toBe('/sites/site-1/pages/page-1/design');
  });

  it('still opens it when the question itself fails', async () => {
    answerAll();
    editorState.grapes.dirty = true;
    editorState.confirm.mockRejectedValue(new Error('dialog unavailable'));
    openEditor();
    act(() => grapesArgs().onOpenFragment(placed));
    await waitFor(() => expect(location()).toBe(heroEditor));
  });
});

describe('CmsEditorPage — picking an image', () => {
  it('answers GrapesJS with the picked image and closes the picker', async () => {
    answerAll();
    openEditor();
    const select = vi.fn();
    act(() => grapesArgs().onPickAsset({ select }));

    fireEvent.click(screen.getByRole('button', { name: 'pick' }));
    expect(select).toHaveBeenCalledWith('https://ik.test/cms/photo.png');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('selects nothing when the picker is closed', async () => {
    answerAll();
    openEditor();
    const select = vi.fn();
    act(() => grapesArgs().onPickAsset({ select }));

    expect(screen.getByRole('dialog', { name: en('websiteApp.cms.editor.pickImage') })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(select).not.toHaveBeenCalled();
  });
});
