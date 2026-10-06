import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { Route } from 'react-router';
import type { MockedResponse } from '@apollo/client/testing';
import CmsEditorPage from '../../src/pages/cms/editor/CmsEditorPage';
import { CMS_PAGE_DRAFT } from '../../src/pages/cms/queries/pages';
import { CMS_FRAGMENT_DRAFT, CMS_FRAGMENT_OPTIONS } from '../../src/pages/cms/queries/fragments';
import { CMS_SITE_DESIGN } from '../../src/pages/cms/queries/sites';
import { renderWithProviders } from '../testkit';

const copy = vi.hoisted(() => ({ page: vi.fn(), component: vi.fn() }));
vi.mock('../../src/pages/cms/lib/useCopyPreviewLink', () => ({ useCopyPreviewLink: () => copy }));
// GrapesJS needs a real browser; the toolbar wiring is what is under test.
vi.mock('../../src/pages/cms/editor/useGrapesEditor', () => ({
  useGrapesEditor: () => ({ editor: null, dirty: false, error: null, markSaved: vi.fn() }),
}));
vi.mock('../../src/pages/cms/editor/useEditorSave', () => ({
  useEditorSave: () => ({ busy: null, conflict: false, save: vi.fn(), publish: vi.fn() }),
}));
vi.mock('@duncit/media-picker', () => ({ MediaPickerDialog: () => null }));

/** Every query the editor opens with, left pending: the toolbar shows before the document loads. */
const pending: MockedResponse[] = [CMS_PAGE_DRAFT, CMS_FRAGMENT_DRAFT, CMS_SITE_DESIGN, CMS_FRAGMENT_OPTIONS].map((query) => ({
  request: { query, variables: () => true },
  result: { data: {} },
  delay: Infinity,
}));

const openEditor = (path: string) =>
  renderWithProviders(<></>, {
    mocks: pending,
    initialEntries: [path],
    routes: <Route path="/sites/:siteId/:target/:docId/design" element={<CmsEditorPage />} />,
  });

beforeEach(() => {
  copy.page.mockClear();
  copy.component.mockClear();
});

describe('CmsEditorPage — copy preview link', () => {
  it("copies the page's preview link when a page is open", () => {
    openEditor('/sites/site-1/pages/page-1/design');
    fireEvent.click(screen.getByTestId('cms-editor-copy-link'));
    expect(copy.page).toHaveBeenCalledWith('page-1');
    expect(copy.component).not.toHaveBeenCalled();
  });

  it("copies the component's own preview link when a component is open", () => {
    openEditor('/sites/site-1/fragments/frag-1/design');
    fireEvent.click(screen.getByTestId('cms-editor-copy-link'));
    expect(copy.component).toHaveBeenCalledWith('frag-1');
    expect(copy.page).not.toHaveBeenCalled();
  });
});
