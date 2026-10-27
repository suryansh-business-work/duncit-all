import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { ops, resetOps } from '../mocks/ops';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
vi.mock('@duncit/media-picker', async (io) => ({
  ...(await io<typeof import('@duncit/media-picker')>()),
  AttachmentUploadField: () => <div />,
  SingleImageUploadField: () => <div />,
}));

import StoreListingPage from '../../src/pages/app-builds/store-listing';

const listing = (over: Record<string, unknown> = {}) => ({
  locale: 'en-US',
  name: 'Duncit',
  subtitle: '',
  short_description: 'Meet people, do things',
  description: 'A long description',
  keywords: '',
  whats_new: '',
  copyright: '2026 Duncit',
  primary_category: 'SOCIAL_NETWORKING',
  privacy_policy_url: 'https://example.test/privacy',
  support_url: 'https://example.test/support',
  marketing_url: '',
  contact_email: 'ops@example.test',
  contact_phone: '+10000000000',
  review_first_name: 'Ops',
  review_last_name: 'Team',
  demo_account_name: '',
  demo_account_password: '',
  demo_account_required: false,
  review_notes: '',
  iphone_screenshots: [],
  ipad_screenshots: [],
  android_phone_screenshots: [],
  android_tablet_7_screenshots: [],
  android_tablet_10_screenshots: [],
  website_screenshots: [],
  android_feature_graphic: '',
  android_icon: '',
  updated_by: '',
  updated_at: null,
  ...over,
});

const seed = (over: Record<string, unknown> = {}, categories = ['SOCIAL_NETWORKING', 'LIFESTYLE']) => {
  ops.q = {
    StoreListing: { data: { storeListing: listing(over) } },
    AppStoreCategories: { data: { appStoreCategories: categories } },
  };
};

beforeEach(() => {
  resetOps();
  seed();
});

const categoryField = () => screen.findByRole('combobox', { name: /^Primary category/ });

describe('Store listing page / states', () => {
  it('shows a placeholder until the listing arrives', () => {
    ops.q = { StoreListing: { loading: true }, AppStoreCategories: { data: { appStoreCategories: [] } } };
    renderWithProviders(<StoreListingPage />);
    expect(screen.queryByTestId('store-listing-form')).not.toBeInTheDocument();
    expect(screen.queryByTestId('store-listing-last-saved')).not.toBeInTheDocument();
  });

  it('shows the form with a free-text category while Apple categories are still loading', async () => {
    ops.q.AppStoreCategories = { loading: true };
    renderWithProviders(<StoreListingPage />);
    expect(await screen.findByLabelText(/^Primary category/)).toHaveValue('SOCIAL_NETWORKING');
  });

  it('shows a busy save button while saving', async () => {
    ops.mutLoading.UpdateStoreListing = true;
    renderWithProviders(<StoreListingPage />);
    expect(await screen.findByTestId('store-listing-save')).toBeDisabled();
  });
});

describe('Store listing page / primary category', () => {
  it('lists Apple categories by readable name', async () => {
    renderWithProviders(<StoreListingPage />);
    expect(await categoryField()).toHaveTextContent('Social networking');
  });

  it('keeps showing a stored category Apple no longer lists', async () => {
    seed({ primary_category: 'GAMES_OLD' });
    renderWithProviders(<StoreListingPage />);
    expect(await categoryField()).toHaveTextContent('Games old');
  });

  it('offers the picker with nothing chosen for a listing with no category yet', async () => {
    seed({ primary_category: '' });
    renderWithProviders(<StoreListingPage />);
    expect(await categoryField()).not.toHaveTextContent(/\w/);
  });
});
