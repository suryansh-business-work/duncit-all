import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route } from 'react-router';
import { notifySuccess } from '@duncit/dialogs';
import EntryEditorPage from '../../src/pages/cms/entries/EntryEditorPage';
import { CMS_ENTRY, CREATE_CMS_ENTRY, UPDATE_CMS_ENTRY } from '../../src/pages/cms/queries/entries';
import { renderWithProviders } from '../testkit';
import { en, label } from '../en';
import { answerQuery, mutationOf, queryOptions, resetApollo } from '../hooks-mock';

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('../hooks-mock')).hooks,
}));
vi.mock('@duncit/dialogs', async (importOriginal) => ({ ...(await importOriginal<typeof import('@duncit/dialogs')>()), notifySuccess: vi.fn() }));
vi.mock('@duncit/rich-text', () => ({
  DuncitRichTextInput: ({ value, onChange, ariaLabel }: { value: string; onChange: (html: string) => void; ariaLabel: string }) => (
    <textarea aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));
vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  SingleImageUploadField: ({ label: text, value, onChange, helperText }: { label: string; value: string; onChange: (v: string) => void; helperText?: string }) => (
    <label>
      {text}
      <input value={value} onChange={(event) => onChange(event.target.value)} />
      {helperText && <span>{helperText}</span>}
    </label>
  ),
}));
vi.mock('../../src/components/DateTimeField', () => ({
  default: ({ label: text, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <input aria-label={text} value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

const ENTRY = {
  __typename: 'CmsEntry',
  id: 'e1',
  site_id: 'site-1',
  collection_type: 'BLOG',
  title: 'Hello world',
  slug: 'hello-world',
  summary: 'A summary',
  cover_image_url: 'https://ik.test/cover.png',
  category: 'News',
  author_name: 'Asha',
  published_at: '2026-10-01T10:00:00.000Z',
  is_published: true,
  sort_order: 2,
  updated_at: '2026-10-01T10:00:00.000Z',
  body_html: '<p>Body</p>',
  tags: ['a', 'b'],
  fields: [{ key: 'location', value: 'Remote' }],
  seo: { title: '', description: '', og_image_url: '', canonical_url: '', noindex: false, og_title: '', og_description: '', twitter_card: '', keywords: '', json_ld: '', meta_tags: [] },
};

const mount = (path: string) =>
  renderWithProviders(<EntryEditorPage />, {
    initialEntries: [path],
    routes: (
      <>
        <Route path="/sites/:siteId/:collectionSlug/:entryId" element={<EntryEditorPage />} />
        <Route path="/sites/:siteId" element={<div data-testid="back-route" />} />
      </>
    ),
  });

beforeEach(() => {
  resetApollo();
  vi.mocked(notifySuccess).mockClear();
});

describe('EntryEditorPage — new entry', () => {
  it('needs a title, then creates the entry on the site and goes back to its collection', async () => {
    mount('/sites/site-1/blog/new');
    expect(queryOptions.get(CMS_ENTRY)?.skip).toBe(true);
    expect(screen.getByRole('heading', { name: en('websiteApp.cms.entryForm.titleNew') })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cms-entry-save'));
    expect(await screen.findByText(en('websiteApp.cms.entryForm.errTitle'))).toBeInTheDocument();
    expect(mutationOf(CREATE_CMS_ENTRY)).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(label('websiteApp.cms.entryForm.title')), { target: { value: 'Fresh post' } });
    fireEvent.change(screen.getByRole('textbox', { name: en('websiteApp.cms.entryForm.body') }), { target: { value: '<p>Hi</p>' } });
    fireEvent.change(screen.getByLabelText(en('websiteApp.cms.entryForm.tags')), { target: { value: 'music, jam , ' } });
    fireEvent.click(screen.getByRole('button', { name: en('websiteApp.cms.entryForm.addField') }));
    fireEvent.change(await screen.findByLabelText(en('websiteApp.cms.entryForm.fieldKey')), { target: { value: 'location' } });
    fireEvent.change(screen.getByLabelText(en('websiteApp.cms.entryForm.fieldValue')), { target: { value: 'Delhi' } });
    fireEvent.click(screen.getByTestId('cms-entry-save'));

    expect(await screen.findByTestId('back-route')).toBeInTheDocument();
    expect(mutationOf(CREATE_CMS_ENTRY).mock.calls[0][0]?.variables).toMatchObject({
      siteId: 'site-1',
      input: {
        collection_type: 'BLOG',
        title: 'Fresh post',
        slug: null,
        body_html: '<p>Hi</p>',
        tags: ['music', 'jam'],
        fields: [{ key: 'location', value: 'Delhi' }],
        published_at: null,
        is_published: false,
      },
    });
    expect(notifySuccess).toHaveBeenCalledWith(en('websiteApp.cms.entryForm.saved'));
  });

  it('refuses a custom field with no name, and lets the editor remove it', async () => {
    mount('/sites/site-1/careers/new');
    fireEvent.change(screen.getByLabelText(label('websiteApp.cms.entryForm.title')), { target: { value: 'Engineer' } });
    fireEvent.click(screen.getByRole('button', { name: en('websiteApp.cms.entryForm.addField') }));
    fireEvent.click(screen.getByTestId('cms-entry-save'));
    expect(await screen.findByText(en('websiteApp.cms.entryForm.errField'))).toBeInTheDocument();
    expect(mutationOf(CREATE_CMS_ENTRY)).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: en('websiteApp.cms.entryForm.removeField') }));
    fireEvent.click(screen.getByTestId('cms-entry-save'));
    await waitFor(() => expect(mutationOf(CREATE_CMS_ENTRY)).toHaveBeenCalled());
    expect(mutationOf(CREATE_CMS_ENTRY).mock.calls[0][0]?.variables).toMatchObject({ input: { collection_type: 'CAREER' } });
  });

  it('shows the server sentence for a refused save and stays on the form', async () => {
    mutationOf(CREATE_CMS_ENTRY).mockRejectedValue({ message: 'x', errors: [{ message: 'Slug already used', extensions: { code: 'CONFLICT' } }] });
    mount('/sites/site-1/blog/new');
    fireEvent.change(screen.getByLabelText(label('websiteApp.cms.entryForm.title')), { target: { value: 'Dup' } });
    fireEvent.click(screen.getByTestId('cms-entry-save'));
    expect(await screen.findByText('Slug already used')).toBeInTheDocument();
    expect(screen.queryByTestId('back-route')).not.toBeInTheDocument();
  });

  it('refuses a cover or share image that is neither an https link nor a site path', async () => {
    mount('/sites/site-1/blog/new');
    fireEvent.change(screen.getByLabelText(label('websiteApp.cms.entryForm.title')), { target: { value: 'Fresh post' } });
    fireEvent.change(screen.getByLabelText(en('websiteApp.cms.entryForm.cover')), { target: { value: '//cdn.test/cover.png' } });
    fireEvent.change(screen.getByLabelText(en('websiteApp.cms.pageForm.seoImage')), { target: { value: 'share.png' } });
    fireEvent.click(screen.getByTestId('cms-entry-save'));
    expect(await screen.findAllByText(en('websiteApp.cms.pageForm.errUrl'))).toHaveLength(2);
    expect(mutationOf(CREATE_CMS_ENTRY)).not.toHaveBeenCalled();
  });

  it('says not found for a collection the site does not know', () => {
    mount('/sites/site-1/podcasts/new');
    expect(screen.getByText(en('websiteApp.cms.notFound'))).toBeInTheDocument();
  });
});

describe('EntryEditorPage — existing entry', () => {
  it('loads the entry into the form and saves changes under its id', async () => {
    answerQuery(CMS_ENTRY, { data: { cmsEntry: ENTRY } });
    mount('/sites/site-1/blog/e1');
    expect(queryOptions.get(CMS_ENTRY)?.variables).toEqual({ id: 'e1' });
    expect(screen.getByLabelText(label('websiteApp.cms.entryForm.title'))).toHaveValue('Hello world');
    expect(screen.getByLabelText(en('websiteApp.cms.entryForm.tags'))).toHaveValue('a, b');
    expect(screen.getByDisplayValue('Remote')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: en('websiteApp.cms.entryForm.titleEdit') })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(label('websiteApp.cms.entryForm.title')), { target: { value: 'Hello again' } });
    fireEvent.click(screen.getByTestId('cms-entry-save'));
    await screen.findByTestId('back-route');
    expect(mutationOf(UPDATE_CMS_ENTRY).mock.calls[0][0]?.variables).toMatchObject({
      id: 'e1',
      input: { title: 'Hello again', slug: 'hello-world', tags: ['a', 'b'], published_at: '2026-10-01T10:00:00.000Z', is_published: true, sort_order: 2 },
    });
  });

  it('reports an entry that cannot be read, and shows nothing while it loads', () => {
    answerQuery(CMS_ENTRY, { data: { cmsEntry: null } });
    const first = mount('/sites/site-1/blog/e1');
    expect(screen.getByText(en('websiteApp.cms.entryForm.loadFailed'))).toBeInTheDocument();
    first.unmount();
    answerQuery(CMS_ENTRY, { loading: true });
    mount('/sites/site-1/blog/e1');
    expect(screen.queryByTestId('cms-entry-form')).not.toBeInTheDocument();
  });
});
