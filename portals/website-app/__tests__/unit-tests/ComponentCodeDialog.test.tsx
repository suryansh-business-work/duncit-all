import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { notifySuccess } from '@duncit/dialogs';
import ComponentCodeDialog from '../../src/pages/cms/fragments-tab/ComponentCodeDialog';
import { CMS_FRAGMENT_DRAFT, SAVE_CMS_FRAGMENT_DRAFT, type CmsFragmentRow } from '../../src/pages/cms/queries/fragments';
import { renderWithProviders } from '../testkit';
import { resetMonacoFakes } from '../mocks/monaco-editor';
import { makeCmsFragmentRow, makeComponentDraft, siteDesignMock } from '../mocks/cms.mock';

vi.mock('@monaco-editor/react', () => import('../mocks/monaco-editor'));
vi.mock('../../src/pages/cms/components/code-field/useServerProblems', () => ({
  useServerProblems: vi.fn(() => ({ problems: [], checking: false })),
}));
vi.mock('@duncit/dialogs', async (importOriginal) => ({ ...(await importOriginal<typeof import('@duncit/dialogs')>()), notifySuccess: vi.fn() }));

const row = makeCmsFragmentRow({ id: 'frag-1', name: 'Hero', updated_at: '2026-10-02T09:00:00.000Z' });
const draft = makeComponentDraft();

const draftLoads: MockedResponse = {
  request: { query: CMS_FRAGMENT_DRAFT, variables: { id: 'frag-1' } },
  result: { data: { cmsFragment: { ...row, draft: { __typename: 'CmsDraftContent', ...draft } } } },
};
const draftFails: MockedResponse = { request: { query: CMS_FRAGMENT_DRAFT, variables: { id: 'frag-1' } }, error: new Error('Failed to fetch') };

const NEW_SCSS = '.hero { padding: var(--space-2); }';
const savedInput = { project: draft.project, html: draft.html, css: draft.css, scss: NEW_SCSS, js: draft.js, base_updated_at: row.updated_at };
const saving = (outcome: Pick<MockedResponse, 'result' | 'error'>): MockedResponse => ({
  request: { query: SAVE_CMS_FRAGMENT_DRAFT, variables: { id: 'frag-1', input: savedInput } },
  ...outcome,
});
const saved = saving({
  result: { data: { saveCmsFragmentDraft: { __typename: 'CmsFragment', id: 'frag-1', has_unpublished_changes: true, updated_at: '2026-10-02T09:05:00.000Z' } } },
});

const open = (mocks: MockedResponse[], component: CmsFragmentRow | null = row) => {
  const props = { siteId: 'site-1', component, onClose: vi.fn(), onSaved: vi.fn() };
  renderWithProviders(<ComponentCodeDialog {...props} />, { mocks: [siteDesignMock(), ...mocks] });
  return props;
};

const editStylesAndSave = async () => {
  const styles = await screen.findByRole('textbox', { name: 'Component styles (SCSS)' });
  fireEvent.change(styles, { target: { value: NEW_SCSS } });
  fireEvent.click(screen.getByTestId('cms-component-code-save'));
};

beforeEach(() => {
  resetMonacoFakes();
  vi.mocked(notifySuccess).mockClear();
});

describe('ComponentCodeDialog', () => {
  it('stays closed without a component', () => {
    open([], null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it("loads the component's draft code with the site variables beside its styles", async () => {
    open([draftLoads]);
    expect(screen.getByRole('dialog', { name: 'Code — Hero' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Loading the component code' })).toBeInTheDocument();
    expect(await screen.findByRole('textbox', { name: 'Markup' })).toHaveValue(draft.html);
    expect(screen.getByRole('textbox', { name: 'Component styles (SCSS)' })).toHaveValue(draft.scss);
    expect(await screen.findByRole('button', { name: 'Insert --brand' })).toBeInTheDocument();
    expect(screen.queryByRole('progressbar', { name: 'Loading the component code' })).not.toBeInTheDocument();
  });

  it('says so when the draft cannot be loaded', async () => {
    open([draftFails]);
    expect(await screen.findByText('Could not load the component code.')).toBeInTheDocument();
    expect(screen.queryByTestId('cms-component-code-form')).not.toBeInTheDocument();
  });

  it('saves the code into the draft, keeping the visual layout when the markup is unchanged', async () => {
    const { onClose, onSaved } = open([draftLoads, saved]);
    await editStylesAndSave();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(notifySuccess).toHaveBeenCalledWith('Component code saved to the draft. Publish to make it live.');
  });

  it("shows the server's reason when someone else saved first, and stays open", async () => {
    const conflict = new GraphQLError('Someone else saved this component after you opened it.', { extensions: { code: 'CONFLICT' } });
    const { onClose, onSaved } = open([draftLoads, saving({ result: { errors: [conflict] } })]);
    await editStylesAndSave();
    expect(await screen.findByText('Someone else saved this component after you opened it.')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('shows the console message when the save fails for any other reason', async () => {
    const { onSaved } = open([draftLoads, saving({ error: new Error('Failed to fetch') })]);
    await editStylesAndSave();
    expect(await screen.findByText('Could not save the component code. Try again.')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByTestId('cms-component-code-save')).toBeEnabled();
  });
});
