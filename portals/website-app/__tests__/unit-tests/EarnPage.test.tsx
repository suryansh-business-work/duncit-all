import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { Route } from 'react-router';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { notifySuccess } from '@duncit/dialogs';
import EarnPage from '../../src/pages/website/earn';
import { SAVE_WEBSITE_EARN_SECTION, WEBSITE_EARN_SECTIONS } from '../../src/pages/website/earn/queries';
import type { WebsiteEarnSection } from '../../src/pages/website/earn/earn-form';
import { renderWithProviders } from '../testkit';
import { en, label } from '../en';

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess: vi.fn(),
}));
vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  useImagekitDirectUpload: () => ({ upload: vi.fn(), uploading: false }),
}));

const makeSection = (over: Partial<WebsiteEarnSection> = {}): WebsiteEarnSection & { __typename: 'WebsiteEarnSection' } => ({
  __typename: 'WebsiteEarnSection',
  site: 'MAIN',
  enabled: true,
  position: 'AFTER_REELS',
  variant: 'WALL',
  accent: 'PRIMARY',
  eyebrow: '',
  heading: 'Main heading',
  heading_muted: '',
  text: '',
  cta_label: '',
  cta_url: '',
  images: [],
  floating_enabled: true,
  floating_label: '',
  updated_at: null,
  ...over,
});

const list = (sections: ReturnType<typeof makeSection>[]): MockedResponse => ({
  request: { query: WEBSITE_EARN_SECTIONS },
  result: { data: { websiteEarnSections: sections } },
});

const input = (over: Record<string, unknown> = {}) => {
  const { __typename: _typename, updated_at: _updatedAt, ...rest } = makeSection();
  return { ...rest, ...over };
};

const render = (mocks: MockedResponse[], entry = '/website/earn') =>
  renderWithProviders(<></>, { mocks, initialEntries: [entry], routes: <Route path="/website/earn" element={<EarnPage />} /> });

const heading = () => screen.findByLabelText(label('websiteApp.earn.heading')) as Promise<HTMLInputElement>;
const save = () => screen.getByRole('button', { name: en('shell.common.save') });

beforeEach(() => {
  vi.mocked(notifySuccess).mockClear();
});

describe('EarnPage', () => {
  it('names the page and offers a tab for each site that shows the section, not the earn site itself', async () => {
    render([list([makeSection()])]);
    expect(await screen.findByText(en('websiteApp.earn.title'))).toBeInTheDocument();
    expect(screen.getByText(en('websiteApp.earn.subtitle'))).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['duncit.com', 'partners.duncit.com', 'ads.duncit.com']);
  });

  it('shows a placeholder while the sections load', () => {
    const { container } = render([list([makeSection()])]);
    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
  });

  it('reports sections that could not be loaded', async () => {
    render([{ request: { query: WEBSITE_EARN_SECTIONS }, error: new Error('Server down') }]);
    expect(await screen.findByText(en('websiteApp.earn.loadFailed'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: en('shell.common.save') })).not.toBeInTheDocument();
  });

  it('says so when the chosen site has no section yet', async () => {
    render([list([makeSection({ site: 'PARTNERS' })])]);
    expect(await screen.findByText(en('websiteApp.earn.empty'))).toBeInTheDocument();
  });

  it('shows the main site first, and another site when its tab is chosen', async () => {
    render([list([makeSection({ heading: 'Main heading' }), makeSection({ site: 'PARTNERS', heading: 'Partners heading' })])]);
    expect((await heading()).value).toBe('Main heading');
    fireEvent.click(screen.getByRole('tab', { name: 'partners.duncit.com' }));
    await waitFor(() => expect(screen.getByLabelText(label('websiteApp.earn.heading'))).toHaveValue('Partners heading'));
  });

  it('opens straight on the site named in the address', async () => {
    render([list([makeSection(), makeSection({ site: 'ADS', heading: 'Ads heading' })])], '/website/earn?selectedtab=ADS');
    expect((await heading()).value).toBe('Ads heading');
  });

  it('saves the edited section for the site on screen, says so, and shows the saved copy', async () => {
    const saved = makeSection({ heading: 'New heading', updated_at: '2026-10-02T10:00:00.000Z' });
    let sent: unknown = null;
    const mutation: MockedResponse = {
      request: { query: SAVE_WEBSITE_EARN_SECTION, variables: () => true },
      result: (variables: unknown) => {
        sent = variables;
        return { data: { saveWebsiteEarnSection: saved } };
      },
    };
    render([list([makeSection(), makeSection({ site: 'PARTNERS' })]), mutation]);
    fireEvent.change(await heading(), { target: { value: 'New heading' } });
    fireEvent.click(save());
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith(en('websiteApp.earn.saved')));
    expect(sent).toEqual({ input: { site: 'MAIN', ...input({ heading: 'New heading' }) } });
    await waitFor(() => expect(screen.getByLabelText(label('websiteApp.earn.heading'))).toHaveValue('New heading'));
    // The other site's stored section is untouched by the write-back.
    fireEvent.click(screen.getByRole('tab', { name: 'partners.duncit.com' }));
    await waitFor(() => expect(screen.getByLabelText(label('websiteApp.earn.heading'))).toHaveValue('Main heading'));
  });

  it('says the save failed and keeps what was typed', async () => {
    const mutation: MockedResponse = {
      request: { query: SAVE_WEBSITE_EARN_SECTION, variables: () => true },
      error: new Error('Not allowed'),
    };
    render([list([makeSection(), makeSection({ site: 'PARTNERS' })]), mutation]);
    fireEvent.change(await heading(), { target: { value: 'Typed heading' } });
    fireEvent.click(save());
    expect(await screen.findByText(en('websiteApp.earn.saveFailed'))).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(screen.getByLabelText(label('websiteApp.earn.heading'))).toHaveValue('Typed heading');
  });

  it('drops a save error when another site is chosen', async () => {
    const mutation: MockedResponse = {
      request: { query: SAVE_WEBSITE_EARN_SECTION, variables: () => true },
      error: new Error('Not allowed'),
    };
    render([list([makeSection(), makeSection({ site: 'PARTNERS' })]), mutation]);
    await heading();
    fireEvent.click(save());
    expect(await screen.findByText(en('websiteApp.earn.saveFailed'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'partners.duncit.com' }));
    await waitFor(() => expect(screen.queryByText(en('websiteApp.earn.saveFailed'))).not.toBeInTheDocument());
  });
});
