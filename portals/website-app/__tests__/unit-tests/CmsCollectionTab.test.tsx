import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { useLocation } from 'react-router';
import { notifyError } from '@duncit/dialogs';
import CollectionTab from '../../src/pages/cms/collection-tab/CollectionTab';
import { CMS_ENTRIES_TABLE, DELETE_CMS_ENTRY, type CmsEntryRow } from '../../src/pages/cms/queries/entries';
import { CMS_PAGES_TABLE, CREATE_CMS_PAGE } from '../../src/pages/cms/queries/pages';
import { renderWithProviders, showHiddenColumns } from '../testkit';
import { en } from '../en';
import { makeCmsPageRow, makeCmsSiteRow } from '../mocks/cms.mock';
import { entriesPage, makeCmsEntryRow } from '../mocks/cms-collection.mock';

const confirm = vi.hoisted(() => vi.fn());

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  useConfirm: () => confirm,
}));

const site = makeCmsSiteRow({ id: 'site-1', key: 'main' });
const TABLE_ID = 'cms-entries-main-blog';

const launch = makeCmsEntryRow({
  id: 'entry-1',
  title: 'Launch week',
  category: 'News',
  cover_image_url: 'https://ik.test/launch.png',
  is_published: true,
  published_at: '2026-09-01T04:30:00.000Z',
});
const draft = makeCmsEntryRow({ id: 'entry-2', title: 'Hiring update', category: 'Team', cover_image_url: '', is_published: false, published_at: null, updated_at: '' });

/** The entries table, answered from `rows` as it stands when each fetch arrives. */
const entriesTable = (rows: { current: CmsEntryRow[] }) => {
  const fetches = vi.fn((_variables: Record<string, unknown>) => entriesPage(rows.current));
  const mock: MockedResponse = {
    request: { query: CMS_ENTRIES_TABLE, variables: () => true },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: fetches,
  };
  return { mock, fetches };
};

const templateLookup = (rows: ReturnType<typeof makeCmsPageRow>[], expected: { kind: string }): MockedResponse => ({
  request: {
    query: CMS_PAGES_TABLE,
    variables: (vars: Record<string, unknown>) => {
      const query = vars.query as { filters: { field: string; value: string }[] };
      return vars.siteId === 'site-1' && query.filters.some((f) => f.field === 'kind' && f.value === expected.kind) && query.filters.some((f) => f.field === 'collection_type' && f.value === 'BLOG');
    },
  },
  result: { data: { cmsPagesTable: { __typename: 'CmsPageTablePage', total: rows.length, rows } } },
});

function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>;
}

const mount = (mocks: MockedResponse[]) =>
  renderWithProviders(
    <>
      <CollectionTab site={site} collection="BLOG" />
      <Where />
    </>,
    { mocks, initialEntries: ['/sites/site-1/blog'] },
  );

const where = () => screen.getByTestId('where').textContent;

beforeEach(() => {
  confirm.mockReset();
  vi.mocked(notifyError).mockClear();
  localStorage.clear();
});

describe('CollectionTab — entries table', () => {
  it("lists the collection's entries with their cover, category, status and publish date", async () => {
    showHiddenColumns(TABLE_ID, ['updated_at']);
    const { mock, fetches } = entriesTable({ current: [launch, draft] });
    const view = mount([mock]);
    expect(await screen.findByText('Launch week')).toBeInTheDocument();
    expect(screen.getByText('Hiring update')).toBeInTheDocument();
    expect(fetches).toHaveBeenCalledWith(expect.objectContaining({ siteId: 'site-1', collection: 'BLOG' }));
    expect(screen.getByText('News')).toBeInTheDocument();
    expect(screen.getByText(en('websiteApp.cms.pages.published'))).toBeInTheDocument();
    expect(screen.getByText(en('websiteApp.cms.pages.draft'))).toBeInTheDocument();
    // Only the entry with a cover shows a thumbnail.
    const covers = view.container.querySelectorAll('img');
    expect([...covers].map((img) => img.getAttribute('src'))).toEqual(['https://ik.test/launch.png']);
    await waitFor(() => expect(screen.getByText('01 Sep 2026')).toBeInTheDocument());
    expect(screen.getByRole('columnheader', { name: en('websiteApp.cms.entries.colPublishedAt') })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: en('shell.common.updated') })).toBeInTheDocument();
  });

  it('shows the empty text for a collection with no entries yet', async () => {
    mount([entriesTable({ current: [] }).mock]);
    expect(await screen.findByText(en('websiteApp.cms.entries.empty'))).toBeInTheDocument();
  });

  it('opens a new entry, and an existing one from its row menu', async () => {
    mount([entriesTable({ current: [launch] }).mock]);
    fireEvent.click(await screen.findByRole('button', { name: `${en('shell.common.actions')}: Launch week` }));
    fireEvent.click(screen.getByRole('menuitem', { name: en('shell.common.edit') }));
    expect(where()).toBe('/sites/site-1/blog/entry-1');
    fireEvent.click(screen.getByTestId('cms-new-entry'));
    expect(where()).toBe('/sites/site-1/blog/new');
    expect(screen.getByTestId('cms-new-entry')).toHaveTextContent(`${en('websiteApp.cms.entries.new')} — ${en('websiteApp.cms.collection.blog')}`);
  });
});

