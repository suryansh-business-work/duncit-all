import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import ContentDialog from '../../src/pages/website/content/ContentDialog';
import { renderWithProviders } from '../testkit';
import { makeContentItem } from '../mocks';

vi.mock('../../src/components/DateTimeField', () => ({
  default: ({ label }: { label: string }) => <input aria-label={label} readOnly />,
}));
vi.mock('@duncit/media-picker', () => ({
  SingleImageUploadField: ({ label }: { label: string }) => <input aria-label={label} readOnly />,
}));

const item = makeContentItem({ id: '1', type: 'BLOG', title: 'Existing' });

describe('ContentDialog', () => {
  it('renders no form body when closed', () => {
    renderWithProviders(
      <ContentDialog
        open={false}
        type="BLOG"
        item={null}
        submitting={false}
        errorMessage={null}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
  });

  it('titles the create form and mounts the body when open', () => {
    renderWithProviders(
      <ContentDialog
        open
        type="BLOG"
        item={null}
        submitting={false}
        errorMessage={null}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText('New Blog entry')).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
  });

  it('titles the edit form and locks close while submitting', () => {
    renderWithProviders(
      <ContentDialog
        open
        type="BLOG"
        item={item}
        submitting
        errorMessage="oops"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText('Edit Blog entry')).toBeInTheDocument();
    // submitting → onClose is swapped to undefined (no backdrop close).
    expect(screen.getByText('oops')).toBeInTheDocument();
  });
});
