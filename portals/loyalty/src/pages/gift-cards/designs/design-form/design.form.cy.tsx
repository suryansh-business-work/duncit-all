import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DesignForm from './design.form';
import { BLANK_DESIGN, makeDesignSchema, toDesignInput, toDesignValues } from './design.types';
import { makeDesign, FRONT, BACK } from '../../../../../__tests__/mocks/gift-card-order.mock';

// The real picker uploads through ImageKit; here it is a plain field that the
// test types a URL into — the form's own rules are what is under test.
vi.mock('@duncit/media-picker', () => ({
  MediaPickerField: ({ label, value, onChange, helperText }: any) => (
    <label>
      {label}
      <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
      <span>{helperText}</span>
    </label>
  ),
}));

/** Reads the key and its vars back, so a message names the rule it came from. */
const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}(${JSON.stringify(options.vars)})` : key;
const schema = makeDesignSchema(t);
const errorsOf = (values: typeof BLANK_DESIGN) => {
  const result = schema.safeParse(values);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
};
const valid = { name: 'Classic', category: 'Evergreen', front_image_url: FRONT, back_image_url: BACK, sort_order: '2' };

describe('makeDesignSchema', () => {
  it('accepts a named design with both https faces', () => {
    expect(errorsOf(valid)).toEqual({});
  });

  it('asks for a name, both faces, and refuses insecure or non-image links', () => {
    expect(errorsOf({ ...BLANK_DESIGN })).toEqual({
      name: 'loyalty.designs.nameRequired',
      front_image_url: 'loyalty.designs.frontRequired',
      back_image_url: 'loyalty.designs.backRequired',
    });
    expect(errorsOf({ ...valid, front_image_url: 'http://insecure.example/a.png', back_image_url: 'not a link' })).toEqual({
      front_image_url: 'loyalty.designs.frontRequired',
      back_image_url: 'loyalty.designs.backRequired',
    });
  });

  it.each([['-1'], ['1.5'], ['10000'], ['']])('refuses a display order of %j', (sort_order) => {
    expect(errorsOf({ ...valid, sort_order })).toEqual({ sort_order: 'loyalty.designs.sortOrderInvalid({"max":9999})' });
  });

  it('keeps the name and category within the server limits', () => {
    expect(errorsOf({ ...valid, name: 'x'.repeat(121), category: 'y'.repeat(81) })).toEqual({
      name: 'loyalty.designs.nameMax({"max":120})',
      category: 'loyalty.designs.categoryMax({"max":80})',
    });
  });
});

describe('design mappers', () => {
  it('starts blank for a new design and copies an existing one', () => {
    expect(toDesignValues(null)).toEqual(BLANK_DESIGN);
    expect(toDesignValues(makeDesign({ sort_order: 3 }))).toEqual({ ...valid, sort_order: '3' });
  });

  it('trims the values and sends the order as a number', () => {
    expect(toDesignInput({ ...valid, name: '  Classic  ', sort_order: '07' })).toEqual({
      name: 'Classic',
      category: 'Evergreen',
      front_image_url: FRONT,
      back_image_url: BACK,
      sort_order: 7,
    });
  });
});

describe('DesignForm', () => {
  const props = { categories: ['Evergreen'], busy: false, onCancel: vi.fn() };

  it('previews the uploaded faces live and submits the new design', async () => {
    const onSubmit = vi.fn();
    render(<DesignForm {...props} design={null} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('design-name').querySelector('input')!, { target: { value: 'Diwali' } });
    fireEvent.change(screen.getByLabelText('Front of the card'), { target: { value: FRONT } });
    fireEvent.change(screen.getByLabelText('Back of the card'), { target: { value: BACK } });
    expect(screen.getByAltText('Front of the card')).toHaveAttribute('src', FRONT);
    expect(screen.getByAltText('Back of the card')).toHaveAttribute('src', BACK);

    fireEvent.click(screen.getByTestId('design-save'));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ name: 'Diwali', category: '', front_image_url: FRONT, back_image_url: BACK, sort_order: 0 })
    );
    expect(screen.getByTestId('design-save')).toHaveTextContent('Add design');
  });

  it('shows the field rules instead of submitting an incomplete design', async () => {
    const onSubmit = vi.fn();
    render(<DesignForm {...props} design={null} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId('design-save'));
    expect(await screen.findByText('Upload the front of the card.')).toBeInTheDocument();
    expect(screen.getByText('Give the design a name.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('edits an existing design, takes a typed category, and shows the server’s refusal', async () => {
    const onSubmit = vi.fn();
    render(<DesignForm {...props} design={makeDesign()} errorMessage="Only one default design" onSubmit={onSubmit} />);
    expect(screen.getByText('Only one default design')).toBeInTheDocument();
    const category = screen.getByLabelText('Category');
    fireEvent.change(category, { target: { value: 'Festive' } });
    fireEvent.blur(category);
    fireEvent.click(screen.getByTestId('design-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Classic', category: 'Festive' })));
    expect(screen.getByTestId('design-save')).toHaveTextContent('Save design');
  });

  it('shows a category that is too long under its field', async () => {
    render(<DesignForm {...props} design={makeDesign()} onSubmit={vi.fn()} />);
    const category = screen.getByLabelText('Category');
    fireEvent.change(category, { target: { value: 'c'.repeat(81) } });
    fireEvent.blur(category);
    expect(await screen.findByText('Keep the category to 80 characters.')).toBeInTheDocument();
  });

  it('hides the buttons from a read-only seat and cancels on request', () => {
    const onCancel = vi.fn();
    const { rerender } = render(<DesignForm {...props} design={makeDesign()} onCancel={onCancel} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
    rerender(<DesignForm {...props} design={makeDesign()} readOnly onCancel={onCancel} onSubmit={vi.fn()} />);
    expect(screen.getByTestId('design-save').closest('.MuiGrid-root')).toHaveStyle({ display: 'none' });
  });
});
