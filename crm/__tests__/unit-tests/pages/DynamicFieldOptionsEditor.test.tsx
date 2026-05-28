import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DynamicFieldOptionsEditor from '@/pages/ManageDynamicFieldsPage/DynamicFieldOptionsEditor';

describe('DynamicFieldOptionsEditor', () => {
  it('adds a blank option row', () => {
    const onChange = vi.fn();
    render(<DynamicFieldOptionsEditor options={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Add option/i }));
    expect(onChange).toHaveBeenCalledWith([{ value: '', label: '' }]);
  });

  it('edits a value and a label by position', () => {
    const onChange = vi.fn();
    render(<DynamicFieldOptionsEditor options={[{ value: 'a', label: 'A' }]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('option-value-0'), { target: { value: 'b' } });
    expect(onChange).toHaveBeenCalledWith([{ value: 'b', label: 'A' }]);
    fireEvent.change(screen.getByLabelText('option-label-0'), { target: { value: 'Bee' } });
    expect(onChange).toHaveBeenCalledWith([{ value: 'a', label: 'Bee' }]);
  });

  it('removes an option', () => {
    const onChange = vi.fn();
    render(
      <DynamicFieldOptionsEditor
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByLabelText('remove-option-0'));
    expect(onChange).toHaveBeenCalledWith([{ value: 'b', label: 'B' }]);
  });
});
