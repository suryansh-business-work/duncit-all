import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import FragmentsTab from '../../src/pages/cms/fragments-tab/FragmentsTab';
import { CMS_FRAGMENTS_TABLE, type CmsFragmentRow } from '../../src/pages/cms/queries/fragments';
import { useCopyPreviewLink } from '../../src/pages/cms/lib/useCopyPreviewLink';
import { renderWithProviders } from '../testkit';
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
vi.mock('../../src/pages/cms/fragments-tab/ReelsDialog', () => ({ default: () => null }));
vi.mock('../../src/pages/cms/components/VersionsDialog', () => ({ default: () => null }));

const site = makeCmsSiteRow({ id: 'site-1', key: 'main' });
const row = makeCmsFragmentRow({ id: 'frag-7', name: 'Pricing table', key: 'pricing', category: 'Pricing' });

const tableFetches = vi.fn(() => ({ data: { cmsFragmentsTable: { __typename: 'CmsFragmentTablePage', total: 1, rows: [row] } } }));
const fragmentsTable: MockedResponse = {
  request: { query: CMS_FRAGMENTS_TABLE, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: tableFetches,
};

const openRowAction = async (action: string) => {
  fireEvent.click(await screen.findByRole('button', { name: 'Actions: Pricing table' }));
  fireEvent.click(screen.getByRole('menuitem', { name: action }));
};

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
});
