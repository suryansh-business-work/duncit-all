/**
 * The row of controls around the composer box: attach, emoji, the text field
 * itself, and the mic/send swap.
 */
import { fireEvent, render } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import ComposerRow from '../src/staff-chat/ComposerRow';

const baseProps = () => ({
  draft: '',
  sending: false,
  uploading: false,
  inputRef: createRef<HTMLTextAreaElement>(),
  onDraft: vi.fn(),
  onKeyDown: vi.fn(),
  onBlur: vi.fn(),
  onSend: vi.fn(),
  onAttach: vi.fn(),
  onRecord: vi.fn(),
  onShareLocation: vi.fn(),
});

describe('ComposerRow', () => {
  it('attaches the chosen file and clears the input for the next pick', () => {
    const onAttach = vi.fn();
    const { container } = render(<ComposerRow {...baseProps()} onAttach={onAttach} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'photo.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(onAttach).toHaveBeenCalledWith(file);
    expect(input.value).toBe('');
  });

  it('does nothing when the file picker is cancelled with nothing chosen', () => {
    const onAttach = vi.fn();
    const { container } = render(<ComposerRow {...baseProps()} onAttach={onAttach} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [] } });

    expect(onAttach).not.toHaveBeenCalled();
  });

  it('reports the caret position alongside a typed draft', () => {
    const onDraft = vi.fn();
    const { getByPlaceholderText } = render(<ComposerRow {...baseProps()} onDraft={onDraft} />);
    const textarea = getByPlaceholderText('Write a message') as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: 'Hi', selectionStart: 2 } });

    expect(onDraft).toHaveBeenCalledWith('Hi', 2);
  });

  it("falls back to the draft's own length when the engine reports no caret at all", () => {
    const onDraft = vi.fn();
    const { getByPlaceholderText } = render(<ComposerRow {...baseProps()} onDraft={onDraft} />);
    const textarea = getByPlaceholderText('Write a message') as HTMLTextAreaElement;
    Object.defineProperty(textarea, 'selectionStart', { value: null, configurable: true });

    fireEvent.change(textarea, { target: { value: 'Hi' } });

    expect(onDraft).toHaveBeenCalledWith('Hi', 2);
  });

  it('appends a picked emoji to the draft, placing the caret right after it', () => {
    const onDraft = vi.fn();
    const { getByLabelText } = render(<ComposerRow {...baseProps()} draft="Hi " onDraft={onDraft} />);

    fireEvent.click(getByLabelText('Insert emoji'));
    fireEvent.click(document.body.querySelector('[aria-label="👍"]') as HTMLElement);

    expect(onDraft).toHaveBeenCalledWith('Hi 👍', 'Hi 👍'.length);
  });

  it('shows the mic and records when there is nothing typed yet', () => {
    const onRecord = vi.fn();
    const onSend = vi.fn();
    const { getByRole } = render(<ComposerRow {...baseProps()} onRecord={onRecord} onSend={onSend} />);

    fireEvent.click(getByRole('button', { name: 'Record a voice note' }));

    expect(onRecord).toHaveBeenCalledTimes(1);
    expect(onSend).not.toHaveBeenCalled();
  });

  it('swaps to send once there is text to send', () => {
    const onRecord = vi.fn();
    const onSend = vi.fn();
    const { getByRole } = render(
      <ComposerRow {...baseProps()} draft="Hello" onRecord={onRecord} onSend={onSend} />,
    );

    fireEvent.click(getByRole('button', { name: 'Send message' }));

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onRecord).not.toHaveBeenCalled();
  });
});
