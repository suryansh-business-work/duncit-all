import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import HostReviewCategories from './HostReviewCategories';
import type { HostCategoryValue } from '../../../forms/host';

// The picker's cascade has its own behaviour (shared @duncit/category); here it
// is a stub that adds one fixed row, so these tests exercise ONLY this
// component's list/persist logic.
vi.mock('../../../components/host-form/HostCategoryPicker', () => ({
  default: ({ onAdd, disabled }: { onAdd: (c: HostCategoryValue) => void; disabled?: boolean }) => (
    <button type="button" disabled={disabled} onClick={() => onAdd(chess)}>
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

const chess: HostCategoryValue = {
  super_category_id: 'sup-2',
  category_id: 'cat-2',
  sub_category_id: 'sub-2',
  super_category_name: 'Games',
  category_name: 'Board',
  sub_category_name: 'Chess',
  request_no: '',
};

const renderList = (props?: Partial<Parameters<typeof HostReviewCategories>[0]>) => {
  const onChange = vi.fn().mockResolvedValue(true);
  render(
    <HostReviewCategories
      categories={[badminton]}
      surveyCategory={null}
      saving={false}
      onChange={onChange}
      {...props}
    />,
  );
  return onChange;
};

describe('HostReviewCategories', () => {
  it('shows each category path with its meeting linkage', () => {
    renderList();
    expect(screen.getByText('Sports › Racket › Badminton · DUN-HOST-000123')).toBeInTheDocument();
    expect(screen.queryByTestId('review-no-categories')).not.toBeInTheDocument();
  });

  it('renders a plain path when the row has no request linkage', () => {
    renderList({ categories: [{ ...badminton, request_no: '' }] });
    expect(screen.getByText('Sports › Racket › Badminton')).toBeInTheDocument();
  });

  it('warns when the host has no categories at all', () => {
    renderList({ categories: [] });
    expect(screen.getByTestId('review-no-categories')).toBeInTheDocument();
  });

  // No Save button: adding persists the whole new list immediately.
  it('persists the list the moment a category is added', () => {
    const onChange = renderList();
    fireEvent.click(screen.getByText('stub-add'));
    expect(onChange).toHaveBeenCalledWith([badminton, chess]);
  });

  // Removing has to persist too — otherwise a deleted chip silently comes back.
  it('persists the list the moment a category is removed', () => {
    const onChange = renderList({ categories: [badminton, chess] });
    fireEvent.click(screen.getAllByTestId('CancelIcon')[0]);
    expect(onChange).toHaveBeenCalledWith([chess]);
  });

  it('locks every edit affordance while a write is in flight', () => {
    renderList({ saving: true });
    expect(screen.getByTestId('categories-saving')).toBeInTheDocument();
    expect(screen.getByText('stub-add')).toBeDisabled();
  });

  describe('the Earn with Duncit pick', () => {
    it('is shown, with a one-click Add, when it is not on the list yet', () => {
      const onChange = renderList({ surveyCategory: chess });
      expect(screen.getByTestId('review-survey-category')).toHaveTextContent(
        'Applied with: Games › Board › Chess',
      );
      fireEvent.click(screen.getByRole('button', { name: 'Add' }));
      expect(onChange).toHaveBeenCalledWith([badminton, chess]);
    });

    it('is shown without an Add button once the host already holds it', () => {
      renderList({ categories: [badminton, chess], surveyCategory: chess });
      expect(screen.getByTestId('review-survey-category')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument();
    });

    it('disables the Add button while a write is in flight', () => {
      renderList({ surveyCategory: chess, saving: true });
      expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    });

    it('is omitted entirely when the applicant never booked a meeting', () => {
      renderList();
      expect(screen.queryByTestId('review-survey-category')).not.toBeInTheDocument();
    });
  });
});
