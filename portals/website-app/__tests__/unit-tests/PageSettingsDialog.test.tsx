import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import PageSettingsDialog from '../../src/pages/cms/pages-tab/PageSettingsDialog';
import { CREATE_CMS_PAGE, UPDATE_CMS_PAGE } from '../../src/pages/cms/queries/pages';
import { renderWithProviders } from '../testkit';
import { resetMonacoFakes } from '../mocks/monaco-editor';
import { makeCmsPageRow, makeCmsSeo, siteDesignMock } from '../mocks/cms.mock';

vi.mock('@monaco-editor/react', () => import('../mocks/monaco-editor'));
vi.mock('../../src/pages/cms/components/code-field/useServerProblems', () => ({
  useServerProblems: () => ({ problems: [], checking: false }),
}));
vi.mock('@duncit/media-picker', () => ({
  SingleImageUploadField: ({ label }: { label: string }) => <input aria-label={label} readOnly />,
}));

const page = makeCmsPageRow({ id: 'page-1', title: 'About', seo: makeCmsSeo({ og_title: 'About Duncit' }) });

const open = (state: Parameters<typeof PageSettingsDialog>[0]['state'], mocks: MockedResponse[]) => {
  resetMonacoFakes();
  const props = { siteId: 'site-1', collections: [], state, onClose: vi.fn(), onSaved: vi.fn() };
  renderWithProviders(<PageSettingsDialog {...props} />, { mocks: [siteDesignMock(), ...mocks] });
  return props;
};

describe('PageSettingsDialog — saving', () => {
  it("updates an existing page, sending its share card with the page's SEO", async () => {
    const sent = vi.fn();
    const updated: MockedResponse = {
      request: {
        query: UPDATE_CMS_PAGE,
        variables: (variables) => {
          sent(variables);
          return true;
        },
      },
      result: { data: { updateCmsPage: page } },
    };
    const { onSaved, onClose } = open({ page }, [updated]);
    expect(screen.getByRole('dialog', { name: 'Page settings' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Search & code' }));
    fireEvent.change(screen.getByLabelText('Keywords'), { target: { value: 'about, team' } });
    fireEvent.click(screen.getByTestId('cms-page-save'));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(sent.mock.calls[0][0]).toMatchObject({ id: 'page-1', input: { seo: { og_title: 'About Duncit', keywords: 'about, team', meta_tags: [] } } });
  });

  it("creates a new page and shows the server's reason when the address is taken", async () => {
    const taken = new GraphQLError('Another page already lives at /careers.', { extensions: { code: 'CONFLICT' } });
    const refused: MockedResponse = { request: { query: CREATE_CMS_PAGE, variables: () => true }, result: { errors: [taken] } };
    const { onSaved, onClose } = open({ page: null, preset: { path: '/careers', title: 'Careers' } }, [refused]);
    expect(screen.getByRole('dialog', { name: 'New page' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cms-page-save'));
    expect(await screen.findByText('Another page already lives at /careers.')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders nothing while closed', () => {
    open(null, []);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
