import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import type { DocumentNode } from 'graphql';
import FragmentsTab from '../../src/pages/cms/fragments-tab/FragmentsTab';
import { CMS_FRAGMENTS_TABLE, CREATE_CMS_FRAGMENT, UPDATE_CMS_FRAGMENT, type CmsFragmentRow } from '../../src/pages/cms/queries/fragments';
import { useCopyPreviewLink } from '../../src/pages/cms/lib/useCopyPreviewLink';
import { renderWithProviders } from '../testkit';
import { en, label } from '../en';
import { makeCmsFragmentRow, makeCmsSiteRow } from '../mocks/cms.mock';

const copy = vi.hoisted(() => ({ page: vi.fn(), component: vi.fn() }));
vi.mock('../../src/pages/cms/lib/useCopyPreviewLink', () => ({ useCopyPreviewLink: vi.fn(() => copy) }));
// The code dialog has its own suite; here only what the tab hands it matters.
vi.mock('../../src/pages/cms/fragments-tab/ComponentCodeDialog', () => ({
  default: ({ component, onClose, onSaved }: { component: CmsFragmentRow | null; onClose: () => void; onSaved: () => void }) =>
    component ? (
      <div role="dialog" aria-label={`Code for ${component.name}`}>
        <button type="button" onClick={onSaved}>
          saved
        </button>
        <button type="button" onClick={onClose}>
          close
        </button>
      </div>
    ) : null,
}));
// The reels and versions dialogs have their own suites too; here only what the tab opens them with.
vi.mock('../../src/pages/cms/fragments-tab/ReelsDialog', () => ({
  default: ({ site: forSite, open, onClose }: { site: { name: string }; open: boolean; onClose: () => void }) =>
    open ? (
      <div role="dialog" aria-label={`Reels of ${forSite.name}`}>
        <button type="button" onClick={onClose}>
          close reels
        </button>
      </div>
    ) : null,
}));
vi.mock('../../src/pages/cms/components/VersionsDialog', () => ({
  default: ({ owner, onClose, onRestored }: { owner: { kind: string; id: string; name: string } | null; onClose: () => void; onRestored: () => void }) =>
    owner ? (
      <div role="dialog" aria-label={`${owner.kind} ${owner.id} versions of ${owner.name}`}>
        <button type="button" onClick={onRestored}>
          restored
        </button>
        <button type="button" onClick={onClose}>
          close versions
        </button>
      </div>
    ) : null,
}));

const site = makeCmsSiteRow({ id: 'site-1', key: 'main' });
const row = makeCmsFragmentRow({ id: 'frag-7', name: 'Pricing table', key: 'pricing', category: 'Pricing' });

