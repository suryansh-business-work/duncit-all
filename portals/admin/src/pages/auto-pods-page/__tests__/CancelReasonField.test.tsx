import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CancelReasonField from '../CancelReasonField';

describe('CancelReasonField', () => {
  it('shows the message and the reason field label', () => {
    render(
      <CancelReasonField
        message="Everyone who enrolled is told."
        label="Reason (optional)"
        onReasonChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Everyone who enrolled is told.')).toBeInTheDocument();
    expect(screen.getByLabelText('Reason (optional)')).toBeInTheDocument();
  });

  it('reports every keystroke to the caller uncontrolled, without holding the value itself', () => {
    const onReasonChange = vi.fn();
    render(
      <CancelReasonField message="msg" label="Reason (optional)" onReasonChange={onReasonChange} />,
    );
    const field = screen.getByLabelText('Reason (optional)') as HTMLTextAreaElement;
    fireEvent.change(field, { target: { value: 'Venue double-booked' } });
    expect(onReasonChange).toHaveBeenCalledWith('Venue double-booked');
    expect(onReasonChange).toHaveBeenCalledTimes(1);
  });

  it('reports an empty string when the field is cleared', () => {
    const onReasonChange = vi.fn();
    render(
      <CancelReasonField message="msg" label="Reason (optional)" onReasonChange={onReasonChange} />,
    );
    const field = screen.getByLabelText('Reason (optional)');
    fireEvent.change(field, { target: { value: 'text' } });
    fireEvent.change(field, { target: { value: '' } });
    expect(onReasonChange).toHaveBeenLastCalledWith('');
  });
});
