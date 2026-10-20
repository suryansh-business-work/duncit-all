import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
// The uploader belongs to @duncit/media-picker; these stand-ins hand the form a
// finished upload so the page's own validation and tab routing are what runs.
vi.mock('@duncit/media-picker', async (io) => ({
  ...(await io<typeof import('@duncit/media-picker')>()),
  AttachmentUploadField: (p: { label: string; value: string[]; onChange: (v: string[]) => void }) => (
    <div>
      <span>{`${p.label}: ${p.value.length}`}</span>
      <button type="button" onClick={() => p.onChange([...p.value, `https://img.example.test/${p.value.length}.png`])}>
        {`add ${p.label}`}
      </button>
    </div>
  ),
  SingleImageUploadField: (p: { label: string; value: string; onChange: (v: string) => void }) => (
    <button type="button" onClick={() => p.onChange('https://img.example.test/single.png')}>
      {`set ${p.label}`}
    </button>
  ),
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
  iphone_screenshots: ['https://img.example.test/a.png'],
  ipad_screenshots: ['https://img.example.test/b.png'],
  android_phone_screenshots: ['https://img.example.test/c.png', 'https://img.example.test/d.png'],
  android_tablet_7_screenshots: [],
  android_tablet_10_screenshots: [],
  website_screenshots: [],
  android_feature_graphic: 'https://img.example.test/f.png',
  android_icon: 'https://img.example.test/i.png',
  updated_by: 'ops@example.test',
  updated_at: '2026-01-01T10:00:00.000Z',
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

const save = () => fireEvent.click(screen.getByTestId('store-listing-save'));
const tab = (name: string) => fireEvent.click(screen.getByRole('tab', { name }));

describe('Store listing page', () => {
  it('shows the saved listing and who saved it', async () => {
    renderWithProviders(<StoreListingPage />);
    expect(await screen.findByLabelText(/^App name/)).toHaveValue('Duncit');
    expect(screen.getByTestId('store-listing-last-saved')).toHaveTextContent('Last saved by ops@example.test');
  });

  it('saves the whole listing and reports success', async () => {
    renderWithProviders(<StoreListingPage />);
    fireEvent.change(await screen.findByLabelText(/^App name/), { target: { value: 'Duncit Social' } });
    save();
    await waitFor(() => expect(mutation('UpdateStoreListing')).toHaveBeenCalled());
    const input = mutation('UpdateStoreListing').mock.calls[0][0].variables.input;
    expect(input).toMatchObject({ name: 'Duncit Social', primary_category: 'SOCIAL_NETWORKING' });
    expect(input).not.toHaveProperty('updated_by');
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledWith('Store listing saved.'));
  });

  it('reports a failed save', async () => {
    ops.mut.UpdateStoreListing = vi.fn().mockRejectedValue(new Error('apple said no'));
    renderWithProviders(<StoreListingPage />);
    await screen.findByLabelText(/^App name/);
    save();
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalled());
    expect(String(ops.notifyError.mock.calls[0][0])).toContain('apple said no');
  });

  it('refuses a URL in the copyright line and a too-long name', async () => {
    renderWithProviders(<StoreListingPage />);
    fireEvent.change(await screen.findByLabelText(/^App name/), { target: { value: 'x'.repeat(31) } });
    fireEvent.change(screen.getByLabelText(/^Copyright/), { target: { value: 'duncit.com' } });
    save();
    expect(await screen.findByText(/Apple refuses a URL/)).toBeInTheDocument();
    expect(screen.getByText('At most 30 characters.')).toBeInTheDocument();
    expect(mutation('UpdateStoreListing')).not.toHaveBeenCalled();
  });

  it('jumps to the Review tab when the only invalid field lives there', async () => {
    seed({ contact_email: 'not-an-email' });
    renderWithProviders(<StoreListingPage />);
    await screen.findByLabelText(/^App name/);
    save();
    expect(await screen.findByTestId('store-listing-review')).toBeInTheDocument();
    expect(screen.getByText('Must be an email address.')).toBeInTheDocument();
  });

  it('requires demo credentials only when App Review needs an account', async () => {
    renderWithProviders(<StoreListingPage />);
    await screen.findByLabelText(/^App name/);
    tab('Review & contact');
    fireEvent.click(await screen.findByTestId('store-listing-demo-account-required'));
    save();
    expect((await screen.findAllByText('Required.')).length).toBeGreaterThanOrEqual(2);
    expect(mutation('UpdateStoreListing')).not.toHaveBeenCalled();
    fireEvent.change(screen.getAllByLabelText(/^Demo account/)[0], { target: { value: 'demo@example.test' } });
    fireEvent.change(screen.getByLabelText(/^Demo account password/), { target: { value: 'not-a-real-password' } });
    save();
    await waitFor(() => expect(mutation('UpdateStoreListing')).toHaveBeenCalled());
    expect(mutation('UpdateStoreListing').mock.calls[0][0].variables.input).toMatchObject({
      demo_account_required: true,
      demo_account_name: 'demo@example.test',
    });
  });

  it('enforces the minimum screenshots and takes new uploads', async () => {
    seed({ android_phone_screenshots: ['https://img.example.test/c.png'], android_icon: '' });
    renderWithProviders(<StoreListingPage />);
    await screen.findByLabelText(/^App name/);
    save();
    expect(await screen.findByTestId('store-listing-screenshots')).toBeInTheDocument();
    expect(screen.getByText('At least 2 images.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'add Android phone screenshots' }));
    expect(await screen.findByText('Android phone screenshots: 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'set App icon' }));
    save();
    await waitFor(() => expect(mutation('UpdateStoreListing')).toHaveBeenCalled());
    expect(mutation('UpdateStoreListing').mock.calls[0][0].variables.input.android_icon).toBe(
      'https://img.example.test/single.png',
    );
  });

  it('falls back to a free-text category when Apple categories cannot be loaded', async () => {
    seed({}, []);
    renderWithProviders(<StoreListingPage />);
    expect(await screen.findByText(/Connect App Store Connect under Environment Variables/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Primary category/)).toHaveValue('SOCIAL_NETWORKING');
  });

  it('shows the one-time checklist tab', async () => {
    renderWithProviders(<StoreListingPage />);
    await screen.findByLabelText(/^App name/);
    tab('One-time setup');
    expect(await screen.findByTestId('store-listing-checklist-apple')).toBeInTheDocument();
    expect(screen.getByTestId('store-listing-checklist-play')).toBeInTheDocument();
  });

  it('shows load errors for the listing and for the categories', async () => {
    ops.q = {
      StoreListing: { error: new Error('listing unreadable') },
      AppStoreCategories: { error: new Error('categories unreadable') },
    };
    renderWithProviders(<StoreListingPage />);
    expect(await screen.findByText(/listing unreadable/)).toBeInTheDocument();
    expect(screen.getByText(/categories unreadable/)).toBeInTheDocument();
    expect(screen.queryByTestId('store-listing-form')).not.toBeInTheDocument();
  });
});
