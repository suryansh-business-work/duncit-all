import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DocumentTypeSelect from '../../src/components/DocumentTypeSelect';

describe('DocumentTypeSelect', () => {
  it('reflects the current value', () => {
    render(<DocumentTypeSelect value="Privacy Policy" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('Privacy Policy')).toBeInTheDocument();
  });

  it('shows an empty input when the value is not a known type', () => {
    render(<DocumentTypeSelect value="Made Up Type" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveValue('');
  });

  it('opens the grouped list and selects an option', () => {
    const onChange = vi.fn();
    render(<DocumentTypeSelect value="" onChange={onChange} />);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Privacy Policy'));
    expect(onChange).toHaveBeenCalledWith('Privacy Policy');
  });

  it('clears back to an empty value', () => {
    const onChange = vi.fn();
    render(<DocumentTypeSelect value="Privacy Policy" onChange={onChange} />);
    fireEvent.click(screen.getByTitle('Clear'));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
