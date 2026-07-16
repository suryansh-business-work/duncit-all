import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import type { AdminCategoryValue } from '@duncit/category';
import CategoryCascade from '../../src/pages/challenges/CategoryCascade';
import { renderWithProviders } from '../testkit';
import { adminCategoryChange } from '../mocks';

vi.mock('@duncit/category', () => ({
  AdminCategorySelect: ({
    value,
    onChange,
    required,
  }: {
    value: AdminCategoryValue;
    onChange: (v: AdminCategoryValue) => void;
    required?: boolean;
  }) => (
    <div>
      <span data-testid="mapped">{`${value.super_id}|${value.category_id}|${value.sub_id}`}</span>
      <span data-testid="required">{String(required)}</span>
      <button type="button" onClick={() => onChange(adminCategoryChange)}>
        change
      </button>
    </div>
  ),
}));

describe('CategoryCascade', () => {
  it('maps the {superId,categoryId,subId} contract into the admin value shape', () => {
    renderWithProviders(
      <CategoryCascade value={{ superId: 'a', categoryId: 'b', subId: 'c' }} onChange={vi.fn()} />,
    );
    expect(screen.getByTestId('mapped')).toHaveTextContent('a|b|c');
    expect(screen.getByTestId('required')).toHaveTextContent('true');
  });

  it('translates the admin onChange back into the cascade contract', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <CategoryCascade value={{ superId: '', categoryId: '', subId: '' }} onChange={onChange} />,
    );
    fireEvent.click(screen.getByText('change'));
    expect(onChange).toHaveBeenCalledWith({ superId: 's2', categoryId: 'c2', subId: 'sub2' });
  });
});