describe('CollectionTab — deleting an entry', () => {
  const openDelete = async () => {
    fireEvent.click(await screen.findByRole('button', { name: `${en('shell.common.actions')}: Launch week` }));
    fireEvent.click(screen.getByRole('menuitem', { name: en('shell.common.delete') }));
  };

  it('deletes only after confirming, then refreshes the table without it', async () => {
    const rows = { current: [launch, draft] };
    const remove: MockedResponse = {
      request: { query: DELETE_CMS_ENTRY, variables: { id: 'entry-1' } },
      result: () => {
        rows.current = [draft];
        return { data: { deleteCmsEntry: true } };
      },
    };
    confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mount([entriesTable(rows).mock, remove]);

    await openDelete();
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: en('websiteApp.cms.entries.deleteTitle'), message: en('websiteApp.cms.entries.deleteText', { title: 'Launch week' }), destructive: true }),
    );
    expect(rows.current).toHaveLength(2);

    await openDelete();
    await waitFor(() => expect(screen.queryByText('Launch week')).not.toBeInTheDocument());
    expect(screen.getByText('Hiring update')).toBeInTheDocument();
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('says so when the server refuses the delete, and keeps the entry', async () => {
    const remove: MockedResponse = { request: { query: DELETE_CMS_ENTRY, variables: { id: 'entry-1' } }, error: new Error('boom') };
    confirm.mockResolvedValue(true);
    mount([entriesTable({ current: [launch] }).mock, remove]);
    await openDelete();
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(en('websiteApp.cms.entries.deleteFailed')));
    expect(screen.getByText('Launch week')).toBeInTheDocument();
  });

  it('reports a failure when the confirmation itself could not be shown', async () => {
    confirm.mockRejectedValue(new Error('no dialog host'));
    mount([entriesTable({ current: [launch] }).mock]);
    await openDelete();
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(en('websiteApp.cms.entries.deleteFailed')));
  });
});

describe('CollectionTab — list and detail templates', () => {
  it('opens the existing list template without creating another', async () => {
    mount([entriesTable({ current: [] }).mock, templateLookup([makeCmsPageRow({ id: 'tpl-list', kind: 'COLLECTION_LIST', collection_type: 'BLOG' })], { kind: 'COLLECTION_LIST' })]);
    fireEvent.click(screen.getByRole('button', { name: en('websiteApp.cms.entries.designList') }));
    await waitFor(() => expect(where()).toBe('/sites/site-1/pages/tpl-list/design'));
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('creates the detail template the first time, named after the collection, then opens it', async () => {
    const create: MockedResponse = {
      request: {
        query: CREATE_CMS_PAGE,
        variables: {
          siteId: 'site-1',
          input: { kind: 'COLLECTION_DETAIL', collection_type: 'BLOG', title: `${en('websiteApp.cms.collection.blog')} — ${en('websiteApp.cms.entries.designDetail')}` },
        },
      },
      result: { data: { createCmsPage: makeCmsPageRow({ id: 'tpl-new', kind: 'COLLECTION_DETAIL', collection_type: 'BLOG' }) } },
    };
    mount([entriesTable({ current: [] }).mock, templateLookup([], { kind: 'COLLECTION_DETAIL' }), create]);
    const button = screen.getByRole('button', { name: en('websiteApp.cms.entries.designDetail') });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    await waitFor(() => expect(where()).toBe('/sites/site-1/pages/tpl-new/design'));
    expect(button).not.toBeDisabled();
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('names a new list template after the list design', async () => {
    const create: MockedResponse = {
      request: {
        query: CREATE_CMS_PAGE,
        variables: {
          siteId: 'site-1',
          input: { kind: 'COLLECTION_LIST', collection_type: 'BLOG', title: `${en('websiteApp.cms.collection.blog')} — ${en('websiteApp.cms.entries.designList')}` },
        },
      },
      result: { data: { createCmsPage: makeCmsPageRow({ id: 'tpl-list-new', kind: 'COLLECTION_LIST', collection_type: 'BLOG' }) } },
    };
    mount([entriesTable({ current: [] }).mock, templateLookup([], { kind: 'COLLECTION_LIST' }), create]);
    fireEvent.click(screen.getByRole('button', { name: en('websiteApp.cms.entries.designList') }));
    await waitFor(() => expect(where()).toBe('/sites/site-1/pages/tpl-list-new/design'));
  });

  it('stays put when the server hands back no template id', async () => {
    const create: MockedResponse = {
      request: { query: CREATE_CMS_PAGE, variables: () => true },
      result: { data: { createCmsPage: makeCmsPageRow({ id: '', kind: 'COLLECTION_LIST', collection_type: 'BLOG' }) } },
    };
    mount([entriesTable({ current: [] }).mock, templateLookup([], { kind: 'COLLECTION_LIST' }), create]);
    const button = screen.getByRole('button', { name: en('websiteApp.cms.entries.designList') });
    fireEvent.click(button);
    await waitFor(() => expect(button).not.toBeDisabled());
    expect(where()).toBe('/sites/site-1/blog');
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('says the template could not be opened when the lookup fails', async () => {
    const lookup: MockedResponse = { request: { query: CMS_PAGES_TABLE, variables: () => true }, error: new Error('offline') };
    mount([entriesTable({ current: [] }).mock, lookup]);
    fireEvent.click(screen.getByRole('button', { name: en('websiteApp.cms.entries.designList') }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(en('websiteApp.cms.entries.templateFailed')));
    expect(where()).toBe('/sites/site-1/blog');
  });
});
