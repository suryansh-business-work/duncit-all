import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RichTextEditor, { htmlToText, toPrintableHtml } from '../../src/components/RichTextEditor';

vi.mock('react-quill', () => ({
  default: ({ value, onChange, placeholder }: any) => (
    <textarea data-testid="quill" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

describe('RichTextEditor', () => {
  it('renders the editor and forwards changes', () => {
    const onChange = vi.fn();
    render(<RichTextEditor value="<p>hi</p>" onChange={onChange} placeholder="Write…" />);
    const editor = screen.getByTestId('quill');
    expect(editor).toHaveAttribute('placeholder', 'Write…');
    fireEvent.change(editor, { target: { value: '<p>x</p>' } });
    expect(onChange).toHaveBeenCalledWith('<p>x</p>');
  });

  it('accepts a custom minHeight', () => {
    const { container } = render(<RichTextEditor value="" onChange={vi.fn()} minHeight={120} />);
    expect(container.firstChild).toBeTruthy();
  });
});

describe('htmlToText', () => {
  it('returns empty for empty input', () => {
    expect(htmlToText('')).toBe('');
  });
  it('strips tags and decodes entities', () => {
    expect(htmlToText('<p>Hello &amp; bye</p>')).toBe('Hello & bye');
  });
  it('handles markup with no text', () => {
    expect(htmlToText('<br>')).toBe('');
  });
});

describe('toPrintableHtml', () => {
  it('wraps content in a printable document with the title', () => {
    const html = toPrintableHtml('Privacy Policy', '<p>Body</p>');
    expect(html).toContain('<title>Privacy Policy</title>');
    expect(html).toContain('<h1>Privacy Policy</h1>');
    expect(html).toContain('<p>Body</p>');
  });

  it('shows a placeholder when there is no content', () => {
    expect(toPrintableHtml('Empty', '')).toContain('No content.');
  });
});
