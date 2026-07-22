import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CategorySummaryBanner from '../CategorySummaryBanner';

describe('CategorySummaryBanner', () => {
  it('returns null when all labels are empty', () => {
    const { container } = render(
      <CategorySummaryBanner labels={{ super: '', category: '', sub: '' }} onChange={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('category-banner')).toBeNull();
  });

  it('renders the full breadcrumb summary and CATEGORY heading', () => {
    render(
      <CategorySummaryBanner
        labels={{ super: 'Food', category: 'Snacks', sub: 'Chips' }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId('category-banner')).toBeInTheDocument();
    expect(screen.getByText('CATEGORY')).toBeInTheDocument();
    expect(screen.getByText('Food › Snacks › Chips')).toBeInTheDocument();
    expect(screen.getByText('Change')).toBeInTheDocument();
  });

  it('joins only non-empty label segments', () => {
    render(
      <CategorySummaryBanner
        labels={{ super: 'Food', category: '', sub: 'Chips' }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Food › Chips')).toBeInTheDocument();
  });

  it('fires onChange when the Change chip is clicked', () => {
    const onChange = vi.fn();
    render(
      <CategorySummaryBanner
        labels={{ super: 'Food', category: 'Snacks', sub: '' }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('Change'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
