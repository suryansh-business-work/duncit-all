import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TagsInput from '../../src/pages/inventory-page/inventory-product-page/TagsInput';

describe('TagsInput', () => {
  it('renders existing tags as chips with the default label', () => {
    render(<TagsInput value={['alpha', 'beta']} onChange={vi.fn()} />);
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('beta')).toBeInTheDocument();
    expect(screen.getByLabelText('Tags')).toBeInTheDocument();
    expect(screen.getByText(/press enter to add a tag/i)).toBeInTheDocument();
  });

  it('normalises a new free-solo tag: trims and lowercases', () => {
    const onChange = vi.fn();
    render(<TagsInput value={[]} onChange={onChange} />);
    const input = screen.getByLabelText('Tags');
    fireEvent.change(input, { target: { value: '  Fresh  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['fresh']);
  });

  it('deduplicates and caps the number of tags at max', () => {
    const onChange = vi.fn();
    render(<TagsInput value={['a']} onChange={onChange} max={1} />);
    const input = screen.getByLabelText('Tags');
    fireEvent.change(input, { target: { value: 'b' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    // ['a','b'] deduped then sliced to max 1 → ['a'].
    expect(onChange).toHaveBeenCalledWith(['a']);
  });
});
