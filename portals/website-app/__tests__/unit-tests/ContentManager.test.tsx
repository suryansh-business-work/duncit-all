import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BlogPage, CareersPage, NewsroomPage } from '../../src/pages/website';
import ContentManager from '../../src/pages/website/content/ContentManager';
import { renderWithProviders } from '../testkit';
import {
  createContentMock,
  deleteContentMock,
  makeContentItem,
  updateContentMock,
  websiteContentTableMock,
} from '../mocks';

vi.mock('../../src/components/DateTimeField', () => ({
  default: ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock('@duncit/media-picker', () => ({
  SingleImageUploadField: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
  }) => <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />,
}));

const rows = [
  makeContentItem({ id: 'a', title: 'First' }),
  makeContentItem({
    id: 'b',
    title: 'Second',
    image_url: '',
    category: '',
    is_published: false,
    published_at: null,
    created_at: '', // falsy → the "—" created-at valueGetter branch
    sort_order: 2,
  }),
];

beforeEach(() => {
  localStorage.setItem(
    'duncit-table-cols:website-content-blog',
    JSON.stringify({ sort_order: false, created_at: false }),
  );
});

const renderBlog = (mocks: MockedResponse[]) =>
  renderWithProviders(<ContentManager type="BLOG" />, {
    mocks: [websiteContentTableMock(rows), ...mocks],
  });

describe('ContentManager', () => {
  it('renders the typed heading and both rows with status chips', async () => {
    renderBlog([]);
    expect(await screen.findByRole('heading', { name: 'Blog' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('First')).toBeInTheDocument());
    expect(screen.getByText('Second')).toBeInTheDocument();
    // "Published" also appears as the published-date column header.
    expect(screen.getAllByText('Published').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('creates a new entry, toasts success and auto-dismisses the toast', async () => {
    renderBlog([createContentMock()]);
    await waitFor(() => expect(screen.getByText('First')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new entry/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('New Blog entry')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Title/), { target: { value: 'Fresh' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Blog entry saved')).toBeInTheDocument();
    // A click-away closes the Snackbar (onClose → setToast(null)).
    fireEvent.click(document.body);
    await waitFor(() => expect(screen.queryByText('Blog entry saved')).not.toBeInTheDocument());
  });

  it('closes the create dialog on cancel', async () => {
    renderBlog([]);
    await waitFor(() => expect(screen.getByText('First')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new entry/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('edits an existing entry seeded from the row', async () => {
    renderBlog([updateContentMock()]);
    await waitFor(() => expect(screen.getByText('First')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: 'edit' })[0]);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit Blog entry')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('First')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Blog entry saved')).toBeInTheDocument();
  });

  it('surfaces a save error in the form', async () => {
    renderBlog([createContentMock({ fail: true })]);
    await waitFor(() => expect(screen.getByText('First')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new entry/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Title/), { target: { value: 'Fresh' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/Boom failed/)).toBeInTheDocument();
  });

  it('deletes an entry after confirmation', async () => {
    renderBlog([deleteContentMock()]);
    await waitFor(() => expect(screen.getByText('First')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: 'delete' })[0]);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Delete "First"?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Blog entry deleted')).toBeInTheDocument();
  });

  it('cancels the delete confirmation', async () => {
    renderBlog([]);
    await waitFor(() => expect(screen.getByText('First')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: 'delete' })[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('First')).toBeInTheDocument();
  });

  it('toasts a delete error', async () => {
    renderBlog([deleteContentMock({ fail: true })]);
    await waitFor(() => expect(screen.getByText('First')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: 'delete' })[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText(/Boom failed/)).toBeInTheDocument();
  });
});

describe('content page wrappers', () => {
  const emptyTable = () => [websiteContentTableMock([])];

  it('renders the Blog manager', async () => {
    renderWithProviders(<BlogPage />, { mocks: emptyTable() });
    expect(await screen.findByRole('heading', { name: 'Blog' })).toBeInTheDocument();
  });

  it('renders the Career manager', async () => {
    renderWithProviders(<CareersPage />, { mocks: emptyTable() });
    expect(await screen.findByRole('heading', { name: 'Career' })).toBeInTheDocument();
  });

  it('renders the Newsroom manager', async () => {
    renderWithProviders(<NewsroomPage />, { mocks: emptyTable() });
    expect(await screen.findByRole('heading', { name: 'Newsroom' })).toBeInTheDocument();
  });
});
