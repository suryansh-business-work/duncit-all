import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

interface AdminValue {
  super_id: string;
  category_id: string;
  sub_id: string;
}

vi.mock('@duncit/category', () => ({
  AdminCategorySelect: ({
    value,
    onChange,
    required,
  }: {
    value: AdminValue;
    onChange: (v: AdminValue) => void;
    required?: boolean;
  }) => (
    <div>
      <span data-testid="mapped">{`${value.super_id}|${value.category_id}|${value.sub_id}`}</span>
      <span data-testid="required">{String(required)}</span>
      <button
        type="button"
        onClick={() =>
          onChange({
            super_id: 's2',
            super_name: 'S2',
            category_id: 'c2',
            category_name: 'C2',
            sub_id: 'sub2',
            sub_name: 'Sub2',
          } as never)
        }
      >
        change
      </button>
    </div>
  ),
}));

import CategoryCascade from '../../src/pages/challenges/CategoryCascade';

describe('CategoryCascade', () => {
  it('maps the {superId,categoryId,subId} contract into the admin value shape', () => {
    render(
      <CategoryCascade value={{ superId: 'a', categoryId: 'b', subId: 'c' }} onChange={vi.fn()} />,
    );
    expect(screen.getByTestId('mapped')).toHaveTextContent('a|b|c');
    expect(screen.getByTestId('required')).toHaveTextContent('true');
  });

  it('translates the admin onChange back into the cascade contract', () => {
    const onChange = vi.fn();
    render(
      <CategoryCascade value={{ superId: '', categoryId: '', subId: '' }} onChange={onChange} />,
    );
    fireEvent.click(screen.getByText('change'));
    expect(onChange).toHaveBeenCalledWith({ superId: 's2', categoryId: 'c2', subId: 'sub2' });
  });
});
