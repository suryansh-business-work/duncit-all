import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import VersionsDialog from '../../src/pages/cms/components/VersionsDialog';
import PreviewDialog from '../../src/pages/cms/components/PreviewDialog';
import { CMS_VERSIONS, PUBLISH_CMS_VERSION, RESTORE_CMS_VERSION } from '../../src/pages/cms/queries/fragments';
import { CMS_PREVIEW, CMS_PREVIEW_LINK } from '../../src/pages/cms/queries/pages';
import { previewDocument } from '../../src/pages/cms/lib/preview';
import { renderWithProviders } from '../testkit';
import { en } from '../en';
import { answerQuery, lazyOf, mutationOf, queryOptions, resetApollo } from '../hooks-mock';

const confirm = vi.hoisted(() => vi.fn());
const copy = vi.hoisted(() => vi.fn());

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('../hooks-mock')).hooks,
}));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  useConfirm: () => confirm,
}));
vi.mock('@duncit/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@duncit/utils')>()), copyToClipboard: copy }));

const VERSIONS = [
  { __typename: 'CmsVersion', id: 'v2', version: 2, published_by: 'a@duncit.test', created_at: '2026-10-02T10:00:00.000Z', preview_url: 'https://duncit.com/about?preview=abc' },
  { __typename: 'CmsVersion', id: 'v1', version: 1, published_by: 'a@duncit.test', created_at: '2026-10-01T10:00:00.000Z', preview_url: '' },
];

beforeEach(() => {
  resetApollo();
  confirm.mockReset();
  copy.mockReset();
  vi.mocked(notifyError).mockClear();
  vi.mocked(notifySuccess).mockClear();
});

describe('VersionsDialog', () => {
  const mount = (data: unknown = { cmsVersions: VERSIONS }) => {
    answerQuery(CMS_VERSIONS, { data });
    const onClose = vi.fn();
    const onRestored = vi.fn();
    renderWithProviders(<VersionsDialog owner={{ kind: 'PAGE', id: 'p1', name: 'About' }} onClose={onClose} onRestored={onRestored} />);
    return { onClose, onRestored };
  };
  const named = (action: string, version: number) =>
    screen.getByRole('button', { name: `${en(`websiteApp.cms.versions.${action}`)}: ${en('websiteApp.cms.versions.version', { version })}` });

  it('lists versions, with a demo link only where the site can serve one', () => {
    mount();
    expect(queryOptions.get(CMS_VERSIONS)?.variables).toEqual({ owner: 'PAGE', id: 'p1' });
    expect(screen.getByRole('link', { name: `${en('websiteApp.cms.versions.openDemo')}: ${en('websiteApp.cms.versions.version', { version: 2 })}` })).toHaveAttribute('href', 'https://duncit.com/about?preview=abc');
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByText(en('websiteApp.cms.versions.noDemo'))).toBeInTheDocument();
    expect(named('copyLink', 1)).toBeDisabled();
  });

  it('copies the demo link and reports whether the browser allowed it', async () => {
    copy.mockResolvedValueOnce(true).mockResolvedValueOnce(false).mockRejectedValueOnce(new Error('denied'));
    mount();
    fireEvent.click(named('copyLink', 2));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith(en('websiteApp.cms.versions.copied')));
    expect(copy).toHaveBeenCalledWith('https://duncit.com/about?preview=abc');
    fireEvent.click(named('copyLink', 2));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(en('websiteApp.cms.versions.copyFailed')));
    fireEvent.click(named('copyLink', 2));
    await waitFor(() => expect(notifyError).toHaveBeenCalledTimes(2));
  });

  it('restores a version into the draft only after confirming, then closes', async () => {
    confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const { onClose, onRestored } = mount();
    fireEvent.click(named('restore', 1));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(mutationOf(RESTORE_CMS_VERSION)).not.toHaveBeenCalled();
    fireEvent.click(named('restore', 1));
    await waitFor(() => expect(mutationOf(RESTORE_CMS_VERSION)).toHaveBeenCalledWith({ variables: { id: 'v1' } }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onRestored).toHaveBeenCalled();
    expect(notifySuccess).toHaveBeenCalledWith(en('websiteApp.cms.versions.restored'));
  });

  it('publishes a version live, refreshes the list and keeps the dialog open', async () => {
    confirm.mockResolvedValue(true);
    const { onClose, onRestored } = mount();
    fireEvent.click(named('publish', 2));
    await waitFor(() => expect(mutationOf(PUBLISH_CMS_VERSION)).toHaveBeenCalledWith({ variables: { id: 'v2' } }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith(en('websiteApp.cms.versions.published', { version: 2 })));
    expect(onRestored).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows the server sentence when a restore or publish is refused', async () => {
    confirm.mockResolvedValue(true);
    mutationOf(RESTORE_CMS_VERSION).mockRejectedValue({ message: 'x', errors: [{ message: 'Draft changed', extensions: { code: 'CONFLICT' } }] });
    mutationOf(PUBLISH_CMS_VERSION).mockRejectedValue(new Error('boom'));
    const { onClose } = mount();
    fireEvent.click(named('restore', 1));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Draft changed'));
    fireEvent.click(named('publish', 1));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(en('websiteApp.cms.versions.publishFailed')));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows the empty and failed states', () => {
    mount({ cmsVersions: [] });
    expect(screen.getByText(en('websiteApp.cms.versions.empty'))).toBeInTheDocument();
  });
});

