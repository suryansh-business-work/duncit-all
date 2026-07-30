import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import HostReviewCategories from './HostReviewCategories';
import type { HostCategoryValue } from '../../forms/host';

// The picker's cascade has its own behaviour (shared @duncit/category); here it
// is a stub that adds one fixed row, so these tests exercise ONLY this
// component's list/dirty/save logic.
vi.mock('../../components/host-form/HostCategoryPicker', () => ({
  default: ({ onAdd }: { onAdd: (c: HostCategoryValue) => void }) => (
    <button
      type="button"
      onClick={() =>
        onAdd({
          super_category_id: 'sup-2',
          category_id: 'cat-2',
          sub_category_id: 'sub-2',
          super_category_name: 'Games',
          category_name: 'Board',
          sub_category_name: 'Chess',
          request_no: '',
        })
      }
    >
      stub-add
    </button>
  ),
}));

const badminton: HostCategoryValue = {
  super_category_id: 'sup-1',
  category_id: 'cat-1',
  sub_category_id: 'sub-1',
  super_category_name: 'Sports',
  category_name: 'Racket',
  sub_category_name: 'Badminton',
  request_no: 'DUN-HOST-000123',
};

describe('HostReviewCategories', () => {
  it('shows each category path with its meeting linkage', () => {
    render(<HostReviewCategories categories={[badminton]} onSave={vi.fn()} saving={false} />);
    expect(
      screen.getByText('Sports › Racket › Badminton · DUN-HOST-000123'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('review-no-categories')).not.toBeInTheDocument();
  });

  // Rows live in local state on purpose — the dialog remounts the component per
  // host via `key` — so the empty warning is asserted on a fresh mount.
  it('warns when the host has no categories at all', () => {
    render(<HostReviewCategories categories={[]} onSave={vi.fn()} saving={false} />);
    expect(screen.getByTestId('review-no-categories')).toBeInTheDocument();
  });

  it('renders a plain path when the row has no request linkage', () => {
    render(
      <HostReviewCategories
        categories={[{ ...badminton, request_no: '' }]}
        onSave={vi.fn()}
        saving={false}
      />,
    );
    expect(screen.getByText('Sports › Racket › Badminton')).toBeInTheDocument();
  });

  it('only enables Save once the list actually changed, and saves the edited rows', () => {
    const onSave = vi.fn();
    render(<HostReviewCategories categories={[badminton]} onSave={onSave} saving={false} />);
    const save = screen.getByRole('button', { name: 'Save categories' });
    expect(save).toBeDisabled();

    fireEvent.click(screen.getByText('stub-add'));
    expect(save).toBeEnabled();
    fireEvent.click(save);
    expect(onSave).toHaveBeenCalledWith([
      badminton,
      expect.objectContaining({ sub_category_id: 'sub-2' }),
    ]);
  });

  it('removes a row from its chip and shows the saving label', () => {
    const onSave = vi.fn();
    const { rerender } = render(
      <HostReviewCategories categories={[badminton]} onSave={onSave} saving={false} />,
    );
    // MUI renders the delete affordance as the chip's CancelIcon.
    fireEvent.click(screen.getByTestId('CancelIcon'));
    expect(screen.getByTestId('review-no-categories')).toBeInTheDocument();

    rerender(<HostReviewCategories categories={[badminton]} onSave={onSave} saving />);
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });
});
