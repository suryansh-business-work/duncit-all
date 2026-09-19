import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PolicyTypeSelect from '../../src/components/PolicyTypeSelect';

/**
 * The policy-type picker: a grouped catalogue offered against a free-text
 * field, so a type nobody listed can still be stored.
 */
const renderSelect = (value: string) => {
  const onChange = vi.fn();
  render(<PolicyTypeSelect value={value} onChange={onChange} required />);
  return { onChange, input: screen.getByRole('combobox') };
};

describe('PolicyTypeSelect', () => {
  it('shows a catalogued type and marks it in the grouped list', () => {
    const { input } = renderSelect('Refund Policy');
    expect(input).toHaveValue('Refund Policy');

    fireEvent.mouseDown(input);

    expect(screen.getByText('Money')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Refund Policy' })).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps a type nobody catalogued and still offers the whole list', () => {
    const { input } = renderSelect('Venue Hygiene Policy');
    expect(input).toHaveValue('Venue Hygiene Policy');

    fireEvent.mouseDown(input);

    expect(screen.getByText('Platform & Legal')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Privacy Policy' })).toHaveAttribute('aria-selected', 'false');
  });

  it('reports a picked option by its label', () => {
    const { input, onChange } = renderSelect('');
    fireEvent.mouseDown(input);
    fireEvent.click(screen.getByRole('option', { name: 'Code of Conduct' }));
    expect(onChange).toHaveBeenCalledWith('Code of Conduct');
  });

  it('reports free text as it is typed and when it is committed', () => {
    const { input, onChange } = renderSelect('');
    fireEvent.change(input, { target: { value: 'Venue Hygiene Policy' } });
    expect(onChange).toHaveBeenLastCalledWith('Venue Hygiene Policy');

    onChange.mockClear();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('Venue Hygiene Policy');
  });

  it('clears back to no type', () => {
    const { onChange } = renderSelect('Refund Policy');
    fireEvent.click(screen.getByTitle('Clear'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('uses the given label in place of the default', () => {
    const onChange = vi.fn();
    render(<PolicyTypeSelect value="" onChange={onChange} label="Filed under" />);
    expect(screen.getByLabelText('Filed under')).toBeInTheDocument();
  });
});
