import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RichTextEditor, { htmlToText } from '../../src/components/RichTextEditor';

vi.mock('react-quill', () => ({
  default: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
  }) => (
    <textarea
      data-testid="quill"
      aria-label="editor"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

describe('RichTextEditor', () => {
  it('renders the editor and forwards changes', () => {
    const onChange = vi.fn();
    render(<RichTextEditor value="<p>hi</p>" onChange={onChange} placeholder="Write a reply…" />);
    const editor = screen.getByTestId('quill');
    expect(editor).toHaveAttribute('placeholder', 'Write a reply…');
    fireEvent.change(editor, { target: { value: '<p>updated</p>' } });
    expect(onChange).toHaveBeenCalledWith('<p>updated</p>');
  });

  it('accepts a custom minHeight', () => {
    const { container } = render(<RichTextEditor value="" onChange={vi.fn()} minHeight={240} />);
    expect(container.firstChild).toBeTruthy();
  });
});

describe('htmlToText', () => {
  it('returns an empty string for empty input', () => {
    expect(htmlToText('')).toBe('');
  });

  it('strips HTML tags and decodes entities', () => {
    expect(htmlToText('<p>Hello &amp; bye</p>')).toBe('Hello & bye');
  });

  it('handles markup with no text content', () => {
    expect(htmlToText('<br>')).toBe('');
  });
});
