import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import BrandingPage from '../index';
import { BRANDING, OCCASIONAL_ICONS, UPDATE_BRANDING } from '../queries';

/** The real field mounts the shared ImageKit/Pexels dialog (its own queries and
 * uploads); this page has a dozen of them and only stores their URLs. */
vi.mock('../../../components/MediaPickerField', () => ({
  default: (props: Readonly<{ label: string; value: string }>) => (
    <span aria-label={props.label}>{props.value || 'no asset'}</span>
  ),
}));

/** What the server returns. `primary_color` is deliberately null so the form's
 * fallback to the shipped default is exercised, and `updated_at` /
 * `home_show_all_vibe_categories` are read-only extras the input must drop. */
const branding = {
  __typename: 'Branding',
  app_name: 'Duncit',
  logo_url: 'https://cdn.test/logo.png',
  primary_color: null,
  support_email: 'help@duncit.com',
  support_phone: '+919999999999',
  mweb_favicon_url: '',
  mweb_logo_url: '',
  mweb_splash_url: '',
  mweb_splash_type: 'IMAGE',
  mobile_favicon_url: '',
  mobile_logo_url: '',
  mobile_splash_url: '',
  mobile_splash_type: 'VIDEO',
  portals_favicon_url: '',
  portals_logo_url: '',
  portals_splash_url: '',
  portals_splash_type: 'IMAGE',
  website_header_logo_url: '',
  website_footer_logo_url: '',
  website_favicon_url: '',
  android_app_url: 'https://play.google.com/store/apps/details?id=com.duncit',
  ios_app_url: '',
  home_all_vibe_icon_url: '',
  home_all_vibe_icon_layout: null,
  home_show_all_vibe_categories: true,
  home_header_tagline: 'Your city, tonight',
  mobile_font_family: 'Inter',
  mweb_font_family: '',
  portals_font_family: '',
  updated_at: '2026-07-01T00:00:00.000Z',
};

const brandingQuery: MockedResponse = {
  request: { query: BRANDING },
  // The mutation refetches 'Branding', so the same mock serves twice.
  maxUsageCount: 5,
  result: { data: { branding } },
};

const iconsQuery: MockedResponse = {
  request: { query: OCCASIONAL_ICONS },
  maxUsageCount: 5,
  result: { data: { branding: { __typename: 'Branding', occasional_icons: [] } } },
};

// FontsSection's tab strip keeps its selection in the URL via useTabParam
// (@duncit/tabs), which needs a Router in scope even though this page never
// navigates.
const renderPage = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={mocks}>
      <MemoryRouter>
        <BrandingPage />
      </MemoryRouter>
    </MockedProvider>,
  );

const captureSave = (sent: { variables?: Record<string, unknown> }): MockedResponse => ({
  request: { query: UPDATE_BRANDING },
  variableMatcher: () => true,
  result: (variables) => {
    sent.variables = variables;
    return { data: { updateBranding: branding } };
  },
});

describe('BrandingPage — query states', () => {
  it('shows a spinner and no form while the first load is in flight', () => {
    renderPage([brandingQuery, iconsQuery]);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByLabelText('App name')).not.toBeInTheDocument();
  });

  it('surfaces a failed branding query', async () => {
    renderPage([
      { request: { query: BRANDING }, error: new Error('Branding service unavailable') },
      iconsQuery,
    ]);
    expect(await screen.findByText('Branding service unavailable')).toBeInTheDocument();
  });

  it('fills the form from the server and falls blank fields back to defaults', async () => {
    renderPage([brandingQuery, iconsQuery]);
    expect(await screen.findByLabelText('App name')).toHaveValue('Duncit');
    expect(screen.getByLabelText('Home header tagline')).toHaveValue('Your city, tonight');
    expect(screen.getByLabelText('Support email')).toHaveValue('help@duncit.com');
    // primary_color came back null — the shipped default is used, not an empty box.
    expect(screen.getByLabelText('Primary color')).toHaveValue('#1976d2');
  });

  it('renders an accordion for identity, every platform, the websites, occasions and fonts', async () => {
    renderPage([brandingQuery, iconsQuery]);
    await screen.findByLabelText('App name');
    const titles = [
      'Identity',
      'mWeb (duncit.com)',
      'Mobile App (Android / iOS / native web)',
      'Portals (admin / crm / tech / …)',
      'Website Logos (marketing sites)',
      'Occasional Icons',
      'Fonts',
    ];
    titles.forEach((title) => expect(screen.getByText(title)).toBeInTheDocument());
  });
});

describe('BrandingPage — saving', () => {
  it('sends every editable field and drops the read-only ones', async () => {
    const sent: { variables?: Record<string, unknown> } = {};
    renderPage([brandingQuery, iconsQuery, captureSave(sent)]);
    await screen.findByLabelText('App name');

    fireEvent.click(screen.getByRole('button', { name: 'Save Branding' }));

    expect(await screen.findByText('Branding saved')).toBeInTheDocument();
    const input = sent.variables?.input as Record<string, unknown>;
    expect(input).toMatchObject({
      app_name: 'Duncit',
      primary_color: '#1976d2',
      mobile_splash_type: 'VIDEO',
      mobile_font_family: 'Inter',
      home_all_vibe_icon_layout: null,
    });
    expect(input).not.toHaveProperty('__typename');
    expect(input).not.toHaveProperty('updated_at');
    expect(input).not.toHaveProperty('home_show_all_vibe_categories');
  });

  it('sends the edited values rather than the ones the query returned', async () => {
    const sent: { variables?: Record<string, unknown> } = {};
    renderPage([brandingQuery, iconsQuery, captureSave(sent)]);
    await screen.findByLabelText('App name');

    fireEvent.change(screen.getByLabelText('App name'), { target: { value: 'Duncit Live' } });
    fireEvent.change(screen.getByLabelText('Support phone (Bouncers → Quick Support)'), {
      target: { value: '+918888888888' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Branding' }));

    await screen.findByText('Branding saved');
    expect(sent.variables?.input).toMatchObject({
      app_name: 'Duncit Live',
      support_phone: '+918888888888',
    });
  });

  it('dismisses the saved toast on Escape', async () => {
    const sent: { variables?: Record<string, unknown> } = {};
    renderPage([brandingQuery, iconsQuery, captureSave(sent)]);
    await screen.findByLabelText('App name');

    fireEvent.click(screen.getByRole('button', { name: 'Save Branding' }));
    await screen.findByText('Branding saved');

    fireEvent.keyDown(document.body, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByText('Branding saved')).not.toBeInTheDocument());
  });

  it('shows the mutation error and leaves the button usable', async () => {
    renderPage([
      brandingQuery,
      iconsQuery,
      {
        request: { query: UPDATE_BRANDING },
        variableMatcher: () => true,
        error: new Error('primary_color must be a hex value'),
      },
    ]);
    await screen.findByLabelText('App name');

    fireEvent.click(screen.getByRole('button', { name: 'Save Branding' }));

    expect(await screen.findByText('primary_color must be a hex value')).toBeInTheDocument();
    expect(screen.queryByText('Branding saved')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save Branding' })).toBeEnabled(),
    );
  });
});