const tableFetches = vi.fn(() => ({ data: { cmsFragmentsTable: { __typename: 'CmsFragmentTablePage', total: 1, rows: [row] } } }));
const fragmentsTable: MockedResponse = {
  request: { query: CMS_FRAGMENTS_TABLE, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: tableFetches,
};

/** A mutation that records what it was sent, then answers with `data` or a GraphQL refusal. */
const recorded = (
  query: DocumentNode,
  data: Record<string, unknown>,
  seen: Record<string, unknown>[],
  refusal?: { message: string; code: string },
): MockedResponse => ({
  request: {
    query,
    variables: (variables: Record<string, unknown>) => {
      seen.push(variables);
      return true;
    },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: refusal ? { errors: [{ message: refusal.message, extensions: { code: refusal.code } }] as never } : { data },
});

const openRowAction = async (action: string, name = 'Pricing table') => {
  fireEvent.click(await screen.findByRole('button', { name: `Actions: ${name}` }));
  fireEvent.click(screen.getByRole('menuitem', { name: action }));
};

const newDialog = () => screen.findByRole('dialog', { name: en('websiteApp.cms.fragmentForm.dialogNew') });
const editDialog = () => screen.findByRole('dialog', { name: en('websiteApp.cms.fragmentForm.dialogEdit') });

beforeEach(() => {
  copy.component.mockClear();
  tableFetches.mockClear();
  localStorage.clear();
});

describe('FragmentsTab', () => {
  it('lists each component with its category', async () => {
    renderWithProviders(<FragmentsTab site={site} />, { mocks: [fragmentsTable] });
    expect(await screen.findByText('Pricing')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Category' })).toBeInTheDocument();
  });

  it('opens the code dialog for the chosen component, refreshes the list once it saves, and closes it', async () => {
    renderWithProviders(<FragmentsTab site={site} />, { mocks: [fragmentsTable] });
    await openRowAction('Edit code');
    expect(screen.getByRole('dialog', { name: 'Code for Pricing table' })).toBeInTheDocument();
    const fetchesBefore = tableFetches.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'saved' }));
    await waitFor(() => expect(tableFetches.mock.calls.length).toBeGreaterThan(fetchesBefore));
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByRole('dialog', { name: 'Code for Pricing table' })).not.toBeInTheDocument();
  });

  it("copies the component's preview link from its row", async () => {
    renderWithProviders(<FragmentsTab site={site} />, { mocks: [fragmentsTable] });
    await openRowAction('Copy preview link');
    expect(copy.component).toHaveBeenCalledWith('frag-7');
    expect(useCopyPreviewLink).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('creates a component from New on this site, refreshes the list and closes the dialog', async () => {
    const seen: Record<string, unknown>[] = [];
    const created = makeCmsFragmentRow({ id: 'frag-new', name: 'Site footer', key: 'site-footer' });
    renderWithProviders(<FragmentsTab site={site} />, { mocks: [fragmentsTable, recorded(CREATE_CMS_FRAGMENT, { createCmsFragment: created }, seen)] });
    await screen.findByText('Pricing');
    fireEvent.click(screen.getByTestId('cms-new-fragment'));
    const dialog = await newDialog();
    expect(within(dialog).getByLabelText(label('websiteApp.cms.fragmentForm.name'))).toHaveValue('');
    fireEvent.change(within(dialog).getByLabelText(label('websiteApp.cms.fragmentForm.name')), { target: { value: 'Site footer' } });
    fireEvent.change(within(dialog).getByLabelText(label('websiteApp.cms.fragmentForm.key')), { target: { value: 'Site-Footer' } });
    const fetchesBefore = tableFetches.mock.calls.length;
    fireEvent.click(within(dialog).getByRole('button', { name: en('shell.common.save') }));

    await waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0]).toEqual({ siteId: 'site-1', input: { name: 'Site footer', key: 'site-footer', kind: 'SECTION', category: '', description: '' } });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: en('websiteApp.cms.fragmentForm.dialogNew') })).not.toBeInTheDocument());
    expect(tableFetches.mock.calls.length).toBeGreaterThan(fetchesBefore);
  });

  it('renames a component under its own id, starting from what it is called now', async () => {
    const seen: Record<string, unknown>[] = [];
    renderWithProviders(<FragmentsTab site={site} />, {
      mocks: [fragmentsTable, recorded(UPDATE_CMS_FRAGMENT, { updateCmsFragment: { ...row, name: 'Pricing grid' } }, seen)],
    });
    await openRowAction(en('websiteApp.cms.fragments.rename'));
    const dialog = await editDialog();
    const name = within(dialog).getByLabelText(label('websiteApp.cms.fragmentForm.name'));
    expect(name).toHaveValue('Pricing table');
    fireEvent.change(name, { target: { value: 'Pricing grid' } });
    fireEvent.click(within(dialog).getByRole('button', { name: en('shell.common.save') }));

    await waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0]).toEqual({ id: 'frag-7', input: { name: 'Pricing grid', key: 'pricing', kind: 'SECTION', category: 'Pricing', description: '' } });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: en('websiteApp.cms.fragmentForm.dialogEdit') })).not.toBeInTheDocument());
  });

  it("keeps the dialog open with the server's reason when a save is refused", async () => {
    const seen: Record<string, unknown>[] = [];
    renderWithProviders(<FragmentsTab site={site} />, {
      mocks: [fragmentsTable, recorded(UPDATE_CMS_FRAGMENT, {}, seen, { message: 'That key is already used.', code: 'CONFLICT' })],
    });
    await openRowAction(en('websiteApp.cms.fragments.rename'));
    const dialog = await editDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: en('shell.common.save') }));
    expect(await within(dialog).findByText('That key is already used.')).toBeInTheDocument();
    expect(seen).toHaveLength(1);
    expect(screen.getByRole('dialog', { name: en('websiteApp.cms.fragmentForm.dialogEdit') })).toBeInTheDocument();
  });

  it('shows the console sentence, not the transport message, for an unexpected failure', async () => {
    renderWithProviders(<FragmentsTab site={site} />, {
      mocks: [fragmentsTable, recorded(UPDATE_CMS_FRAGMENT, {}, [], { message: 'ECONNRESET at db-1', code: 'INTERNAL_SERVER_ERROR' })],
    });
    await openRowAction(en('websiteApp.cms.fragments.rename'));
    const dialog = await editDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: en('shell.common.save') }));
    expect(await within(dialog).findByText(en('websiteApp.cms.fragmentForm.saveFailed'))).toBeInTheDocument();
    expect(screen.queryByText(/ECONNRESET/)).not.toBeInTheDocument();
  });

  it('closes the form on Cancel and on Escape without saving', async () => {
    const seen: Record<string, unknown>[] = [];
    renderWithProviders(<FragmentsTab site={site} />, { mocks: [fragmentsTable, recorded(CREATE_CMS_FRAGMENT, {}, seen)] });
    await screen.findByText('Pricing');
    const formDialog = () => screen.queryByRole('dialog', { name: en('websiteApp.cms.fragmentForm.dialogNew') });

    fireEvent.click(screen.getByTestId('cms-new-fragment'));
    fireEvent.click(within(await newDialog()).getByRole('button', { name: en('shell.common.cancel') }));
    await waitFor(() => expect(formDialog()).not.toBeInTheDocument());

    fireEvent.click(screen.getByTestId('cms-new-fragment'));
    fireEvent.keyDown(await newDialog(), { key: 'Escape' });
    await waitFor(() => expect(formDialog()).not.toBeInTheDocument());
    expect(seen).toHaveLength(0);
  });

  it('labels a component built from live blocks as live, and offers reels only for a reel slider', async () => {
    const slider = makeCmsFragmentRow({ id: 'frag-8', name: 'Reel strip', key: 'reel-strip', blocks: ['reel-slider'], updated_at: '' });
    const table: MockedResponse = {
      request: { query: CMS_FRAGMENTS_TABLE, variables: () => true },
      maxUsageCount: Number.POSITIVE_INFINITY,
      result: { data: { cmsFragmentsTable: { __typename: 'CmsFragmentTablePage', total: 2, rows: [row, slider] } } },
    };
    renderWithProviders(<FragmentsTab site={makeCmsSiteRow({ id: 'site-1', key: 'main', name: 'Main' })} />, { mocks: [table] });
    expect(await screen.findByText(en('websiteApp.cms.fragments.kindLive'))).toBeInTheDocument();
    expect(screen.getByText(en('websiteApp.cms.fragments.kindSection'))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Actions: Pricing table' }));
    expect(screen.getByRole('menuitem', { name: en('websiteApp.cms.fragments.rename') })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: en('websiteApp.cms.fragments.manageReels') })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());

    await openRowAction(en('websiteApp.cms.fragments.manageReels'), 'Reel strip');
    expect(screen.getByRole('dialog', { name: 'Reels of Main' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'close reels' }));
    expect(screen.queryByRole('dialog', { name: 'Reels of Main' })).not.toBeInTheDocument();
  });

  it("opens the component's versions, refreshes after a restore, and closes them", async () => {
    renderWithProviders(<FragmentsTab site={site} />, { mocks: [fragmentsTable] });
    await openRowAction(en('websiteApp.cms.pages.versions'));
    expect(screen.getByRole('dialog', { name: 'FRAGMENT frag-7 versions of Pricing table' })).toBeInTheDocument();
    const fetchesBefore = tableFetches.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'restored' }));
    await waitFor(() => expect(tableFetches.mock.calls.length).toBeGreaterThan(fetchesBefore));
    fireEvent.click(screen.getByRole('button', { name: 'close versions' }));
    expect(screen.queryByRole('dialog', { name: /versions of/ })).not.toBeInTheDocument();
  });
});
