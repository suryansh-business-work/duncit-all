import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Stub the media-picker so the field is testable in isolation. The stub echoes
// the props the component passes and exposes onChange via test buttons.
vi.mock('@duncit/media-picker', () => ({
  ATTACHMENT_ACCEPT_ALL: 'accept-all',
  AttachmentUploadField: ({ value, onChange, label, max, folder, accept }: any) => (
    <div data-testid="attachment-field">
      <span data-testid="value">{JSON.stringify(value)}</span>
      <span data-testid="label">{label}</span>
      <span data-testid="max">{String(max)}</span>
      <span data-testid="folder">{folder}</span>
      <span data-testid="accept">{accept}</span>
      <button type="button" onClick={() => onChange(['https://cdn/bill.pdf'])}>
        set-one
      </button>
      <button type="button" onClick={() => onChange([])}>
        set-empty
      </button>
    </div>
  ),
}));

import BillUploadField from '../BillUploadField';

describe('BillUploadField', () => {
  it('wraps an empty value into an empty list and forwards config props', () => {
    render(<BillUploadField value="" onChange={vi.fn()} />);
    expect(screen.getByTestId('value')).toHaveTextContent('[]');
    expect(screen.getByTestId('label')).toHaveTextContent('Venue Bill');
    expect(screen.getByTestId('max')).toHaveTextContent('1');
    expect(screen.getByTestId('folder')).toHaveTextContent('/pod-bills');
    expect(screen.getByTestId('accept')).toHaveTextContent('accept-all');
  });

  it('wraps a present value into a single-item list', () => {
    render(<BillUploadField value="https://cdn/x.png" onChange={vi.fn()} />);
    expect(screen.getByTestId('value')).toHaveTextContent('["https://cdn/x.png"]');
  });

  it('maps the first uploaded url through onChange', () => {
    const onChange = vi.fn();
    render(<BillUploadField value="" onChange={onChange} />);
    fireEvent.click(screen.getByText('set-one'));
    expect(onChange).toHaveBeenCalledWith('https://cdn/bill.pdf');
  });

  it('maps an emptied list to an empty string', () => {
    const onChange = vi.fn();
    render(<BillUploadField value="https://cdn/x.png" onChange={onChange} />);
    fireEvent.click(screen.getByText('set-empty'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('does not render a helper when there is no error', () => {
    render(<BillUploadField value="" onChange={vi.fn()} />);
    expect(screen.queryByText('Bill is required')).not.toBeInTheDocument();
  });

  it('renders the error helper text when an error is provided', () => {
    render(<BillUploadField value="" onChange={vi.fn()} error="Bill is required" />);
    expect(screen.getByText('Bill is required')).toBeInTheDocument();
  });
});