describe('PreviewDialog', () => {
  const mount = (pageId: string | null = 'p1') => {
    const onClose = vi.fn();
    renderWithProviders(<PreviewDialog pageId={pageId} title="About" onClose={onClose} />);
    return onClose;
  };

  it('frames the signed live preview when the site has a domain', () => {
    answerQuery(CMS_PREVIEW_LINK, { data: { cmsPreviewLink: { url: 'https://duncit.com/about?pv=1', expires_at: '' } } });
    mount();
    const frame = screen.getByTitle(en('websiteApp.cms.preview.frameTitle'));
    expect(frame).toHaveAttribute('src', 'https://duncit.com/about?pv=1');
    expect(frame.getAttribute('sandbox')).toContain('allow-scripts');
    expect(queryOptions.get(CMS_PREVIEW)?.skip).toBe(true);
  });

  it('falls back to the composed html in a script-less frame when no link can be signed', () => {
    answerQuery(CMS_PREVIEW_LINK, { error: new Error('no domain') });
    answerQuery(CMS_PREVIEW, {
      data: { cmsPreview: { status: 'DRAFT', title: 'About', html: '<h1>Hi</h1>', css: 'h1{color:red}', head_html: '', custom_js: '', site: null } },
    });
    mount();
    const frame = screen.getByTitle(en('websiteApp.cms.preview.frameTitle'));
    expect(frame).toHaveAttribute('sandbox', '');
    expect(frame.getAttribute('srcdoc')).toContain('<h1>Hi</h1>');
    expect(queryOptions.get(CMS_PREVIEW)?.skip).toBe(false);
  });

  it('reports a preview that could not be composed', () => {
    answerQuery(CMS_PREVIEW_LINK, { error: new Error('x') });
    answerQuery(CMS_PREVIEW, { error: new Error('y') });
    mount();
    expect(screen.getByText(en('websiteApp.cms.preview.failed'))).toBeInTheDocument();
  });

  it('opens the draft on the site in its own tab, keeping the opener out of it', async () => {
    answerQuery(CMS_PREVIEW_LINK, { data: { cmsPreviewLink: { url: 'https://duncit.com/about?pv=1', expires_at: '' } } });
    const tab = { opener: 'console', location: { href: '' }, close: vi.fn() };
    const open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    lazyOf(CMS_PREVIEW_LINK).mockResolvedValue({ data: { cmsPreviewLink: { url: 'https://duncit.com/about?pv=2' } } });
    mount();
    fireEvent.click(screen.getByTestId('cms-preview-open-on-site'));
    await waitFor(() => expect(tab.location.href).toBe('https://duncit.com/about?pv=2'));
    expect(tab.opener).toBeNull();
    open.mockRestore();
  });

  it('closes the blank tab and says so when the link cannot be signed', async () => {
    answerQuery(CMS_PREVIEW_LINK, { data: { cmsPreviewLink: { url: 'https://duncit.com/a', expires_at: '' } } });
    const tab = { opener: 'console', location: { href: '' }, close: vi.fn() };
    const open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    lazyOf(CMS_PREVIEW_LINK).mockResolvedValue({ data: undefined });
    mount();
    fireEvent.click(screen.getByTestId('cms-preview-open-on-site'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(en('websiteApp.cms.preview.openFailed')));
    expect(tab.close).toHaveBeenCalled();
    open.mockRestore();
  });

  it('opens the link directly when the popup was blocked', async () => {
    answerQuery(CMS_PREVIEW_LINK, { data: { cmsPreviewLink: { url: 'https://duncit.com/a', expires_at: '' } } });
    const open = vi.spyOn(window, 'open').mockReturnValueOnce(null).mockReturnValue(null);
    lazyOf(CMS_PREVIEW_LINK).mockResolvedValue({ data: { cmsPreviewLink: { url: 'https://duncit.com/about?pv=3' } } });
    mount();
    fireEvent.click(screen.getByTestId('cms-preview-open-on-site'));
    await waitFor(() => expect(open).toHaveBeenCalledWith('https://duncit.com/about?pv=3', '_blank', 'noopener'));
    open.mockRestore();
  });

  it('has no frame without a page', () => {
    mount(null);
    expect(screen.queryByTitle(en('websiteApp.cms.preview.frameTitle'))).not.toBeInTheDocument();
  });
});

describe('previewDocument', () => {
  it('escapes a closing style tag so a stylesheet cannot break out of its element', () => {
    const doc = previewDocument({
      status: 'DRAFT',
      title: 't',
      html: '<p>x</p>',
      css: 'a{}</style><script>alert(1)</script>',
      head_html: '',
      custom_js: '',
      site: { design: null as never, custom_css: '' },
    });
    expect(doc).not.toContain('</style><script>');
    expect(doc).toContain(String.raw`<\/style`);
    expect(doc).toContain('<body><p>x</p></body>');
    // The placeholder rules are always present so live blocks read as outlines.
    expect(doc).toContain('cms-block');
  });
});

describe('VersionsDialog — loading, failure and cancel', () => {
  const owner = { kind: 'FRAGMENT' as const, id: 'f1', name: 'Hero' };

  it('shows progress, not the empty text, while the versions load', () => {
    answerQuery(CMS_VERSIONS, { loading: true });
    renderWithProviders(<VersionsDialog owner={owner} onClose={vi.fn()} onRestored={vi.fn()} />);
    expect(screen.getByRole('progressbar', { name: en('websiteApp.cms.versions.loading') })).toBeInTheDocument();
    expect(screen.queryByText(en('websiteApp.cms.versions.empty'))).not.toBeInTheDocument();
    expect(queryOptions.get(CMS_VERSIONS)?.variables).toEqual({ owner: 'FRAGMENT', id: 'f1' });
  });

  it('says the versions could not be loaded instead of claiming there are none', () => {
    answerQuery(CMS_VERSIONS, { error: new Error('down') });
    renderWithProviders(<VersionsDialog owner={owner} onClose={vi.fn()} onRestored={vi.fn()} />);
    expect(screen.getByText(en('websiteApp.cms.versions.loadFailed'))).toBeInTheDocument();
    expect(screen.queryByText(en('websiteApp.cms.versions.empty'))).not.toBeInTheDocument();
  });

  it('publishes nothing when the editor backs out of the confirmation', async () => {
    answerQuery(CMS_VERSIONS, { data: { cmsVersions: VERSIONS } });
    confirm.mockResolvedValue(false);
    const onRestored = vi.fn();
    renderWithProviders(<VersionsDialog owner={owner} onClose={vi.fn()} onRestored={onRestored} />);
    fireEvent.click(screen.getByRole('button', { name: `${en('websiteApp.cms.versions.publish')}: ${en('websiteApp.cms.versions.version', { version: 2 })}` }));
    await waitFor(() => expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ title: en('websiteApp.cms.versions.publishTitle', { version: 2 }) })));
    expect(mutationOf(PUBLISH_CMS_VERSION)).not.toHaveBeenCalled();
    expect(onRestored).not.toHaveBeenCalled();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('reports a restore or publish whose confirmation could not be shown', async () => {
    answerQuery(CMS_VERSIONS, { data: { cmsVersions: VERSIONS } });
    confirm.mockRejectedValue(new Error('no dialog host'));
    renderWithProviders(<VersionsDialog owner={owner} onClose={vi.fn()} onRestored={vi.fn()} />);
    const label = en('websiteApp.cms.versions.version', { version: 1 });
    fireEvent.click(screen.getByRole('button', { name: `${en('websiteApp.cms.versions.restore')}: ${label}` }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(en('websiteApp.cms.versions.restoreFailed')));
    fireEvent.click(screen.getByRole('button', { name: `${en('websiteApp.cms.versions.publish')}: ${label}` }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(en('websiteApp.cms.versions.publishFailed')));
    expect(mutationOf(RESTORE_CMS_VERSION)).not.toHaveBeenCalled();
    expect(mutationOf(PUBLISH_CMS_VERSION)).not.toHaveBeenCalled();
  });

  it('asks for nothing while closed', () => {
    renderWithProviders(<VersionsDialog owner={null} onClose={vi.fn()} onRestored={vi.fn()} />);
    expect(queryOptions.get(CMS_VERSIONS)?.skip).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('PreviewDialog — loading and dismissal', () => {
  it('shows progress while the preview link is being signed', () => {
    answerQuery(CMS_PREVIEW_LINK, { loading: true });
    renderWithProviders(<PreviewDialog pageId="p1" title="About" onClose={vi.fn()} />);
    expect(within(screen.getByRole('dialog')).getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTitle(en('websiteApp.cms.preview.frameTitle'))).not.toBeInTheDocument();
  });

  it('shows progress while the fallback preview is being composed', () => {
    answerQuery(CMS_PREVIEW_LINK, { error: new Error('no domain') });
    answerQuery(CMS_PREVIEW, { loading: true });
    renderWithProviders(<PreviewDialog pageId="p1" title="About" onClose={vi.fn()} />);
    expect(within(screen.getByRole('dialog')).getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText(en('websiteApp.cms.preview.failed'))).not.toBeInTheDocument();
  });

  it('opens no tab from a dialog that is already closing', () => {
    answerQuery(CMS_PREVIEW_LINK, { data: { cmsPreviewLink: { url: 'https://duncit.com/a', expires_at: '' } } });
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    function Closable() {
      const [pageId, setPageId] = useState<string | null>('p1');
      return (
        <>
          <button type="button" onClick={() => setPageId(null)}>
            dismiss
          </button>
          <PreviewDialog pageId={pageId} title="About" onClose={() => setPageId(null)} />
        </>
      );
    }
    renderWithProviders(<Closable />);
    fireEvent.click(screen.getByText('dismiss'));
    // The dialog fades out, so its button is still on screen for a moment.
    fireEvent.click(screen.getByTestId('cms-preview-open-on-site'));
    expect(open).not.toHaveBeenCalled();
    expect(lazyOf(CMS_PREVIEW_LINK)).not.toHaveBeenCalled();
    open.mockRestore();
  });
});
