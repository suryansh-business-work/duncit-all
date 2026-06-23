import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import TableSkeleton from './TableSkeleton';

describe('TableSkeleton', () => {
  it('renders the requested rows × columns of skeleton cells', () => {
    const { container } = render(<TableSkeleton rows={3} columns={7} />);
    expect(container.querySelectorAll('tr')).toHaveLength(3);
    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(21);
  });

  it('defaults to 6 rows when rows is omitted', () => {
    const { container } = render(<TableSkeleton columns={4} />);
    expect(container.querySelectorAll('tr')).toHaveLength(6);
    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(24);
  });
});
